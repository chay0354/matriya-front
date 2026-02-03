import React, { useState, useEffect } from 'react';
import './App.css';
import UploadTab from './components/UploadTab';
import SearchTab from './components/SearchTab';
import InfoTab from './components/InfoTab';
import LoginTab from './components/LoginTab';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

function App() {
    const [activeTab, setActiveTab] = useState('upload');
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
            // Verify token is still valid
            axios.get(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${storedToken}` }
            })
            .then(response => {
                setUser(response.data);
                setToken(storedToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            })
            .catch(() => {
                // Token invalid, clear storage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
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
        setToken(authToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    };

    const handleLogout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    const tabs = [
        { id: 'upload', label: 'העלאת מסמכים' },
        { id: 'search', label: 'חיפוש' },
        { id: 'info', label: 'מידע' }
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
                {activeTab === 'info' && <InfoTab />}
            </div>
        </div>
    );
}

export default App;
