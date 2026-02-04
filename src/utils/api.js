/**
 * API utility with authentication
 */
import axios from 'axios';

// Use environment variable for API URL (REQUIRED)
// Set REACT_APP_API_BASE_URL in .env file or Vercel environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://matriya-back.vercel.app';

if (!process.env.REACT_APP_API_BASE_URL) {
    console.warn('REACT_APP_API_BASE_URL is not set! Using default: https://matriya-back.vercel.app');
    console.warn('For local development, create a .env file with: REACT_APP_API_BASE_URL=http://localhost:8000');
    console.warn('For production, set it in Vercel Dashboard → Settings → Environment Variables');
}

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second default timeout (can be overridden per request)
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL };
