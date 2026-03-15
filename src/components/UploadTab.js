import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import './UploadTab.css';

const ACCEPT = '.pdf,.docx,.txt,.doc,.xlsx,.xls';
const ACCEPT_LIST = ['pdf', 'docx', 'txt', 'doc', 'xlsx', 'xls'];

function getFileType(filename) {
    if (!filename) return '—';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const labels = { pdf: 'PDF', docx: 'DOCX', doc: 'DOC', txt: 'TXT', xlsx: 'XLSX', xls: 'XLS' };
    return labels[ext] || ext.toUpperCase() || '—';
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return iso;
    }
}

function UploadTab() {
    const [fileList, setFileList] = useState([]);
    const [fileListLoading, setFileListLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [collectionInfo, setCollectionInfo] = useState(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const loadFileList = async () => {
        setFileListLoading(true);
        try {
            const res = await api.get('/files/detail');
            setFileList(Array.isArray(res.data?.files) ? res.data.files : []);
        } catch (_) {
            setFileList([]);
        } finally {
            setFileListLoading(false);
        }
    };

    const loadCollectionInfo = async () => {
        try {
            const res = await api.get('/collection/info');
            setCollectionInfo(res.data);
        } catch (_) {
            setCollectionInfo(null);
        }
    };

    useEffect(() => {
        loadFileList();
        loadCollectionInfo();
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (files.length === 1) uploadFile(files[0]);
            else uploadFiles(Array.from(files));
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files?.length > 0) {
            if (files.length === 1) uploadFile(files[0]);
            else uploadFiles(Array.from(files));
        }
        e.target.value = '';
    };

    const handleFolderSelect = (e) => {
        const files = e.target.files;
        if (files?.length > 0) {
            const supported = Array.from(files).filter(f => {
                const ext = (f.name.split('.').pop() || '').toLowerCase();
                return ACCEPT_LIST.includes(ext);
            });
            if (supported.length > 0) uploadFiles(supported);
            else setUploadResult({ type: 'error', message: 'לא נמצאו קבצים נתמכים בתיקייה (PDF, DOCX, TXT, DOC, XLSX, XLS)' });
        }
        e.target.value = '';
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);
        setUploadResult(null);
        try {
            const response = await api.post('/ingest/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (response.data.success) {
                setUploadResult({ type: 'success', message: 'העלאה הושלמה בהצלחה!', data: response.data.data });
                loadFileList();
                loadCollectionInfo();
            } else {
                setUploadResult({ type: 'error', message: response.data?.error || response.data?.detail || 'שגיאה בהעלאה' });
            }
        } catch (error) {
            setUploadResult({ type: 'error', message: error.response?.data?.error || error.response?.data?.detail || error.message || 'שגיאה בהעלאה' });
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFiles = async (files) => {
        setIsUploading(true);
        setUploadResult(null);
        let ok = 0, err = 0;
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await api.post('/ingest/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (response.data?.success) ok++;
                else err++;
            } catch (_) {
                err++;
            }
        }
        setIsUploading(false);
        setUploadResult({
            type: err === 0 ? 'success' : (ok === 0 ? 'error' : 'success'),
            message: err === 0 ? `${ok} קבצים הועלו בהצלחה` : ok === 0 ? `${err} העלאות נכשלו` : `הועלו ${ok} קבצים, ${err} נכשלו`
        });
        loadFileList();
        loadCollectionInfo();
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const openPreview = async (filename) => {
        setPreviewDoc({ filename, text: null });
        setPreviewLoading(true);
        try {
            const res = await api.get('/files/preview', { params: { filename } });
            setPreviewDoc({ filename, text: res.data?.text || '', metadata: res.data?.metadata });
        } catch (_) {
            setPreviewDoc(prev => ({ ...prev, text: '(לא ניתן לטעון תצוגה מקדימה)' }));
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => setPreviewDoc(null);

    const recentFiles = fileList.slice(0, 5);

    return (
        <div className="upload-tab">
            <div className="upload-layout">
                <div className="upload-main">
                    <div className="card">
                        <div className="upload-card-header">
                            <h2>העלאת מסמך חדש</h2>
                            <button type="button" className="folder-upload-btn" onClick={() => folderInputRef.current?.click()}>
                                📁 ייבוא תיקייה
                            </button>
                            <input ref={folderInputRef} type="file" webkitdirectory="true" directory="true" multiple style={{ display: 'none' }} onChange={handleFolderSelect} accept={ACCEPT} />
                        </div>
                        <div className="upload-actions">
                            <div
                                className={`upload-area ${isDragging ? 'dragover' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleFileSelect} multiple />
                                <div className="upload-placeholder">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <p>לחץ כאן או גרור קובץ להעלאה</p>
                                    <p className="file-types">PDF, DOCX, TXT, DOC, XLSX, XLS</p>
                                </div>
                            </div>
                        </div>

                        {isUploading && (
                            <div className="progress-bar">
                                <div className="progress-fill" />
                            </div>
                        )}

                        {uploadResult && (
                            <div className={`upload-result ${uploadResult.type}`}>
                                <strong>{uploadResult.type === 'success' ? '✓' : '✗'} {uploadResult.message}</strong>
                                {uploadResult.data && (
                                    <div style={{ marginTop: '10px' }}>
                                        <p>קובץ: {uploadResult.data.filename}</p>
                                        <p>מספר חלקים שנוצרו: {uploadResult.data.chunks_count}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="card documents-table-card">
                        <h2>מסמכים במערכת</h2>
                        {fileListLoading ? (
                            <div className="loading">טוען רשימה...</div>
                        ) : fileList.length === 0 ? (
                            <p className="empty-docs">אין עדיין מסמכים. העלה קבצים למעלה.</p>
                        ) : (
                            <div className="table-wrap">
                                <table className="documents-table">
                                    <thead>
                                        <tr>
                                            <th>שם מסמך</th>
                                            <th>סוג קובץ</th>
                                            <th>תאריך העלאה</th>
                                            <th>חלקים</th>
                                            <th>תצוגה מקדימה</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fileList.map((f) => (
                                            <tr key={f.filename}>
                                                <td className="doc-name">{f.filename}</td>
                                                <td>{getFileType(f.filename)}</td>
                                                <td>{formatDate(f.uploaded_at)}</td>
                                                <td>{f.chunks_count ?? '—'}</td>
                                                <td>
                                                    <button type="button" className="preview-btn" onClick={() => openPreview(f.filename)}>תצוגה מקדימה</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="upload-sidebar">
                    <div className="card sidebar-card">
                        <h3>סטטיסטיקה</h3>
                        {collectionInfo ? (
                            <ul className="stats-list">
                                <li>מסמכים במאגר: <strong>{collectionInfo.document_count ?? 0}</strong></li>
                                <li>קבצים ייחודיים: <strong>{fileList.length}</strong></li>
                            </ul>
                        ) : (
                            <p className="muted">טוען...</p>
                        )}
                    </div>
                    <div className="card sidebar-card">
                        <h3>מסמכים אחרונים</h3>
                        {recentFiles.length === 0 ? (
                            <p className="muted">אין מסמכים</p>
                        ) : (
                            <ul className="recent-list">
                                {recentFiles.map((f) => (
                                    <li key={f.filename} title={f.filename}>{f.filename}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="card sidebar-card">
                        <h3>פעילות אינדוקס</h3>
                        {uploadResult ? (
                            <p className={uploadResult.type}>{uploadResult.message}</p>
                        ) : (
                            <p className="muted">העלה קובץ או תיקייה כדי לראות פעילות</p>
                        )}
                    </div>
                </aside>
            </div>

            {previewDoc && (
                <div className="preview-overlay" onClick={closePreview} role="dialog" aria-modal="true">
                    <div className="preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="preview-header">
                            <h3>{previewDoc.filename}</h3>
                            <button type="button" className="preview-close" onClick={closePreview} aria-label="סגור">×</button>
                        </div>
                        <div className="preview-body">
                            {previewLoading ? (
                                <div className="loading">טוען...</div>
                            ) : (
                                <div className="preview-text">{previewDoc.text || 'אין תוכן'}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UploadTab;
