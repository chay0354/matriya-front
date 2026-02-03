import React, { useState } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import './SearchTab.css';

function SearchTab() {
    const [query, setQuery] = useState('');
    const [nResults, setNResults] = useState(5);
    const [selectedFile, setSelectedFile] = useState('all');
    const [availableFiles, setAvailableFiles] = useState([]);
    const [results, setResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [agentAnalysis, setAgentAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('אנא הכנס שאילתת חיפוש');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults(null);

        try {
            const params = {
                query: query.trim(),
                n_results: nResults,
                generate_answer: true
            };
            
            // Add filename filter if a specific file is selected
            if (selectedFile && selectedFile !== 'all') {
                params.filename = selectedFile;
            }
            
            const response = await api.get(`${API_BASE_URL}/search`, { params });

            setResults(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'שגיאה בחיפוש');
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Load available files on component mount
    React.useEffect(() => {
        const loadFiles = async () => {
            try {
                const response = await api.get(`${API_BASE_URL}/files`);
                setAvailableFiles(response.data.files || []);
            } catch (err) {
                console.error('Error loading files:', err);
                // Don't show error to user, just log it
            }
        };
        loadFiles();
    }, []);

    const handleAgentCheck = async (agentType) => {
        if (!results || !results.answer || !results.context) {
            setError('לא ניתן לבדוק ללא תשובה והקשר');
            return;
        }

        setIsAnalyzing(true);
        setAgentAnalysis(null);
        setError(null);

        try {
            const endpoint = agentType === 'contradiction' 
                ? '/agent/contradiction' 
                : '/agent/risk';
            
            const response = await api.post(`${API_BASE_URL}${endpoint}`, {
                answer: results.answer,
                context: results.context,
                query: results.query
            });

            setAgentAnalysis({
                type: agentType,
                ...response.data
            });
        } catch (err) {
            setError(err.response?.data?.detail || err.message || `שגיאה בבדיקת ${agentType === 'contradiction' ? 'סתירות' : 'סיכונים'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="search-tab">
            <div className="card">
                <h2>חיפוש במסמכים</h2>
                <div className="search-box">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="הכנס שאילתת חיפוש..."
                        className="search-input"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="search-button"
                    >
                        {isSearching ? 'מחפש...' : 'חפש'}
                    </button>
                </div>
                <div className="search-options">
                    <label>
                        מספר תוצאות:
                        <input
                            type="number"
                            value={nResults}
                            onChange={(e) => setNResults(parseInt(e.target.value) || 5)}
                            min="1"
                            max="20"
                            className="results-count-input"
                        />
                    </label>
                    <label>
                        חיפוש במסמך:
                        <select
                            value={selectedFile}
                            onChange={(e) => setSelectedFile(e.target.value)}
                            className="file-select"
                        >
                            <option value="all">כל המסמכים</option>
                            {availableFiles.map((filename, index) => (
                                <option key={index} value={filename}>
                                    {filename}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {isSearching && (
                    <div className="loading">
                        <div>מחפש במסמכים...</div>
                        <div style={{ marginTop: '15px', fontSize: '0.95em', color: '#a0a0c0' }}>
                            🤖 מייצר תשובה חכמה באמצעות AI...
                        </div>
                    </div>
                )}

                {results && (
                    <div className="search-results">
                        {results.answer && (
                            <div className="ai-answer">
                                <h3>🤖 תשובה חכמה (Doc Agent):</h3>
                                <div className="answer-text">{results.answer}</div>
                                {results.context_sources && (
                                    <div className="answer-sources">
                                        מבוסס על {results.context_sources} מקורות מהמסמכים
                                    </div>
                                )}
                                <div className="agent-actions">
                                    <button
                                        onClick={() => handleAgentCheck('contradiction')}
                                        disabled={isAnalyzing}
                                        className="agent-button contradiction-button"
                                    >
                                        {isAnalyzing ? 'בודק...' : '🔍 בדוק סתירות (Contradiction Agent)'}
                                    </button>
                                    <button
                                        onClick={() => handleAgentCheck('risk')}
                                        disabled={isAnalyzing}
                                        className="agent-button risk-button"
                                    >
                                        {isAnalyzing ? 'בודק...' : '⚠️ זהה סיכונים (Risk Agent)'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {!results.answer && results.results_count > 0 && (
                            <div className="info-message">
                                ⚠️ לא נוצרה תשובה חכמה. מציג תוצאות חיפוש בלבד.
                            </div>
                        )}

                        {agentAnalysis && (
                            <div className={`agent-analysis ${agentAnalysis.type === 'contradiction' ? 'contradiction-analysis' : 'risk-analysis'}`}>
                                <h3>
                                    {agentAnalysis.type === 'contradiction' 
                                        ? '🔍 ניתוח סתירות (Contradiction Agent)' 
                                        : '⚠️ ניתוח סיכונים (Risk Agent)'}
                                </h3>
                                <div className="agent-status">
                                    {agentAnalysis.type === 'contradiction' ? (
                                        agentAnalysis.has_contradictions ? (
                                            <span className="status-badge warning">נמצאו סתירות</span>
                                        ) : agentAnalysis.has_contradictions === false ? (
                                            <span className="status-badge success">לא נמצאו סתירות</span>
                                        ) : (
                                            <span className="status-badge unknown">לא ניתן לבדוק</span>
                                        )
                                    ) : (
                                        agentAnalysis.has_risks ? (
                                            <span className="status-badge warning">נמצאו סיכונים</span>
                                        ) : agentAnalysis.has_risks === false ? (
                                            <span className="status-badge success">לא נמצאו סיכונים</span>
                                        ) : (
                                            <span className="status-badge unknown">לא ניתן לבדוק</span>
                                        )
                                    )}
                                </div>
                                <div className="agent-analysis-text">
                                    {agentAnalysis.analysis}
                                </div>
                            </div>
                        )}
                        
                        <h3>נמצאו {results.results_count} תוצאות:</h3>
                        {results.results_count === 0 ? (
                            <div className="empty-state">לא נמצאו תוצאות</div>
                        ) : (
                            results.results.map((item, index) => (
                                <div key={index} className="search-result-item">
                                    <div className="result-header">
                                        <span className="result-filename">
                                            {item.metadata?.filename || 'לא ידוע'}
                                        </span>
                                        <span className="result-distance">
                                            דמיון: {item.distance ? item.distance.toFixed(4) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="result-text">{item.document}</div>
                                    {item.metadata?.chunk_index !== undefined && (
                                        <div className="result-metadata">
                                            חלק מספר: {item.metadata.chunk_index}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchTab;
