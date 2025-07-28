// src/services/loginService.js
import { authService } from './authService';

class LoginService {
    /**
     * Authenticate user with username and password
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data with token and profile information
     */
    async authenticate(username, password) {
        try {
            const response = await authService.authenticate(username, password);
            return response.data;
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Registration response
     */
    async register(userData) {
        try {
            const response = await authService.register(userData);
            return response.data;
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    /**
     * Validate current token
     * @returns {Promise<boolean>} Whether token is valid
     */
    async validateToken() {
        try {
            const response = await authService.validateToken();
            return response.data.valid;
        } catch (error) {
            console.warn('Token validation failed:', error);
            return false;
        }
    }

    /**
     * Refresh authentication token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object>} New token data
     */
    async refreshToken(refreshToken) {
        try {
            const response = await authService.refreshToken(refreshToken);
            return response.data;
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    /**
     * Logout user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            await authService.logout();
        } catch (error) {
            console.warn('Backend logout failed:', error);
        }
    }

    /**
     * Save user session to localStorage
     * @param {Object} userData - User data including token
     */
    saveUserSession(userData) {
        const { token, ...userInfo } = userData;
        
        if (token) {
            localStorage.setItem('token', token);
        }
        
        if (userInfo) {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
    }

    /**
     * Clear user session from localStorage
     */
    clearUserSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
    }

    /**
     * Get stored token from localStorage
     * @returns {string|null} Stored token or null
     */
    getStoredToken() {
        return localStorage.getItem('token');
    }

    /**
     * Get stored user info from localStorage
     * @returns {Object|null} Stored user info or null
     */
    getStoredUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token to check
     * @returns {boolean} Whether token is expired
     */
    isTokenExpired(token) {
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
    }

    /**
     * Get token expiration time
     * @param {string} token - JWT token
     * @returns {Date|null} Expiration date or null
     */
    getTokenExpiration(token) {
        if (!token) return null;

        try {
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));

            if (!decodedPayload.exp) return null;

            return new Date(decodedPayload.exp * 1000);
        } catch (error) {
            console.error('Error getting token expiration:', error);
            return null;
        }
    }

    /**
     * Handle authentication errors
     * @param {Error} error - Error object
     * @throws {Error} Formatted error message
     */
    handleAuthError(error) {
        let errorMessage = 'Authentication failed';

        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 401:
                    errorMessage = data?.message || 'Invalid credentials';
                    break;
                case 403:
                    errorMessage = data?.message || 'Access denied';
                    break;
                case 404:
                    errorMessage = data?.message || 'Authentication service not found';
                    break;
                case 500:
                    errorMessage = data?.message || 'Server error occurred';
                    break;
                default:
                    errorMessage = data?.message || `Authentication failed (${status})`;
            }
        } else if (error.request) {
            // Network error
            errorMessage = 'Network error. Please check your connection.';
        } else {
            // Other errors
            errorMessage = error.message || 'Authentication failed';
        }

        throw new Error(errorMessage);
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Whether user is authenticated
     */
    isAuthenticated() {
        const token = this.getStoredToken();
        return token && !this.isTokenExpired(token);
    }

    /**
     * Get user role from stored session
     * @returns {string|null} User role or null
     */
    getUserRole() {
        const userInfo = this.getStoredUserInfo();
        return userInfo?.role || null;
    }

    /**
     * Check if user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} Whether user has the role
     */
    hasRole(role) {
        const userRole = this.getUserRole();
        return userRole === role;
    }

    /**
     * Check if user has any of the specified roles
     * @param {string[]} roles - Roles to check
     * @returns {boolean} Whether user has any of the roles
     */
    hasAnyRole(roles) {
        const userRole = this.getUserRole();
        return roles.includes(userRole);
    }
}

// Export singleton instance
export const loginService = new LoginService();
export default loginService; 