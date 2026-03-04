import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaUsers, FaPiggyBank, FaExclamationTriangle, FaPlus, FaFileAlt, FaEye } from 'react-icons/fa';
import { Button } from '../../../components/common/Button';
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
            <div className="oretech-payroll-dashboard">
                <div className="oretech-payroll-dashboard__loading">
                    <div className="oretech-loading-spinner"></div>
                    <span>Loading dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="oretech-payroll-dashboard">
            {/* Header */}
            <div className="oretech-payroll-dashboard__header">
                <div className="oretech-header-content">
                    <h1 className="oretech-page-title">Payroll Dashboard</h1>
                    <div className="oretech-header-actions">
                        <Button
                            variant="primary"
                            onClick={handleGenerateMonthlyPayroll}
                        >
                            <FaPlus /> Generate Monthly Payroll
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/payroll/reports')}
                        >
                            <FaFileAlt /> View Reports
                        </Button>
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
            <div className="oretech-payroll-dashboard__content">
                {/* Recent Payslips */}
                <div className="oretech-dashboard-card">
                    <div className="oretech-dashboard-card__header">
                        <h3>Recent Payslips</h3>
                        <button
                            className="oretech-view-all-link"
                            onClick={() => navigate('/payroll/payslips')}
                        >
                            <FaEye /> View All
                        </button>
                    </div>
                    <div className="oretech-dashboard-card__content">
                        {dashboardData.recentPayslips.length > 0 ? (
                            <div className="oretech-payslip-list">
                                {dashboardData.recentPayslips.map(payslip => (
                                    <PayslipListItem key={payslip.id} payslip={payslip} />
                                ))}
                            </div>
                        ) : (
                            <div className="oretech-payroll-dashboard-empty-state">
                                <FaFileAlt className="oretech-empty-icon" />
                                <p>No recent payslips</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Actions */}
                <div className="oretech-dashboard-card">
                    <div className="oretech-dashboard-card__header">
                        <h3>Pending Actions</h3>
                        {dashboardData.pendingActions.length > 0 && (
                            <span className="oretech-pending-count">{dashboardData.pendingActions.length}</span>
                        )}
                    </div>
                    <div className="oretech-dashboard-card__content">
                        {dashboardData.pendingActions.length > 0 ? (
                            <div className="oretech-pending-actions-list">
                                {dashboardData.pendingActions.map(action => (
                                    <PendingActionItem key={action.id} action={action} />
                                ))}
                            </div>
                        ) : (
                            <div className="oretech-payroll-dashboard-empty-state">
                                <FaExclamationTriangle className="oretech-empty-icon" />
                                <p>No pending actions</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Loan Summary */}
                <div className="oretech-dashboard-card">
                    <div className="oretech-dashboard-card__header">
                        <h3>Loan Summary</h3>
                        <button
                            className="oretech-view-all-link"
                            onClick={() => navigate('/payroll/loans')}
                        >
                            <FaEye /> View All
                        </button>
                    </div>
                    <div className="oretech-dashboard-card__content">
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
            DRAFT: { class: 'oretech-status-warning', text: 'Draft' },
            GENERATED: { class: 'oretech-status-info', text: 'Generated' },
            SENT: { class: 'oretech-status-success', text: 'Sent' },
            ACKNOWLEDGED: { class: 'oretech-status-default', text: 'Acknowledged' }
        };

        const config = statusConfig[status] || { class: 'oretech-status-default', text: status };

        return (
            <span className={`oretech-status-badge ${config.class}`}>
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
        <div className="oretech-payslip-list-item">
            <div className="oretech-payslip-list-item__info">
                <div className="oretech-employee-name">{payslip.employeeName}</div>
                <div className="oretech-pay-period">
                    {formatDateRange(payslip.payPeriodStart, payslip.payPeriodEnd)}
                </div>
            </div>
            <div className="oretech-payslip-list-item__amount">
                {formatCurrency(payslip.netPay)}
            </div>
            <div className="oretech-payslip-list-item__status">
                {getStatusBadge(payslip.status)}
            </div>
        </div>
    );
};

// Pending Action Item Component
const PendingActionItem = ({ action }) => {
    return (
        <div className="oretech-pending-action-item">
            <div className="oretech-pending-action-item__info">
                <div className="oretech-action-type">{action.type}</div>
                <div className="oretech-action-description">{action.description}</div>
            </div>
            <Button variant="primary" size="sm">
                Take Action
            </Button>
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
            <div className="oretech-loan-summary oretech-loan-summary--empty">
                <FaPiggyBank className="oretech-empty-icon" />
                <p>No loan data available</p>
            </div>
        );
    }

    return (
        <div className="oretech-loan-summary">
            <div className="oretech-loan-summary__stat">
                <span className="oretech-stat-label">Total Outstanding:</span>
                <span className="oretech-stat-value oretech-stat-value--currency">
          {formatCurrency(stats.totalOutstanding)}
        </span>
            </div>
            <div className="oretech-loan-summary__stat">
                <span className="oretech-stat-label">Active Loans:</span>
                <span className="oretech-stat-value">{stats.activeLoans || 0}</span>
            </div>
            <div className="oretech-loan-summary__stat">
                <span className="oretech-stat-label">Overdue:</span>
                <span className={`oretech-stat-value ${stats.overdueLoans > 0 ? 'oretech-stat-value--urgent' : ''}`}>
          {stats.overdueLoans || 0}
        </span>
            </div>
        </div>
    );
};

export default PayrollDashboard;