import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { useTranslation } from 'react-i18next';
import { FaSignOutAlt, FaBars, FaTimes, FaMoon, FaSun, FaArrowLeft, FaBell } from 'react-icons/fa';
import logoImage from '../../../assets/logos/Logo.png';
import logoDarkImage from '../../../assets/logos/Logo-dark.png';
import './Navbar.css';

const Navbar = () => {
    const { currentUser, logout, token } = useAuth();
    const { language, switchLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [navigationHistory, setNavigationHistory] = useState(['/login']);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    const stompClientRef = useRef(null);

    // Always show the back button
    const showBackButton = true;

    // Initialize WebSocket connection for real-time notification count
    useEffect(() => {
        if (currentUser && token) {
            fetchUnreadCount();
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [currentUser, token]);

    // Track navigation history to avoid going back to login
    useEffect(() => {
        setNavigationHistory(prev => {
            const lastPage = prev[prev.length - 1];
            if (lastPage !== location.pathname) {
                const newHistory = [...prev, location.pathname];
                return newHistory.slice(-10);
            }
            return prev;
        });
    }, [location.pathname]);

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/notifications/unread/count', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Initial unread count fetched:', data);
                setUnreadNotifications(data.unreadCount || data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Connect to WebSocket for real-time updates
    const connectWebSocket = async () => {
        if (stompClientRef.current?.connected) {
            return;
        }

        setConnectionStatus('connecting');

        try {
            const { Client } = await import('@stomp/stompjs');

            const stompClient = new Client({
                brokerURL: 'ws://localhost:8080/ws-native',
                connectHeaders: {
                    'Authorization': `Bearer ${token}`
                },
                debug: () => {}, // Silent debug for navbar
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            stompClient.onConnect = (frame) => {
                console.log('🔗 Navbar WebSocket Connected');
                setConnectionStatus('connected');

                // 🎯 ONLY Subscribe to unread count updates (server-side calculated)
                stompClient.subscribe('/user/queue/unread-count', (message) => {
                    const response = JSON.parse(message.body);
                    console.log('📊 Navbar received unread count update:', response);

                    // Handle different response formats
                    let newCount = 0;
                    if (response.data !== undefined) {
                        newCount = response.data;
                    } else if (response.unreadCount !== undefined) {
                        newCount = response.unreadCount;
                    } else if (response.count !== undefined) {
                        newCount = response.count;
                    }

                    console.log('🔔 Setting unread notifications to:', newCount);
                    setUnreadNotifications(newCount);
                });

                // 🔔 Subscribe to new notifications ONLY for immediate visual feedback (no counting)
                stompClient.subscribe('/user/queue/notifications', (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('🔔 Navbar received new notification (refreshing count):', notification.title);

                    // Just refresh the count from server instead of manual increment
                    setTimeout(() => {
                        fetchUnreadCount();
                    }, 100);
                });

                // 📢 Subscribe to broadcast notifications ONLY for immediate visual feedback (no counting)
                stompClient.subscribe('/topic/notifications', (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('📢 Navbar received broadcast notification (refreshing count):', notification.title);

                    // Just refresh the count from server instead of manual increment
                    setTimeout(() => {
                        fetchUnreadCount();
                    }, 100);
                });

                // 🗑️ OPERATIONS: Subscribe to operation responses for immediate count refresh
                stompClient.subscribe('/user/queue/responses', (message) => {
                    const response = JSON.parse(message.body);
                    console.log('📬 Navbar received operation response:', response);

                    // Refresh count from server after any operation
                    if (response.type === 'SUCCESS') {
                        setTimeout(() => {
                            fetchUnreadCount();
                        }, 100);
                    }
                });

                // 🔐 Authenticate with the server
                stompClient.publish({
                    destination: '/app/authenticate',
                    body: JSON.stringify({
                        token: token,
                        userId: currentUser.id,
                        sessionId: Date.now().toString()
                    })
                });

                console.log('✅ Navbar WebSocket subscriptions established');
            };

            stompClient.onStompError = (frame) => {
                console.error('❌ Navbar WebSocket STOMP Error:', frame);
                setConnectionStatus('disconnected');
            };

            stompClient.onDisconnect = () => {
                console.log('📴 Navbar WebSocket Disconnected');
                setConnectionStatus('disconnected');
            };

            stompClient.onWebSocketError = (error) => {
                console.error('❌ Navbar WebSocket Error:', error);
                setConnectionStatus('disconnected');
            };

            stompClient.activate();
            stompClientRef.current = stompClient;

        } catch (error) {
            console.error('Failed to connect WebSocket in navbar:', error);
            setConnectionStatus('disconnected');
        }
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
            stompClientRef.current = null;
        }
        setConnectionStatus('disconnected');
    };

    const toggleLanguageDropdown = () => {
        setShowLanguageDropdown(!showLanguageDropdown);
    };

    const changeLanguage = (lang) => {
        switchLanguage(lang);
        setShowLanguageDropdown(false);
    };

    const handleLogout = () => {
        disconnectWebSocket();
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
        if (!mobileMenuOpen) {
            setShowLanguageDropdown(false);
        }
    };

    const handleThemeToggle = () => {
        console.log('Theme toggle clicked. Current theme:', theme);
        toggleTheme();
    };

    const handleBackClick = () => {
        console.log('=== BACK BUTTON CLICKED ===');
        console.log('Navigation history:', navigationHistory);

        const previousPage = navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2] : null;
        console.log('Previous page:', previousPage);

        if (window.history.length <= 2 || previousPage === '/login') {
            console.log('Redirecting to dashboard to avoid login page');
            navigate('/dashboard');
            return;
        }

        console.log('Normal back navigation');
        navigate(-1);
    };

    // Handle notification click
    const handleNotificationClick = () => {
        navigate('/notifications');
        // Don't reset count here - let the notifications page handle read status
    };

    // Debug logging for count changes
    useEffect(() => {
        console.log('🔔 Unread notifications count changed to:', unreadNotifications);
    }, [unreadNotifications]);

    return (
        <nav className="admin-navbar">
            <div className="navbar-content">
                <div className="navbar-left">
                    {/* Logo container - moved from sidebar */}
                </div>

                {/* Mobile menu button */}
                <button className="mobile-menu-button" onClick={toggleMobileMenu}>
                    {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>

                {/* Navbar right content - will be hidden on mobile and shown in mobile menu */}
                <div className={`navbar-right ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                    <div className="language-selector">
                        <div className="language-dropdown-container">
                            <div className="language-flag" onClick={toggleLanguageDropdown}>
                                {language === 'en' ? (
                                    <>
                                        <img src="https://cdn.britannica.com/29/22529-004-ED1907BE/Union-Flag-Cross-St-Andrew-of-George.jpg" alt="English" />
                                        <span>English</span>
                                    </>
                                ) : (
                                    <>
                                        <img src="https://cdn.britannica.com/79/5779-004-DC479508/Flag-Saudi-Arabia.jpg" alt="Arabic" />
                                        <span>العربية</span>
                                    </>
                                )}
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            {showLanguageDropdown && (
                                <div className="language-dropdown-menu">
                                    <div className="language-option" onClick={() => changeLanguage('en')}>
                                        <img src="https://cdn.britannica.com/29/22529-004-ED1907BE/Union-Flag-Cross-St-Andrew-of-George.jpg" alt="English" />
                                        <span>English</span>
                                    </div>
                                    <div className="language-option" onClick={() => changeLanguage('ar')}>
                                        <img src="https://cdn.britannica.com/79/5779-004-DC479508/Flag-Saudi-Arabia.jpg" alt="Arabic" />
                                        <span>العربية</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        className={`notification-icon ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}
                        onClick={handleNotificationClick}
                        title={`View Notifications (${connectionStatus === 'connected' ? 'Connected' : 'Disconnected'})`}
                    >
                        {unreadNotifications > 0 && (
                            <span className="notification-badge">
                                {unreadNotifications > 99 ? '99+' : unreadNotifications}
                            </span>
                        )}
                        <FaBell size={20} />
                        {/* Small connection indicator */}
                        <span className={`connection-dot ${connectionStatus}`}></span>
                    </button>

                    <div className="user-profile">
                        <img
                            src="https://randomuser.me/api/portraits/women/44.jpg"
                            alt="User Avatar"
                            className="user-avatar"
                        />
                        <div className="user-info">
                            <p className="user-name">
                                {currentUser?.firstName || 'N/A'}
                            </p>
                            <p className="user-role">{currentUser?.role.replace('_', ' ') || 'N/A'}</p>
                        </div>
                    </div>

                    <button className="logout-button" onClick={handleLogout} title={t('common.logout')}>
                        <FaSignOutAlt />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;