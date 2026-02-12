import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { webSocketService } from '../services/notification/webSocketService';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';
import NotificationToast from '../components/common/NotificationToast/NotificationToast';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { token, currentUser } = useAuth();
    const wsInitialized = useRef(false);
    const toastIdCounter = useRef(0);

    // Fetch initial unread count
    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await notificationService.getUnreadCount();
            const data = response.data;
            setUnreadCount(data.unreadCount || data.count || 0);
        } catch (error) {
            // Silently fail — count will update via WebSocket
        }
    }, []);

    // Initialize WebSocket connection for real-time notifications
    useEffect(() => {
        if (currentUser && token && !wsInitialized.current) {
            initializeWebSocket();
            wsInitialized.current = true;
        }

        return () => {
            if (wsInitialized.current) {
                webSocketService.disconnect();
                wsInitialized.current = false;
            }
        };
    }, [currentUser, token]);

    const initializeWebSocket = async () => {
        try {
            // Set up callback to handle incoming notifications
            webSocketService.onNotification((notifications) => {
                handleWebSocketNotifications(notifications);
            });

            // Set up unread count callback
            webSocketService.onUnreadCount((count) => {
                setUnreadCount(count);
            });

            // Set up connection status callback
            webSocketService.onConnectionStatus(setWsConnected);

            // Connect to WebSocket
            await webSocketService.connect(token);

            // Fetch initial unread count after connection
            fetchUnreadCount();

            console.log('✅ NotificationProvider: WebSocket connected');
        } catch (error) {
            console.error('❌ NotificationProvider: Failed to connect WebSocket:', error);
        }
    };

    const handleWebSocketNotifications = (notifications) => {
        // Filter out initial load (when user first connects, they get all their notifications)
        // We only want to show toasts for NEW notifications
        if (!Array.isArray(notifications)) return;

        // Only show toast for truly new notifications (not the initial batch)
        // We can detect this by checking if we're already showing toasts or if this is a single notification
        const isNewNotification = notifications.length === 1 || notifications.length <= 3;

        if (isNewNotification) {
            notifications.forEach(notification => {
                showToast({
                    type: mapNotificationType(notification.type),
                    title: notification.title,
                    message: notification.message,
                    action: notification.actionUrl ? {
                        label: 'View Details',
                        onClick: () => {
                            if (notification.actionUrl.startsWith('/')) {
                                window.location.href = notification.actionUrl;
                            } else {
                                window.open(notification.actionUrl, '_blank');
                            }
                        }
                    } : null,
                    timestamp: notification.createdAt,
                    duration: 6000 // Slightly longer for notifications from server
                });
            });

            // Re-fetch unread count after new notifications
            fetchUnreadCount();
        }
    };

    const mapNotificationType = (backendType) => {
        const typeMap = {
            'SUCCESS': 'success',
            'ERROR': 'error',
            'WARNING': 'warning',
            'INFO': 'info'
        };
        return typeMap[backendType] || 'info';
    };

    const showToast = useCallback(({
        type = 'info',
        title,
        message,
        duration = 5000,
        action,
        avatar,
        timestamp,
        persistent = false
    }) => {
        const id = `toast-${Date.now()}-${toastIdCounter.current++}`;

        const newToast = {
            id,
            type,
            title,
            message,
            duration,
            action,
            avatar,
            timestamp,
            persistent
        };

        setToasts(prevToasts => {
            // Limit to max 5 toasts at once
            const updatedToasts = [newToast, ...prevToasts].slice(0, 5);
            return updatedToasts;
        });

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // Convenience methods for different toast types
    const showSuccess = useCallback((title, message, options = {}) => {
        return showToast({ type: 'success', title, message, ...options });
    }, [showToast]);

    const showError = useCallback((title, message, options = {}) => {
        return showToast({ type: 'error', title, message, duration: 7000, ...options });
    }, [showToast]);

    const showWarning = useCallback((title, message, options = {}) => {
        return showToast({ type: 'warning', title, message, ...options });
    }, [showToast]);

    const showInfo = useCallback((title, message, options = {}) => {
        return showToast({ type: 'info', title, message, ...options });
    }, [showToast]);

    const value = {
        showToast,
        removeToast,
        clearAllToasts,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        wsConnected,
        toasts,
        unreadCount,
        refreshUnreadCount: fetchUnreadCount
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}

            {/* Toast Container */}
            <div className="notification-toast-container">
                {toasts.map(toast => (
                    <NotificationToast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;
