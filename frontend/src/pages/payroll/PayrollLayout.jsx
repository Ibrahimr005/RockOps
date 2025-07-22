import React from 'react';
import { Outlet } from 'react-router-dom';
import './PayrollLayout.scss';

/**
 * PayrollLayout component - Layout wrapper for all payroll pages
 * Provides consistent structure and styling for payroll module
 */
const PayrollLayout = () => {
    return (
        <div className="payroll-layout">
            <div className="payroll-layout__container">
                <main className="payroll-layout__content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default PayrollLayout;