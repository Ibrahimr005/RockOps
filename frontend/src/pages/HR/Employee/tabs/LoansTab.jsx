import React, { useState, useEffect } from 'react';
import { FaPlus, FaEye, FaMoneyBillWave, FaCalendarAlt, FaPercent, FaExclamationTriangle } from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import ContentLoader from '../../../../components/common/ContentLoader/ContentLoader.jsx';
import LoanDetailsModal from '../../../payroll/Loans/components/LoanDetailsModal.jsx';
import CreateLoanModal from '../../../payroll/Loans/components/CreateLoanModal/CreateLoanModal.jsx';

const LoansTab = ({ employee, formatCurrency }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);

    useEffect(() => {
        if (employee?.id) {
            loadEmployeeLoans();
        }
    }, [employee?.id]);

    const loadEmployeeLoans = async () => {
        try {
            setLoading(true);
            const response = await loanService.getLoansByEmployee(employee.id);
            setLoans(response.data || []);
        } catch (error) {
            console.error('Error loading employee loans:', error);
            showError('Failed to load loan information');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Summary calculations
    const activeLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'DISBURSED');
    const pendingLoans = loans.filter(l => ['PENDING', 'PENDING_HR_APPROVAL', 'HR_APPROVED', 'PENDING_FINANCE'].includes(l.status));
    const completedLoans = loans.filter(l => l.status === 'COMPLETED');

    const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
    const monthlyRepayment = activeLoans.reduce((sum, l) => sum + (l.effectiveMonthlyInstallment || l.monthlyInstallment || 0), 0);
    const totalBorrowed = loans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
    const utilizationRatio = employee?.monthlySalary && totalOutstanding > 0
        ? ((totalOutstanding / employee.monthlySalary) * 100).toFixed(1)
        : '0.0';

    const canApplyForNewLoan = () => {
        return pendingLoans.length === 0;
    };

    const handleLoanSaved = () => {
        setShowAddModal(false);
        loadEmployeeLoans();
        showSuccess('Loan application submitted successfully');
    };

    const getStatusBadge = (status) => {
        const config = {
            DRAFT: 'pending',
            PENDING: 'pending',
            PENDING_HR_APPROVAL: 'pending',
            HR_APPROVED: 'completed',
            HR_REJECTED: 'cancelled',
            PENDING_FINANCE: 'pending',
            FINANCE_APPROVED: 'completed',
            FINANCE_REJECTED: 'cancelled',
            DISBURSED: 'active',
            ACTIVE: 'active',
            COMPLETED: 'completed',
            CANCELLED: 'cancelled'
        };
        const badgeClass = config[status] || 'default';
        const displayText = status?.replace(/_/g, ' ') || 'Unknown';
        return <span className={`status-badge ${badgeClass}`}>{displayText}</span>;
    };

    const columns = [
        {
            header: 'Loan #',
            accessor: 'loanNumber',
            sortable: true,
            width: '130px'
        },
        {
            header: 'Date Applied',
            accessor: 'loanDate',
            sortable: true,
            render: (row) => formatDate(row.loanDate)
        },
        {
            header: 'Purpose',
            accessor: 'purpose',
            sortable: true,
            render: (row) => row.purpose || '-'
        },
        {
            header: 'Amount',
            accessor: 'loanAmount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600 }}>{formatCurrency(row.loanAmount)}</span>
            )
        },
        {
            header: 'Remaining',
            accessor: 'remainingBalance',
            sortable: true,
            render: (row) => formatCurrency(row.remainingBalance)
        },
        {
            header: 'Monthly',
            accessor: 'effectiveMonthlyInstallment',
            sortable: true,
            render: (row) => formatCurrency(row.effectiveMonthlyInstallment || row.monthlyInstallment)
        },
        {
            header: 'Progress',
            accessor: 'completionPercentage',
            sortable: true,
            render: (row) => {
                const pct = row.completionPercentage || 0;
                const paid = row.paymentsMade || 0;
                const total = (row.paymentsMade || 0) + (row.paymentsRemaining || 0);
                return (
                    <div style={{ minWidth: 100 }}>
                        <div style={{
                            width: '100%', height: 8,
                            background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden', marginBottom: 4
                        }}>
                            <div style={{
                                height: '100%', width: `${pct}%`,
                                background: 'var(--color-success)', transition: 'width 0.3s'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {paid}/{total} ({pct.toFixed(0)}%)
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'HR Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => getStatusBadge(row.status)
        },
        {
            header: 'Finance',
            accessor: 'financeStatus',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => row.financeStatus ? getStatusBadge(row.financeStatus) : '-'
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: (row) => {
                setSelectedLoan(row);
                setShowDetailsModal(true);
            }
        }
    ];

    if (loading) {
        return (
            <div className="loans-info tab-panel">
                <ContentLoader text="Loading loan information..." />
            </div>
        );
    }

    return (
        <div className="loans-info tab-panel">
            <StatisticsCards
                cards={[
                    {
                        icon: <FaMoneyBillWave />,
                        label: 'Total Outstanding',
                        value: formatCurrency(totalOutstanding),
                        variant: 'primary',
                        subtitle: `${activeLoans.length} active loan${activeLoans.length !== 1 ? 's' : ''}`
                    },
                    {
                        icon: <FaCalendarAlt />,
                        label: 'Monthly Deduction',
                        value: formatCurrency(monthlyRepayment),
                        variant: 'info',
                        subtitle: 'Per month'
                    },
                    {
                        icon: <FaPercent />,
                        label: 'Utilization Ratio',
                        value: `${utilizationRatio}%`,
                        variant: 'warning',
                        subtitle: 'Of monthly salary'
                    },
                    {
                        icon: <FaMoneyBillWave />,
                        label: 'Total Borrowed',
                        value: formatCurrency(totalBorrowed),
                        variant: 'success',
                        subtitle: `${completedLoans.length} completed`
                    }
                ]}
                columns={4}
            />

            {!canApplyForNewLoan() && (
                <div style={{
                    background: 'rgba(var(--color-warning-rgb, 255, 152, 0), 0.1)',
                    border: '1px solid rgba(var(--color-warning-rgb, 255, 152, 0), 0.3)',
                    color: 'var(--color-warning)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                }}>
                    <FaExclamationTriangle />
                    <span>There is a pending loan application. Only one pending application is allowed at a time.</span>
                </div>
            )}

            <DataTable
                data={loans}
                columns={columns}
                actions={actions}
                isLoading={loading}
                emptyMessage="No loans found for this employee"
                searchPlaceholder="Search loans..."
                defaultSortField="loanDate"
                defaultSortDirection="desc"
                exportFileName={`${employee.firstName}_${employee.lastName}_Loans`}
                showAddButton={canApplyForNewLoan()}
                addButtonText="Apply for Loan"
                addButtonIcon={<FaPlus />}
                onAddClick={() => setShowAddModal(true)}
            />

            {showAddModal && (
                <CreateLoanModal
                    employees={[employee]}
                    onClose={() => setShowAddModal(false)}
                    onLoanCreated={handleLoanSaved}
                />
            )}

            {showDetailsModal && selectedLoan && (
                <LoanDetailsModal
                    loan={selectedLoan}
                    onClose={() => setShowDetailsModal(false)}
                />
            )}
        </div>
    );
};

export default LoansTab;
