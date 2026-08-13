import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000/api`;

const api = axios.create({
    baseURL: apiBaseURL,
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('autocare_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
