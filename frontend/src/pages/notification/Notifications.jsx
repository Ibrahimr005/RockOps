import React, { useState, useEffect, useRef } from 'react';
import {
    FaBell,
    FaCheck,
    FaTimes,
    FaTrash,
    FaFilter,
    FaEye,
    FaEyeSlash,
    FaExternalLinkAlt,
    FaSearch,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaInfoCircle,
    FaCheckDouble,
    FaChevronLeft,
    FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext.jsx';
import IntroCard from '../../components/common/IntroCard/IntroCard.jsx';
import Snackbar from '../../components/common/Snackbar/Snackbar.jsx';
import ConfirmationDialog from '../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import notificationLight from '../../assets/imgs/notificationlight.png';
import notificationDark from '../../assets/imgs/notificationdark.png';
import './Notifications.scss';
import { notificationService } from '../../services/notificationService';

const Notifications = () => {
    const { currentUser, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [currentPage, setCurrentPage] = useState(1);
    const [notificationsPerPage] = useState(3); // You can make this configurable
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null,
        isLoading: false
    });

    const stompClientRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [forceUpdate, setForceUpdate] = useState(0);



    useEffect(() => {
        if (currentUser && token) {
            fetchNotifications();
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [currentUser, token]);

    // Reset to first page when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationService.getAll();
            const data = response.data;
            setNotifications(data);
            console.log('Notifications fetched:', data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            showSnackbar('Failed to fetch notifications', 'error');
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = async () => {
        if (stompClientRef.current?.connected) {
            return;
        }

        setConnectionStatus('connecting');

        try {
            const { Client } = await import('@stomp/stompjs');

            const stompClient = new Client({
                brokerURL: notificationService.getWebSocketUrl(),
                connectHeaders: {
                    'Authorization': `Bearer ${token}`
                },
                debug: (str) => {
                    console.log('STOMP Debug:', str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            stompClient.onConnect = (frame) => {
                console.log('WebSocket Connected:', frame);
                setConnectionStatus('connected');

                stompClient.subscribe('/user/queue/notifications', (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('Received notification:', notification);
                    handleNewNotification(notification);
                });

// 🎯 ADD THIS TEST SUBSCRIPTION
                stompClient.subscribe(`/user/${currentUser.id}/queue/notifications`, (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('🎯 Received notification via direct user subscription:', notification);
                    handleNewNotification(notification);
                });

                stompClient.subscribe('/user/queue/unread-count', (message) => {
                    const response = JSON.parse(message.body);
                    console.log('Unread count update:', response);
                });

                stompClient.subscribe('/user/queue/responses', (message) => {
                    const response = JSON.parse(message.body);
                    console.log('Operation response:', response);
                    if (response.type === 'SUCCESS') {
                        showSnackbar(response.message, 'success');
                    } else if (response.type === 'ERROR') {
                        showSnackbar(response.message, 'error');
                    }
                });

                stompClient.subscribe('/user/queue/auth-response', (message) => {
                    const response = JSON.parse(message.body);
                    console.log('Auth response:', response);
                    // Removed the snackbar for authentication success
                    // Authentication happens silently in the background
                });

                stompClient.subscribe('/topic/notifications', (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('Received broadcast notification:', notification);
                    handleNewNotification(notification);
                });

                stompClient.publish({
                    destination: '/app/authenticate',
                    body: JSON.stringify({
                        token: token,
                        userId: currentUser.id,
                        sessionId: Date.now().toString()
                    })
                });
            };

            stompClient.onStompError = (frame) => {
                console.error('STOMP Error:', frame);
                setConnectionStatus('disconnected');
                showSnackbar('Connection error. Attempting to reconnect...', 'error');
                scheduleReconnect();
            };

            stompClient.onDisconnect = () => {
                console.log('WebSocket Disconnected');
                setConnectionStatus('disconnected');
                scheduleReconnect();
            };

            stompClient.onWebSocketError = (error) => {
                console.error('WebSocket Error:', error);
                setConnectionStatus('disconnected');
                showSnackbar('WebSocket connection failed', 'error');
                scheduleReconnect();
            };

            stompClient.activate();
            stompClientRef.current = stompClient;

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            setConnectionStatus('disconnected');
            showSnackbar('Failed to connect to notification service', 'error');
            scheduleReconnect();
        }
    };

    const scheduleReconnect = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
        }, 5000);
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
            stompClientRef.current = null;
        }
        setConnectionStatus('disconnected');
    };

    const handleNewNotification = React.useCallback((notification) => {
        console.log('🎯 handleNewNotification called with:', notification);

        setNotifications(prev => {
            console.log('🎯 Previous notifications count:', prev.length);
            const exists = prev.some(n => n.id === notification.id);
            if (exists) {
                console.log('⚠️ Notification already exists, skipping:', notification.id);
                return prev;
            }
            console.log('✅ Adding new notification to state');
            const newNotifications = [notification, ...prev];
            console.log('🎯 New notifications count:', newNotifications.length);
            return newNotifications;
        });

        // Force re-render (this is now INSIDE the function, so it's safe)
        setForceUpdate(prev => prev + 1);

        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id
            });
        }
    }, []);

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }, []);

    const showSnackbar = (message, type = 'success') => {
        setSnackbar({
            show: true,
            message,
            type
        });
    };

    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    // Filter notifications
    const filteredNotifications = notifications.filter(notification => {
        const matchesFilter = filter === 'all' ||
            (filter === 'unread' && !notification.read) ||
            (filter === 'read' && notification.read);

        const matchesSearch = searchTerm === '' ||
            notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.message.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
    const startIndex = (currentPage - 1) * notificationsPerPage;
    const endIndex = startIndex + notificationsPerPage;
    const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const toggleReadStatus = async (notificationId) => {
        if (!stompClientRef.current?.connected) {
            showSnackbar('Not connected to notification service', 'error');
            return;
        }

        try {
            stompClientRef.current.publish({
                destination: '/app/markAsRead',
                body: JSON.stringify({
                    notificationId: notificationId,
                    userId: currentUser.id
                })
            });

            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: !notification.read }
                        : notification
                )
            );
        } catch (error) {
            console.error('Failed to update notification:', error);
            showSnackbar('Failed to update notification', 'error');
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await notificationService.delete(notificationId);
            showSnackbar('Notification deleted successfully', 'success');
            fetchNotifications(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete notification:', error);
            showSnackbar('Failed to delete notification', 'error');
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            let successCount = 0;
            let errorCount = 0;

            // Mark each unread notification as read
            for (const notification of notifications.filter(n => !n.read)) {
                try {
                    await notificationService.markAsRead(notification.id);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to mark notification ${notification.id} as read:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                showSnackbar(`Marked ${successCount} notifications as read`, 'success');
                fetchNotifications(); // Refresh the list
            }

            if (errorCount > 0) {
                showSnackbar(`Failed to mark ${errorCount} notifications as read`, 'error');
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            showSnackbar('Failed to mark all notifications as read', 'error');
        } finally {
            setLoading(false);
        }
    };

    const clearAllNotifications = async () => {
        try {
            setLoading(true);
            let successCount = 0;
            let errorCount = 0;

            // Delete each notification individually
            for (const notification of notifications) {
                try {
                    await notificationService.delete(notification.id);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to delete notification ${notification.id}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                showSnackbar(`Deleted ${successCount} notifications`, 'success');
                fetchNotifications(); // Refresh the list
            }

            if (errorCount > 0) {
                showSnackbar(`Failed to delete ${errorCount} notifications`, 'error');
            }
        } catch (error) {
            console.error('Failed to clear all notifications:', error);
            showSnackbar('Failed to clear all notifications', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString();
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'SUCCESS':
                return { icon: <FaCheckCircle />, color: 'success' };
            case 'WARNING':
                return { icon: <FaExclamationTriangle />, color: 'warning' };
            case 'ERROR':
                return { icon: <FaTimesCircle />, color: 'error' };
            case 'INFO':
            default:
                return { icon: <FaInfoCircle />, color: 'info' };
        }
    };

    const getNotificationStats = () => {
        const unreadCount = notifications.filter(n => !n.read).length;
        const totalCount = notifications.length;

        return [
            { value: totalCount.toString(), label: "Total Notifications" },
        ];
    };

    return (
        <div className="notifications-page">
            <div className={`connection-status ${connectionStatus}`}>
                <div className="status-indicator">
                    <div className="status-dot"></div>
                    <span className="status-text">
                        {connectionStatus === 'connected' && 'Connected'}
                        {connectionStatus === 'connecting' && 'Connecting...'}
                        {connectionStatus === 'disconnected' && 'Disconnected'}
                    </span>
                </div>
            </div>

            <IntroCard
                title="Notifications"
                label="NOTIFICATION CENTER"
                lightModeImage={notificationLight}
                darkModeImage={notificationDark}
                stats={getNotificationStats()}
                onInfoClick={() => console.log('Notification info clicked')}
            />

            {/* New Cleaner Toolbar */}
            <div className="notifications-toolbar-clean">
                {/* Search Bar */}
                <div className="search-bar">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="clear-search"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="filter-pills">
                    {[
                        { key: 'all', label: 'All', count: notifications.length },
                        { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
                        { key: 'read', label: 'Read', count: notifications.filter(n => n.read).length }
                    ].map((pill) => (
                        <button
                            key={pill.key}
                            onClick={() => setFilter(pill.key)}
                            className={`filter-pill ${filter === pill.key ? 'active' : ''}`}
                        >
                            {pill.label} <span className="count">{pill.count}</span>
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="toolbar-actions">
                    <button
                        onClick={markAllAsRead}
                        disabled={filteredNotifications.filter(n => !n.read).length === 0 || connectionStatus !== 'connected'}
                        className="action-button mark-read"
                    >
                        <FaCheckDouble />
                        Mark All Read
                    </button>
                    <button
                        onClick={clearAllNotifications}
                        disabled={filteredNotifications.length === 0}
                        className="action-button clear-all"
                    >
                        <FaTrash />
                        Clear All
                    </button>
                </div>
            </div>

            <div className="notifications-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <FaBell className="empty-icon" />
                        <h3>
                            {filter === 'all'
                                ? "No notifications yet"
                                : filter === 'unread'
                                    ? "No unread notifications"
                                    : "No read notifications"}
                        </h3>
                        <p>
                            {filter === 'all'
                                ? "You'll see notifications here when you receive them"
                                : filter === 'unread'
                                    ? "All caught up! You have no unread notifications"
                                    : "You haven't read any notifications yet"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="notifications-list">
                            {currentNotifications.map((notification) => {
                                const style = getNotificationStyle(notification.type);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${notification.type?.toLowerCase()} ${!notification.read ? 'unread' : 'read'}`}
                                    >
                                        <div className="notification-left">
                                            <div className="notification-icon">
                                                {style.icon}
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-header">
                                                    <h4 className="notification-title">{notification.title}</h4>
                                                    <div className="header-right">
                                                        {notification.actionUrl && (
                                                            <a href={notification.actionUrl} className="view-details" style={{ color: '#4880ff' }}>
                                                                View Details <FaExternalLinkAlt />
                                                            </a>
                                                        )}
                                                        <span className="notification-time">{getTimeAgo(notification.createdAt)}</span>
                                                    </div>
                                                </div>
                                                <p className="notification-message">{notification.message}</p>

                                                <div className="notification-footer">
                                                    <div className="footer-left">
                                                        {notification.relatedEntity && (
                                                            <span className="related-entity">
                                                                {notification.relatedEntity}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="notification-actions">
                                                        <button
                                                            className="action-btn-small toggle"
                                                            onClick={() => toggleReadStatus(notification.id)}
                                                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                                                            disabled={connectionStatus !== 'connected'}
                                                        >
                                                            {notification.read ? <FaEyeSlash /> : <FaEye />}
                                                        </button>
                                                        <button
                                                            className="action-btn-small delete"
                                                            onClick={() => deleteNotification(notification.id)}
                                                            title="Delete notification"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!notification.read && <div className="unread-dot"></div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className="pagination-button prev"
                                >
                                    <FaChevronLeft />
                                    Previous
                                </button>

                                <div className="pagination-info">
                                    <span className="page-numbers">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(page => {
                                                // Show first page, last page, current page, and 2 pages around current
                                                return page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 2 && page <= currentPage + 2);
                                            })
                                            .map((page, index, array) => (
                                                <React.Fragment key={page}>
                                                    {index > 0 && array[index - 1] !== page - 1 && (
                                                        <span className="pagination-ellipsis">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => goToPage(page)}
                                                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                                    >
                                                        {page}
                                                    </button>
                                                </React.Fragment>
                                            ))
                                        }
                                    </span>
                                    <span className="pagination-summary">
                                        Showing {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length}
                                    </span>
                                </div>

                                <button
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className="pagination-button next"
                                >
                                    Next
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={closeSnackbar}
                duration={3000}
            />

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ isVisible: false, type: 'warning', title: '', message: '', onConfirm: null, isLoading: false })}
                isLoading={confirmDialog.isLoading}
                size="large"
            />
        </div>
    );
};

export default Notifications;