/**
 * Management (lab) backend — same JWT as Matriya; maneger-back proxies auth to Matriya.
 */
import axios from 'axios';

function stripSlash(u) {
  return u ? String(u).replace(/\/$/, '') : '';
}

export function getManagementApiBaseUrl() {
  const raw = process.env.REACT_APP_MANAGEMENT_API_URL;
  return raw && String(raw).trim() ? stripSlash(String(raw).trim()) : '';
}

export function getManagementFrontBaseUrl() {
  const raw = process.env.REACT_APP_MANAGEMENT_FRONT_URL;
  return raw && String(raw).trim() ? stripSlash(String(raw).trim()) : '';
}

/** Axios instance to maneger-back with Matriya Bearer token. */
export function createManagementApiClient() {
  const baseURL = getManagementApiBaseUrl();
  if (!baseURL) return null;
  const client = axios.create({
    baseURL,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
  });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export function buildManagementLabUrl(projectId) {
  const front = getManagementFrontBaseUrl();
  if (!front || !projectId) return '';
  const token = localStorage.getItem('token');
  const path = `/project/${encodeURIComponent(projectId)}/section/lab`;
  const url = `${front}${path}`;
  if (!token) return url;
  return `${url}#matriya_token=${encodeURIComponent(token)}`;
}
