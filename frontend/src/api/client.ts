import axios from 'axios';

function isLoginEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.endsWith('/auth/login') || url.endsWith('/auth/admin/login');
}

export function shouldLogoutOn401(url?: string): boolean {
  return !isLoginEndpoint(url);
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !isLoginEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && shouldLogoutOn401(error.config?.url)) {
      localStorage.removeItem('token');
      window.location.href = '/view';
    }
    return Promise.reject(error);
  }
);

export default api;
