import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import './PayrollLayout.scss';

/**
 * PayrollLayout component - Layout wrapper with navigation for all payroll pages
 * Provides consistent structure, styling, and navigation for payroll module
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