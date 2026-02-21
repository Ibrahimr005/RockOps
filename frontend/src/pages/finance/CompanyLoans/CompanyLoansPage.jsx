import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiPlus, FiEye, FiEdit2, FiTrendingUp, FiAlertCircle, FiCalendar } from 'react-icons/fi';
import {FaUniversity, FaStore} from 'react-icons/fa';
import { financeService } from '../../../services/financeService';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './CompanyLoansPage.scss';

const CompanyLoansPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [loans, setLoans] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [upcomingInstallments, setUpcomingInstallments] = useState([]);
    const [overdueInstallments, setOverdueInstallments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('loans');

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [loansRes, dashboardRes, upcomingRes, overdueRes] = await Promise.all([
                financeService.companyLoans.loans.getAll(),
                financeService.companyLoans.dashboard.getSummary(),
                financeService.companyLoans.loans.getUpcomingInstallments(30),
                financeService.companyLoans.loans.getOverdueInstallments()
            ]);

            setLoans(loansRes.data || loansRes || []);
            setDashboardData(dashboardRes.data || dashboardRes || {});
            setUpcomingInstallments(upcomingRes.data || upcomingRes || []);
            setOverdueInstallments(overdueRes.data || overdueRes || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        if (type === 'error') showError(message);
        else showSuccess(message);
    };

    // Format currency
    const formatCurrency = (amount, currency = 'EGP') => {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            ACTIVE: 'status-badge--active',
            COMPLETED: 'status-badge--completed',
            DEFAULTED: 'status-badge--defaulted',
            CANCELLED: 'status-badge--cancelled',
            PENDING: 'status-badge--pending',
            PAYMENT_REQUEST_CREATED: 'status-badge--pending',
            PARTIALLY_PAID: 'status-badge--partial',
            PAID: 'status-badge--paid',
            OVERDUE: 'status-badge--overdue'
        };
        return statusClasses[status] || 'status-badge--default';
    };

    // Loan columns — UPDATED to show lender name + type badge
    const loanColumns = [
        {
            header: 'Loan Number',
            accessor: 'loanNumber',
            sortable: true,
            width: '120px'
        },
        {
            header: 'Lender',
            accessor: 'lenderName',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <div className="lender-cell">
                    <span className={`lender-type-icon lender-type-icon--${(row.lenderType || 'FINANCIAL_INSTITUTION').toLowerCase()}`}>
                        {row.lenderType === 'MERCHANT' ? <FaStore /> : <FaUniversity />}
                    </span>
                    <span>{row.lenderName || row.financialInstitutionName || '-'}</span>
                </div>
            )
        },
        {
            header: 'Type',
            accessor: 'loanType',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className="loan-type-badge">
                    {row.loanType?.replace(/_/g, ' ')}
                </span>
            )
        },
        {
            header: 'Principal',
            accessor: 'principalAmount',
            sortable: true,
            render: (row) => formatCurrency(row.principalAmount, row.currency)
        },
        {
            header: 'Remaining',
            accessor: 'remainingPrincipal',
            sortable: true,
            render: (row) => formatCurrency(row.remainingPrincipal, row.currency)
        },
        {
            header: 'Interest Rate',
            accessor: 'interestRate',
            sortable: true,
            render: (row) => `${row.interestRate}%`
        },
        {
            header: 'Maturity Date',
            accessor: 'maturityDate',
            sortable: true,
            render: (row) => formatDate(row.maturityDate)
        },
        {
            header: 'Progress',
            accessor: 'paymentProgressPercentage',
            sortable: true,
            render: (row) => (
                <div className="progress-cell">
                    <div className="progress-bar">
                        <div
                            className="progress-bar__fill"
                            style={{ width: `${row.paymentProgressPercentage || 0}%` }}
                        />
                    </div>
                    <span className="progress-text">{(row.paymentProgressPercentage || 0).toFixed(1)}%</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status}
                </span>
            )
        }
    ];

    // Loan actions
    const loanActions = [
        // {
        //     label: 'View Details',
        //     icon: <FiEye />,
        //     onClick: (row) => navigate(`/finance/company-loans/${row.id}`)
        // },
        // {
        //     label: 'Edit',
        //     icon: <FiEdit2 />,
        //     onClick: (row) => navigate(`/finance/company-loans/${row.id}/edit`),
        //     condition: (row) => row.status === 'ACTIVE'
        // }
    ];

    // Installment columns
    const installmentColumns = [
        {
            header: 'Loan',
            accessor: 'loanNumber',
            sortable: true
        },
        {
            header: 'Installment #',
            accessor: 'installmentNumber',
            sortable: true,
            width: '100px'
        },
        {
            header: 'Due Date',
            accessor: 'dueDate',
            sortable: true,
            render: (row) => formatDate(row.dueDate)
        },
        {
            header: 'Total Amount',
            accessor: 'totalAmount',
            sortable: true,
            render: (row) => formatCurrency(row.totalAmount)
        },
        {
            header: 'Remaining',
            accessor: 'remainingAmount',
            sortable: true,
            render: (row) => formatCurrency(row.remainingAmount)
        },
        {
            header: 'Days Overdue',
            accessor: 'daysOverdue',
            sortable: true,
            render: (row) => row.daysOverdue > 0 ? (
                <span className="overdue-days">{row.daysOverdue} days</span>
            ) : '-'
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status?.replace(/_/g, ' ')}
                </span>
            )
        }
    ];

    // IntroCard stats
    const stats = dashboardData ? [
        { value: dashboardData.activeLoans || 0, label: 'Active Loans' },
        { value: formatCurrency(dashboardData.totalOutstandingPrincipal), label: 'Outstanding' },
        { value: dashboardData.overdueInstallments || 0, label: 'Overdue' }
    ] : [];

    // IntroCard action buttons
    const actionButtons = [
        {
            text: 'New Loan',
            icon: <FiPlus />,
            onClick: () => navigate('/finance/company-loans/new'),
            className: 'primary'
        },
        {
            text: 'Institutions',
            icon: <FiTrendingUp />,
            onClick: () => navigate('/finance/company-loans/institutions'),
            className: 'secondary'
        }
    ];

    return (
        <div className="company-loans-page">
            <PageHeader
                title="Company Loans"
                subtitle="Manage company loans and financial institutions"
            />

            {/* Dashboard Summary Cards */}
            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <div className="dashboard-card__icon dashboard-card__icon--primary">
                        <FiDollarSign />
                    </div>
                    <div className="dashboard-card__content">
                        <span className="dashboard-card__value">
                            {formatCurrency(dashboardData?.totalOutstandingPrincipal)}
                        </span>
                        <span className="dashboard-card__label">Total Outstanding</span>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-card__icon dashboard-card__icon--success">
                        <FiTrendingUp />
                    </div>
                    <div className="dashboard-card__content">
                        <span className="dashboard-card__value">{dashboardData?.activeLoans || 0}</span>
                        <span className="dashboard-card__label">Active Loans</span>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-card__icon dashboard-card__icon--warning">
                        <FiCalendar />
                    </div>
                    <div className="dashboard-card__content">
                        <span className="dashboard-card__value">{dashboardData?.upcomingPaymentsCount || 0}</span>
                        <span className="dashboard-card__label">Due in 30 Days</span>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-card__icon dashboard-card__icon--danger">
                        <FiAlertCircle />
                    </div>
                    <div className="dashboard-card__content">
                        <span className="dashboard-card__value">{dashboardData?.overdueInstallments || 0}</span>
                        <span className="dashboard-card__label">Overdue</span>
                    </div>
                </div>
            </div>

            {/* Alerts Banner */}
            {dashboardData?.overdueInstallments > 0 && (
                <div className="alerts-banner alerts-banner--warning">
                    <FiAlertCircle />
                    <span>
                        You have <strong>{dashboardData.overdueInstallments}</strong> overdue installments
                        totaling <strong>{formatCurrency(dashboardData.totalOverdueAmount)}</strong>
                    </span>
                    <button
                        className="alerts-banner__action"
                        onClick={() => setActiveTab('overdue')}
                    >
                        View Overdue
                    </button>
                </div>
            )}

            {/* Tabs */}
            <Tabs
                tabs={[
                    { id: 'loans', label: 'All Loans', icon: <FiDollarSign /> },
                    { id: 'upcoming', label:`Upcoming`,icon: <FiCalendar /> },
                    { id:'overdue', label: `Overdue`,icon: <FiAlertCircle /> },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Content based on active tab */}
            {activeTab === 'loans' && (
                <div className="tab-content tab-content--with-actions">
                    <div className="tab-content__extra-actions">
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/finance/company-loans/institutions')}
                        >
                            <FaUniversity /> Institutions
                        </button>
                    </div>
                    <DataTable
                        data={loans}
                        columns={loanColumns}
                        actions={loanActions}
                        isLoading={isLoading}
                        emptyMessage="No loans found"
                        searchPlaceholder="Search loans..."
                        defaultSortField="maturityDate"
                        defaultSortDirection="asc"
                        onRowClick={(row) => navigate(`/finance/company-loans/${row.id}`)}
                        exportFileName="company_loans"
                        showAddButton={true}
                        addButtonText="New Loan"
                        addButtonIcon={<FiPlus />}
                        onAddClick={() => navigate('/finance/company-loans/new')}
                    />
                </div>
            )}

            {activeTab === 'upcoming' && (
                <div className="tab-content">
                    <DataTable
                        data={upcomingInstallments}
                        columns={installmentColumns}
                        isLoading={isLoading}
                        emptyMessage="No upcoming installments"
                        searchPlaceholder="Search installments..."
                        defaultSortField="dueDate"
                        defaultSortDirection="asc"
                        exportFileName="upcoming_installments"
                    />
                </div>
            )}

            {activeTab === 'overdue' && (
                <div className="tab-content">
                    <DataTable
                        data={overdueInstallments}
                        columns={installmentColumns}
                        isLoading={isLoading}
                        emptyMessage="No overdue installments"
                        searchPlaceholder="Search installments..."
                        defaultSortField="dueDate"
                        defaultSortDirection="asc"
                        exportFileName="overdue_installments"
                    />
                </div>
            )}

        </div>
    );
};

export default CompanyLoansPage;