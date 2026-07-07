import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const urlObj = new URL(envUrl);
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        urlObj.hostname = window.location.hostname;
      }
    }
    return urlObj.toString().replace(/\/$/, '');
  } catch (e) {
    return envUrl;
  }
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if present and prevent browser caching
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Prevent caching on all requests
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    // Add cache-buster to GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors (especially 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if we receive an unauthorized response
      sessionStorage.removeItem('token');
      
      // Prevent infinite redirect loops if we are already on the login page
      if (!window.location.pathname.endsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
