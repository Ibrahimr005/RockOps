import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { useTheme } from '../../../contexts/ThemeContext.jsx'; // Import the theme context
import { useTranslation } from 'react-i18next';
import { FaSignOutAlt, FaBars, FaTimes, FaMoon, FaSun } from 'react-icons/fa'; // Added moon and sun icons
import './Navbar.css';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const { language, switchLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme(); // Use the theme context
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleLanguageDropdown = () => {
        setShowLanguageDropdown(!showLanguageDropdown);
    };

    const changeLanguage = (lang) => {
        switchLanguage(lang);
        setShowLanguageDropdown(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
        // Close language dropdown when toggling mobile menu
        if (!mobileMenuOpen) {
            setShowLanguageDropdown(false);
        }
    };

    const handleThemeToggle = () => {
        console.log('Theme toggle clicked. Current theme:', theme);
        toggleTheme();
    };

    return (
        <nav className="admin-navbar" style={{ direction: 'ltr' }}>
            <div className="navbar-content">
                <div className="navbar-left">
                    {/* Logo container is empty */}
                    <div className="logo-container">
                    </div>
                </div>

                {/* Mobile menu button */}
                <button className="mobile-menu-button" onClick={toggleMobileMenu}>
                    {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>

                {/* Navbar right content - will be hidden on mobile and shown in mobile menu */}
                <div className={`navbar-right ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                    {/* Theme toggle button */}



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

                    <div className="notification-icon">
                        <span className="notification-badge">1</span>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.0001 22C13.1001 22 14.0001 21.1 14.0001 20H10.0001C10.0001 21.1 10.8901 22 12.0001 22ZM18.0001 16V11C18.0001 7.93 16.3601 5.36 13.5001 4.68V4C13.5001 3.17 12.8301 2.5 12.0001 2.5C11.1701 2.5 10.5001 3.17 10.5001 4V4.68C7.63005 5.36 6.00005 7.92 6.00005 11V16L4.71005 17.29C4.08005 17.92 4.52005 19 5.41005 19H18.5801C19.4701 19 19.9201 17.92 19.2901 17.29L18.0001 16Z" fill="currentColor"/>
                        </svg>
                    </div>

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