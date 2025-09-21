// LeaveRequestDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaCheck, FaTimes, FaCalendarAlt, FaUser, FaClock,
    FaPhone, FaHandsHelping, FaFileAlt, FaEdit
} from 'react-icons/fa';
import EmployeeAvatar from '../../../components/common/EmployeeAvatar';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { leaveRequestService } from '../../../services/hr/leaveRequestService';
import './LeaveRequestDetailPage.scss';

const LeaveRequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [leaveRequest, setLeaveRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isVisible: false });

    // Fetch leave request details
    const fetchLeaveRequest = async () => {
        try {
            setLoading(true);
            const response = await leaveRequestService.getLeaveRequest(id);

            if (response.data.success) {
                setLeaveRequest(response.data.data);
            } else {
                showError('Failed to load leave request details');
                console.log(response.data)
            }
        } catch (error) {
            console.error('Error fetching leave request:', error);
            showError('Failed to load leave request details');
            navigate('/hr/leave-requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveRequest();
    }, [id]);

    // Action handlers
    const handleApprove = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Approve Leave Request',
            message: `Are you sure you want to approve this ${leaveRequest.leaveTypeDisplay} request for ${leaveRequest.employeeName}?\n\nThis will update their vacation balance and attendance records.`,
            confirmText: 'Approve Request',
            showInput: true,
            inputLabel: 'Approval Comments (optional)',
            inputPlaceholder: 'Add any comments about the approval...',
            inputValue: '',
            onInputChange: (value) => {
                setConfirmDialog(prev => ({ ...prev, inputValue: value }));
            },
            onConfirm: async (comments) => {
                try {
                    setActionLoading(true);
                    const response = await leaveRequestService.approveLeaveRequest(id, { comments });

                    if (response.success) {
                        showSuccess('Leave request approved successfully');
                        fetchLeaveRequest(); // Refresh data
                    } else {
                        showError(response.error || 'Failed to approve leave request');
                    }
                } catch (error) {
                    showError('Failed to approve leave request');
                } finally {
                    setActionLoading(false);
                }
                setConfirmDialog({ isVisible: false });
            },
            onCancel: () => setConfirmDialog({ isVisible: false })
        });
    };

    const handleReject = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Reject Leave Request',
            message: `Are you sure you want to reject this ${leaveRequest.leaveTypeDisplay} request for ${leaveRequest.employeeName}?\n\nThis action cannot be undone.`,
            confirmText: 'Reject Request',
            showInput: true,
            inputLabel: 'Rejection Reason',
            inputPlaceholder: 'Please provide a reason for rejection...',
            inputRequired: true,
            inputValue: '',
            onInputChange: (value) => {
                setConfirmDialog(prev => ({ ...prev, inputValue: value }));
            },
            onConfirm: async (reason) => {
                try {
                    setActionLoading(true);
                    const response = await leaveRequestService.rejectLeaveRequest(id, { reason });

                    if (response.success) {
                        showSuccess('Leave request rejected');
                        fetchLeaveRequest(); // Refresh data
                    } else {
                        showError(response.error || 'Failed to reject leave request');
                    }
                } catch (error) {
                    showError('Failed to reject leave request');
                } finally {
                    setActionLoading(false);
                }
                setConfirmDialog({ isVisible: false });
            },
            onCancel: () => setConfirmDialog({ isVisible: false })
        });
    };

    const handleCancel = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Cancel Leave Request',
            message: 'Are you sure you want to cancel this leave request?\n\nThis action cannot be undone.',
            confirmText: 'Cancel Request',
            onConfirm: async () => {
                try {
                    setActionLoading(true);
                    const response = await leaveRequestService.cancelLeaveRequest(id);

                    console.log('Cancel response:', response);

                    // Handle different response structures
                    const success = response.success !== false && !response.error;

                    if (success) {
                        showSuccess('Leave request cancelled');
                        fetchLeaveRequest(); // Refresh data
                    } else {
                        const errorMessage = response.error || response.message || 'Failed to cancel leave request';
                        showError(errorMessage);
                    }
                } catch (error) {
                    console.error('Error cancelling leave request:', error);
                    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to cancel leave request';
                    showError(errorMessage);
                } finally {
                    setActionLoading(false);
                }
                setConfirmDialog({ isVisible: false });
            },
            onCancel: () => setConfirmDialog({ isVisible: false })
        });
    };

    // Helper functions
    const getStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { icon: FaClock, color: 'warning', text: 'Pending Review' },
            APPROVED: { icon: FaCheck, color: 'success', text: 'Approved' },
            REJECTED: { icon: FaTimes, color: 'danger', text: 'Rejected' },
            CANCELLED: { icon: FaTimes, color: 'secondary', text: 'Cancelled' },
            IN_PROGRESS: { icon: FaClock, color: 'info', text: 'In Progress' },
            COMPLETED: { icon: FaCheck, color: 'success', text: 'Completed' }
        };

        const config = statusConfig[status] || statusConfig.PENDING;
        const Icon = config.icon;

        return (
            <div className={`status-badge status-${config.color}`}>
                <Icon className="status-icon" />
                {config.text}
            </div>
        );
    };

    const getLeaveTypeBadge = (leaveType) => {
        return (
            <div className={`leave-type-badge leave-type-${leaveType.toLowerCase()}`}>

                {leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </div>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateTimeString) => {
        return new Date(dateTimeString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (!leaveRequest) {
        return (
            <div className="error-page">
                <h2>Leave Request Not Found</h2>
                <button className="btn-primary" onClick={() => navigate('/hr/leave-requests')}>
                    Back to Leave Requests
                </button>
            </div>
        );
    }

    const canApprove = leaveRequest.status === 'PENDING';
    const canReject = leaveRequest.status === 'PENDING';
    const canCancel = leaveRequest.status === 'PENDING' && leaveRequest.canBeModified;

    return (
        <div className="leave-request-detail-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <div className="header-title">
                        <FaCalendarAlt className="page-icon" />
                        <h1>Leave Request Details</h1>
                        {getStatusBadge(leaveRequest.status)}
                    </div>

                    {/* Action buttons */}
                    <div className="header-actions">
                        {canApprove && (
                            <button
                                className="btn-success"
                                onClick={handleApprove}
                                disabled={actionLoading}
                            >
                                <FaCheck /> Approve
                            </button>
                        )}
                        {canReject && (
                            <button
                                className="btn-danger"
                                onClick={handleReject}
                                disabled={actionLoading}
                            >
                                <FaTimes /> Reject
                            </button>
                        )}
                        {canCancel && (
                            <button
                                className="btn-secondary"
                                onClick={handleCancel}
                                disabled={actionLoading}
                            >
                                <FaTimes /> Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="detail-container">
                {/* Employee & Request Info */}
                <div className="detail-section">
                    <div className="section-header">
                        <FaUser className="section-icon" />
                        <h2>Employee Information</h2>
                    </div>

                    <div className="employee-card">
                        <div className="employee-info">
                            <EmployeeAvatar
                                photoUrl={leaveRequest.employeePhoto}
                                firstName={leaveRequest.employeeName?.split(' ')[0]}
                                lastName={leaveRequest.employeeName?.split(' ').slice(1).join(' ')}
                                size="large"
                                className="employee-avatar"
                            />
                            <div className="employee-details">
                                <h3 className="employee-name">{leaveRequest.employeeName}</h3>
                                <div className="employee-meta">
                                    <div className="meta-item">
                                        <span className="label">Position:</span>
                                        <span className="value">{leaveRequest.employeePosition || 'N/A'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="label">Department:</span>
                                        <span className="value">{leaveRequest.employeeDepartment || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leave Details */}
                <div className="detail-section">
                    <div className="section-header">
                        <FaCalendarAlt className="section-icon" />
                        <h2>Leave Details</h2>
                    </div>

                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="label">Leave Type:</span>
                            {getLeaveTypeBadge(leaveRequest.leaveType)}
                        </div>

                        <div className="detail-item">
                            <span className="label">Start Date:</span>
                            <span className="value">{formatDate(leaveRequest.startDate)}</span>
                        </div>

                        <div className="detail-item">
                            <span className="label">End Date:</span>
                            <span className="value">{formatDate(leaveRequest.endDate)}</span>
                        </div>

                        <div className="detail-item">
                            <span className="label">Duration:</span>
                            <div className="duration-info">
                                <span className="days-count">{leaveRequest.daysRequested}</span>
                                <span className="days-label">calendar days</span>
                                <span className="working-days">({leaveRequest.workingDaysRequested} working days)</span>
                            </div>
                        </div>

                        <div className="detail-item full-width">
                            <span className="label">Reason:</span>
                            <div className="reason-text">
                                {leaveRequest.reason || 'No reason provided'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact & Delegation Info */}
                {(leaveRequest.emergencyContact || leaveRequest.workDelegatedTo) && (
                    <div className="detail-section">
                        <div className="section-header">
                            <FaHandsHelping className="section-icon" />
                            <h2>Additional Information</h2>
                        </div>

                        <div className="details-grid">
                            {leaveRequest.emergencyContact && (
                                <div className="detail-item">
                                    <span className="label">Emergency Contact:</span>
                                    <div className="contact-info">
                                        <span className="contact-name">{leaveRequest.emergencyContact}</span>
                                        {leaveRequest.emergencyPhone && (
                                            <div className="contact-phone">
                                                <FaPhone className="phone-icon" />
                                                {leaveRequest.emergencyPhone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {leaveRequest.workDelegatedTo && (
                                <div className="detail-item">
                                    <span className="label">Work Delegated To:</span>
                                    <span className="value">{leaveRequest.workDelegatedTo}</span>
                                </div>
                            )}

                            {leaveRequest.delegationNotes && (
                                <div className="detail-item full-width">
                                    <span className="label">Delegation Notes:</span>
                                    <div className="notes-text">{leaveRequest.delegationNotes}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Review Information */}
                {(leaveRequest.reviewedBy || leaveRequest.reviewComments) && (
                    <div className="detail-section">
                        <div className="section-header">
                            <FaFileAlt className="section-icon" />
                            <h2>Review Information</h2>
                        </div>

                        <div className="review-info">
                            {leaveRequest.reviewedBy && (
                                <div className="review-item">
                                    <span className="label">Reviewed By:</span>
                                    <span className="value">{leaveRequest.reviewedBy}</span>
                                </div>
                            )}

                            {leaveRequest.reviewedAt && (
                                <div className="review-item">
                                    <span className="label">Review Date:</span>
                                    <span className="value">{formatDateTime(leaveRequest.reviewedAt)}</span>
                                </div>
                            )}

                            {leaveRequest.reviewComments && (
                                <div className="review-item full-width">
                                    <span className="label">Comments:</span>
                                    <div className="comments-text">{leaveRequest.reviewComments}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="detail-section">
                    <div className="section-header">
                        <FaClock className="section-icon" />
                        <h2>Request Timeline</h2>
                    </div>

                    <div className="timeline">
                        <div className="timeline-item">
                            <div className="timeline-icon submitted">
                                <FaFileAlt />
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-title">Request Submitted</div>
                                <div className="timeline-date">{formatDateTime(leaveRequest.createdAt)}</div>
                                <div className="timeline-author">by {leaveRequest.createdBy}</div>
                            </div>
                        </div>

                        {leaveRequest.reviewedAt && (
                            <div className="timeline-item">
                                <div className={`timeline-icon ${leaveRequest.status.toLowerCase()}`}>
                                    {leaveRequest.status === 'APPROVED' ? <FaCheck /> : <FaTimes />}
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-title">
                                        Request {leaveRequest.statusDisplay}
                                    </div>
                                    <div className="timeline-date">{formatDateTime(leaveRequest.reviewedAt)}</div>
                                    <div className="timeline-author">by {leaveRequest.reviewedBy}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                cancelText="Cancel"
                showInput={confirmDialog.showInput}
                inputLabel={confirmDialog.inputLabel}
                inputPlaceholder={confirmDialog.inputPlaceholder}
                inputRequired={confirmDialog.inputRequired}
                inputValue={confirmDialog.inputValue || ''}
                onInputChange={confirmDialog.onInputChange}
                onConfirm={confirmDialog.onConfirm}
                onCancel={confirmDialog.onCancel}
                isLoading={actionLoading}
                size="medium"
            />
        </div>
    );
};

export default LeaveRequestDetailPage;