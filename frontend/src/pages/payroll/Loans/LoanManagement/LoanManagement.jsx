// frontend/src/pages/payroll/LoanManagement/LoanManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaDollarSign, FaUsers, FaFileInvoice, FaEye, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import CreateLoanModal from '../components/CreateLoanModal/CreateLoanModal';
import { loanService } from '../../../../services/payroll/loanService';
import { employeeService } from '../../../../services/hr/employeeService';
import { formatCurrency, formatDate } from '../../../../utils/formatters.js';
import './LoanManagement.scss';

const LoanManagement = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load employees first
            const employeesResponse = await employeeService.getAll();
            setEmployees(employeesResponse.data);

            // Get loans from all statuses and combine them
            try {
                const [activeLoans, pendingLoans, completedLoans, cancelledLoans] = await Promise.all([
                    loanService.getActiveLoans().catch(() => ({ data: [] })),
                    loanService.getLoansByStatus('PENDING').catch(() => ({ data: [] })),
                    loanService.getLoansByStatus('COMPLETED').catch(() => ({ data: [] })),
                    loanService.getLoansByStatus('CANCELLED').catch(() => ({ data: [] }))
                ]);

                const allLoans = [
                    ...(activeLoans.data || []),
                    ...(pendingLoans.data || []),
                    ...(completedLoans.data || []),
                    ...(cancelledLoans.data || [])
                ];

                // Remove duplicates if any (based on loan id)
                const uniqueLoans = allLoans.filter((loan, index, self) =>
                    index === self.findIndex(l => l.id === loan.id)
                );

                setLoans(uniqueLoans);
            } catch (err) {
                console.warn('Error fetching all loans, falling back to active loans only:', err);
                const activeLoans = await loanService.getActiveLoans();
                setLoans(activeLoans.data || []);
            }

        } catch (err) {
            setError('Failed to load loan data');
            console.error('Error loading loans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLoan = () => {
        setShowCreateModal(true);
    };

    const handleLoanCreated = (newLoan) => {
        setLoans(prev => [newLoan, ...prev]);
        setShowCreateModal(false);
        // Use your existing snackbar here
        // showSnackbar('Loan created successfully', 'success');
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
    };

    const handleApproveLoan = async (loanId) => {
        try {
            await loanService.approveLoan(loanId, 'ADMIN');
            setLoans(prev => prev.map(loan =>
                loan.id === loanId ? { ...loan, status: 'ACTIVE' } : loan
            ));
            // showSnackbar('Loan approved successfully', 'success');
        } catch (error) {
            console.error('Error approving loan:', error);
            // showSnackbar('Failed to approve loan', 'error');
        }
    };

    const handleRejectLoan = async (loanId) => {
        try {
            await loanService.rejectLoan(loanId, 'ADMIN', 'Rejected from management interface');
            setLoans(prev => prev.map(loan =>
                loan.id === loanId ? { ...loan, status: 'REJECTED' } : loan
            ));
            // showSnackbar('Loan rejected successfully', 'success');
        } catch (error) {
            console.error('Error rejecting loan:', error);
            // showSnackbar('Failed to reject loan', 'error');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'pending', icon: '', label: 'Pending' },
            ACTIVE: { class: 'active', icon: '🟢', label: 'Active' },
            COMPLETED: { class: 'status-completed', icon: '✅', label: 'Completed' },
            CANCELLED: { class: 'status-cancelled', icon: '🔴', label: 'Cancelled' },
            REJECTED: { class: 'status-rejected', icon: '❌', label: 'Rejected' }
        };

        const config = statusConfig[status] || statusConfig.PENDING;
        return (
            <span className={`status-badge ${config.class}`}>
                {config.icon} {config.label}
            </span>
        );
    };

    const calculateProgress = (totalAmount, remainingBalance) => {
        const paidAmount = totalAmount - remainingBalance;
        return totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    };

    const getEmployeeName = (employeeId) => {
        const employee = employees.find(emp => emp.id === employeeId);
        return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
    };

    const getEmployeePosition = (employeeId) => {
        const employee = employees.find(emp => emp.id === employeeId);
        return employee ? employee.jobPositionName || 'Unknown Position' : 'Unknown Position';
    };

    // DataTable columns configuration
    const columns = [
        {
            accessor: 'id',
            header: 'Loan ID',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (loan) => (
                <span className="loan-management-loan-id">
                    #{loan.id ? loan.id.slice(-8) : 'N/A'}
                </span>
            )
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (loan) => (
                <div className="loan-management-employee-info">
                    <div className="loan-management-employee-name">
                        {loan.employeeName || getEmployeeName(loan.employeeId)}
                    </div>
                    <div className="loan-management-employee-position">
                        {getEmployeePosition(loan.employeeId)}
                    </div>
                </div>
            )
        },
        {
            accessor: 'loanAmount',
            header: 'Loan Amount',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (loan) => (
                <span className="loan-management-loan-amount">{formatCurrency(loan.loanAmount)}</span>
            )
        },
        {
            accessor: 'remainingBalance',
            header: 'Remaining Balance',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (loan) => (
                <div className="loan-management-balance-info">
                    <span className="loan-management-remaining-amount">{formatCurrency(loan.remainingBalance)}</span>
                    <div className="loan-management-progress-bar">
                        <div
                            className="loan-management-progress-fill"
                            style={{ width: `${calculateProgress(loan.loanAmount, loan.remainingBalance)}%` }}
                        ></div>
                    </div>
                    <small className="loan-management-progress-text">
                        {calculateProgress(loan.loanAmount, loan.remainingBalance)}% paid
                    </small>
                </div>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (loan) => getStatusBadge(loan.status)
        },
        {
            accessor: 'startDate',
            header: 'Start Date',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (loan) => formatDate(loan.startDate)
        },
        {
            accessor: 'endDate',
            header: 'End Date',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (loan) => formatDate(loan.endDate)
        },
        {
            accessor: 'totalInstallments',
            header: 'Installments',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (loan) => `${loan.totalInstallments} months`
        }
    ];

    // DataTable actions configuration
    const actions = [

        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (loan) => navigate(`/payroll/loans/${loan.id}/edit`),
            isVisible: (loan) => loan.status === 'PENDING',
            className: 'action-edit'
        },
        {
            label: 'Approve',
            icon: <FaCheck />,
            onClick: (loan) => handleApproveLoan(loan.id),
            isVisible: (loan) => loan.status === 'PENDING',
            className: 'action-approve'
        },
        {
            label: 'Reject',
            icon: <FaTimes />,
            onClick: (loan) => handleRejectLoan(loan.id),
            isVisible: (loan) => loan.status === 'PENDING',
            className: 'action-reject'
        }
    ];

    // Custom filters for DataTable
    const customFilters = [
        {
            label: 'Date From',
            component: (
                <input
                    type="date"
                    className="loan-management-filter-input"
                    onChange={(e) => {
                        // Handle date filtering logic here if needed
                        // This would be used for additional client-side filtering
                    }}
                />
            )
        },
        {
            label: 'Date To',
            component: (
                <input
                    type="date"
                    className="loan-management-filter-input"
                    onChange={(e) => {
                        // Handle date filtering logic here if needed
                    }}
                />
            )
        }
    ];

    // Filterable columns for DataTable
    const filterableColumns = columns.filter(col => col.filterable);

    const summaryStats = useMemo(() => {
        const totalLoans = loans.length;
        const activeLoans = loans.filter(loan => loan.status === 'ACTIVE').length;
        const pendingLoans = loans.filter(loan => loan.status === 'PENDING').length;
        const completedLoans = loans.filter(loan => loan.status === 'COMPLETED').length;
        const totalOutstanding = loans
            .filter(loan => loan.status === 'ACTIVE')
            .reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0);

        return { totalLoans, activeLoans, pendingLoans, completedLoans, totalOutstanding };
    }, [loans]);

    if (loading) return <div className="loan-management-loading-state">Loading loans...</div>;
    if (error) return <div className="loan-management-error-state">{error}</div>;

    return (
        <div className="loan-management">
            <div className="loan-management__header">
                <div className="loan-management-header-content">
                    <h1>Loan Management</h1>
                    <p>Manage employee loans and track repayment schedules</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="loan-management__summary">
                <div className="loan-management-summary-card">
                    <div className="loan-management-summary-icon">
                        <FaFileInvoice />
                    </div>
                    <div className="loan-management-summary-content">
                        <h3>{summaryStats.totalLoans}</h3>
                        <p>Total Loans</p>
                    </div>
                </div>
                <div className="loan-management-summary-card">
                    <div className="loan-management-summary-icon">
                        <FaUsers />
                    </div>
                    <div className="loan-management-summary-content">
                        <h3>{summaryStats.activeLoans}</h3>
                        <p>Active Loans</p>
                    </div>
                </div>
                <div className="loan-management-summary-card">
                    <div className="loan-management-summary-icon">
                        <FaDollarSign />
                    </div>
                    <div className="loan-management-summary-content">
                        <h3>{formatCurrency(summaryStats.totalOutstanding)}</h3>
                        <p>Outstanding Balance</p>
                    </div>
                </div>
            </div>

            {/* DataTable with built-in filters and actions */}
            <div className="loan-management__content">
                <DataTable
                    data={loans}
                    columns={columns}
                    loading={loading}
                    tableTitle="Employee Loans"
                    emptyMessage="No loans found"

                    // Search and Filter configuration
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    customFilters={customFilters}

                    // Actions configuration
                    actions={actions}
                    actionsColumnWidth="50px"

                    // Add button configuration
                    showAddButton={true}
                    addButtonText="Create Loan"
                    addButtonIcon={<FaPlus />}
                    onAddClick={handleCreateLoan}

                    // Export configuration
                    showExportButton={true}
                    exportFileName="loans-report"
                    exportButtonText="Export Loans"

                    // Pagination configuration
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}

                    // Sorting configuration
                    defaultSortField="startDate"
                    defaultSortDirection="desc"

                    // Styling
                    className="loan-management-table"

                    // Row click handler
                    onRowClick={(loan) => navigate(`/payroll/loans/${loan.id}`)}
                />
            </div>

            {/* Create Loan Modal */}
            {showCreateModal && (
                <CreateLoanModal
                    employees={employees}
                    onClose={handleCloseModal}
                    onLoanCreated={handleLoanCreated}
                />
            )}
        </div>
    );
};

export default LoanManagement;