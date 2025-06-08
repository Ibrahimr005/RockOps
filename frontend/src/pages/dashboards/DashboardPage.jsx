import React, {useState, useEffect } from 'react';
import {useAuth} from '../../contexts/AuthContext';
import Navbar from '../../components/common/Navbar/Navbar';
import Sidebar from '../../components/common/Sidebar/Sidebar';
import UserDashboard from './UserDashboard.jsx';
import SiteAdminDashboard from './SiteAdminDashboard.jsx';
import ProcurementDashboard from './ProcurementDashboard';
import WarehouseDashboard from '../../pages/warehouse/WarehouseDashboard/WarehouseDashboard.jsx';
import SecretaryDashboard from './SecretaryDashboard.jsx';
import EquipmentManagerDashboard from '../equipment/EquipmentManagerDashboard/EquipmentManagerDashboard.jsx';
import HRManagerDashboard from './HRManagerDashboard.jsx';
import HREmployeeDashboard from './HR/HREmployeeDashboard.jsx';
import './Dashboard.css';

const DashboardPage = () => {
    const {currentUser} = useAuth();
    const [isMobile, setIsMobile] = useState(false);

    // Detect if screen is mobile sized
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkIfMobile();

        // Add resize listener
        window.addEventListener('resize', checkIfMobile);

        // Clean up
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    // Get the role-specific dashboard title
    const getDashboardTitle = () => {
        switch (currentUser?.role) {
            case 'SITE_ADMIN':
                return 'Site Administration';
            case 'PROCUREMENT':
                return 'Procurement Management';
            case 'WAREHOUSE_MANAGER':
                return 'Warehouse Management';
            case 'SECRETARY':
                return 'Secretary Dashboard';
            case 'EQUIPMENT_MANAGER':
                return 'Equipment Management';
            case 'HR_MANAGER':
                return 'HR Management';
            case 'HR_EMPLOYEE':
                return 'HR Employee Portal';
            case 'FINANCE_EMPLOYEE': // Add Finance role
                return 'Finance Dashboard';
            case 'FINANCE_MANAGER': // Add Finance role
                return 'Finance Dashboard';
            case 'USER':
            default:
                return 'User Dashboard';
        }
    };

    // Render the appropriate dashboard based on user role
    const renderDashboard = () => {
        switch (currentUser?.role) {
            case 'SITE_ADMIN':
                return <SiteAdminDashboard/>;
            case 'PROCUREMENT':
                return <ProcurementDashboard/>;
            case 'WAREHOUSE_MANAGER':
                return <WarehouseDashboard/>;
            case 'SECRETARY':
                return <SecretaryDashboard/>;
            case 'EQUIPMENT_MANAGER':
                return <EquipmentManagerDashboard/>;
            case 'HR_MANAGER':
                return <HRManagerDashboard/>;
            case 'HR_EMPLOYEE':
                return <HREmployeeDashboard/>;
            // case 'FINANCE': // Add Finance case
            //     return <FinanceDashboard/>;
            case 'USER':
            default:
                return <UserDashboard/>;
        }
    };

    return (
        <div className="dashboard-layout">



            <div className="dashboard-content">
                {renderDashboard()}

            </div>
        </div>
    );
};

export default DashboardPage;