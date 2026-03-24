import React, { useState, useEffect, useCallback } from 'react';
import {
  createManagementApiClient,
  getManagementApiBaseUrl,
  getManagementFrontBaseUrl,
  buildManagementLabUrl
} from '../utils/managementApi';
import './ManagementLabTab.css';

function ManagementLabTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('matriya_management_lab_project_id') || '');
  const [iframeKey, setIframeKey] = useState(0);

  const apiBase = getManagementApiBaseUrl();
  const frontBase = getManagementFrontBaseUrl();

  const loadProjects = useCallback(async () => {
    const client = createManagementApiClient();
    if (!client) {
      setError('לא הוגדר כתובת API למערכת הניהול (REACT_APP_MANAGEMENT_API_URL).');
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get('/api/projects');
      setProjects(data.projects || []);
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        'לא ניתן לטעון פרויקטים. ודא שאתה מחובר ל־Matriya וש־CORS במערכת הניהול מאפשר את המקור הזה.';
      setError(msg);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedId) localStorage.setItem('matriya_management_lab_project_id', selectedId);
  }, [selectedId]);

  const labSrc = selectedId ? buildManagementLabUrl(selectedId) : '';

  const openInNewWindow = () => {
    if (!labSrc) return;
    window.open(labSrc, '_blank', 'noopener,noreferrer');
  };

  const reloadIframe = () => setIframeKey((k) => k + 1);

  if (!apiBase || !frontBase) {
    return (
      <div className="management-lab-tab card-block">
        <h2 className="management-lab-title">מעבדה — מערכת ניהול</h2>
        <p className="management-lab-muted">
          כדי לשלב את המעבדה, הגדר משתני סביבה בזמן הבנייה (Vercel / <code>.env</code>):
        </p>
        <ul className="management-lab-list">
          <li>
            <code>REACT_APP_MANAGEMENT_API_URL</code> — כתובת שרת הניהול (למשל <code>https://manegment-back.vercel.app</code>)
          </li>
          <li>
            <code>REACT_APP_MANAGEMENT_FRONT_URL</code> — כתובת ממשק הניהול (למשל <code>https://manegment-front.vercel.app</code>)
          </li>
        </ul>
        <p className="management-lab-muted">
          אותו משתמש וסיסמה כמו ב־Matriya — שרת הניהול משתמש באותה התחברות.
        </p>
      </div>
    );
  }

  return (
    <div className="management-lab-tab">
      <div className="management-lab-toolbar card-block">
        <h2 className="management-lab-title">מעבדה — מערכת ניהול</h2>
        <p className="management-lab-desc">
          בחרו פרויקט — תוצג כאן אותה מעבדה כמו בנתיב: ניהול → פרויקט → מעבדה.
        </p>
        {error && <p className="management-lab-error">{error}</p>}
        <div className="management-lab-row">
          <label htmlFor="management-lab-project">פרויקט</label>
          <select
            id="management-lab-project"
            className="management-lab-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading}
          >
            <option value="">— בחרו פרויקט —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.id}
              </option>
            ))}
          </select>
          <button type="button" className="management-lab-btn secondary" onClick={loadProjects} disabled={loading}>
            {loading ? 'טוען…' : 'רענן רשימה'}
          </button>
          <button type="button" className="management-lab-btn secondary" onClick={reloadIframe} disabled={!selectedId}>
            רענן מסגרת
          </button>
          <button type="button" className="management-lab-btn" onClick={openInNewWindow} disabled={!selectedId}>
            פתח בחלון חדש
          </button>
        </div>
      </div>

      {selectedId && labSrc ? (
        <div className="management-lab-frame-wrap">
          <iframe
            key={iframeKey}
            title="מעבדת ניהול"
            className="management-lab-iframe"
            src={labSrc}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
          />
        </div>
      ) : (
        <div className="management-lab-placeholder card-block">
          <p>בחרו פרויקט כדי לטעון את המעבדה.</p>
        </div>
      )}
    </div>
  );
}

export default ManagementLabTab;
