// ========================================
// FILE: PaidPhase.jsx
// Component for displaying the PAID phase of payroll
// ========================================

import React from 'react';
import { FaCheckCircle, FaMoneyBillWave, FaCalendarCheck } from 'react-icons/fa';
import FinanceSubTimeline from './FinanceSubTimeline';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards';

const PaidPhase = ({ payroll }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="paid-phase">
            {/* Finance Sub-Timeline - Shows completed state */}
            <FinanceSubTimeline currentStatus={payroll?.status || 'PAID'} />

            <div className="phase-header completed">
                <div className="phase-icon">
                    <FaCheckCircle />
                </div>
                <div className="phase-title">
                    <h2>Payroll Completed</h2>
                    <p>All payments have been processed successfully</p>
                </div>
            </div>

            <StatisticsCards
                cards={[
                    { icon: <FaMoneyBillWave />, label: "Total Paid", value: formatCurrency(payroll?.totalNetPay || payroll?.summary?.totalNetPay), variant: "success" },
                    { icon: <FaCalendarCheck />, label: "Payment Date", value: formatDate(payroll?.paidAt || payroll?.updatedAt), variant: "info" },
                ]}
                columns={2}
            />

            <div className="phase-message">
                <FaCheckCircle className="message-icon" />
                <div className="message-content">
                    <h3>Payroll Successfully Processed</h3>
                    <p>
                        This payroll cycle for {payroll?.month}/{payroll?.year} has been completed.
                        All employee payments have been processed and distributed according to their payment types.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaidPhase;
