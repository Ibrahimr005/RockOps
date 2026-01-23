// ========================================
// FILE: LoanManagement.jsx
// Loan Management Page - Complete Rewrite
// ========================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaPlus,
    FaDollarSign,
    FaUsers,
    FaFileInvoice,
    FaEye,
    FaEdit,
    FaCheck,
    FaTimes,
    FaClock,
    FaUniversity,
    FaCheckCircle,
    FaBan,
    FaSpinner,
    FaMoneyBillWave
} from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import CreateLoanModal from '../components/CreateLoanModal/CreateLoanModal';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { loanService, LOAN_STATUS, LOAN_STATUS_CONFIG } from '../../../../services/payroll/loanService';
import { employeeService } from '../../../../services/hr/employeeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './LoanManagement.scss';
import PageHeader from "../../../../components/common/PageHeader/index.js";

const LoanManagement = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

    // ========================================
    // STATE
    // ========================================
    const [loans, setLoans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    // ========================================
    // DATA LOADING
    // ========================================
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            const [employeesRes, loansRes] = await Promise.all([
                employeeService.getAll(),
                loanService.getAllLoans()
            ]);

            setEmployees(employeesRes.data || []);
            setLoans(loansRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showError(error.response?.data?.message || 'Failed to load loan data');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ========================================
    // STATISTICS
    // ========================================
    const statistics = useMemo(() => {
        return loanService.calculateStatistics(loans);
    }, [loans]);

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateProgress = (loanAmount, remainingBalance) => {
        if (!loanAmount || loanAmount <= 0) return 0;
        const paid = (loanAmount - (remainingBalance || 0));
        return Math.min(100, Math.max(0, Math.round((paid / loanAmount) * 100)));
    };

    // ========================================
    // ACTION HANDLERS
    // ========================================
    const handleApproveLoan = async (loan) => {
        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Approve Loan',
            message: `Are you sure you want to approve the loan for ${loan.employeeName || 'this employee'}? This will automatically generate a finance payment request.`,
            onConfirm: async () => {
                try {
                    setProcessingId(loan.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    const response = await loanService.approveLoan(loan.id);
                    const updatedLoan = response.data;

                    setLoans(prev => prev.map(l =>
                        l.id === loan.id ? { ...l, ...updatedLoan } : l
                    ));

                    showSuccess('Loan approved! Finance request has been auto-generated.');
                } catch (error) {
                    console.error('Error approving loan:', error);
                    showError(error.response?.data?.message || 'Failed to approve loan');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleRejectLoan = (loan) => {
        setSelectedLoanId(loan.id);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmRejectLoan = async () => {
        if (!rejectionReason.trim()) {
            showWarning('Please provide a rejection reason');
            return;
        }

        try {
            setProcessingId(selectedLoanId);
            setShowRejectModal(false);

            const response = await loanService.rejectLoan(selectedLoanId, null, rejectionReason);
            const updatedLoan = response.data;

            setLoans(prev => prev.map(l =>
                l.id === selectedLoanId ? { ...l, ...updatedLoan } : l
            ));

            showInfo('Loan has been rejected');
            setRejectionReason('');
            setSelectedLoanId(null);
        } catch (error) {
            console.error('Error rejecting loan:', error);
            showError(error.response?.data?.message || 'Failed to reject loan');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelLoan = async (loan) => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Cancel Loan',
            message: `Are you sure you want to cancel the loan ${loan.loanNumber || ''} for ${loan.employeeName}? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    setProcessingId(loan.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await loanService.cancelLoan(loan.id, 'Cancelled by HR');

                    setLoans(prev => prev.map(l =>
                        l.id === loan.id ? { ...l, status: LOAN_STATUS.CANCELLED } : l
                    ));

                    showInfo('Loan has been cancelled');
                } catch (error) {
                    console.error('Error cancelling loan:', error);
                    showError(error.response?.data?.message || 'Failed to cancel loan');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleLoanCreated = (newLoan) => {
        setLoans(prev => [newLoan, ...prev]);
        setShowCreateModal(false);
        showSuccess(`Loan ${newLoan.loanNumber || ''} created successfully`);
    };

    // ========================================
    // STATUS BADGE RENDERER
    // ========================================
    const renderStatusBadge = (status) => {
        const config = LOAN_STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="loan-status-badge"
                style={{
                    backgroundColor: config.bgColor,
                    color: config.color,
                    border: `1px solid ${config.color}20`
                }}
            >
                {config.label}
            </span>
        );
    };

    // ========================================
    // TABLE COLUMNS
    // ========================================
    const columns = [
        {
            accessor: 'loanNumber',
            header: 'Loan #',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (loan) => (
                <span className="loan-number">
                    {loan.loanNumber || `#${loan.id?.slice(-8)}`}
                </span>
            )
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (loan) => (
                <div className="employee-cell">
                    <span className="employee-name">{loan.employeeName || 'Unknown'}</span>
                    {loan.employeeNumber && (
                        <span className="employee-number">{loan.employeeNumber}</span>
                    )}
                </div>
            )
        },
        {
            accessor: 'loanAmount',
            header: 'Amount',
            sortable: true,
            render: (loan) => (
                <span className="loan-amount">{formatCurrency(loan.loanAmount)}</span>
            )
        },
        {
            accessor: 'monthlyInstallment',
            header: 'Monthly',
            sortable: true,
            render: (loan) => (
                <span className="monthly-amount">
                    {formatCurrency(loan.effectiveMonthlyInstallment || loan.monthlyInstallment)}
                </span>
            )
        },
        {
            accessor: 'remainingBalance',
            header: 'Balance',
            sortable: true,
            render: (loan) => {
                const progress = calculateProgress(loan.loanAmount, loan.remainingBalance);
                return (
                    <div className="balance-cell">
                        <span className="balance-amount">{formatCurrency(loan.remainingBalance)}</span>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="progress-text">{progress}% paid</span>
                    </div>
                );
            }
        },
        {
            accessor: 'installmentMonths',
            header: 'Term',
            sortable: true,
            render: (loan) => (
                <span className="term-cell">
                    {loan.effectiveInstallmentMonths || loan.installmentMonths || '-'} months
                </span>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (loan) => renderStatusBadge(loan.status)
        },
        {
            accessor: 'loanDate',
            header: 'Date',
            sortable: true,
            render: (loan) => formatDate(loan.loanDate)
        }
    ];

    // ========================================
    // TABLE ACTIONS
    // ========================================
    const actions = [
        {
            label: 'View',
            icon: <FaEye />,
            onClick: (loan) => navigate(`/payroll/loans/${loan.id}`),
            className: 'action-view'
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (loan) => navigate(`/payroll/loans/${loan.id}/edit`),
            isVisible: (loan) => loanService.canEditLoan(loan),
            className: 'action-edit'
        },
        {
            label: 'Approve',
            icon: processingId ? <FaSpinner className="spin" /> : <FaCheck />,
            onClick: handleApproveLoan,
            isVisible: (loan) => loanService.isPendingHRApproval(loan),
            isDisabled: (loan) => processingId === loan.id,
            className: 'action-approve'
        },
        {
            label: 'Reject',
            icon: <FaTimes />,
            onClick: handleRejectLoan,
            isVisible: (loan) => loanService.isPendingHRApproval(loan),
            isDisabled: (loan) => processingId === loan.id,
            className: 'action-reject'
        },
        {
            label: 'Cancel',
            icon: <FaBan />,
            onClick: handleCancelLoan,
            isVisible: (loan) => loanService.canEditLoan(loan),
            isDisabled: (loan) => processingId === loan.id,
            className: 'action-cancel'
        }
    ];

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="loan-management">
            {/* Header */}
            <PageHeader title={"Loan Management"} subtitle={"Manage employee loans, approvals, and track repayment schedules"} />

            {/* Statistics Cards */}
            <div className="loan-management-stats">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <FaFileInvoice />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.total}</span>
                        <span className="stat-label">Total Loans</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon active">
                        <FaCheckCircle />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.active}</span>
                        <span className="stat-label">Active Loans</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon pending-hr">
                        <FaClock />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.pendingHR}</span>
                        <span className="stat-label">Pending HR</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon pending-finance">
                        <FaUniversity />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.pendingFinance}</span>
                        <span className="stat-label">Pending Finance</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon outstanding">
                        <FaDollarSign />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(statistics.totalOutstanding)}</span>
                        <span className="stat-label">Outstanding</span>
                    </div>
                </div>
            </div>

            {/* Data Table */}
                <DataTable
                    data={loans}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No loans found. Create a new loan to get started."

                    showSearch={true}
                    showFilters={true}
                    filterableColumns={columns.filter(c => c.filterable)}

                    actions={actions}
                    actionsColumnWidth="180px"

                    showAddButton={true}
                    addButtonText="New Loan"
                    addButtonIcon={<FaPlus />}
                    onAddClick={() => setShowCreateModal(true)}

                    showExportButton={true}
                    exportFileName="loans-export"

                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    defaultSortField="loanDate"
                    defaultSortDirection="desc"

                    onRowClick={(loan) => navigate(`/payroll/loans/${loan.id}`)}
                    className="loan-data-table"
                />
            {/* Create Loan Modal */}
            {showCreateModal && (
                <CreateLoanModal
                    employees={employees}
                    onClose={() => setShowCreateModal(false)}
                    onLoanCreated={handleLoanCreated}
                />
            )}

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="modal-overlay">
                    <div className="rejection-modal">
                        <h3>Reject Loan</h3>
                        <p>Please provide a reason for rejecting this loan:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                        />
                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                    setSelectedLoanId(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-reject"
                                onClick={confirmRejectLoan}
                                disabled={!rejectionReason.trim() || processingId}
                            >
                                {processingId ? <FaSpinner className="spin" /> : null}
                                Reject Loan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default LoanManagement;
