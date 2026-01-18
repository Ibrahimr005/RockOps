// ========================================
// FILE: PayrollSummaryCards.jsx
// Shared component - Finance summary cards
// ========================================

import React from 'react';
import {
    FaUsers,
    FaMoneyBillWave,
    FaMinusCircle,
    FaCheckCircle
} from 'react-icons/fa';
import './PayrollSummaryCards.scss';

const PayrollSummaryCards = ({ payroll }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    return (
        <div className="payroll-summary-cards">
            <div className="payroll-summary">
                <div className="summary-card">
                    <div className="card-icon employees">
                        <FaUsers />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{payroll.employeeCount || 0}</div>
                        <div className="card-label">Employees</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon gross">
                        <FaMoneyBillWave />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{formatCurrency(payroll.totalGrossAmount)}</div>
                        <div className="card-label">Total Gross</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon deductions">
                        <FaMinusCircle />
                    </div>
                    <div className="card-content">
                        <div className="card-value">-{formatCurrency(payroll.totalDeductions)}</div>
                        <div className="card-label">Deductions</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon net">
                        <FaCheckCircle />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{formatCurrency(payroll.totalNetAmount)}</div>
                        <div className="card-label">Total Net</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollSummaryCards;