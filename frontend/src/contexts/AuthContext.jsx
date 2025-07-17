import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loginService } from '../services/loginService';

// Create the context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    // Function to check if token is expired
    const isTokenExpired = (token) => {
        return loginService.isTokenExpired(token);
    };

    // Function to handle login
    const login = async (username, password) => {
        try {
            const userData = await loginService.authenticate(username, password);
            const { token: jwtToken, role, firstName, lastName, username: userName } = userData;

            // Save user session using login service
            loginService.saveUserSession(userData);

            // Update state
            setToken(jwtToken);
            setCurrentUser({ role, firstName, lastName, username: userName });
            setIsAuthenticated(true);
            setLoading(false);

            // Return the user data for further use
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error; // loginService already handles error formatting
        }
    };

    // Function to handle logout
    const logout = async () => {
        try {
            // Call backend logout endpoint if available
            await loginService.logout();
        } catch (error) {
            console.warn('Backend logout failed, continuing with local logout:', error);
        } finally {
            // Always clear local storage and state using login service
            loginService.clearUserSession();
            setToken(null);
            setCurrentUser(null);
            setIsAuthenticated(false);
        }
    };

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const storedToken = loginService.getStoredToken();
        const storedUserInfo = loginService.getStoredUserInfo();

        if (storedToken) {
            if (isTokenExpired(storedToken)) {
                // Token expired, clear storage and state
                logout();
            } else {
                // Token valid, restore user state
                setToken(storedToken);

                if (storedUserInfo) {
                    setCurrentUser(storedUserInfo);
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
                if (isTokenExpired(token)) {
                    clearInterval(checkInterval);
                    logout();
                }
            }, 60000); // Check every minute

            return () => clearInterval(checkInterval);
        }
    }, [token, isAuthenticated]);

    // Context value
    const value = {
        currentUser,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        isTokenExpired
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