import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminTab.css';

function AdminTab() {
    const [files, setFiles] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('files'); // 'files' or 'users'
    const [deletingFile, setDeletingFile] = useState(null);
    const [savingPermissions, setSavingPermissions] = useState(false);

    useEffect(() => {
        loadFiles();
        loadUsers();
    }, []);

    const loadFiles = async () => {
        try {
            const response = await api.get('/admin/files', {
                timeout: 15000  // 15 second timeout (files list may need RAG service init)
            });
            setFiles(response.data.files || []);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'שגיאה בטעינת קבצים');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await api.get('/admin/users', {
                timeout: 10000  // 10 second timeout for user list
            });
            setUsers(response.data.users || []);
        } catch (err) {
            console.error('Error loading users:', err);
        }
    };

    const handleDeleteFile = async (filename) => {
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הקובץ "${filename}"?`)) {
            return;
        }

        setDeletingFile(filename);
        try {
            await api.delete(`/admin/files/${encodeURIComponent(filename)}`, {
                timeout: 5000
            });
            setFiles(files.filter(f => f !== filename));
            alert('הקובץ נמחק בהצלחה');
        } catch (err) {
            alert(err.response?.data?.detail || err.message || 'שגיאה במחיקת קובץ');
        } finally {
            setDeletingFile(null);
        }
    };

    const handleUserClick = async (user) => {
        setSelectedUser(user);
        try {
            const response = await api.get(`/admin/users/${user.id}/permissions`, {
                timeout: 5000  // 5 second timeout
            });
            setUserPermissions(response.data);
        } catch (err) {
            alert(err.response?.data?.detail || err.message || 'שגיאה בטעינת הרשאות');
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedUser || !userPermissions) return;

        setSavingPermissions(true);
        try {
            await api.post(`/admin/users/${selectedUser.id}/permissions`, {
                access_all_files: userPermissions.access_all_files,
                allowed_files: userPermissions.allowed_files
            }, {
                timeout: 5000
            });
            alert('הרשאות עודכנו בהצלחה');
        } catch (err) {
            alert(err.response?.data?.detail || err.message || 'שגיאה בשמירת הרשאות');
        } finally {
            setSavingPermissions(false);
        }
    };

    const handleToggleAccessAll = () => {
        setUserPermissions({
            ...userPermissions,
            access_all_files: !userPermissions.access_all_files,
            allowed_files: userPermissions.access_all_files ? [] : userPermissions.allowed_files
        });
    };

    const handleToggleFile = (filename) => {
        if (userPermissions.access_all_files) return;
        
        const currentFiles = userPermissions.allowed_files || [];
        if (currentFiles.includes(filename)) {
            setUserPermissions({
                ...userPermissions,
                allowed_files: currentFiles.filter(f => f !== filename)
            });
        } else {
            setUserPermissions({
                ...userPermissions,
                allowed_files: [...currentFiles, filename]
            });
        }
    };

    if (loading) {
        return (
            <div className="admin-tab">
                <div className="card">
                    <div className="loading">טוען...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-tab">
            <div className="card">
                <h2>ניהול מערכת - Admin</h2>
                
                <div className="admin-sections">
                    <button
                        className={`section-button ${activeSection === 'files' ? 'active' : ''}`}
                        onClick={() => setActiveSection('files')}
                    >
                        ניהול קבצים
                    </button>
                    <button
                        className={`section-button ${activeSection === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveSection('users')}
                    >
                        ניהול הרשאות משתמשים
                    </button>
                </div>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                {activeSection === 'files' && (
                    <div className="files-section">
                        <h3>כל הקבצים במאגר ({files.length})</h3>
                        {files.length === 0 ? (
                            <div className="empty-state">אין קבצים במאגר</div>
                        ) : (
                            <div className="files-list">
                                {files.map((filename, index) => (
                                    <div key={index} className="file-item">
                                        <span className="file-name">{filename}</span>
                                    <button
                                        className={`delete-button ${deletingFile === filename ? 'loading' : ''}`}
                                        onClick={() => handleDeleteFile(filename)}
                                        disabled={deletingFile === filename}
                                    >
                                        {deletingFile === filename ? (
                                            <>
                                                <span className="spinner"></span>
                                                מוחק...
                                            </>
                                        ) : (
                                            'מחק'
                                        )}
                                    </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'users' && (
                    <div className="users-section">
                        <div className="users-list-container">
                            <h3>משתמשים ({users.length})</h3>
                            <div className="users-list">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                                        onClick={() => handleUserClick(user)}
                                    >
                                        <div className="user-info">
                                            <strong>{user.username}</strong>
                                            {user.full_name && <span> - {user.full_name}</span>}
                                            {user.is_admin && <span className="admin-badge">Admin</span>}
                                        </div>
                                        <div className="user-email">{user.email}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedUser && userPermissions && (
                            <div className="permissions-panel">
                                <h3>הרשאות עבור: {selectedUser.username}</h3>
                                
                                <div className="permission-option">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={userPermissions.access_all_files}
                                            onChange={handleToggleAccessAll}
                                        />
                                        <span>גישה לכל הקבצים</span>
                                    </label>
                                </div>

                                {!userPermissions.access_all_files && (
                                    <div className="files-permissions">
                                        <h4>בחר קבצים מותרים:</h4>
                                        <div className="files-checkbox-list">
                                            {files.map((filename, index) => (
                                                <label key={index} className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={userPermissions.allowed_files?.includes(filename) || false}
                                                        onChange={() => handleToggleFile(filename)}
                                                    />
                                                    <span>{filename}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    className={`save-button ${savingPermissions ? 'loading' : ''}`}
                                    onClick={handleSavePermissions}
                                    disabled={savingPermissions}
                                >
                                    {savingPermissions ? (
                                        <>
                                            <span className="spinner"></span>
                                            שומר...
                                        </>
                                    ) : (
                                        'שמור הרשאות'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminTab;
