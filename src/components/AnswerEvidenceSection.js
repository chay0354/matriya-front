import React from 'react';
import './AnswerEvidenceSection.css';

/**
 * Shows file_search / RAG excerpts returned with an answer (filename + quote).
 * @param {{
 *  sources: { filename?: string, excerpt?: string, text?: string }[],
 *  title: string,
 *  hint?: string,
 *  collapsible?: boolean,
 *  defaultCollapsed?: boolean
 * }} props
 */
function AnswerEvidenceSection({ sources, title, hint, collapsible = false, defaultCollapsed = false }) {
    if (!Array.isArray(sources) || sources.length === 0) return null;
    const header = (
        <>
            <h4 className="matriya-evidence__title">{title}</h4>
            {hint ? <p className="matriya-evidence__hint">{hint}</p> : null}
        </>
    );
    const content = (
        <ul className="matriya-evidence__list">
            {sources.map((s, i) => {
                const label = s.document_name || s.filename || '—';
                const body = s.preview || s.excerpt || s.text || '';
                const key = s.source_id != null ? String(s.source_id) : `${label}-${i}`;
                return (
                    <li key={key} className="matriya-evidence__card">
                        <div className="matriya-evidence__file">{label}</div>
                        <blockquote className="matriya-evidence__quote">{body}</blockquote>
                    </li>
                );
            })}
        </ul>
    );
    if (collapsible) {
        return (
            <section className="matriya-evidence" aria-label={title}>
                <details className="matriya-evidence__details" open={!defaultCollapsed}>
                    <summary className="matriya-evidence__summary">
                        <span className="matriya-evidence__summary-text">{title}</span>
                        <span className="matriya-evidence__summary-count">{sources.length}</span>
                    </summary>
                    <div className="matriya-evidence__body">
                        {hint ? <p className="matriya-evidence__hint">{hint}</p> : null}
                        {content}
                    </div>
                </details>
            </section>
        );
    }
    return (
        <section className="matriya-evidence" aria-label={title}>
            {header}
            {content}
        </section>
    );
}

export default AnswerEvidenceSection;
