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
    FaChevronRight,
    FaWifi,
    FaExclamationCircle
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext.jsx';
import IntroCard from '../../components/common/IntroCard/IntroCard.jsx';
import Snackbar from '../../components/common/Snackbar/Snackbar.jsx';
import ConfirmationDialog from '../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { notificationService } from '../../services/notification/notificationService';
import { webSocketService } from '../../services/notification/webSocketService';
import notificationLight from '../../assets/imgs/notificationlight.png';
import notificationDark from '../../assets/imgs/notificationdark.png';
import './Notifications.scss';

const Notifications = () => {
    const { currentUser, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [notificationsPerPage] = useState(7);
    const [wsConnected, setWsConnected] = useState(false);
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

    const wsInitialized = useRef(false);

    useEffect(() => {
        if (currentUser && token) {
            initializeApp();
        }

        return () => {
            webSocketService.disconnect();
        };
    }, [currentUser, token]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm]);

    const initializeApp = async () => {
        // First, load notifications via HTTP (fast initial load)
        await fetchNotifications();

        // Then, set up WebSocket for real-time updates
        if (!wsInitialized.current) {
            await initializeWebSocket();
            wsInitialized.current = true;
        }
    };

    const fetchNotifications = async () => {
        if (!currentUser || !token) {
            console.log('⚠️ Cannot fetch notifications: Missing auth data');
            return;
        }

        setLoading(true);
        try {
            const response = await notificationService.getAll();
            const notificationsData = response.data || response;

            if (Array.isArray(notificationsData)) {
                setNotifications(notificationsData);
            } else {
                console.warn('⚠️ Unexpected notifications data format:', notificationsData);
                setNotifications([]);
            }
        } catch (error) {
            console.error('❌ Failed to fetch notifications:', error);
            showSnackbar('Failed to fetch notifications', 'error');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const initializeWebSocket = async () => {
        try {
            // Set up callbacks
            webSocketService.onNotification(handleNewNotifications);
            webSocketService.onConnectionStatus(setWsConnected);

            // Connect
            await webSocketService.connect(token);

        } catch (error) {
            showSnackbar('Failed to connect to real-time notifications', 'warning');
        }
    };

    const handleNewNotifications = (newNotifications) => {
        console.log('📬 Handling new notifications:', newNotifications);

        if (Array.isArray(newNotifications) && newNotifications.length > 0) {
            setNotifications(prevNotifications => {
                // Check if this is initial load (full notification list) or new notifications
                const isInitialLoad = newNotifications.length > 5; // Assume if we get many, it's initial load

                if (isInitialLoad) {
                    // Replace all notifications (initial load from WebSocket)
                    return newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    // Merge new notifications, avoiding duplicates
                    const existingIds = new Set(prevNotifications.map(n => n.id));
                    const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));

                    if (uniqueNewNotifications.length > 0) {
                        // Show toast for actually new notifications
                        const message = uniqueNewNotifications.length === 1
                            ? `New: ${uniqueNewNotifications[0].title}`
                            : `${uniqueNewNotifications.length} new notifications`;
                        showSnackbar(message, 'info');
                    }

                    // Merge and sort
                    return [...uniqueNewNotifications, ...prevNotifications]
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }
            });
        }
    };

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
        try {
            // Try WebSocket first, fallback to HTTP
            if (wsConnected) {
                await webSocketService.markAsRead(notificationId);
            } else {
                await notificationService.markAsRead(notificationId);
            }

            // Update local state optimistically
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: !notification.read }
                        : notification
                )
            );

            showSnackbar('Notification updated successfully');
        } catch (error) {
            console.error('Failed to update notification:', error);
            showSnackbar('Failed to update notification', 'error');
        }
    };

    const deleteNotification = async (notificationId) => {
        setConfirmDialog({
            isVisible: true,
            type: 'delete',
            title: 'Delete Notification',
            message: 'Are you sure you want to delete this notification? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));

                try {
                    await notificationService.delete(notificationId);
                    setNotifications(prev => prev.filter(n => n.id !== notificationId));
                    showSnackbar('Notification deleted successfully');
                    setConfirmDialog({ isVisible: false, type: 'warning', title: '', message: '', onConfirm: null, isLoading: false });
                } catch (error) {
                    console.error('Failed to delete notification:', error);
                    showSnackbar('Failed to delete notification', 'error');
                    setConfirmDialog(prev => ({ ...prev, isLoading: false }));
                }
            },
            isLoading: false
        });
    };

    const markAllAsRead = async () => {
        try {
            const notificationsToUpdate = filteredNotifications.filter(n => !n.read);

            if (notificationsToUpdate.length === 0) {
                showSnackbar('No unread notifications to mark as read', 'info');
                return;
            }

            // Try WebSocket first, fallback to HTTP
            if (wsConnected) {
                await webSocketService.markAllAsRead();
            } else {
                await notificationService.markAllAsRead();
            }

            setNotifications(prev =>
                prev.map(notification => ({ ...notification, read: true }))
            );

            const filterText = filter === 'all' ? 'all' : `${filter}`;
            showSnackbar(`Marked ${notificationsToUpdate.length} ${filterText} notifications as read`, 'success');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            showSnackbar('Failed to update notifications', 'error');
        }
    };

    const clearAllNotifications = async () => {
        const filterText = filter === 'all' ? 'all' : `${filter}`;
        const notificationsToDelete = filteredNotifications;

        if (notificationsToDelete.length === 0) {
            showSnackbar(`No ${filterText} notifications to clear`, 'info');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'delete',
            title: `Clear All ${filterText.charAt(0).toUpperCase() + filterText.slice(1)} Notifications`,
            message: `Are you sure you want to clear all ${filterText} notifications? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));

                try {
                    for (const notification of notificationsToDelete) {
                        await notificationService.delete(notification.id);
                    }

                    setNotifications(prev =>
                        prev.filter(notification =>
                            !notificationsToDelete.some(n => n.id === notification.id)
                        )
                    );

                    showSnackbar(`Cleared all notifications successfully`, 'success');
                    setConfirmDialog({ isVisible: false, type: 'warning', title: '', message: '', onConfirm: null, isLoading: false });
                } catch (error) {
                    console.error('Failed to clear notifications:', error);
                    showSnackbar('Failed to clear notifications', 'error');
                    setConfirmDialog(prev => ({ ...prev, isLoading: false }));
                }
            },
            isLoading: false
        });
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
            { value: unreadCount.toString(), label: "Unread" },
        ];
    };

    // Show loading state while waiting for auth
    if (!currentUser) {
        return (
            <div className="notifications-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '200px',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div className="loading-spinner"></div>
                    <p>Loading user authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="notifications-page">
            <IntroCard
                title="Notifications"
                label="NOTIFICATION CENTER"
                lightModeImage={notificationLight}
                darkModeImage={notificationDark}
                stats={getNotificationStats()}
                icon={false}
            />

            {/* Toolbar */}
            <div className="notifications-toolbar-clean">
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

                <div className="toolbar-actions">
                    <button
                        onClick={markAllAsRead}
                        disabled={filteredNotifications.filter(n => !n.read).length === 0}
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