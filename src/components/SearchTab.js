import React, { useState } from 'react';
import api from '../utils/api';
import './SearchTab.css';

const RESEARCH_STAGES = [
    { id: 'K', label: 'K', desc: 'מידע קיים בלבד (ללא פתרונות)' },
    { id: 'C', label: 'C', desc: 'מידע מאומת (ללא פתרונות)' },
    { id: 'B', label: 'B', desc: 'Hard Stop בלבד' },
    { id: 'N', label: 'N', desc: 'מותר רק אחרי B' },
    { id: 'L', label: 'L', desc: 'מותר רק אחרי N' }
];

function SearchTab() {
    const [query, setQuery] = useState('');
    const [nResults, setNResults] = useState(5);
    const [selectedFile, setSelectedFile] = useState('');
    const [availableFiles, setAvailableFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [results, setResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [agentAnalysis, setAgentAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [researchStage, setResearchStage] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    const handleSearch = async () => {
        if (!researchStage) {
            setError('נא לבחור שלב מחקר (K, C, B, N או L) לפני שליחת השאלה');
            return;
        }
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
                generate_answer: true,
                stage: researchStage
            };
            if (sessionId) params.session_id = sessionId;
            if (selectedFile) params.filename = selectedFile;

            const response = await api.get('/search', {
                params,
                timeout: 60000
            });

            const data = response.data;
            setResults(data);
            if (data.session_id) setSessionId(data.session_id);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
            setError(err.response?.data?.research_stage_error ? msg : (msg || 'שגיאה בחיפוש'));
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
        let isMounted = true;
        const loadFiles = async () => {
            setIsLoadingFiles(true);
            try {
                const response = await api.get('/files', {
                    timeout: 15000  // 15 second timeout (files list may need RAG service init)
                });
                if (!isMounted) return;
                const files = response.data.files || [];
                setAvailableFiles(files);
                // Auto-select first file if available
                if (files.length > 0) {
                    setSelectedFile(prev => prev || files[0]);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Error loading files:', err);
                setError('שגיאה בטעינת רשימת הקבצים');
            } finally {
                if (isMounted) {
                    setIsLoadingFiles(false);
                }
            }
        };
        loadFiles();
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAgentCheck = async (agentType) => {
        if (!results || !results.answer) {
            setError('לא ניתן לבדוק ללא תשובה');
            return;
        }
        
        // Check if we have context or can build it from results
        const hasContext = results.context || (results.results && results.results.length > 0);
        if (!hasContext) {
            setError('לא ניתן לבדוק ללא הקשר - אנא נסה שוב את החיפוש');
            return;
        }

        setIsAnalyzing(true);
        setAgentAnalysis(null);
        setError(null);

        try {
            const endpoint = agentType === 'contradiction' 
                ? '/agent/contradiction' 
                : '/agent/risk';
            
            // Use query from state if not in results
            const queryToUse = results.query || query;
            
            // Build context from search results if context is empty
            let contextToUse = results.context;
            if (!contextToUse && results.results && results.results.length > 0) {
                // Reconstruct context from search results
                contextToUse = results.results.map((result, index) => {
                    const docText = result.document || result.text || '';
                    const filename = result.metadata?.filename || 'Unknown';
                    return `[Source ${index + 1} from ${filename}]:\n${docText}\n`;
                }).join('\n');
            }
            
            const response = await api.post(endpoint, {
                answer: results.answer,
                context: contextToUse || '',
                query: queryToUse
            }, {
                timeout: 30000  // 30 second timeout for agent checks
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

                <div className="research-stage-section">
                    <h3 className="stage-heading">שלב מחקר (חובה)</h3>
                    <p className="stage-hint">יש לבחור שלב לפני שליחת שאלה. מעבר שלבים: K → C → B → N → L</p>
                    <div className="stage-buttons">
                        {RESEARCH_STAGES.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                className={`stage-button ${researchStage === s.id ? 'active' : ''}`}
                                onClick={() => setResearchStage(s.id)}
                                title={s.desc}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    {researchStage && (
                        <span className="stage-desc">
                            {RESEARCH_STAGES.find((s) => s.id === researchStage)?.desc}
                        </span>
                    )}
                </div>

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
                        disabled={isSearching || !researchStage}
                        className={`search-button ${isSearching ? 'loading' : ''}`}
                    >
                        {isSearching ? (
                            <>
                                <span className="spinner"></span>
                                מחפש...
                            </>
                        ) : (
                            'חפש'
                        )}
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
                            disabled={isLoadingFiles}
                        >
                            {isLoadingFiles ? (
                                <option value="">טוען קבצים...</option>
                            ) : availableFiles.length === 0 ? (
                                <option value="">אין קבצים זמינים</option>
                            ) : (
                                availableFiles.map((filename, index) => (
                                    <option key={index} value={filename}>
                                        {filename}
                                    </option>
                                ))
                            )}
                        </select>
                        {isLoadingFiles && (
                            <span className="file-loading-spinner"></span>
                        )}
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
                        {results.blocked && (
                            <div className="blocked-message">
                                <h3>🚫 תשובה נחסמה</h3>
                                <div className="blocked-text">
                                    {results.block_reason || results.error || 'התשובה נחסמה על ידי המערכת'}
                                </div>
                                {results.state && (
                                    <div className="state-badge blocked-state">
                                        מצב: {results.state}
                                    </div>
                                )}
                            </div>
                        )}
                        {results.answer && !results.blocked && (
                            <div className="ai-answer">
                                {results.research_stage && (
                                    <div className="research-stage-badge">שלב: {results.research_stage}</div>
                                )}
                                <h3>🤖 תשובה חכמה (Doc Agent):</h3>
                                {results.warning && (
                                    <div className="warning-banner">
                                        ⚠️ {results.warning}
                                    </div>
                                )}
                                {results.state && (
                                    <div className={`state-badge state-${results.state.toLowerCase()}`}>
                                        מצב: {results.state}
                                    </div>
                                )}
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
                                        className={`agent-button contradiction-button ${isAnalyzing ? 'loading' : ''}`}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <span className="spinner"></span>
                                                בודק...
                                            </>
                                        ) : (
                                            '🔍 בדוק סתירות (Contradiction Agent)'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleAgentCheck('risk')}
                                        disabled={isAnalyzing}
                                        className={`agent-button risk-button ${isAnalyzing ? 'loading' : ''}`}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <span className="spinner"></span>
                                                בודק...
                                            </>
                                        ) : (
                                            '⚠️ זהה סיכונים (Risk Agent)'
                                        )}
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
