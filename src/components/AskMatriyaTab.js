import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { formatBoldSegments } from '../utils/formatBold';
import AnswerEvidenceSection from './AnswerEvidenceSection';
import './AskMatriyaTab.css';

const ASK_CHAT_EVIDENCE_TITLE = 'מקורות מהמסמכים (ציטוטים)';
const ASK_CHAT_EVIDENCE_HINT = 'קטעים ששימשו כבסיס לתשובה — לשקיפות וביקורת.';

function AskMatriyaTab() {
    const [systemFiles, setSystemFiles] = useState([]);
    const [selectedFilenames, setSelectedFilenames] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [filesLoading, setFilesLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const filteredFiles = systemFiles.filter((f) =>
        f.toLowerCase().includes((searchQuery || '').trim().toLowerCase())
    );

    useEffect(() => {
        if (!dropdownOpen) return;
        searchInputRef.current?.focus();
    }, [dropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        let cancelled = false;
        setFilesLoading(true);
        api.get('/files/detail')
            .then((res) => {
                if (cancelled) return;
                const list = Array.isArray(res.data?.files) ? res.data.files : [];
                setSystemFiles(list.map((f) => f.filename));
            })
            .catch(() => {
                if (!cancelled) setSystemFiles([]);
            })
            .finally(() => {
                if (!cancelled) setFilesLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const toggleFile = (filename) => {
        setSelectedFilenames((prev) =>
            prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
        );
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;

        setError(null);
        setInput('');
        const userMessage = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMessage]);
        setSending(true);

        try {
            const res = await api.post(
                '/ask-matriya',
                {
                    message: text,
                    history: messages,
                    filenames: selectedFilenames.length > 0 ? selectedFilenames : undefined
                },
                { timeout: 90000 }
            );
            const reply = res.data?.reply ?? '';
            const sources = Array.isArray(res.data?.sources) ? res.data.sources : [];
            setMessages((prev) => [...prev, { role: 'assistant', content: reply, sources }]);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'שגיאה בשליחה';
            setError(msg);
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="ask-matriya-tab">
            <div className="ask-matriya-single card">
                <h2>שאל את מטריה</h2>
                <p className="ask-matriya-hint">
                    בחרו מסמך אחד או כמה מהמערכת — התשובות יתבססו על תוכנם. ללא בחירה, החיפוש כולל את כל המסמכים
                    הזמינים והמסונכרנים.
                </p>

                <div className="ask-matriya-file-section" ref={dropdownRef}>
                    <span className="ask-matriya-file-section-label">מסמכים במערכת:</span>
                    {filesLoading ? (
                        <div className="ask-matriya-loading-files">טוען...</div>
                    ) : systemFiles.length === 0 ? (
                        <div className="ask-matriya-no-files">אין מסמכים במערכת. העלו מסמכים בלשונית העלאת מסמכים קודם.</div>
                    ) : (
                        <div className="ask-matriya-dropdown">
                            <button
                                type="button"
                                className="ask-matriya-dropdown-trigger"
                                onClick={() => setDropdownOpen((o) => !o)}
                                aria-expanded={dropdownOpen}
                                aria-haspopup="listbox"
                            >
                                <span className="ask-matriya-dropdown-trigger-text">
                                    {selectedFilenames.length === 0
                                        ? 'בחרו מסמכים...'
                                        : selectedFilenames.length === 1
                                            ? selectedFilenames[0]
                                            : `${selectedFilenames.length} מסמכים נבחרו`}
                                </span>
                                <span className="ask-matriya-dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
                            </button>
                            {dropdownOpen && (
                                <div className="ask-matriya-dropdown-panel" role="listbox">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        className="ask-matriya-dropdown-search"
                                        placeholder="חיפוש מסמכים..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <div className="ask-matriya-dropdown-list">
                                        {filteredFiles.length === 0 ? (
                                            <div className="ask-matriya-dropdown-empty">אין התאמות</div>
                                        ) : (
                                            filteredFiles.map((filename) => (
                                                <button
                                                    key={filename}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selectedFilenames.includes(filename)}
                                                    className={`ask-matriya-dropdown-option ${selectedFilenames.includes(filename) ? 'selected' : ''}`}
                                                    onClick={() => toggleFile(filename)}
                                                >
                                                    <span className="ask-matriya-dropdown-option-check">
                                                        {selectedFilenames.includes(filename) ? '✓' : ''}
                                                    </span>
                                                    <span className="ask-matriya-dropdown-option-label" title={filename}>
                                                        {filename}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="ask-matriya-messages">
                    {messages.length === 0 && (
                        <div className="ask-matriya-placeholder">
                            כתבו שאלה למטה. אם בחרתם מסמכים למעלה, התשובה תתבסס עליהם.
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`ask-matriya-msg ask-matriya-msg-${msg.role}`}>
                            <div className="ask-matriya-msg-content">
                                {formatBoldSegments(msg.content || '').map((part, j) =>
                                    part.type === 'bold' ? <strong key={j}>{part.value}</strong> : part.value
                                )}
                            </div>
                            {msg.role === 'assistant' ? (
                                <AnswerEvidenceSection
                                    sources={msg.sources || []}
                                    title={ASK_CHAT_EVIDENCE_TITLE}
                                    hint={ASK_CHAT_EVIDENCE_HINT}
                                />
                            ) : null}
                        </div>
                    ))}
                    {sending && (
                        <div className="ask-matriya-msg ask-matriya-msg-assistant">
                            <div className="ask-matriya-msg-content ask-matriya-typing">מחפש תשובה...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {error && <div className="ask-matriya-error">{error}</div>}

                <div className="ask-matriya-input-row">
                    <textarea
                        className="ask-matriya-input"
                        placeholder="כתבו את השאלה..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        disabled={sending}
                    />
                    <button
                        type="button"
                        className="ask-matriya-send"
                        onClick={handleSend}
                        disabled={sending || !input.trim()}
                    >
                        שלח
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AskMatriyaTab;
