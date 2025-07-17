// src/services/authService.js
import apiClient from '../utils/apiClient';
import { AUTH_ENDPOINTS } from '../config/api.config';

export const authService = {
    register: (registerData) => {
        return apiClient.post(AUTH_ENDPOINTS.REGISTER, registerData);
    },

    login: (loginData) => {
        return apiClient.post(AUTH_ENDPOINTS.LOGIN, loginData);
    },

    authenticate: (username, password) => {
        return apiClient.post(AUTH_ENDPOINTS.AUTHENTICATE, { username, password });
    },

    // Method to validate token
    validateToken: () => {
        return apiClient.get(AUTH_ENDPOINTS.BASE + '/validate');
    },

    // Method to refresh token
    refreshToken: (refreshToken) => {
        return apiClient.post(AUTH_ENDPOINTS.BASE + '/refresh', { refreshToken });
    },

    // Method to logout (if backend supports it)
    logout: () => {
        return apiClient.post(AUTH_ENDPOINTS.BASE + '/logout');
    }
}; 