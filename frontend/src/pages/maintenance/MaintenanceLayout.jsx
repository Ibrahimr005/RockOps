import React from 'react';
import { Outlet } from 'react-router-dom';
import './MaintenanceLayout.scss';

const MaintenanceLayout = () => {
    return (
        <div className="maintenance-layout">
            <div className="maintenance-content">
                <Outlet />
            </div>
        </div>
    );
};

export default MaintenanceLayout; 