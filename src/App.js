import React, { useState, useEffect } from 'react';
import './App.css';
import UploadTab from './components/UploadTab';
import SearchTab from './components/SearchTab';
import LoginTab from './components/LoginTab';
import AdminTab from './components/AdminTab';
import axios from 'axios';
import { API_BASE_URL } from './utils/api';

function App() {
    const [activeTab, setActiveTab] = useState('upload');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is already logged in (optimized)
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
            // Use stored user immediately for faster UI
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
            
            // Verify token in background (don't block UI)
            axios.get(`${API_BASE_URL}/auth/me`, {
                baseURL: API_BASE_URL,
                headers: { Authorization: `Bearer ${storedToken}` },
                timeout: 10000  // 10 second timeout
            })
            .then(response => {
                // Update user data if verification succeeds
                setUser(response.data);
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(response.data));
            })
            .catch((error) => {
                // Only clear storage on 401 (unauthorized), not on network errors
                if (error.response?.status === 401) {
                    // Token invalid, clear storage
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    delete axios.defaults.headers.common['Authorization'];
                } else {
                    // Network error or timeout - keep user logged in with stored data
                    console.warn('Token verification failed, but keeping user logged in:', error.message);
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleLogin = (userData, authToken) => {
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    const isAdmin = user && (user.is_admin || user.username === 'admin');
    
    const tabs = [
        { id: 'upload', label: 'העלאת מסמכים' },
        { id: 'search', label: 'חיפוש' },
        ...(isAdmin ? [{ id: 'admin', label: 'ניהול' }] : [])
    ];

    if (isLoading) {
        return (
            <div className="container">
                <div className="loading">טוען...</div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!user) {
        return (
            <div className="container">
                <header>
                    <h1>MATRIYA RAG System</h1>
                    <p className="subtitle">מערכת חיפוש חכמה במסמכים</p>
                </header>
                <LoginTab onLogin={handleLogin} />
            </div>
        );
    }

    return (
        <div className="container">
            <header>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>MATRIYA RAG System</h1>
                        <p className="subtitle">מערכת חיפוש חכמה במסמכים</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#c0c0e0', fontSize: '1.05em', fontWeight: '500' }}>
                            שלום, <span style={{ color: '#667eea', fontWeight: '700' }}>{user.full_name || user.username}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="logout-button"
                        >
                            התנתק
                        </button>
                    </div>
                </div>
            </header>

            <div className="tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="tab-content-wrapper">
                {activeTab === 'upload' && <UploadTab />}
                {activeTab === 'search' && <SearchTab />}
                {activeTab === 'admin' && <AdminTab />}
            </div>
        </div>
    );
}

export default App;
