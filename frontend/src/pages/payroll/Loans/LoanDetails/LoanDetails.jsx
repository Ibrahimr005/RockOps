// ========================================
// FILE: LoanDetails.jsx
// Loan Details Page - Backend Integrated
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft,
    FaEdit,
    FaCheck,
    FaTimes,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaUser,
    FaFileAlt,
    FaPaperPlane,
    FaUniversity,
    FaSpinner,
    FaPercent,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaHourglassHalf,
    FaHistory,
    FaInfoCircle
} from 'react-icons/fa';
import { loanService, LOAN_STATUS, LOAN_STATUS_CONFIG } from '../../../../services/payroll/loanService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import PageHeader from '../../../../components/common/PageHeader/index.js';
import './LoanDetails.scss';

const LoanDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError, showWarning } = useSnackbar();

    // State
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // ========================================
    // DATA LOADING
    // ========================================
    const loadLoanDetails = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            const response = await loanService.getLoanById(id);
            setLoan(response.data);
        } catch (err) {
            console.error('Error loading loan details:', err);
            const errorMessage = err.response?.data?.message || 'Failed to load loan details';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [id, showError]);

    useEffect(() => {
        loadLoanDetails();
    }, [loadLoanDetails]);

    // ========================================
    // ACTION HANDLERS
    // ========================================
    const handleHRApprove = async () => {
        if (!window.confirm('Are you sure you want to approve this loan? This will send it to Finance for review.')) {
            return;
        }

        try {
            setActionLoading('hr-approve');
            await loanService.approveLoan(id);
            showSuccess('Loan approved and sent to Finance for review');
            loadLoanDetails();
        } catch (err) {
            console.error('Error approving loan:', err);
            showError(err.response?.data?.message || 'Failed to approve loan');
        } finally {
            setActionLoading(null);
        }
    };

    const handleHRReject = async () => {
        if (!rejectReason.trim()) {
            showWarning('Please provide a reason for rejection');
            return;
        }

        try {
            setActionLoading('hr-reject');
            await loanService.rejectLoan(id, null, rejectReason);
            showSuccess('Loan rejected');
            setShowRejectModal(false);
            setRejectReason('');
            loadLoanDetails();
        } catch (err) {
            console.error('Error rejecting loan:', err);
            showError(err.response?.data?.message || 'Failed to reject loan');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendToFinance = async () => {
        if (!window.confirm('Are you sure you want to send this loan to Finance?')) {
            return;
        }

        try {
            setActionLoading('send-finance');
            await loanService.sendToFinance(id);
            showSuccess('Loan sent to Finance for approval');
            loadLoanDetails();
        } catch (err) {
            console.error('Error sending to finance:', err);
            showError(err.response?.data?.message || 'Failed to send to finance');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelLoan = async () => {
        const reason = window.prompt('Please provide a reason for cancellation:');
        if (reason === null) return;
        if (!reason.trim()) {
            showWarning('Please provide a reason for cancellation');
            return;
        }

        try {
            setActionLoading('cancel');
            await loanService.cancelLoan(id, reason);
            showSuccess('Loan cancelled');
            loadLoanDetails();
        } catch (err) {
            console.error('Error cancelling loan:', err);
            showError(err.response?.data?.message || 'Failed to cancel loan');
        } finally {
            setActionLoading(null);
        }
    };

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP',
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

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const config = LOAN_STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="loan-details-status-badge"
                style={{
                    color: config.color,
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.color}20`
                }}
            >
                {config.label}
            </span>
        );
    };

    const getFinanceStatusBadge = (status) => {
        const configs = {
            NOT_SUBMITTED: { label: 'Not Submitted', color: '#6b7280', bgColor: '#f3f4f6' },
            PENDING: { label: 'Pending', color: '#d97706', bgColor: '#fef3c7' },
            UNDER_REVIEW: { label: 'Under Review', color: '#2563eb', bgColor: '#dbeafe' },
            APPROVED: { label: 'Approved', color: '#059669', bgColor: '#d1fae5' },
            REJECTED: { label: 'Rejected', color: '#dc2626', bgColor: '#fee2e2' },
            REQUIRES_MODIFICATION: { label: 'Needs Changes', color: '#d97706', bgColor: '#fef3c7' }
        };
        const config = configs[status] || { label: status || '-', color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="loan-details-status-badge"
                style={{
                    color: config.color,
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.color}20`
                }}
            >
                {config.label}
            </span>
        );
    };

    // Calculate progress
    const getProgress = () => {
        if (!loan) return { percentage: 0, paid: 0, remaining: 0 };
        const paid = loan.paymentsMade || 0;
        const total = loan.effectiveInstallmentMonths || loan.installmentMonths || 1;
        const percentage = total > 0 ? (paid / total) * 100 : 0;
        return { percentage, paid, total };
    };

    // Check action permissions
    const canHRApprove = loan && [LOAN_STATUS.PENDING_HR_APPROVAL, LOAN_STATUS.PENDING, LOAN_STATUS.DRAFT].includes(loan.status);
    const canSendToFinance = loan && loan.status === LOAN_STATUS.HR_APPROVED;
    const canCancel = loan && ![LOAN_STATUS.COMPLETED, LOAN_STATUS.CANCELLED, LOAN_STATUS.ACTIVE, LOAN_STATUS.DISBURSED].includes(loan.status);

    // ========================================
    // RENDER
    // ========================================
    if (loading) {
        return (
            <div className="loan-details">
                <div className="loan-details-loading">
                    <FaSpinner className="loan-details-spinner" />
                    <span>Loading loan details...</span>
                </div>
            </div>
        );
    }

    if (error || !loan) {
        return (
            <div className="loan-details">
                <div className="loan-details-error">
                    <FaTimesCircle className="loan-details-error-icon" />
                    <h3>Error Loading Loan</h3>
                    <p>{error || 'Loan not found'}</p>
                    <button
                        className="loan-details-btn loan-details-btn-primary"
                        onClick={() => navigate('/payroll/loans')}
                    >
                        <FaArrowLeft /> Back to Loans
                    </button>
                </div>
            </div>
        );
    }

    const progress = getProgress();

    return (
        <div className="loan-details">
            {/* Header */}
            <PageHeader
                title={`Loan: ${loan.loanNumber}`}
                subtitle={`Employee: ${loan.employeeName || 'N/A'}`}
                actions={
                    <div className="loan-details-header-actions">
                        <button
                            className="loan-details-btn loan-details-btn-secondary"
                            onClick={() => navigate('/payroll/loans')}
                        >
                            <FaArrowLeft /> Back
                        </button>
                    </div>
                }
            />

            {/* Status & Actions Bar */}
            <div className="loan-details-status-bar">
                <div className="loan-details-status-info">
                    <span className="loan-details-status-label">Status:</span>
                    {getStatusBadge(loan.status)}
                    {loan.financeStatus && loan.financeStatus !== 'NOT_SUBMITTED' && (
                        <>
                            <span className="loan-details-status-separator">|</span>
                            <span className="loan-details-status-label">Finance:</span>
                            {getFinanceStatusBadge(loan.financeStatus)}
                        </>
                    )}
                </div>
                <div className="loan-details-actions">
                    {canHRApprove && (
                        <>
                            <button
                                className="loan-details-btn loan-details-btn-success"
                                onClick={handleHRApprove}
                                disabled={actionLoading}
                            >
                                {actionLoading === 'hr-approve' ? <FaSpinner className="loan-details-spinner" /> : <FaCheck />}
                                Approve
                            </button>
                            <button
                                className="loan-details-btn loan-details-btn-danger"
                                onClick={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                            >
                                <FaTimes /> Reject
                            </button>
                        </>
                    )}
                    {canSendToFinance && (
                        <button
                            className="loan-details-btn loan-details-btn-primary"
                            onClick={handleSendToFinance}
                            disabled={actionLoading}
                        >
                            {actionLoading === 'send-finance' ? <FaSpinner className="loan-details-spinner" /> : <FaPaperPlane />}
                            Send to Finance
                        </button>
                    )}
                    {canCancel && (
                        <button
                            className="loan-details-btn loan-details-btn-outline-danger"
                            onClick={handleCancelLoan}
                            disabled={actionLoading}
                        >
                            {actionLoading === 'cancel' ? <FaSpinner className="loan-details-spinner" /> : <FaTimes />}
                            Cancel Loan
                        </button>
                    )}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="loan-details-overview">
                <div className="loan-details-card loan-details-card-primary">
                    <div className="loan-details-card-icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="loan-details-card-content">
                        <span className="loan-details-card-label">Loan Amount</span>
                        <span className="loan-details-card-value">{formatCurrency(loan.loanAmount)}</span>
                    </div>
                </div>
                <div className="loan-details-card loan-details-card-warning">
                    <div className="loan-details-card-icon">
                        <FaHourglassHalf />
                    </div>
                    <div className="loan-details-card-content">
                        <span className="loan-details-card-label">Remaining Balance</span>
                        <span className="loan-details-card-value">{formatCurrency(loan.remainingBalance)}</span>
                    </div>
                </div>
                <div className="loan-details-card loan-details-card-info">
                    <div className="loan-details-card-icon">
                        <FaCalendarAlt />
                    </div>
                    <div className="loan-details-card-content">
                        <span className="loan-details-card-label">Monthly Payment</span>
                        <span className="loan-details-card-value">{formatCurrency(loan.effectiveMonthlyInstallment || loan.monthlyInstallment)}</span>
                    </div>
                </div>
                <div className="loan-details-card loan-details-card-success">
                    <div className="loan-details-card-icon">
                        <FaPercent />
                    </div>
                    <div className="loan-details-card-content">
                        <span className="loan-details-card-label">Interest Rate</span>
                        <span className="loan-details-card-value">{loan.interestRate || 0}%</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {(loan.status === LOAN_STATUS.ACTIVE || loan.status === LOAN_STATUS.DISBURSED || loan.status === LOAN_STATUS.COMPLETED) && (
                <div className="loan-details-progress-section">
                    <h3><FaCheckCircle /> Repayment Progress</h3>
                    <div className="loan-details-progress-container">
                        <div className="loan-details-progress-bar">
                            <div
                                className="loan-details-progress-fill"
                                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                            />
                        </div>
                        <div className="loan-details-progress-info">
                            <span>{progress.paid} of {progress.total} payments ({Math.round(progress.percentage)}%)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="loan-details-content">
                {/* Employee Information */}
                <div className="loan-details-section">
                    <h3><FaUser /> Employee Information</h3>
                    <div className="loan-details-grid">
                        <div className="loan-details-field">
                            <label>Employee Name</label>
                            <span>{loan.employeeName || '-'}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Employee Number</label>
                            <span>{loan.employeeNumber || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Loan Information */}
                <div className="loan-details-section">
                    <h3><FaFileAlt /> Loan Information</h3>
                    <div className="loan-details-grid">
                        <div className="loan-details-field">
                            <label>Loan Number</label>
                            <span className="loan-details-mono">{loan.loanNumber}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Loan Amount</label>
                            <span>{formatCurrency(loan.loanAmount)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Total Installments</label>
                            <span>{loan.effectiveInstallmentMonths || loan.installmentMonths} months</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Monthly Installment</label>
                            <span>{formatCurrency(loan.effectiveMonthlyInstallment || loan.monthlyInstallment)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Interest Rate</label>
                            <span>{loan.interestRate || 0}%</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Total Interest</label>
                            <span>{formatCurrency(loan.totalInterest)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Total Payment Amount</label>
                            <span>{formatCurrency(loan.totalPaymentAmount)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Remaining Balance</label>
                            <span className="loan-details-highlight">{formatCurrency(loan.remainingBalance)}</span>
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="loan-details-section">
                    <h3><FaCalendarAlt /> Important Dates</h3>
                    <div className="loan-details-grid">
                        <div className="loan-details-field">
                            <label>Loan Date</label>
                            <span>{formatDate(loan.loanDate)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Disbursement Date</label>
                            <span>{formatDate(loan.disbursementDate)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>First Payment Date</label>
                            <span>{formatDate(loan.firstPaymentDate)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Last Payment Date</label>
                            <span>{formatDate(loan.lastPaymentDate)}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Completion Date</label>
                            <span>{formatDate(loan.completionDate)}</span>
                        </div>
                    </div>
                </div>

                {/* Purpose & Notes */}
                {(loan.purpose || loan.notes) && (
                    <div className="loan-details-section">
                        <h3><FaInfoCircle /> Purpose & Notes</h3>
                        <div className="loan-details-grid loan-details-grid-full">
                            {loan.purpose && (
                                <div className="loan-details-field loan-details-field-full">
                                    <label>Purpose</label>
                                    <span>{loan.purpose}</span>
                                </div>
                            )}
                            {loan.notes && (
                                <div className="loan-details-field loan-details-field-full">
                                    <label>Notes</label>
                                    <span>{loan.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HR Approval Info */}
                {(loan.hrApprovedBy || loan.hrRejectedBy) && (
                    <div className="loan-details-section">
                        <h3><FaUser /> HR Approval</h3>
                        <div className="loan-details-grid">
                            {loan.hrApprovedBy && (
                                <>
                                    <div className="loan-details-field">
                                        <label>Approved By</label>
                                        <span>{loan.hrApprovedBy}</span>
                                    </div>
                                    <div className="loan-details-field">
                                        <label>Approved At</label>
                                        <span>{formatDateTime(loan.hrApprovedAt)}</span>
                                    </div>
                                </>
                            )}
                            {loan.hrRejectedBy && (
                                <>
                                    <div className="loan-details-field">
                                        <label>Rejected By</label>
                                        <span>{loan.hrRejectedBy}</span>
                                    </div>
                                    <div className="loan-details-field">
                                        <label>Rejected At</label>
                                        <span>{formatDateTime(loan.hrRejectedAt)}</span>
                                    </div>
                                    <div className="loan-details-field loan-details-field-full">
                                        <label>Rejection Reason</label>
                                        <span className="loan-details-rejection-reason">{loan.hrRejectionReason}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Finance Info */}
                {loan.financeStatus && loan.financeStatus !== 'NOT_SUBMITTED' && (
                    <div className="loan-details-section">
                        <h3><FaUniversity /> Finance Review</h3>
                        <div className="loan-details-grid">
                            <div className="loan-details-field">
                                <label>Finance Status</label>
                                <span>{getFinanceStatusBadge(loan.financeStatus)}</span>
                            </div>
                            {loan.financeRequestNumber && (
                                <div className="loan-details-field">
                                    <label>Request Number</label>
                                    <span className="loan-details-mono">{loan.financeRequestNumber}</span>
                                </div>
                            )}
                            {loan.financeApprovedAmount && (
                                <div className="loan-details-field">
                                    <label>Approved Amount</label>
                                    <span>{formatCurrency(loan.financeApprovedAmount)}</span>
                                </div>
                            )}
                            {loan.financeApprovedInstallments && (
                                <div className="loan-details-field">
                                    <label>Approved Installments</label>
                                    <span>{loan.financeApprovedInstallments} months</span>
                                </div>
                            )}
                            {loan.financeApprovedBy && (
                                <>
                                    <div className="loan-details-field">
                                        <label>Approved By</label>
                                        <span>{loan.financeApprovedBy}</span>
                                    </div>
                                    <div className="loan-details-field">
                                        <label>Approved At</label>
                                        <span>{formatDateTime(loan.financeApprovedAt)}</span>
                                    </div>
                                </>
                            )}
                            {loan.financeRejectedBy && (
                                <>
                                    <div className="loan-details-field">
                                        <label>Rejected By</label>
                                        <span>{loan.financeRejectedBy}</span>
                                    </div>
                                    <div className="loan-details-field">
                                        <label>Rejected At</label>
                                        <span>{formatDateTime(loan.financeRejectedAt)}</span>
                                    </div>
                                    <div className="loan-details-field loan-details-field-full">
                                        <label>Rejection Reason</label>
                                        <span className="loan-details-rejection-reason">{loan.financeRejectionReason}</span>
                                    </div>
                                </>
                            )}
                            {loan.financeNotes && (
                                <div className="loan-details-field loan-details-field-full">
                                    <label>Finance Notes</label>
                                    <span>{loan.financeNotes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Disbursement Info */}
                {loan.disbursedBy && (
                    <div className="loan-details-section">
                        <h3><FaMoneyBillWave /> Disbursement</h3>
                        <div className="loan-details-grid">
                            <div className="loan-details-field">
                                <label>Disbursed By</label>
                                <span>{loan.disbursedBy}</span>
                            </div>
                            <div className="loan-details-field">
                                <label>Disbursed At</label>
                                <span>{formatDateTime(loan.disbursedAt)}</span>
                            </div>
                            {loan.paymentSourceType && (
                                <div className="loan-details-field">
                                    <label>Payment Source</label>
                                    <span>{loan.paymentSourceType}: {loan.paymentSourceName || loan.paymentSourceId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Audit Trail */}
                <div className="loan-details-section">
                    <h3><FaHistory /> Audit Trail</h3>
                    <div className="loan-details-grid">
                        <div className="loan-details-field">
                            <label>Created By</label>
                            <span>{loan.createdBy || '-'}</span>
                        </div>
                        <div className="loan-details-field">
                            <label>Created At</label>
                            <span>{formatDateTime(loan.createdAt)}</span>
                        </div>
                        {loan.updatedBy && (
                            <>
                                <div className="loan-details-field">
                                    <label>Last Updated By</label>
                                    <span>{loan.updatedBy}</span>
                                </div>
                                <div className="loan-details-field">
                                    <label>Last Updated At</label>
                                    <span>{formatDateTime(loan.updatedAt)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="loan-details-modal-overlay">
                    <div className="loan-details-modal">
                        <div className="loan-details-modal-header">
                            <h3>Reject Loan</h3>
                            <button
                                className="loan-details-modal-close"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="loan-details-modal-content">
                            <p>Please provide a reason for rejecting this loan request:</p>
                            <textarea
                                className="loan-details-textarea"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                rows={4}
                            />
                        </div>
                        <div className="loan-details-modal-actions">
                            <button
                                className="loan-details-btn loan-details-btn-secondary"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="loan-details-btn loan-details-btn-danger"
                                onClick={handleHRReject}
                                disabled={actionLoading === 'hr-reject'}
                            >
                                {actionLoading === 'hr-reject' ? <FaSpinner className="loan-details-spinner" /> : <FaTimes />}
                                Reject Loan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanDetails;
