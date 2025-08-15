// src/pages/finance/Payables/PayablesDashboard/PayablesDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
    FaFileInvoiceDollar,
    FaMoneyBillWave,
    FaExclamationTriangle,
    FaClock,
    FaChartLine,
    FaEye
} from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';
import './PayablesDashboard.css';

const PayablesDashboard = () => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        summary: {
            totalOutstanding: 0,
            overdueInvoices: 0,
            dueThisWeek: 0,
            totalPaidThisMonth: 0
        },
        recentInvoices: [],
        recentPayments: [],
        agingSummary: {
            aged0To30: 0,
            aged31To60: 0,
            aged61To90: 0,
            agedOver90: 0
        }
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING DASHBOARD DATA ===');

            // Fetch all dashboard data using financeService
            const [
                outstanding,
                overdue,
                dueWeek,
                recentInvoices,
                recentPayments,
                agingSummary
            ] = await Promise.all([
                financeService.invoices.getOutstandingTotal(),
                financeService.invoices.getOverdue(),
                financeService.invoices.getDueSoon(7), // 7 days
                financeService.invoices.getAll(0, 5), // page=0, size=5
                financeService.payments.getAll(0, 5), // page=0, size=5
                financeService.invoices.getAgingSummary() // JSON format
            ]);

            console.log('Dashboard data fetched:', {
                outstanding,
                overdue,
                dueWeek,
                recentInvoices,
                recentPayments,
                agingSummary
            });

// Extract data from Axios responses
            const outstandingData = outstanding.data || outstanding;
            const overdueData = overdue.data || overdue;
            const dueWeekData = dueWeek.data || dueWeek;
            const invoicesData = recentInvoices.data || recentInvoices;
            const paymentsData = recentPayments.data || recentPayments;
            const agingData = agingSummary.data || agingSummary;

            console.log('=== EXTRACTED DASHBOARD DATA ===');
            console.log('Outstanding data:', outstandingData);
            console.log('Overdue data:', overdueData);
            console.log('DueWeek data:', dueWeekData);
            console.log('Invoices data:', invoicesData);
            console.log('Payments data:', paymentsData);
            console.log('Aging data:', agingData);

// Extract arrays from responses safely
            let overdueArray = [];
            let dueWeekArray = [];
            let invoicesArray = [];
            let paymentsArray = [];

// Handle overdue response
            if (Array.isArray(overdueData)) {
                overdueArray = overdueData;
            } else if (overdueData && Array.isArray(overdueData.content)) {
                overdueArray = overdueData.content;
            }

// Handle dueWeek response
            if (Array.isArray(dueWeekData)) {
                dueWeekArray = dueWeekData;
            } else if (dueWeekData && Array.isArray(dueWeekData.content)) {
                dueWeekArray = dueWeekData.content;
            }

// Handle recentInvoices response
            if (Array.isArray(invoicesData)) {
                invoicesArray = invoicesData;
            } else if (invoicesData && Array.isArray(invoicesData.content)) {
                invoicesArray = invoicesData.content;
            }

// Handle recentPayments response
            if (Array.isArray(paymentsData)) {
                paymentsArray = paymentsData;
            } else if (paymentsData && Array.isArray(paymentsData.content)) {
                paymentsArray = paymentsData.content;
            }

            console.log('Final extracted arrays:', {
                overdueArray: overdueArray.length,
                dueWeekArray: dueWeekArray.length,
                invoicesArray: invoicesArray.length,
                paymentsArray: paymentsArray.length
            });

// Calculate total paid this month from recent payments
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const paymentsThisMonth = paymentsArray.filter(payment => {
                try {
                    if (!payment || !payment.paymentDate) return false;
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate.getMonth() === currentMonth &&
                        paymentDate.getFullYear() === currentYear &&
                        payment.status === 'PROCESSED';
                } catch (e) {
                    console.error('Error filtering payment:', payment, e);
                    return false;
                }
            });

            const totalPaidThisMonth = paymentsThisMonth.reduce((sum, payment) => {
                return sum + (parseFloat(payment.amount) || 0);
            }, 0);

            console.log('Calculated totals:', {
                paymentsThisMonth: paymentsThisMonth.length,
                totalPaidThisMonth
            });

            setDashboardData({
                summary: {
                    totalOutstanding: outstandingData?.totalOutstandingAmount || 0,
                    overdueInvoices: overdueArray.length,
                    dueThisWeek: dueWeekArray.length,
                    totalPaidThisMonth
                },
                recentInvoices: invoicesArray,
                recentPayments: paymentsArray,
                agingSummary: agingData || {
                    aged0To30: 0,
                    aged31To60: 0,
                    aged61To90: 0,
                    agedOver90: 0
                }
            });

            showSuccess('Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showError('Could not load dashboard data: ' + error.message);

            // Set default empty data on error
            setDashboardData({
                summary: {
                    totalOutstanding: 0,
                    overdueInvoices: 0,
                    dueThisWeek: 0,
                    totalPaidThisMonth: 0
                },
                recentInvoices: [],
                recentPayments: [],
                agingSummary: {
                    aged0To30: 0,
                    aged31To60: 0,
                    aged61To90: 0,
                    agedOver90: 0
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const recentInvoicesColumns = [
        {
            id: 'invoiceNumber',
            header: 'Invoice #',
            accessor: 'invoiceNumber'
        },
        {
            id: 'vendorName',
            header: 'Vendor',
            accessor: 'vendorName'
        },
        {
            id: 'totalAmount',
            header: 'Amount',
            accessor: 'totalAmount',
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'dueDate',
            header: 'Due Date',
            accessor: 'dueDate',
            render: (row, value) => {
                try {
                    return value ? new Date(value).toLocaleDateString() : 'N/A';
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'pending'}`}>
                    {value?.replace('_', ' ') || 'Pending'}
                </span>
            )
        }
    ];

    const recentPaymentsColumns = [
        {
            id: 'amount',
            header: 'Amount',
            accessor: 'amount',
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'paymentDate',
            header: 'Payment Date',
            accessor: 'paymentDate',
            render: (row, value) => {
                try {
                    return value ? new Date(value).toLocaleDateString() : 'N/A';
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'invoiceNumber',
            header: 'Invoice #',
            accessor: 'invoice.invoiceNumber'
        },
        {
            id: 'vendorName',
            header: 'Vendor',
            accessor: 'invoice.vendorName'
        },
        {
            id: 'paymentMethod',
            header: 'Method',
            accessor: 'paymentMethod',
            render: (row, value) => value?.replace('_', ' ') || 'N/A'
        }
    ];

    const recentInvoicesActions = [
        {
            label: 'View',
            icon: <FaEye />,
            onClick: (invoice) => {
                showSuccess(`Viewing invoice ${invoice.invoiceNumber}`);
            },
            className: 'view'
        }
    ];

    const recentPaymentsActions = [
        {
            label: 'View',
            icon: <FaEye />,
            onClick: (payment) => {
                showSuccess(`Viewing payment ${payment.id}`);
            },
            className: 'view'
        }
    ];

    if (loading) {
        return (
            <div className="payables-dashboard">
                <div className="loading-container">Loading dashboard data...</div>
            </div>
        );
    }

    return (
        <div className="payables-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h2>Payables Dashboard</h2>
                    <p>Overview of invoices, payments, and outstanding balances</p>
                </div>
                {/*<button*/}
                {/*    className="payables-btn payables-btn-primary"*/}
                {/*    onClick={fetchDashboardData}*/}
                {/*    disabled={loading}*/}
                {/*>*/}
                {/*    <FaChartLine />*/}
                {/*    Refresh Data*/}
                {/*</button>*/}
            </div>

            {/* Summary Statistics */}
            <div className="payables-stats">
                <div className="payables-stat-card">
                    <FaFileInvoiceDollar className="payables-stat-icon" />
                    <h3 className="payables-stat-value">
                        ${dashboardData.summary.totalOutstanding.toLocaleString()}
                    </h3>
                    <p className="payables-stat-label">Total Outstanding</p>
                </div>
                <div className="payables-stat-card">
                    <FaExclamationTriangle className="payables-stat-icon" />
                    <h3 className="payables-stat-value">
                        {dashboardData.summary.overdueInvoices}
                    </h3>
                    <p className="payables-stat-label">Overdue Invoices</p>
                </div>
                <div className="payables-stat-card">
                    <FaClock className="payables-stat-icon" />
                    <h3 className="payables-stat-value">
                        {dashboardData.summary.dueThisWeek}
                    </h3>
                    <p className="payables-stat-label">Due This Week</p>
                </div>
                <div className="payables-stat-card">
                    <FaMoneyBillWave className="payables-stat-icon" />
                    <h3 className="payables-stat-value">
                        ${dashboardData.summary.totalPaidThisMonth.toLocaleString()}
                    </h3>
                    <p className="payables-stat-label">Paid This Month</p>
                </div>
            </div>

            {/* Aging Summary */}
            <div className="payables-card">
                <div className="payables-card-header">
                    <h3 className="payables-card-title">
                        <FaChartLine />
                        Aging Summary
                    </h3>
                </div>
                <div className="aging-summary-grid">
                    <div className="aging-bucket current">
                        <h4>0-30 Days</h4>
                        <p>${dashboardData.agingSummary.aged0To30?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="aging-bucket warning">
                        <h4>31-60 Days</h4>
                        <p>${dashboardData.agingSummary.aged31To60?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="aging-bucket danger">
                        <h4>61-90 Days</h4>
                        <p>${dashboardData.agingSummary.aged61To90?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="aging-bucket critical">
                        <h4>90+ Days</h4>
                        <p>${dashboardData.agingSummary.agedOver90?.toLocaleString() || '0'}</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity Tables */}
            <div className="dashboard-tables">
                <div className="table-section">
                    <DataTable
                        tableTitle="Recent Invoices"
                        data={dashboardData.recentInvoices}
                        columns={recentInvoicesColumns}
                        // actions={recentInvoicesActions}
                        defaultItemsPerPage={5}
                        showSearch={false}
                        showFilters={false}
                        className="payables-table"
                        emptyMessage="No recent invoices found"
                    />
                </div>

                <div className="table-section">
                    <DataTable
                        tableTitle="Recent Payments"
                        data={dashboardData.recentPayments}
                        columns={recentPaymentsColumns}
                        // actions={recentPaymentsActions}
                        defaultItemsPerPage={5}
                        showSearch={false}
                        showFilters={false}
                        className="payables-table"
                        emptyMessage="No recent payments found"
                    />
                </div>
            </div>
        </div>
    );
};

export default PayablesDashboard;