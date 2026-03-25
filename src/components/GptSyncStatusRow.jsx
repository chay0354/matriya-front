import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import api from '../utils/api';
import './GptSyncStatusRow.css';

/** Extensions eligible for cloud document sync (logical basename). */
const GPT_ELIGIBLE_RE = /\.(pdf|docx|doc|txt|xlsx|xls|pptx|csv|json|md|html|htm)$/i;

function hasEligibleFilenames(filenames) {
    if (!Array.isArray(filenames) || filenames.length === 0) return false;
    return filenames.some((n) => {
        const base = String(n || '').split('/').filter(Boolean).pop() || '';
        return base && GPT_ELIGIBLE_RE.test(base);
    });
}

function filterEligibleLogicalNames(names) {
    if (!Array.isArray(names) || names.length === 0) return [];
    return names.filter((n) => {
        const base = String(n || '').split('/').filter(Boolean).pop() || '';
        return base && GPT_ELIGIBLE_RE.test(base);
    });
}

/**
 * Cloud document sync status + actions (aligned with management RagTab: manual sync here; post-upload sync from parent).
 * @param {{
 *   filenames: string[],
 *   onSyncComplete?: () => void,
 *   onSyncingChange?: (syncing: boolean) => void,
 *   onStatusChange?: (st: object | null) => void,
 *   uploadSyncBusy?: boolean,
 *   className?: string
 * }} props
 */
const STATUS_REQUEST_MS = 120000;

function statusFetchErrorMessage(err) {
    if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
        return 'פג הזמן לחיבור לשירות המסמכים (לעיתים אחרי סנכרון או אתחול שרת). וודא ש־Matriya Back פועל, המתן רגע ונסה «רענון סטטוס».';
    }
    if (!err?.response) {
        return 'לא ניתן להתחבר ל־Matriya Back. בדקו את כתובת ה־API (REACT_APP_API_BASE_URL) ושהשרת רץ.';
    }
    const server = err.response?.data?.error || err.response?.data?.detail;
    if (server) return `שגיאת שרת: ${server}`;
    return 'לא ניתן לטעון סטטוס מסמכים. נסו «רענון סטטוס».';
}

const GptSyncStatusRow = forwardRef(function GptSyncStatusRow(
    {
        filenames = [],
        onSyncComplete,
        onSyncingChange,
        onStatusChange,
        uploadSyncBusy = false,
        className = ''
    },
    ref
) {
    const [st, setSt] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [syncHadError, setSyncHadError] = useState(false);
    const stRef = useRef(null);
    useEffect(() => {
        stRef.current = st;
    }, [st]);

    useEffect(() => {
        onStatusChange?.(st);
    }, [st, onStatusChange]);

    const refresh = useCallback(async (opts = {}) => {
        const silent = Boolean(opts.silent);
        if (!silent) {
            setStatusError(null);
            setStatusLoading(true);
        }
        const fetchOnce = () => api.get('/gpt-rag/status', { timeout: STATUS_REQUEST_MS });
        try {
            let res;
            try {
                res = await fetchOnce();
            } catch (e1) {
                const isTimeout =
                    e1?.code === 'ECONNABORTED' || String(e1?.message || '').toLowerCase().includes('timeout');
                if (isTimeout) {
                    await new Promise((r) => setTimeout(r, 2000));
                    res = await fetchOnce();
                } else {
                    throw e1;
                }
            }
            const data = res.data ?? null;
            setSt(data);
            stRef.current = data;
            return data;
        } catch (e) {
            if (!silent) {
                setSt(null);
                stRef.current = null;
                setStatusError(statusFetchErrorMessage(e));
                console.warn('[GptSyncStatusRow] /gpt-rag/status failed', e);
            }
            return null;
        } finally {
            if (!silent) setStatusLoading(false);
        }
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            refresh: () => refresh({ silent: false }),
            refreshSilent: () => refresh({ silent: true })
        }),
        [refresh]
    );

    useEffect(() => {
        refresh({ silent: false });
    }, [refresh]);

    useEffect(() => {
        refresh({ silent: true });
    }, [filenames.length, refresh]);

    useEffect(() => {
        onSyncingChange?.(syncing || uploadSyncBusy);
    }, [syncing, uploadSyncBusy, onSyncingChange]);

    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState === 'visible') refresh({ silent: false });
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, [refresh]);

    const runSync = useCallback(
        async (opts) => {
            const only = opts && Array.isArray(opts.only_logical_names) ? opts.only_logical_names : null;
            const body =
                only && only.length > 0
                    ? { only_logical_names: only.map((x) => String(x || '').trim()).filter(Boolean) }
                    : {};
            setSyncing(true);
            setSyncHadError(false);
            try {
                const res = await api.post('/gpt-rag/sync', body, { timeout: 300000 });
                await refresh({ silent: true });
                onSyncComplete?.();
                if (res.data?.indexing_pending) await refresh({ silent: true });
            } catch (e) {
                setSyncHadError(true);
                console.warn('[GptSyncStatusRow]', e);
            } finally {
                setSyncing(false);
            }
        },
        [refresh, onSyncComplete]
    );

    const hasAnyFile = filenames.length > 0;
    const hasEligible = hasEligibleFilenames(filenames);

    let dotColor = 'var(--matriya-border, #ccc)';
    let label = 'בודק חיבור לשירות המסמכים…';
    let hintId = 'gpt-sync-status-hint';
    let extraWarn = null;

    if (statusLoading) {
        dotColor = 'var(--matriya-muted, #6b7280)';
        label = 'בודק חיבור לשירות המסמכים…';
    } else if (statusError) {
        dotColor = 'var(--matriya-error, #c0392b)';
        label = statusError;
    } else if (!st) {
        dotColor = 'var(--matriya-error, #c0392b)';
        label = 'לא התקבל מידע סטטוס מהשרת. נסו «רענון סטטוס».';
    } else if (st) {
        if (!st.openai) {
            dotColor = 'var(--matriya-error, #c0392b)';
            label = 'חיפוש המסמכים בענן לא מוגדר. פנה למנהל המערכת.';
        } else if (syncing || uploadSyncBusy) {
            dotColor = 'var(--matriya-accent, #166534)';
            label = 'מסנכרן....';
        } else if (st.vector_store_id) {
            dotColor = 'var(--matriya-success, #166534)';
            label = 'מסונכרן';
            if (st.warning) {
                extraWarn = 'לא ניתן לאמת את מאגר המסמכים. נסה «רענון סטטוס» או «סנכרון מחדש».';
            }
        } else if (!hasEligible) {
            dotColor = 'var(--matriya-muted, #6b7280)';
            if (!hasAnyFile) {
                label = 'אין מסמכים לאינדוקס — העלו קבצים ואז סנכרנו.';
            } else {
                label = 'אין מסמכים בפורמט נתמך לסנכרון (PDF, Word, Excel, טקסט וכו׳).';
            }
        } else if (syncHadError) {
            dotColor = 'var(--matriya-error, #c0392b)';
            label = 'הסנכרון נכשל. בדקו את השרת או נסו שוב.';
        } else if (!st.use_openai_file_search) {
            dotColor = 'var(--matriya-muted, #6b7280)';
            label = 'חיפוש מסמכים בענן מושבת בהגדרות השרת. פנה למנהל המערכת.';
        } else {
            dotColor = 'var(--matriya-accent, #166534)';
            label = 'ממתין לסנכרון…';
        }
    }

    const uiBusy = syncing || uploadSyncBusy || statusLoading;
    const showResync =
        st?.openai && st?.use_openai_file_search && Boolean(st?.vector_store_id) && !uiBusy;
    const showRetry =
        st?.openai &&
        st?.use_openai_file_search &&
        !st?.vector_store_id &&
        !uiBusy &&
        hasEligible &&
        syncHadError;
    const showInitialSync =
        st?.openai &&
        st?.use_openai_file_search &&
        !st?.vector_store_id &&
        !uiBusy &&
        hasEligible &&
        !syncHadError;

    return (
        <div className={`gpt-sync-status-row ${className}`.trim()} role="region" aria-label="סטטוס סנכרון מסמכים">
            <div className="gpt-sync-status-row__inner">
                <span className="gpt-sync-status-row__dot" style={{ background: dotColor }} aria-hidden />
                <span id={hintId} className="gpt-sync-status-row__label">
                    {label}
                    {extraWarn ? <span className="gpt-sync-status-row__warn"> {extraWarn}</span> : null}
                </span>
                {showResync && (
                    <button
                        type="button"
                        className="gpt-sync-status-row__btn"
                        disabled={!hasEligible}
                        onClick={() => runSync()}
                    >
                        סנכרון מחדש
                    </button>
                )}
                {showRetry && (
                    <button
                        type="button"
                        className="gpt-sync-status-row__btn"
                        onClick={() => {
                            setSyncHadError(false);
                            runSync();
                        }}
                    >
                        נסה שוב
                    </button>
                )}
                {showInitialSync && (
                    <button
                        type="button"
                        className="gpt-sync-status-row__btn gpt-sync-status-row__btn--primary"
                        disabled={!hasEligible}
                        onClick={() => runSync()}
                    >
                        סנכרון
                    </button>
                )}
                <button
                    type="button"
                    className="gpt-sync-status-row__btn"
                    disabled={syncing || uploadSyncBusy}
                    onClick={() => refresh({ silent: false })}
                >
                    רענון סטטוס
                </button>
            </div>
        </div>
    );
});

GptSyncStatusRow.displayName = 'GptSyncStatusRow';

export default GptSyncStatusRow;
export { hasEligibleFilenames, GPT_ELIGIBLE_RE, filterEligibleLogicalNames };
