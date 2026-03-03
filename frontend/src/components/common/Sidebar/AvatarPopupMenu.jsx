import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { useNotification } from '../../../contexts/NotificationContext.jsx';
import { useSidebar } from './Sidebar.jsx';
import { FaBell, FaMoon, FaSun, FaGlobe, FaSignOutAlt, FaChevronUp } from 'react-icons/fa';
import './AvatarPopupMenu.css';

const AvatarPopupMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);
    const triggerRef = useRef(null);
    const navigate = useNavigate();

    const { currentUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { language, switchLanguage } = useLanguage();
    const { unreadCount } = useNotification();
    const { isExpanded } = useSidebar();

    // Get user initials
    const getInitials = () => {
        const first = currentUser?.firstName?.[0] || '';
        const last = currentUser?.lastName?.[0] || '';
        return (first + last).toUpperCase() || 'U';
    };

    // Get display name
    const getDisplayName = () => {
        if (currentUser?.firstName) {
            return `${currentUser.firstName}${currentUser.lastName ? ' ' + currentUser.lastName : ''}`;
        }
        return currentUser?.username || 'User';
    };

    // Get formatted role
    const getRole = () => {
        return currentUser?.role?.replace(/_/g, ' ') || 'User';
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                popupRef.current && !popupRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    };

    const handleNotifications = () => {
        navigate('/notifications');
        setIsOpen(false);
    };

    const handleThemeToggle = (e) => {
        e.stopPropagation();
        toggleTheme();
    };

    const handleLanguageToggle = (e) => {
        e.stopPropagation();
        switchLanguage(language === 'en' ? 'ar' : 'en');
    };

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className={`avatar-popup-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                className="avatar-trigger"
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="avatar-trigger-circle">
                    {getInitials()}
                    {unreadCount > 0 && (
                        <span className="avatar-notification-dot" />
                    )}
                </div>
                {isExpanded && (
                    <>
                        <span className="avatar-trigger-name">{getDisplayName()}</span>
                        <FaChevronUp className={`avatar-trigger-chevron ${isOpen ? 'open' : ''}`} />
                    </>
                )}
            </button>

            {/* Popup */}
            {isOpen && (
                <div
                    ref={popupRef}
                    className={`avatar-popup-menu ${isExpanded ? 'expanded' : 'collapsed'}`}
                >
                    {/* User header */}
                    <div className="avatar-popup-header">
                        <div className="avatar-popup-circle">
                            {getInitials()}
                        </div>
                        <div className="avatar-popup-user-info">
                            <span className="avatar-popup-name">{getDisplayName()}</span>
                            <span className="avatar-popup-role">{getRole()}</span>
                        </div>
                    </div>

                    <div className="avatar-popup-divider" />

                    {/* Notifications */}
                    <button className="avatar-popup-item" onClick={handleNotifications}>
                        <FaBell className="avatar-popup-item-icon" />
                        <span className="avatar-popup-item-label">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="avatar-popup-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Theme toggle */}
                    <button className="avatar-popup-item" onClick={handleThemeToggle}>
                        {theme === 'light' ? (
                            <FaMoon className="avatar-popup-item-icon" />
                        ) : (
                            <FaSun className="avatar-popup-item-icon" />
                        )}
                        <span className="avatar-popup-item-label">
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                    </button>

                    {/* Language toggle */}
                    <button className="avatar-popup-item" onClick={handleLanguageToggle}>
                        <FaGlobe className="avatar-popup-item-icon" />
                        <span className="avatar-popup-item-label">
                            {language === 'en' ? 'العربية' : 'English'}
                        </span>
                    </button>

                    <div className="avatar-popup-divider" />

                    {/* Logout */}
                    <button className="avatar-popup-item avatar-popup-logout" onClick={handleLogout}>
                        <FaSignOutAlt className="avatar-popup-item-icon" />
                        <span className="avatar-popup-item-label">Log Out</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AvatarPopupMenu;
