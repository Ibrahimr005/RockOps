import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiDollarSign, FiEdit2, FiArrowLeft, FiCalendar, FiPercent,
    FiCreditCard, FiFileText, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import { FaUniversity, FaStore } from 'react-icons/fa';
import { financeService } from '../../../services/financeService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './LoanDetailsPage.scss';

const LoanDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [loan, setLoan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch loan data
    useEffect(() => {
        fetchLoan();
    }, [id]);

    const fetchLoan = async () => {
        setIsLoading(true);
        try {
            const response = await financeService.companyLoans.loans.getById(id);
            setLoan(response.data || response);
        } catch (error) {
            console.error('Error fetching loan:', error);
            showError('Failed to load loan details');
        } finally {
            setIsLoading(false);
        }
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

    // Installments table columns
    const installmentColumns = [
        {
            header: '#',
            accessor: 'installmentNumber',
            width: '60px'
        },
        {
            header: 'Due Date',
            accessor: 'dueDate',
            render: (row) => formatDate(row.dueDate)
        },
        {
            header: 'Principal',
            accessor: 'principalAmount',
            render: (row) => formatCurrency(row.principalAmount, loan?.currency)
        },
        {
            header: 'Interest',
            accessor: 'interestAmount',
            render: (row) => formatCurrency(row.interestAmount, loan?.currency)
        },
        {
            header: 'Total',
            accessor: 'totalAmount',
            render: (row) => formatCurrency(row.totalAmount, loan?.currency)
        },
        {
            header: 'Paid',
            accessor: 'paidAmount',
            render: (row) => formatCurrency(row.paidAmount, loan?.currency)
        },
        {
            header: 'Remaining',
            accessor: 'remainingAmount',
            render: (row) => formatCurrency(row.remainingAmount, loan?.currency)
        },
        {
            header: 'Status',
            accessor: 'status',
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status?.replace(/_/g, ' ')}
                </span>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="loan-details-page">
                <div className="loading-state">Loading loan details...</div>
            </div>
        );
    }

    if (!loan) {
        return (
            <div className="loan-details-page">
                <div className="error-state">Loan not found</div>
            </div>
        );
    }

    // Determine lender info
    const isMerchantLender = loan.lenderType === 'MERCHANT';
    const lenderDisplayName = loan.lenderName || loan.financialInstitutionName || loan.merchantName || '-';

    // Breadcrumbs
    const breadcrumbs = [
        { label: 'Company Loans', onClick: () => navigate('/finance/company-loans') },
        { label: loan.loanNumber }
    ];

    // Stats
    const stats = [
        { value: formatCurrency(loan.principalAmount, loan.currency), label: 'Principal' },
        { value: `${loan.interestRate}%`, label: 'Interest Rate' },
        { value: `${(loan.paymentProgressPercentage || 0).toFixed(1)}%`, label: 'Progress' }
    ];

    return (
        <div className="loan-details-page">
            <IntroCard
                title={`Loan ${loan.loanNumber}`}
                label="FINANCE CENTER"
                icon={<FiDollarSign />}
                breadcrumbs={breadcrumbs}
                stats={stats}
                actionButtons={[]}
            />

            {/* Loan Status Banner */}
            <div className={`status-banner status-banner--${loan.status?.toLowerCase()}`}>
                {loan.status === 'ACTIVE' && <FiCheckCircle />}
                {loan.status === 'DEFAULTED' && <FiAlertCircle />}
                <span>Loan Status: <strong>{loan.status}</strong></span>
            </div>

            {/* Details Grid */}
            <div className="details-grid">
                {/* Lender Card — UPDATED to handle both types */}
                <div className="detail-card">
                    <h3 className="detail-card__title">
                        {isMerchantLender ? <FaStore /> : <FiCreditCard />}
                        {' '}
                        {isMerchantLender ? 'Merchant Lender' : 'Financial Institution'}
                    </h3>
                    <div className="detail-card__content">
                        <div className="detail-row">
                            <span className="detail-label">Lender Type</span>
                            <span className="detail-value">
                                <span className={`lender-type-badge lender-type-badge--${(loan.lenderType || 'FINANCIAL_INSTITUTION').toLowerCase()}`}>
                                    {isMerchantLender ? 'Merchant' : 'Financial Institution'}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Name</span>
                            <span className="detail-value">{lenderDisplayName}</span>
                        </div>
                        {!isMerchantLender && loan.financialInstitutionNumber && (
                            <div className="detail-row">
                                <span className="detail-label">Institution Number</span>
                                <span className="detail-value">{loan.financialInstitutionNumber}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Loan Terms Card */}
                <div className="detail-card">
                    <h3 className="detail-card__title">
                        <FiPercent /> Loan Terms
                    </h3>
                    <div className="detail-card__content">
                        <div className="detail-row">
                            <span className="detail-label">Loan Type</span>
                            <span className="detail-value">{loan.loanType?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Interest Type</span>
                            <span className="detail-value">{loan.interestType}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Interest Rate</span>
                            <span className="detail-value">{loan.interestRate}% p.a.</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Term</span>
                            <span className="detail-value">{loan.termMonths} months</span>
                        </div>
                    </div>
                </div>

                {/* Dates Card */}
                <div className="detail-card">
                    <h3 className="detail-card__title">
                        <FiCalendar /> Important Dates
                    </h3>
                    <div className="detail-card__content">
                        <div className="detail-row">
                            <span className="detail-label">Disbursement Date</span>
                            <span className="detail-value">{formatDate(loan.disbursementDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Start Date</span>
                            <span className="detail-value">{formatDate(loan.startDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Maturity Date</span>
                            <span className="detail-value">{formatDate(loan.maturityDate)}</span>
                        </div>
                    </div>
                </div>

                {/* Financial Summary Card */}
                <div className="detail-card">
                    <h3 className="detail-card__title">
                        <FiDollarSign /> Financial Summary
                    </h3>
                    <div className="detail-card__content">
                        <div className="detail-row">
                            <span className="detail-label">Principal Amount</span>
                            <span className="detail-value">{formatCurrency(loan.principalAmount, loan.currency)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Remaining Principal</span>
                            <span className="detail-value">{formatCurrency(loan.remainingPrincipal, loan.currency)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Total Principal Paid</span>
                            <span className="detail-value">{formatCurrency(loan.totalPrincipalPaid, loan.currency)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Total Interest Paid</span>
                            <span className="detail-value">{formatCurrency(loan.totalInterestPaid, loan.currency)}</span>
                        </div>
                        <div className="detail-row detail-row--highlight">
                            <span className="detail-label">Total Amount Paid</span>
                            <span className="detail-value">{formatCurrency(loan.totalAmountPaid, loan.currency)}</span>
                        </div>
                    </div>
                </div>

                {/* Additional Info Card */}
                {(loan.purpose || loan.collateral || loan.guarantor || loan.contractReference) && (
                    <div className="detail-card detail-card--full">
                        <h3 className="detail-card__title">
                            <FiFileText /> Additional Information
                        </h3>
                        <div className="detail-card__content detail-card__content--grid">
                            {loan.purpose && (
                                <div className="detail-row detail-row--vertical">
                                    <span className="detail-label">Purpose</span>
                                    <span className="detail-value">{loan.purpose}</span>
                                </div>
                            )}
                            {loan.collateral && (
                                <div className="detail-row detail-row--vertical">
                                    <span className="detail-label">Collateral</span>
                                    <span className="detail-value">{loan.collateral}</span>
                                </div>
                            )}
                            {loan.guarantor && (
                                <div className="detail-row detail-row--vertical">
                                    <span className="detail-label">Guarantor</span>
                                    <span className="detail-value">{loan.guarantor}</span>
                                </div>
                            )}
                            {loan.contractReference && (
                                <div className="detail-row detail-row--vertical">
                                    <span className="detail-label">Contract Reference</span>
                                    <span className="detail-value">{loan.contractReference}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Progress */}
            <div className="progress-section">
                <h3 className="section-title">Payment Progress</h3>
                <div className="progress-container">
                    <div className="progress-bar-large">
                        <div
                            className="progress-bar-large__fill"
                            style={{ width: `${loan.paymentProgressPercentage || 0}%` }}
                        />
                    </div>
                    <div className="progress-info">
                        <span>{loan.paidInstallments || 0} of {loan.totalInstallments} installments paid</span>
                        <span className="progress-percentage">{(loan.paymentProgressPercentage || 0).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Installments Table */}
            <div className="installments-section">
                <h3 className="section-title">Payment Schedule</h3>
                <DataTable
                    data={loan.installments || []}
                    columns={installmentColumns}
                    emptyMessage="No installments found"
                    defaultSortField="installmentNumber"
                    defaultSortDirection="asc"
                    tableTitle="Loan Installments"
                    exportFileName={`loan_${loan.loanNumber}_installments`}
                />
            </div>

        </div>
    );
};

export default LoanDetailsPage;