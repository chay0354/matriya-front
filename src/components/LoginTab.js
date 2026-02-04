import React, { useState } from 'react';
import api from '../utils/api';
import './LoginTab.css';

function LoginTab({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const endpoint = isLogin ? '/auth/login' : '/auth/signup';
        const payload = isLogin
            ? { username: formData.username, password: formData.password }
            : formData;

        try {
            const response = await api.post(endpoint, payload, {
                timeout: 10000  // 10 second timeout for auth requests
            });

            // Store token
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Notify parent component
            if (onLogin) {
                onLogin(response.data.user, response.data.access_token);
            }
        } catch (err) {
            // Log detailed error information to console
            console.error('Login/Signup Error:', {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message,
                endpoint: endpoint,
                url: err.config?.url
            });
            
            // Check for database connection errors
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || 'שגיאה בהתחברות';
            const errorText = err.response?.data?.error || err.response?.data?.detail || '';
            
            if (errorText.includes('Database') || errorText.includes('POSTGRES_URL') || errorText.includes('connection not available')) {
                console.error('🔴 DATABASE CONNECTION ERROR:', errorText);
                console.error('💡 SOLUTION: Set POSTGRES_URL in Vercel Dashboard → Settings → Environment Variables');
                console.error('   Use Supabase pooler connection: postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true');
            }
            
            if (err.response?.status === 500) {
                console.error('⚠️ Server Error (500): Check backend logs for details');
                if (errorText.includes('Database')) {
                    console.error('   This is likely a database connection issue. Verify POSTGRES_URL is set correctly.');
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-tab">
            <div className="card">
                <h2>{isLogin ? 'התחברות' : 'הרשמה'}</h2>
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>שם משתמש:</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label>אימייל:</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>שם מלא (אופציונלי):</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>סיסמה:</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="form-input"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`auth-button ${isLoading ? 'loading' : ''}`}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                מעבד...
                            </>
                        ) : (
                            isLogin ? 'התחבר' : 'הירשם'
                        )}
                    </button>
                </form>

                <div className="auth-switch">
                    {isLogin ? (
                        <p>
                            אין לך חשבון?{' '}
                            <button
                                type="button"
                                onClick={() => setIsLogin(false)}
                                className="link-button"
                            >
                                הירשם כאן
                            </button>
                        </p>
                    ) : (
                        <p>
                            יש לך כבר חשבון?{' '}
                            <button
                                type="button"
                                onClick={() => setIsLogin(true)}
                                className="link-button"
                            >
                                התחבר כאן
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LoginTab;
