import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, FileText, CreditCard, Building } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Finance Manager Dashboard Component
 * Displays financial metrics, accounting, and payables management
 * Also used by FINANCE_EMPLOYEE role
 */
const FinanceManagerDashboard = () => {
    const { t } = useTranslation();
    const { showError } = useSnackbar();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const data = await DashboardService.getFinanceManagerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching finance dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="finance-dashboard-error">No data available</div>;
    }

    const invoicesData = [
        { name: 'Pending', value: dashboardData.pendingInvoices || 0 },
        { name: 'Overdue', value: dashboardData.overdueInvoices || 0 },
        { name: 'Total', value: dashboardData.totalInvoices || 0 },
    ];

    return (
        <div className="finance-dashboard">
            <PageHeader title="Finance Dashboard" subtitle="Financial overview and accounting management" />

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <DollarSign />, label: "Cash Balance", value: `$${(dashboardData.currentCashBalance || 0).toLocaleString()}`, variant: "success", subtitle: "Current" },
                    { icon: <FileText />, label: "Total Invoices", value: dashboardData.totalInvoices, variant: "primary", subtitle: `${dashboardData.pendingInvoices} Pending` },
                    { icon: <AlertCircle />, label: "Overdue Invoices", value: dashboardData.overdueInvoices, variant: "danger", subtitle: "Requires Attention" },
                    { icon: <CreditCard />, label: "Total Payables", value: `$${(dashboardData.totalPayables || 0).toLocaleString()}`, variant: "warning", subtitle: `$${(dashboardData.overduePayables || 0).toLocaleString()} Overdue` },
                    { icon: <Building />, label: "Fixed Assets", value: dashboardData.totalFixedAssets, variant: "purple", subtitle: `$${(dashboardData.totalAssetValue || 0).toLocaleString()}` },
                    { icon: <TrendingUp />, label: "Bank Accounts", value: dashboardData.totalBankAccounts, variant: "info", subtitle: `${dashboardData.reconciledAccounts} Reconciled` },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="finance-charts">
                <div className="finance-chart-card">
                    <h3>Invoices Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={invoicesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="finance-info-card">
                    <h3>Financial Metrics</h3>
                    <div className="finance-metrics-list">
                        <div className="finance-metric-item">
                            <span>Total Assets:</span>
                            <span className="finance-metric-value">
                                ${(dashboardData.totalAssets || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="finance-metric-item">
                            <span>Total Liabilities:</span>
                            <span className="finance-metric-value">
                                ${(dashboardData.totalLiabilities || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="finance-metric-item">
                            <span>Total Equity:</span>
                            <span className="finance-metric-value success">
                                ${(dashboardData.totalEquity || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="finance-metric-item">
                            <span>Accounting Period:</span>
                            <span className="finance-metric-value">{dashboardData.currentAccountingPeriod}</span>
                        </div>
                        <div className="finance-metric-item">
                            <span>Pending Journal Entries:</span>
                            <span className="finance-metric-value">{dashboardData.pendingJournalEntries}</span>
                        </div>
                        <div className="finance-metric-item">
                            <span>Employees on Payroll:</span>
                            <span className="finance-metric-value">{dashboardData.employeesOnPayroll}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Financial Metrics */}
            <div className="finance-additional-metrics">
                <h3>Detailed Financial Analysis</h3>
                <div className="finance-analytics-grid">
                    <div className="finance-analytics-card">
                        <h4>Payables Overview</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Total Payables:</span>
                                <span className="analytics-value">${(dashboardData.totalPayables || 0).toLocaleString()}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Overdue Payables:</span>
                                <span className="analytics-value alert">${(dashboardData.overduePayables || 0).toLocaleString()}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Pending Invoices:</span>
                                <span className="analytics-value">{dashboardData.pendingInvoices || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="finance-analytics-card">
                        <h4>Balance Sheet Summary</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Total Assets:</span>
                                <span className="analytics-value success">${(dashboardData.totalAssets || 0).toLocaleString()}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Total Liabilities:</span>
                                <span className="analytics-value">${(dashboardData.totalLiabilities || 0).toLocaleString()}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Total Equity:</span>
                                <span className="analytics-value success">${(dashboardData.totalEquity || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {(dashboardData.overdueInvoices > 0 || dashboardData.pendingReconciliations > 0 || dashboardData.pendingApprovals > 0) && (
                <div className="finance-alerts-section">
                    <h3>Financial Alerts</h3>
                    <div className="finance-alerts-grid">
                        {dashboardData.overdueInvoices > 0 && (
                            <div className="finance-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.overdueInvoices}</div>
                                    <div className="alert-label">Overdue Invoices</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.pendingReconciliations > 0 && (
                            <div className="finance-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.pendingReconciliations}</div>
                                    <div className="alert-label">Pending Reconciliations</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.pendingApprovals > 0 && (
                            <div className="finance-alert-card info">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.pendingApprovals}</div>
                                    <div className="alert-label">Pending Approvals</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManagerDashboard;

