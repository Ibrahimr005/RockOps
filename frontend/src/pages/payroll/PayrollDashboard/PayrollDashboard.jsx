import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaUsers, FaPiggyBank, FaExclamationTriangle, FaPlus, FaFileAlt, FaEye } from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService.js';
import { payrollService } from '../../../services/payroll/payrollService.js';
import { loanService } from '../../../services/payroll/loanService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards';
import './PayrollDashboard.scss';

const PayrollDashboard = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();
    const [dashboardData, setDashboardData] = useState({
        payrollStats: null,
        loanStats: null,
        recentPayslips: [],
        pendingActions: [],
        loading: true
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setDashboardData(prev => ({ ...prev, loading: true }));

            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;

            // Fetch dashboard data in parallel
            const [payrollStats, loanStats, recentPayslips, pendingPayslips] = await Promise.all([
                payrollService.getMonthlyPayrollStats(currentYear).catch(() => ({ data: null })),
                loanService.getLoanStatistics().catch(() => ({ data: null })),
                payslipService.getPayslips(0, 5, 'payDate,desc').catch(() => ({ data: { content: [] } })),
                payslipService.getPendingPayslips().catch(() => ({ data: [] }))
            ]);

            setDashboardData({
                payrollStats: payrollStats.data,
                loanStats: loanStats.data,
                recentPayslips: recentPayslips.data.content || [],
                pendingActions: pendingPayslips.data || [],
                loading: false
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data');
            setDashboardData(prev => ({ ...prev, loading: false }));
        }
    };

    const handleGenerateMonthlyPayroll = async () => {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            await payrollService.generateMonthlyPayslips(year, month);
            await loadDashboardData(); // Refresh data
            showSuccess('Monthly payroll generated successfully!');
        } catch (error) {
            console.error('Error generating payroll:', error);
            showError('Failed to generate payroll. Please try again.');
        }
    };

    if (dashboardData.loading) {
        return (
            <div className="rockops-payroll-dashboard">
                <div className="rockops-payroll-dashboard__loading">
                    <div className="rockops-loading-spinner"></div>
                    <span>Loading dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rockops-payroll-dashboard">
            {/* Header */}
            <div className="rockops-payroll-dashboard__header">
                <div className="rockops-header-content">
                    <h1 className="rockops-page-title">Payroll Dashboard</h1>
                    <div className="rockops-header-actions">
                        <button
                            className="rockops-btn rockops-btn-primary"
                            onClick={handleGenerateMonthlyPayroll}
                        >
                            <FaPlus /> Generate Monthly Payroll
                        </button>
                        <button
                            className="rockops-btn rockops-btn-secondary"
                            onClick={() => navigate('/payroll/reports')}
                        >
                            <FaFileAlt /> View Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <StatisticsCards
                cards={[
                    {
                        icon: <FaMoneyBillWave />,
                        label: "Total Payroll",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dashboardData.payrollStats?.totalPayroll || 0),
                        variant: "primary"
                    },
                    {
                        icon: <FaUsers />,
                        label: "Employees Paid",
                        value: new Intl.NumberFormat('en-US').format(dashboardData.payrollStats?.employeesPaid || 0),
                        variant: "success"
                    },
                    {
                        icon: <FaPiggyBank />,
                        label: "Active Loans",
                        value: new Intl.NumberFormat('en-US').format(dashboardData.loanStats?.activeLoans || 0),
                        variant: "info"
                    },
                    {
                        icon: <FaExclamationTriangle />,
                        label: "Pending Actions",
                        value: new Intl.NumberFormat('en-US').format(dashboardData.pendingActions.length),
                        variant: "warning"
                    },
                ]}
                columns={4}
            />

            {/* Main Content Grid */}
            <div className="rockops-payroll-dashboard__content">
                {/* Recent Payslips */}
                <div className="rockops-dashboard-card">
                    <div className="rockops-dashboard-card__header">
                        <h3>Recent Payslips</h3>
                        <button
                            className="rockops-view-all-link"
                            onClick={() => navigate('/payroll/payslips')}
                        >
                            <FaEye /> View All
                        </button>
                    </div>
                    <div className="rockops-dashboard-card__content">
                        {dashboardData.recentPayslips.length > 0 ? (
                            <div className="rockops-payslip-list">
                                {dashboardData.recentPayslips.map(payslip => (
                                    <PayslipListItem key={payslip.id} payslip={payslip} />
                                ))}
                            </div>
                        ) : (
                            <div className="rockops-payroll-dashboard-empty-state">
                                <FaFileAlt className="rockops-empty-icon" />
                                <p>No recent payslips</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Actions */}
                <div className="rockops-dashboard-card">
                    <div className="rockops-dashboard-card__header">
                        <h3>Pending Actions</h3>
                        {dashboardData.pendingActions.length > 0 && (
                            <span className="rockops-pending-count">{dashboardData.pendingActions.length}</span>
                        )}
                    </div>
                    <div className="rockops-dashboard-card__content">
                        {dashboardData.pendingActions.length > 0 ? (
                            <div className="rockops-pending-actions-list">
                                {dashboardData.pendingActions.map(action => (
                                    <PendingActionItem key={action.id} action={action} />
                                ))}
                            </div>
                        ) : (
                            <div className="rockops-payroll-dashboard-empty-state">
                                <FaExclamationTriangle className="rockops-empty-icon" />
                                <p>No pending actions</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Loan Summary */}
                <div className="rockops-dashboard-card">
                    <div className="rockops-dashboard-card__header">
                        <h3>Loan Summary</h3>
                        <button
                            className="rockops-view-all-link"
                            onClick={() => navigate('/payroll/loans')}
                        >
                            <FaEye /> View All
                        </button>
                    </div>
                    <div className="rockops-dashboard-card__content">
                        <LoanSummary stats={dashboardData.loanStats} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Payslip List Item Component
const PayslipListItem = ({ payslip }) => {
    const getStatusBadge = (status) => {
        const statusConfig = {
            DRAFT: { class: 'rockops-status-warning', text: 'Draft' },
            GENERATED: { class: 'rockops-status-info', text: 'Generated' },
            SENT: { class: 'rockops-status-success', text: 'Sent' },
            ACKNOWLEDGED: { class: 'rockops-status-default', text: 'Acknowledged' }
        };

        const config = statusConfig[status] || { class: 'rockops-status-default', text: status };

        return (
            <span className={`rockops-status-badge ${config.class}`}>
        {config.text}
      </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDateRange = (start, end) => {
        const startDate = new Date(start).toLocaleDateString();
        const endDate = new Date(end).toLocaleDateString();
        return `${startDate} - ${endDate}`;
    };

    return (
        <div className="rockops-payslip-list-item">
            <div className="rockops-payslip-list-item__info">
                <div className="rockops-employee-name">{payslip.employeeName}</div>
                <div className="rockops-pay-period">
                    {formatDateRange(payslip.payPeriodStart, payslip.payPeriodEnd)}
                </div>
            </div>
            <div className="rockops-payslip-list-item__amount">
                {formatCurrency(payslip.netPay)}
            </div>
            <div className="rockops-payslip-list-item__status">
                {getStatusBadge(payslip.status)}
            </div>
        </div>
    );
};

// Pending Action Item Component
const PendingActionItem = ({ action }) => {
    return (
        <div className="rockops-pending-action-item">
            <div className="rockops-pending-action-item__info">
                <div className="rockops-action-type">{action.type}</div>
                <div className="rockops-action-description">{action.description}</div>
            </div>
            <button className="rockops-btn rockops-btn-sm rockops-btn-primary">
                Take Action
            </button>
        </div>
    );
};

// Loan Summary Component
const LoanSummary = ({ stats }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (!stats) {
        return (
            <div className="rockops-loan-summary rockops-loan-summary--empty">
                <FaPiggyBank className="rockops-empty-icon" />
                <p>No loan data available</p>
            </div>
        );
    }

    return (
        <div className="rockops-loan-summary">
            <div className="rockops-loan-summary__stat">
                <span className="rockops-stat-label">Total Outstanding:</span>
                <span className="rockops-stat-value rockops-stat-value--currency">
          {formatCurrency(stats.totalOutstanding)}
        </span>
            </div>
            <div className="rockops-loan-summary__stat">
                <span className="rockops-stat-label">Active Loans:</span>
                <span className="rockops-stat-value">{stats.activeLoans || 0}</span>
            </div>
            <div className="rockops-loan-summary__stat">
                <span className="rockops-stat-label">Overdue:</span>
                <span className={`rockops-stat-value ${stats.overdueLoans > 0 ? 'rockops-stat-value--urgent' : ''}`}>
          {stats.overdueLoans || 0}
        </span>
            </div>
        </div>
    );
};

export default PayrollDashboard;