import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEye, FaCheck, FaTimes, FaCalendarAlt, FaExclamationTriangle, FaMoneyBillWave, FaFilter, FaSearch, FaEdit, FaHandHoldingUsd } from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import IntroCard from '../../../../components/common/IntroCard/IntroCard.jsx';
import LoanFormModal from '../components/LoanFormModal.jsx';
import LoanDetailsModal from '../components/LoanDetailsModal.jsx';
import './LoanManagement.scss';

const LoanManagement = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, showWarning } = useSnackbar();

    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        employeeName: '',
        startDate: '',
        endDate: '',
        page: 0,
        size: 20
    });
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loanStats, setLoanStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null,
        isLoading: false
    });

    useEffect(() => {
        loadLoans();
        loadLoanStats();
    }, [filters.page, filters.size]);

    const loadLoans = async () => {
        try {
            setLoading(true);
            setError(null);
            let response;

            console.log('Loading loans with filters:', filters);

            // Determine which API call to make based on current filter
            if (filters.status && filters.status !== '' && filters.status !== 'ALL') {
                console.log('Fetching loans by status:', filters.status);
                response = await loanService.getLoansByStatus(filters.status);
            } else {
                console.log('Fetching all active loans');
                // For "All Loans" tab, we should get all loans, not just active ones
                // Let's try getting all loans by fetching each status
                try {
                    // Try to get all loans by fetching each status
                    const [pendingResponse, activeResponse, completedResponse, rejectedResponse, cancelledResponse] = await Promise.all([
                        loanService.getLoansByStatus('PENDING').catch(() => ({ data: [] })),
                        loanService.getActiveLoans().catch(() => ({ data: [] })),
                        loanService.getLoansByStatus('COMPLETED').catch(() => ({ data: [] })),
                        loanService.getLoansByStatus('REJECTED').catch(() => ({ data: [] })),
                        loanService.getLoansByStatus('CANCELLED').catch(() => ({ data: [] }))
                    ]);

                    // Combine all loans
                    const allLoans = [
                        ...(pendingResponse.data || []),
                        ...(activeResponse.data || []),
                        ...(completedResponse.data || []),
                        ...(rejectedResponse.data || []),
                        ...(cancelledResponse.data || [])
                    ];

                    response = { data: allLoans };
                    console.log('Combined all loans:', allLoans.length);
                } catch (combineError) {
                    console.warn('Failed to combine all loans, falling back to active loans only');
                    response = await loanService.getActiveLoans();
                }
            }

            // Handle response data
            const allLoans = response.data || [];
            console.log('Received loans from API:', allLoans.length, allLoans);

            // Apply client-side filtering if needed
            let filteredLoans = allLoans;

            if (filters.employeeName && filters.employeeName.trim()) {
                filteredLoans = filteredLoans.filter(loan =>
                    loan.employeeName?.toLowerCase().includes(filters.employeeName.toLowerCase())
                );
                console.log('After employee name filter:', filteredLoans.length);
            }

            if (filters.startDate) {
                filteredLoans = filteredLoans.filter(loan =>
                    new Date(loan.startDate) >= new Date(filters.startDate)
                );
                console.log('After start date filter:', filteredLoans.length);
            }

            if (filters.endDate) {
                filteredLoans = filteredLoans.filter(loan =>
                    new Date(loan.endDate) <= new Date(filters.endDate)
                );
                console.log('After end date filter:', filteredLoans.length);
            }

            // Simple client-side pagination
            const startIndex = filters.page * filters.size;
            const endIndex = startIndex + filters.size;
            const paginatedLoans = filteredLoans.slice(startIndex, endIndex);

            console.log('Final paginated loans:', paginatedLoans.length);

            setLoans(paginatedLoans);
            setTotalElements(filteredLoans.length);
            setTotalPages(Math.ceil(filteredLoans.length / filters.size));

        } catch (error) {
            console.error('Error loading loans:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load loans';
            setError(errorMessage);
            showError(`Failed to load loans: ${errorMessage}`);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    const loadLoanStats = async () => {
        try {
            setStatsLoading(true);
            const response = await loanService.getLoanStatistics();
            setLoanStats(response.data);
        } catch (error) {
            console.error('Error loading loan statistics:', error);
            // Don't show error for stats failure, just log it
            setLoanStats({
                totalOutstanding: 0,
                activeLoans: 0,
                overdueLoans: 0,
                pendingLoans: 0,
                completedLoans: 0,
                rejectedLoans: 0,
                cancelledLoans: 0
            });
        } finally {
            setStatsLoading(false);
        }
    };

    const handleAddLoan = () => {
        setSelectedLoan(null);
        setShowAddModal(true);
    };

    const handleEditLoan = (loan) => {
        if (loan.status !== 'PENDING') {
            showWarning('Only pending loans can be edited');
            return;
        }
        setSelectedLoan(loan);
        setShowAddModal(true);
    };

    const handleViewLoan = (loan) => {
        setSelectedLoan(loan);
        setShowDetailsModal(true);
    };

    const handleApproveLoan = (loanId) => {
        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Approve Loan',
            message: 'Are you sure you want to approve this loan? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));
                try {
                    await loanService.approveLoan(loanId);
                    showSuccess('Loan approved successfully');
                    loadLoans();
                    loadLoanStats();
                } catch (error) {
                    console.error('Error approving loan:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to approve loan';
                    showError(`Failed to approve loan: ${errorMessage}`);
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
                }
            }
        });
    };

    const handleRejectLoan = (loanId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return; // User cancelled

        if (!reason.trim()) {
            showError('Rejection reason is required');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Reject Loan',
            message: `Are you sure you want to reject this loan?\n\nReason: "${reason}"\n\nThis action cannot be undone.`,
            confirmText: 'Reject',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));
                try {
                    await loanService.rejectLoan(loanId, 'SYSTEM', reason);
                    showSuccess('Loan rejected successfully');
                    loadLoans();
                    loadLoanStats();
                } catch (error) {
                    console.error('Error rejecting loan:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to reject loan';
                    showError(`Failed to reject loan: ${errorMessage}`);
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
                }
            }
        });
    };

    const handleCancelLoan = (loanId) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Cancel Loan',
            message: 'Are you sure you want to cancel this loan? This action cannot be undone.',
            confirmText: 'Cancel Loan',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));
                try {
                    await loanService.cancelLoan(loanId);
                    showSuccess('Loan cancelled successfully');
                    loadLoans();
                    loadLoanStats();
                } catch (error) {
                    console.error('Error cancelling loan:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel loan';
                    showError(`Failed to cancel loan: ${errorMessage}`);
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
                }
            }
        });
    };

    const handleProcessRepayment = async (scheduleId, amount) => {
        try {
            await loanService.processRepayment(scheduleId, amount);
            showSuccess('Repayment processed successfully');
            loadLoans();
            loadLoanStats();
        } catch (error) {
            console.error('Error processing repayment:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to process repayment';
            showError(`Failed to process repayment: ${errorMessage}`);
        }
    };

    const handleLoanSaved = () => {
        setShowAddModal(false);
        setSelectedLoan(null);
        loadLoans();
        loadLoanStats();
        showSuccess(selectedLoan ? 'Loan updated successfully' : 'Loan created successfully');
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            page: 0
        }));
    };

    const handleSearch = () => {
        loadLoans();
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleStatusFilterChange = (status) => {
        setFilters(prev => ({
            ...prev,
            status,
            page: 0
        }));
    };

    // Calculate loan statistics for IntroCard
    const calculateStats = () => {
        const totalOutstanding = loanStats?.totalOutstanding || 0;
        const activeLoans = loanStats?.activeLoans || 0;
        const pendingLoans = loanStats?.pendingLoans || 0;
        const overdueLoans = loanStats?.overdueLoans || 0;

        return [
            { value: formatCurrency(totalOutstanding), label: 'Total Outstanding' },
            { value: activeLoans.toString(), label: 'Active Loans' },
            { value: pendingLoans.toString(), label: 'Pending Approval' },
            { value: overdueLoans.toString(), label: 'Overdue' }
        ];
    };

    // Define table columns
    const columns = [
        {
            id: 'employee',
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            render: (loan) => (
                <div className="employee-info">
                    <div className="employee-name">{loan.employeeName}</div>
                    <div className="employee-id">ID: {loan.employeeId}</div>
                </div>
            )
        },
        {
            id: 'loanAmount',
            accessor: 'loanAmount',
            header: 'Loan Amount',
            sortable: true,
            filterable: false,
            render: (loan) => formatCurrency(loan.loanAmount)
        },
        {
            id: 'remainingBalance',
            accessor: 'remainingBalance',
            header: 'Remaining',
            sortable: true,
            filterable: false,
            render: (loan) => (
                <span className="remaining-balance">
                    {formatCurrency(loan.remainingBalance)}
                </span>
            )
        },
        {
            id: 'installmentAmount',
            accessor: 'installmentAmount',
            header: 'Monthly Payment',
            sortable: true,
            filterable: false,
            render: (loan) => formatCurrency(loan.installmentAmount)
        },
        {
            id: 'progress',
            accessor: 'paidInstallments',
            header: 'Progress',
            sortable: false,
            filterable: false,
            render: (loan) => (
                <LoanProgress
                    paid={loan.paidInstallments || 0}
                    total={loan.totalInstallments}
                    percentage={((loan.paidInstallments || 0) / loan.totalInstallments) * 100}
                />
            )
        },
        {
            id: 'startDate',
            accessor: 'startDate',
            header: 'Start Date',
            sortable: true,
            filterable: false,
            render: (loan) => new Date(loan.startDate).toLocaleDateString()
        },
        {
            id: 'endDate',
            accessor: 'endDate',
            header: 'End Date',
            sortable: true,
            filterable: false,
            render: (loan) => new Date(loan.endDate).toLocaleDateString()
        },
        {
            id: 'status',
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            render: (loan) => getLoanStatusBadge(loan.status)
        }
    ];

    // Define table actions
    const actions = [
        {
            id: 'view',
            label: 'View Details',
            icon: <FaEye />,
            onClick: (loan) => handleViewLoan(loan),
            className: 'action-view'
        },
        {
            id: 'edit',
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (loan) => handleEditLoan(loan),
            className: 'action-edit',
            isDisabled: (loan) => loan.status !== 'PENDING'
        },
        {
            id: 'approve',
            label: 'Approve',
            icon: <FaCheck />,
            onClick: (loan) => handleApproveLoan(loan.id),
            className: 'action-approve',
            isDisabled: (loan) => loan.status !== 'PENDING'
        },
        {
            id: 'reject',
            label: 'Reject',
            icon: <FaTimes />,
            onClick: (loan) => handleRejectLoan(loan.id),
            className: 'action-reject',
            isDisabled: (loan) => loan.status !== 'PENDING'
        },
        {
            id: 'cancel',
            label: 'Cancel',
            icon: <FaTimes />,
            onClick: (loan) => handleCancelLoan(loan.id),
            className: 'action-cancel',
            isDisabled: (loan) => ['COMPLETED', 'CANCELLED'].includes(loan.status)
        }
    ];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getLoanStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'pending', text: 'Pending' },
            APPROVED: { class: 'approved', text: 'Approved' },
            ACTIVE: { class: 'active', text: 'Active' },
            COMPLETED: { class: 'completed', text: 'Completed' },
            REJECTED: { class: 'rejected', text: 'Rejected' },
            CANCELLED: { class: 'cancelled', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { class: 'pending', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
                {config.text}
            </span>
        );
    };

    if (error) {
        return (
            <div className="loan-management">
                <div className="error-state">
                    <div className="error-content">
                        <FaExclamationTriangle className="error-icon" />
                        <h3>Error Loading Loans</h3>
                        <p>{error}</p>
                        <button
                            className="btn btn-primary"
                            onClick={loadLoans}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="loan-management">
            {/* IntroCard with loan statistics */}
            <IntroCard
                title="Employee Loan Management"
                label="LOAN CENTER"
                icon={<FaHandHoldingUsd />}
                stats={calculateStats()}
                className="loan-intro-card"
            />

            {/* Filter Tabs */}
            <div className="loan-management__filters">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filters.status === '' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('')}
                    >
                        All Loans ({(loanStats?.totalLoans || 0)})
                    </button>
                    <button
                        className={`filter-tab ${filters.status === 'PENDING' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('PENDING')}
                    >
                        Pending ({(loanStats?.pendingLoans || 0)})
                    </button>
                    <button
                        className={`filter-tab ${filters.status === 'ACTIVE' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('ACTIVE')}
                    >
                        Active ({(loanStats?.activeLoans || 0)})
                    </button>
                    <button
                        className={`filter-tab ${filters.status === 'COMPLETED' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('COMPLETED')}
                    >
                        Completed ({(loanStats?.completedLoans || 0)})
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                // Data props
                data={loans}
                columns={columns}
                loading={loading}

                // Table configuration
                tableTitle="Employee Loans"
                emptyStateMessage="No loans found"
                noResultsMessage="No loans match your search criteria"
                defaultSortField="startDate"
                defaultSortDirection="desc"
                defaultItemsPerPage={20}
                itemsPerPageOptions={[10, 20, 50, 100]}

                // Search and filters
                showSearch={true}
                showFilters={true}

                // Actions
                actions={actions}

                // Add button configuration
                showAddButton={true}
                addButtonText="Create New Loan"
                addButtonIcon={<FaPlus />}
                onAddClick={handleAddLoan}
                addButtonDisabled={loading}

                // Export functionality
                showExportButton={true}
                exportButtonText="Export Loans"
                exportFileName={`Employee_Loans_${new Date().toISOString().split('T')[0]}`}
                exportAllData={true}
                customExportHeaders={{
                    employeeName: 'Employee Name',
                    loanAmount: 'Loan Amount (USD)',
                    remainingBalance: 'Remaining Balance (USD)',
                    installmentAmount: 'Monthly Payment (USD)',
                    startDate: 'Start Date',
                    endDate: 'End Date',
                    status: 'Loan Status'
                }}
                onExportStart={() => {
                    console.log('Export started');
                    showSuccess('Starting loans export...');
                }}
                onExportComplete={(data) => {
                    console.log('Export completed:', data);
                    showSuccess(`Successfully exported ${data.rowCount} loans to Excel`);
                }}
                onExportError={(error) => {
                    console.error('Export failed:', error);
                    showError('Failed to export loans. Please try again.');
                }}

                // Styling
                className="loan-data-table"
            />

            {/* Modals */}
            {showAddModal && (
                <LoanFormModal
                    loan={selectedLoan}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleLoanSaved}
                />
            )}

            {showDetailsModal && selectedLoan && (
                <LoanDetailsModal
                    loan={selectedLoan}
                    onClose={() => setShowDetailsModal(false)}
                    onProcessRepayment={handleProcessRepayment}
                />
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText || 'Confirm'}
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleCloseConfirmDialog}
                isLoading={confirmDialog.isLoading}
            />
        </div>
    );
};

// Loan Progress Component
const LoanProgress = ({ paid, total, percentage }) => {
    return (
        <div className="loan-progress">
            <div className="progress-info">
                <span className="progress-text">{paid}/{total}</span>
                <span className="progress-percentage">{Math.round(percentage)}%</span>
            </div>
            <div className="loan-progress-bar">
                <div
                    className="loan-progress-fill"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
};

export default LoanManagement;