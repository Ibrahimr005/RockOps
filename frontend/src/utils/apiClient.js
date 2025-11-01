// src/utils/apiClient.js
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// Request interceptor for adding token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, config: reqConfig } = error.response;

            // ✅ Skip login endpoint from global 401 handling
            if (status === 401 && !reqConfig.url.includes('/auth/authenticate')) {
                console.error('Authentication error: Please log in again');
                // Uncomment if you want to auto-logout on other 401s
                // localStorage.removeItem('token');
                // window.location = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
