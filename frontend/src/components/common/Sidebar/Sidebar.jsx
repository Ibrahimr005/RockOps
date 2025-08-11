import React, {useEffect, useState, createContext, useContext} from 'react';
import {NavLink, useLocation, useNavigate} from 'react-router-dom';
import {useAuth} from '../../../contexts/AuthContext.jsx';
import {useTheme} from '../../../contexts/ThemeContext.jsx';
import {useTranslation} from 'react-i18next';
import {
    FaBars,
    FaBoxes,
    FaBriefcase,
    FaBuilding,
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
    FaListAlt,
    FaArrowLeft,
    FaBook, FaBalanceScale, FaReceipt, FaPiggyBank, FaFileAlt, FaMoneyBillWave, FaChartBar, FaArrowUp,
} from 'react-icons/fa';
import { ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE } from '../../../utils/roles';

import './Sidebar.css';
import logoDarkImage from "../../../assets/logos/Logo-dark.png";
import logoImage from "../../../assets/logos/Logo.png";

// Create Sidebar Context
const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

export const SidebarProvider = ({ children }) => {
    const { theme } = useTheme(); // Fix: Get theme from context
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

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

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    // Add class to body to handle main content margin and navbar positioning
    useEffect(() => {
        if (isExpanded && !isMobile) {
            document.body.classList.remove('sidebar-collapsed');
        } else {
            document.body.classList.add('sidebar-collapsed');
        }

        return () => {
            document.body.classList.remove('sidebar-collapsed');
        };
    }, [isExpanded, isMobile]);

    return (
        <SidebarContext.Provider value={{
            isExpanded,
            setIsExpanded,
            isMobile,
            toggleSidebar
        }}>
            {children}
        </SidebarContext.Provider>
    );
};

const Sidebar = () => {
    const {currentUser, logout} = useAuth();
    const {theme, toggleTheme} = useTheme();
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const {isExpanded, setIsExpanded, isMobile, toggleSidebar} = useSidebar();
    const [expandedMenus, setExpandedMenus] = useState({});
    const [navigationHistory, setNavigationHistory] = useState(['/login']);

    const userRole = currentUser?.role || 'USER';

    // Get the appropriate logo based on theme
    const currentLogo = theme === 'dark' ? logoDarkImage : logoImage;

    // Helper function to check if a path is active
    const isPathActive = (itemPath, currentPath) => {
        // Exact match only for submenu items
        return currentPath === itemPath;
    };

    // Helper function to check if a main menu item should be active
    const isMainMenuActive = (item, currentPath) => {
        if (item.hasSubmenu) {
            // For items with submenu, check if current path matches the parent path
            // OR if current path starts with the parent path (for nested routes)
            return currentPath === item.path || currentPath.startsWith(item.path + '/');
        } else {
            // For regular menu items, use exact matching
            return currentPath === item.path;
        }
    };

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

    const handleBackClick = () => {
        const previousPage = navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2] : null;

        if (window.history.length <= 2 || previousPage === '/login') {
            navigate('/dashboard');
            return;
        }

        navigate(-1);
    };

    // Fixed theme toggle handler
    const handleThemeToggle = (e) => {
        e.stopPropagation();
        toggleTheme();
    };

    // Auto-expand submenus when on submenu pages
    useEffect(() => {
        const currentPath = location.pathname;
        const newExpandedMenus = {...expandedMenus};

        menuItems.forEach(item => {
            if (item.hasSubmenu && item.submenuItems) {
                const isOnSubmenuPage = item.submenuItems.some(sub =>
                    isPathActive(sub.path, currentPath)
                );
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

    // Menu items with role-based access control
    const menuItems = [
        {
            title: 'Admin',
            icon: <FaUser/>,
            path: '/admin',
            roles: [ADMIN]
        },
        {
            title: 'Dashboard',
            icon: <FaChartLine/>,
            path: '/dashboard',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE]
        },
        {
            title: 'Sites',
            icon: <FaMapMarkerAlt/>,
            path: '/sites',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE]
        },
        {
            title: 'Partners',
            icon: <FaUsers/>,
            path: '/partners',
            roles: [ADMIN, SITE_ADMIN]
        },
        {
            title: 'Equipment',
            icon: <FaTruck/>,
            path: '/equipment',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Equipment List',
                    icon: <FaTruck/>,
                    path: '/equipment',
                    roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE]
                },
                {
                    title: 'Equipment Types',
                    icon: <FaTags/>,
                    path: '/equipment/type-management',
                    roles: [ADMIN, EQUIPMENT_MANAGER]
                },
                {
                    title: 'Equipment Brands',
                    icon: <FaTags/>,
                    path: '/equipment/brand-management',
                    roles: [ADMIN, EQUIPMENT_MANAGER]
                },
                {
                    title: 'Work Types',
                    icon: <FaListAlt/>,
                    path: '/equipment/work-type-management',
                    roles: [ADMIN, EQUIPMENT_MANAGER]
                },
                {
                    title: 'Maintenance Types',
                    icon: <FaTools/>,
                    path: '/equipment/maintenance-type-management',
                    roles: [ADMIN, EQUIPMENT_MANAGER]
                }
            ]
        },
        {
            title: 'Warehouses',
            icon: <FaWarehouse/>,
            path: '/warehouses',
            roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER','WAREHOUSE_EMPLOYEE', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE'],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Warehouses',
                    icon: <FaWarehouse/>,
                    path: '/warehouses',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE','SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
                },
                {
                    title: 'Item Categories',
                    icon: <FaBoxes/>,
                    path: '/warehouses/item-categories',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER','WAREHOUSE_EMPLOYEE', 'SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
                },
                {
                    title: 'Item Types',
                    icon: <FaTags/>,
                    path: '/warehouses/item-types',
                    roles: ['ADMIN', 'USER', 'SITE_ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE','SECRETARY', 'EQUIPMENT_MANAGER', 'HR_MANAGER', 'HR_EMPLOYEE']
                }
            ]
        },
        {
            title: 'Merchants',
            icon: <FaStore/>,
            path: '/merchants',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE]
        },
        {
            title: 'HR',
            icon: <FaUsers/>,
            path: '/hr',
            roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Departments',
                    icon: <FaBuilding/>,
                    path: '/hr/departments',
                    roles: [USER, HR_MANAGER, HR_EMPLOYEE],
                },
                {
                    title: 'Employees',
                    icon: <FaIdCard/>,
                    path: '/hr/employees',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE],
                },
                {
                    title: 'Vacancies',
                    icon: <FaBriefcase/>,
                    path: '/hr/vacancies',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE],
                },
                {
                    title: 'Positions',
                    icon: <FaSitemap/>,
                    path: '/hr/positions',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE],
                },
                {
                    title: 'Promotions',
                    icon: <FaArrowUp/>,
                    path: '/hr/promotions',
                    roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE],
                },
                {
                    title: 'Attendance',
                    icon: <FaTasks/>,
                    path: '/hr/attendance',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE],
                },
            ]
        },
        {
            title: 'Payroll',
            icon: <FaMoneyBillWave/>,
            path: '/payroll',
            roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Dashboard',
                    icon: <FaChartBar/>,
                    path: '/payroll',
                    roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
                {
                    title: 'Payslips',
                    icon: <FaReceipt/>,
                    path: '/payroll/payslips',
                    roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
                {
                    title: 'Loans',
                    icon: <FaPiggyBank/>,
                    path: '/payroll/loans',
                    roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
                {
                    title: 'Reports',
                    icon: <FaFileAlt/>,
                    path: '/payroll/reports',
                    roles: [ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
            ]
        },
        {
            title: 'Finance',
            icon: <FaFileInvoiceDollar/>,
            path: '/finance',
            roles: [ADMIN, USER, FINANCE_MANAGER, FINANCE_EMPLOYEE, SITE_ADMIN],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'General Ledger',
                    icon: <FaBook/>,
                    path: '/finance/general-ledger',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
                {
                    title: 'Payables',
                    icon: <FaFileInvoiceDollar/>,
                    path: '/finance/payables',
                    roles: [ADMIN, USER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE],
                },
                {
                    title: 'Fixed Assets',
                    icon: <FaBuilding/>,
                    path: '/finance/fixed-assets',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE'],
                },
                {
                    title: 'Bank Reconciliation',
                    icon: <FaBalanceScale/>,
                    path: '/finance/bank-reconciliation',
                    roles: ['ADMIN', 'USER', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE'],
                },
            ]
        },
        {
            title: 'Procurement',
            icon: <FaShoppingCart/>,
            path: '/procurement',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT],
            hasSubmenu: true,
            submenuItems: [
                {
                    title: 'Request Orders',
                    icon: <FaFileContract/>,
                    path: '/procurement/request-orders',
                    roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT]
                },
                {
                    title: 'Offers',
                    icon: <FaFileInvoice/>,
                    path: '/procurement/offers',
                    roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT]
                },
                {
                    title: 'Purchase Orders',
                    icon: <FaFileInvoice/>,
                    path: '/procurement/purchase-orders',
                    roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT]
                }
            ]
        },
        {
            title: 'Maintenance',
            icon: <FaTools/>,
            path: '/maintenance',
            roles: [ADMIN, USER, SITE_ADMIN, EQUIPMENT_MANAGER]
        },
        {
            title: 'Secretary',
            icon: <FaClipboard/>,
            path: '/secretary',
            roles: [ADMIN, USER, SITE_ADMIN, SECRETARY]
        },
        // {
        //     title: 'Equipment MT',
        //     icon: <FaTruck/>,
        //     path: '/equipment-team',
        //     roles: ['ADMIN', 'USER', 'EQUIPMENT_MANAGER']
        // },
        {
            title: 'Settings',
            icon: <FaCog/>,
            path: '/settings',
            roles: [ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE]
        }
    ];

    const handleLogout = () => {
        logout();
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

            <div
                className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
                data-expanded={isExpanded}
            >
                {/* Toggle button - Uses icon swap instead of rotation */}
                {!isMobile && (
                    <button
                        className="sidebar-toggle-btn"
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                    >
                        <span className={`chevron-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
                            {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
                        </span>
                    </button>
                )}

                <div className="sidebar-header">
                    <div className="logo-container">
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
                                            // For submenu items, use the new helper function
                                            const isActive = isMainMenuActive(item, location.pathname);
                                            return `menu-item ${isActive ? 'active' : ''}`;
                                        } else {
                                            // For regular menu items, use exact matching
                                            const isActive = isMainMenuActive(item, location.pathname);
                                            return `menu-item ${isActive ? 'active' : ''}`;
                                        }
                                    }}
                                    data-tooltip={t(item.title)}
                                    onClick={(e) => {
                                        if (item.hasSubmenu) {
                                            e.preventDefault();

                                            // If sidebar is collapsed, expand it first
                                            if (!isExpanded) {
                                                setIsExpanded(true);
                                                // Add a small delay to allow the sidebar to expand before toggling submenu
                                                setTimeout(() => {
                                                    toggleSubmenu(item.title);
                                                }, 100);
                                            } else {
                                                // If already expanded, just toggle the submenu
                                                toggleSubmenu(item.title);
                                            }
                                        } else if (isMobile) {
                                            toggleSidebar();
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
                                                        const currentPath = location.pathname;

                                                        // Get all submenu items from the parent to find the most specific match
                                                        const allSubItems = item.submenuItems || [];

                                                        // Find the submenu item that best matches the current path
                                                        const bestMatch = allSubItems
                                                            .filter(sub => currentPath === sub.path || currentPath.startsWith(sub.path + '/'))
                                                            .sort((a, b) => b.path.length - a.path.length)[0]; // Sort by path length descending

                                                        // This item is active only if it's the best match
                                                        const isActive = bestMatch && bestMatch.path === subItem.path;

                                                        return `submenu-item ${isActive ? 'active' : ''}`;
                                                    }}
                                                    onClick={() => {
                                                        if (isMobile) {
                                                            toggleSidebar();
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
                    {/* Back Button with text when expanded */}
                    <button
                        className="back-button"
                        onClick={handleBackClick}
                        title={t('common.back') || 'Go back'}
                    >
                        <FaArrowLeft />
                        {isExpanded && <span className="back-text">Back</span>}
                    </button>

                    <div className="theme-toggle-container">
                        <div
                            className="theme-toggle-item"
                            onClick={handleThemeToggle}
                        >
                            <div className="menu-icon">
                                {theme === 'dark' ? <FaMoon/> : <FaSun/>}
                            </div>
                            <div className="menu-title">{theme === 'dark' ? 'Dark' : 'Light'} Mode</div>
                            <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={theme === 'dark'}
                                    onChange={handleThemeToggle}
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
                    onClick={() => toggleSidebar()}
                />
            )}
        </>
    );
};

export default Sidebar;