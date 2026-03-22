import React from 'react';
import './AnswerEvidenceSection.css';

/**
 * Shows file_search / RAG excerpts returned with an answer (filename + quote).
 * @param {{ sources: { filename?: string, excerpt?: string, text?: string }[], title: string, hint?: string }} props
 */
function AnswerEvidenceSection({ sources, title, hint }) {
    if (!Array.isArray(sources) || sources.length === 0) return null;
    return (
        <section className="matriya-evidence" aria-label={title}>
            <h4 className="matriya-evidence__title">{title}</h4>
            {hint ? <p className="matriya-evidence__hint">{hint}</p> : null}
            <ul className="matriya-evidence__list">
                {sources.map((s, i) => {
                    const body = s.excerpt || s.text || '';
                    return (
                        <li key={`${s.filename}-${i}`} className="matriya-evidence__card">
                            <div className="matriya-evidence__file">{s.filename || '—'}</div>
                            <blockquote className="matriya-evidence__quote">{body}</blockquote>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

export default AnswerEvidenceSection;
