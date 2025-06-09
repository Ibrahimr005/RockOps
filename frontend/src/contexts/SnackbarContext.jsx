import React, { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '../components/common/Snackbar/Snackbar.jsx';

// Create the Snackbar context
const SnackbarContext = createContext();

/**
 * Provider component for the Snackbar system
 */
export const SnackbarProvider = ({ children }) => {
    const [snackbarState, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000,
        persistent: false,
        actions: null
    });

    const showSnackbar = useCallback((message, type = 'success', duration = 3000, persistent = false, actions = null) => {
        setSnackbar({
            show: true,
            message,
            type,
            duration,
            persistent,
            actions
        });
    }, []);

    const hideSnackbar = useCallback(() => {
        setSnackbar(prev => ({
            ...prev,
            show: false
        }));
    }, []);

    // Convenience methods for different Snackbar types
    const showSuccess = useCallback((message, duration) =>
        showSnackbar(message, 'success', duration), [showSnackbar]);

    const showError = useCallback((message, duration) =>
        showSnackbar(message, 'error', duration), [showSnackbar]);

    const showInfo = useCallback((message, duration, persistent = false) =>
        showSnackbar(message, 'info', duration, persistent), [showSnackbar]);

    const showWarning = useCallback((message, duration, persistent = false) =>
        showSnackbar(message, 'warning', duration, persistent), [showSnackbar]);

    // New method for showing confirmation dialogs
    const showConfirmation = useCallback((message, onConfirm, onCancel) => {
        showSnackbar(
            message,
            'warning',
            0, // No auto-hide
            true, // Persistent
            {
                buttons: [
                    {
                        label: 'YES',
                        type: 'confirm',
                        onClick: () => {
                            if (onConfirm) onConfirm();
                            hideSnackbar();
                        }
                    },
                    {
                        label: 'NO',
                        type: 'cancel',
                        onClick: () => {
                            if (onCancel) onCancel();
                            hideSnackbar();
                        }
                    }
                ]
            }
        );
    }, [showSnackbar, hideSnackbar]);

    return (
        <SnackbarContext.Provider
            value={{
                showSnackbar,
                hideSnackbar,
                showSuccess,
                showError,
                showInfo,
                showWarning,
                showConfirmation
            }}
        >
            {children}
            <Snackbar
                show={snackbarState.show}
                message={snackbarState.message}
                type={snackbarState.type}
                duration={snackbarState.duration}
                persistent={snackbarState.persistent}
                actions={snackbarState.actions}
                onClose={hideSnackbar}
            />
        </SnackbarContext.Provider>
    );
};

/**
 * Hook to use the Snackbar context
 */
export const useSnackbar = () => {
    const context = useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbar must be used within a SnackbarProvider');
    }
    return context;
};
