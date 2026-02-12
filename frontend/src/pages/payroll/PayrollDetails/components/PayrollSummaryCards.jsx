// ========================================
// FILE: PayrollSummaryCards.jsx
// Shared component - Finance summary cards
// ========================================

import React from 'react';
import {
    FaUsers,
    FaMoneyBillWave,
    FaMinusCircle,
    FaCheckCircle,
    FaGift
} from 'react-icons/fa';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards';
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
            <StatisticsCards
                cards={[
                    { icon: <FaUsers />, label: "Employees", value: payroll.employeeCount || 0, variant: "primary" },
                    { icon: <FaMoneyBillWave />, label: "Total Gross", value: formatCurrency(payroll.totalGrossAmount), variant: "success" },
                    { icon: <FaGift />, label: "Total Bonuses", value: formatCurrency(payroll.totalBonusAmount), variant: "warning" },
                    { icon: <FaMinusCircle />, label: "Deductions", value: `-${formatCurrency(payroll.totalDeductions)}`, variant: "danger" },
                    { icon: <FaCheckCircle />, label: "Total Net", value: formatCurrency(payroll.totalNetAmount), variant: "info" },
                ]}
                columns={5}
            />
        </div>
    );
};

export default PayrollSummaryCards;