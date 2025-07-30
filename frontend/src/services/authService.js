// src/services/authService.js
import apiClient from '../utils/apiClient.js';
import { AUTH_ENDPOINTS } from '../config/api.config.js';

export const authService = {
    // Register new user
    register: (registerData) => {
        return apiClient.post(AUTH_ENDPOINTS.REGISTER, registerData);
    },

    // Authenticate user with username and password
    authenticate: (loginData) => {
        return apiClient.post(AUTH_ENDPOINTS.AUTHENTICATE, loginData);
    },

    // Login (alias for authenticate for consistency)
    login: (loginData) => {
        return apiClient.post(AUTH_ENDPOINTS.LOGIN, loginData);
    },

    // Validate current token
    validateToken: () => {
        return apiClient.get(AUTH_ENDPOINTS.VALIDATE);
    },

    // Refresh token
    refreshToken: (refreshTokenData) => {
        return apiClient.post(AUTH_ENDPOINTS.REFRESH, refreshTokenData);
    },

    // Get current user profile
    getCurrentUser: () => {
        return apiClient.get(AUTH_ENDPOINTS.PROFILE);
    },

    // Logout
    logout: () => {
        return apiClient.post(AUTH_ENDPOINTS.LOGOUT);
    },

    // Change password
    changePassword: (passwordData) => {
        return apiClient.post(AUTH_ENDPOINTS.CHANGE_PASSWORD, passwordData);
    },

    // Request password reset
    requestPasswordReset: (emailData) => {
        return apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, emailData);
    },

    // Reset password with token
    resetPassword: (resetData) => {
        return apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, resetData);
    },

    // Utility functions
    isTokenExpired: (token) => {
        if (!token) return true;

        try {
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));

            if (!decodedPayload.exp) return false;

            return decodedPayload.exp * 1000 < Date.now();
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    },

    getTokenPayload: (token) => {
        if (!token) return null;

        try {
            const payload = token.split('.')[1];
            return JSON.parse(atob(payload));
        } catch (error) {
            console.error('Error parsing token payload:', error);
            return null;
        }
    },

    getUserRoleFromToken: (token) => {
        const payload = authService.getTokenPayload(token);
        return payload?.role || null;
    },

    hasRole: (token, role) => {
        const userRole = authService.getUserRoleFromToken(token);
        return userRole === role;
    },

    hasAnyRole: (token, roles) => {
        const userRole = authService.getUserRoleFromToken(token);
        return roles.includes(userRole);
    }
};