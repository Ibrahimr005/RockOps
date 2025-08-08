import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService.js';

// Create the context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    // Function to handle login
    const login = async (username, password) => {
        try {
            const response = await authService.authenticate({ username, password });
            const userData = response.data;
            const { token: jwtToken, role, firstName, lastName, username: userName } = userData;

            // Save token to localStorage
            localStorage.setItem('token', jwtToken);

            // Save user info to localStorage for persistence
            const userInfo = { role, firstName, lastName, username: userName };
            localStorage.setItem('userInfo', JSON.stringify(userInfo));

            // Update state
            setToken(jwtToken);
            setCurrentUser(userInfo);
            setIsAuthenticated(true);
            setLoading(false);

            // Return the user data for further use
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Function to handle logout
    const logout = async () => {
        try {
            // Call server-side logout if available
            await authService.logout();
        } catch (error) {
            console.warn('Server logout failed, continuing with local logout:', error);
        } finally {
            // Always clear local storage and state
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            setToken(null);
            setCurrentUser(null);
            setIsAuthenticated(false);
        }
    };

    // Function to change password
    const changePassword = async (oldPassword, newPassword) => {
        try {
            const response = await authService.changePassword({ oldPassword, newPassword });
            return response;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    };

    // Function to request password reset
    const requestPasswordReset = async (email) => {
        try {
            const response = await authService.requestPasswordReset({ email });
            return response;
        } catch (error) {
            console.error('Password reset request error:', error);
            throw error;
        }
    };

    // Function to reset password
    const resetPassword = async (token, newPassword) => {
        try {
            const response = await authService.resetPassword({ token, newPassword });
            return response;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    // Function to refresh user data
    const refreshUserData = async () => {
        try {
            if (!token) return;

            const response = await authService.getCurrentUser();
            const userInfo = response.data;

            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            setCurrentUser(userInfo);

            return userInfo;
        } catch (error) {
            console.error('Error refreshing user data:', error);
            // If refresh fails, consider logging out
            logout();
            throw error;
        }
    };

    // Function to validate current session
    const validateSession = async () => {
        if (!token) return false;

        try {
            const response = await authService.validateToken();
            return response.data?.valid || false;
        } catch (error) {
            console.error('Session validation error:', error);
            logout();
            return false;
        }
    };

    // Utility functions exposed from authService
    const hasRole = (role) => {
        return authService.hasRole(token, role);
    };

    const hasAnyRole = (roles) => {
        return authService.hasAnyRole(token, roles);
    };

    const isTokenExpired = (tokenToCheck = token) => {
        return authService.isTokenExpired(tokenToCheck);
    };

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUserInfo = localStorage.getItem('userInfo');

        if (storedToken) {
            if (authService.isTokenExpired(storedToken)) {
                // Token expired, clear storage and state
                logout();
            } else {
                // Token valid, restore user state
                setToken(storedToken);

                if (storedUserInfo) {
                    try {
                        const userInfo = JSON.parse(storedUserInfo);
                        setCurrentUser(userInfo);
                    } catch (e) {
                        console.error('Error parsing stored user info:', e);
                    }
                }

                setIsAuthenticated(true);
            }
        }

        setLoading(false);
    }, []);

    // Set up interval to check token expiration
    useEffect(() => {
        if (token && isAuthenticated) {
            const checkInterval = setInterval(() => {
                if (authService.isTokenExpired(token)) {
                    clearInterval(checkInterval);
                    logout();
                }
            }, 60000); // Check every minute

            return () => clearInterval(checkInterval);
        }
    }, [token, isAuthenticated]);

    // Context value
    const value = {
        // State
        currentUser,
        token,
        isAuthenticated,
        loading,

        // Authentication methods
        login,
        logout,
        changePassword,
        requestPasswordReset,
        resetPassword,

        // User and session management
        refreshUserData,
        validateSession,

        // Utility methods
        hasRole,
        hasAnyRole,
        isTokenExpired,

    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};