import React, {useEffect, useState} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {useAuth} from '../../../contexts/AuthContext.jsx';
import {useTheme} from '../../../contexts/ThemeContext.jsx';
import {useTranslation} from 'react-i18next';
import {
    FaBars,
    FaBoxes,
    FaBriefcase, FaBuilding,
    FaChartLine,
    FaChevronDown,
    FaChevronRight,
    FaChevronLeft,
    FaClipboard,
    FaCog,
    FaFileContract,
    FaFileInvoice,
    FaFileInvoiceDollar,
    FaIdCard,
    FaMapMarkerAlt,
    FaMoon,
    FaShoppingCart,
    FaSignOutAlt,
    FaSitemap,
    FaStore,
    FaSun,
    FaTasks,
    FaTimes,
    FaTools,
    FaTruck,
    FaUser,
    FaUsers,
    FaWarehouse,
    FaTags,
    FaListAlt
} from 'react-icons/fa';

import logoImage from '../../../assets/logos/Logo.png';
import logoDarkImage from '../../../assets/logos/Logo-dark.png';
import './Sidebar.css';
import {BsFillPersonVcardFill} from "react-icons/bs";


const Sidebar = () => {
    const {currentUser, logout} = useAuth();
    const {theme, toggleTheme} = useTheme();
    const {t} = useTranslation();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [isExpanded, setIsExpanded] = useState(true); // Start expanded on desktop

    const userRole = currentUser?.role || 'USER';

    // Get the appropriate logo based on theme
    const currentLogo = theme === 'dark' ? logoDarkImage : logoImage;

    // Check if screen is mobile and set initial state
    useEffect(() => {
        const checkIfMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // On mobile, start collapsed. On desktop, start expanded
            if (mobile) {
                setIsExpanded(false);
            } else {
                setIsExpanded(true);
            }
        };

        // Initial check
        checkIfMobile();

        // Add resize listener
        window.addEventListener('resize', checkIfMobile);

        // Clean up
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    // Auto-expand submenus when on submenu pages
    useEffect(() => {
        const currentPath = location.pathname;
        const newExpandedMenus = {...expandedMenus};

        menuItems.forEach(item => {
            if (item.hasSubmenu && item.submenuItems) {
                const isOnSubmenuPage = item.submenuItems.some(sub => currentPath === sub.path);
                if (isOnSubmenuPage) {
                    newExpandedMenus[item.title] = true;
                }
            }
        });

        setExpandedMenus(newExpandedMenus);
    }, [location.pathname]);

    // Toggle submenu expansion
    const toggleSubmenu = (title) => {
        setExpandedMenus(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    // Check if current path is in a submenu to determine if parent should be highlighted
    const isInSubmenu = (parentPath, currentPath) => {
        return currentPath.startsWith(parentPath);
    };

    // Menu items with role-based access control
    const menuItems = [
        {
            title: 'Admin',
            icon: <FaUser/>,
            path: '/admin',
            roles: ['ADMIN']
        },
        {
            title: 'Dashboard',
            icon: <FaChartLine/>,
            path: '/dashboard',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
        },
        {
            title: 'Sites',
            icon: <FaMapMarkerAlt/>,
            path: '/sites',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
        },
        {
            title: 'Partners',
            icon: <FaUsers/>,
            path: '/partners',
            roles: ['ADMIN', 'SITE_ADMIN']
        },
        {
            title: 'Equipment',
            icon: <FaTruck/>,
            path: '/equipment',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE'],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Equipment List',
                    icon: <FaTruck/>,
                    path: '/equipment',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
                },
                {
                    title: 'Equipment Types',
                    icon: <FaTags/>,
                    path: '/equipment/type-management',
                    roles: ['ADMIN', 'EQUIPMENT_MANAGER']
                },
                {
                    title: 'Equipment Brands',
                    icon: <FaTags/>,
                    path: '/equipment/brand-management',
                    roles: ['ADMIN', 'EQUIPMENT_MANAGER']
                },
                {
                    title: 'Work Types',
                    icon: <FaListAlt/>,
                    path: '/equipment/work-type-management',
                    roles: ['ADMIN', 'EQUIPMENT_MANAGER']
                },
                {
                    title: 'Maintenance Types',
                    icon: <FaTools/>,
                    path: '/equipment/maintenance-type-management',
                    roles: ['ADMIN', 'EQUIPMENT_MANAGER']
                }
            ]
        },
        {
            title: 'Warehouses',
            icon: <FaWarehouse/>,
            path: '/warehouses',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE'],
        },
        {
            title: 'Merchants',
            icon: <FaStore/>,
            path: '/merchants',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT']
        },
        {
            title: 'HR',
            icon: <FaUsers/>,
            path: '/hr',
            roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Departments',
                    icon: <FaBuilding/>,
                    path: '/hr/departments',
                    roles: ['USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
                },
                {
                    title: 'Employees',
                    icon: <FaIdCard/>,
                    path: '/hr/employees',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
                },
                {
                    title: 'Vacancies',
                    icon: <FaBriefcase/>,
                    path: '/hr/vacancies',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
                },
                {
                    title: 'Positions',
                    icon: <FaSitemap/>,
                    path: '/hr/positions',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
                },
                {
                    title: 'Attendance',
                    icon: <FaTasks/>,
                    path: '/hr/attendance',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE'],
                },
            ]
        },
        {
            title: 'Finance',
            icon: <FaFileInvoiceDollar/>,
            path: '/finance',
            roles: ['ADMIN', 'USER', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE'],
            hasSubmenu: true,
            submenuItems: []
        },
        {
            title: 'Procurement',
            icon: <FaShoppingCart/>,
            path: '/procurement',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT'],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Request Orders',
                    icon: <FaFileContract/>,
                    path: '/procurement/request-orders',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT']
                },
                {
                    title: 'Offers',
                    icon: <FaFileInvoice/>,
                    path: '/procurement/offers',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT']
                },
                {
                    title: 'Purchase Orders',
                    icon: <FaFileInvoice/>,
                    path: '/procurement/purchase-orders',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT']
                }
            ]
        },
        {
            title: 'Maintenance',
            icon: <FaTools/>,
            path: '/maintenance',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'EQUIPMENT_MANAGER']
        },
        {
            title: 'Secretary',
            icon: <FaClipboard/>,
            path: '/secretary',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'SECRETARY']
        },
        {
            title: 'Equipment MT ',
            icon: <FaTruck/>,
            path: '/equipment-team',
            roles: ['ADMIN', 'USER', 'EQUIPMENT_MANAGER']
        },
        {
            title: 'Settings',
            icon: <FaCog/>,
            path: '/settings',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']
        }
    ];

    // Filter menu items based on user role
    const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleLogout = () => {
        logout();
    };

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <>
            {/* Mobile toggle button */}
            {isMobile && (
                <button
                    className="mobile-sidebar-toggle"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                >
                    {isExpanded ? <FaTimes /> : <FaBars />}
                </button>
            )}

            <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
                {/* Integrated toggle button for desktop */}
                {!isMobile && (
                    <button
                        className="sidebar-toggle-btn"
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                    >
        <span className="chevron-icon">
            {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
        </span>
                    </button>
                )}

                <div className="sidebar-header">
                    <div className="logo">
                        <img
                            src={currentLogo}
                            alt="Logo"
                            className="logo-image"
                            key={theme}
                        />
                    </div>
                </div>

                <div className="sidebar-menu">
                    {menuItems.map((item) => {
                        if (!item.roles.includes(userRole)) return null;

                        return (
                            <div key={item.title} className="menu-item-container">
                                <NavLink
                                    to={item.hasSubmenu ? '#' : item.path}
                                    className={() => {
                                        if (item.hasSubmenu) {
                                            const isOnParentPath = location.pathname === item.path;
                                            return `menu-item ${isOnParentPath ? 'active' : ''}`;
                                        } else {
                                            const isDirectActive = location.pathname === item.path;
                                            return `menu-item ${isDirectActive ? 'active' : ''}`;
                                        }
                                    }}
                                    data-tooltip={t(item.title)}
                                    onClick={(e) => {
                                        if (item.hasSubmenu) {
                                            e.preventDefault();
                                            toggleSubmenu(item.title);
                                        } else if (isMobile) {
                                            setIsExpanded(false);
                                        }
                                    }}
                                >
                                    <span className="menu-icon">{item.icon}</span>
                                    <span className="menu-title">{t(item.title)}</span>
                                    {item.hasSubmenu && (
                                        <span className="submenu-toggle">
                                            {expandedMenus[item.title] ? (
                                                <FaChevronDown />
                                            ) : (
                                                <FaChevronRight />
                                            )}
                                        </span>
                                    )}
                                </NavLink>

                                {item.hasSubmenu && expandedMenus[item.title] && (
                                    <div className={`submenu ${expandedMenus[item.title] ? 'expanded' : ''}`}>
                                        {item.submenuItems.map((subItem) => {
                                            return (
                                                <NavLink
                                                    key={subItem.title}
                                                    to={subItem.path}
                                                    className={() => {
                                                        const isActive = location.pathname === subItem.path;
                                                        return `submenu-item ${isActive ? 'active' : ''}`;
                                                    }}
                                                    onClick={() => {
                                                        if (isMobile) {
                                                            setIsExpanded(false);
                                                        }
                                                    }}
                                                >
                                                    <span className="menu-icon">
                                                        {subItem.icon}
                                                    </span>
                                                    <span className="menu-title">
                                                        {t(subItem.title)}
                                                    </span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="sidebar-footer">
                    <div className="theme-toggle-container">
                        <div
                            className="theme-toggle-item"
                            onClick={toggleTheme}
                        >
                            <div className="menu-icon">
                                {theme === 'dark' ? <FaMoon/> : <FaSun/>}
                            </div>
                            <div className="menu-title"> {theme === 'dark' ? 'Dark' : 'Light'} Mode</div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={theme === 'dark'}
                                    onChange={toggleTheme}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={handleLogout}>
                        <span className="menu-icon">
                            <FaSignOutAlt />
                        </span>
                        <span>{t('Logout')}</span>
                    </button>
                </div>
            </div>

            {/* Enhanced backdrop with blur effect */}
            {isMobile && isExpanded && (
                <div
                    className="sidebar-backdrop active"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </>
    );
};

export default Sidebar;