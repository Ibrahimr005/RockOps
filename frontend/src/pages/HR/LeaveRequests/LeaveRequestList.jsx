import React, { useEffect, useState } from 'react';
import { FaPlus, FaEye, FaCheck, FaTimes, FaCalendarAlt, FaClock, FaUser } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { leaveRequestService } from '../../../services/hr/leaveRequestService';
import LeaveRequestModal from './LeaveRequestModal.jsx';
import './LeaveRequestList.scss';
import EmployeeAvatar from "../../../components/common/EmployeeAvatar/index.js";
import {useNavigate} from "react-router-dom";

const LeaveRequestList = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [approveConfirmId, setApproveConfirmId] = useState(null);
    const [rejectConfirmId, setRejectConfirmId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch leave requests
    const fetchLeaveRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await leaveRequestService.getLeaveRequests();
            console.log('Fetched leave requests:', response.data);

            // Handle paginated response structure
            const responseData = response.data;
            const requestsArray = responseData?.data || responseData || [];

            setLeaveRequests(Array.isArray(requestsArray) ? requestsArray : []);
        } catch (err) {
            console.error('Error fetching leave requests:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load leave requests';
            setError(errorMessage);
            showError('Failed to load leave requests. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    // Modal handlers
    const handleOpenCreateModal = () => {
        setCurrentRequest(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentRequest(null);
        setError(null);
    };

    const handleModalSuccess = () => {
        fetchLeaveRequests();
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate days between dates
    const calculateDays = (startDate, endDate) => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const statusConfig = {
            'PENDING': { class: 'status-pending', text: 'Pending' },
            'APPROVED': { class: 'status-approved', text: 'Approved' },
            'REJECTED': { class: 'status-rejected', text: 'Rejected' },
            'CANCELLED': { class: 'status-cancelled', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { class: 'status-unknown', text: status || 'Unknown' };

        return <span className={`status-badge ${config.class}`}>{config.text}</span>;
    };

    const handleRowClick = (leaveRequest) => {
        navigate(`/hr/leave-requests/${leaveRequest.id}`);
    };

    // Approve handlers
    const handleApproveRequest = async () => {
        if (!approveConfirmId) return;

        setIsProcessing(true);
        try {
            console.log('Approving request with id:', approveConfirmId);
            await leaveRequestService.approveLeaveRequest(approveConfirmId, {});
            await fetchLeaveRequests();
            setApproveConfirmId(null);
            showSuccess('Leave request approved successfully');
        } catch (err) {
            console.error('Error approving request:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to approve request';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelApprove = () => {
        setApproveConfirmId(null);
    };

    // Reject handlers
    const handleRejectRequest = async () => {
        if (!rejectConfirmId || !rejectionReason.trim()) return;

        setIsProcessing(true);
        try {
            console.log('Rejecting request with id:', rejectConfirmId);
            await leaveRequestService.rejectLeaveRequest(rejectConfirmId, { reason: rejectionReason });
            await fetchLeaveRequests();
            setRejectConfirmId(null);
            setRejectionReason('');
            showSuccess('Leave request rejected successfully');
        } catch (err) {
            console.error('Error rejecting request:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to reject request';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelReject = () => {
        setRejectConfirmId(null);
        setRejectionReason('');
    };

    // DataTable configuration
    const columns = [
        {
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row, value) => (
                <div className="employee-name-cell">
                    <EmployeeAvatar
                        photoUrl={row.employeePhoto}
                        firstName={value?.split(' ')[0]}
                        lastName={value?.split(' ').slice(1).join(' ')}
                        size="small"
                        className="employee-avatar"
                    />
                    <div>
                        <span className="employee-name">{value || 'Unknown'}</span>
                        <div className="employee-info">
                            <span className="employee-position">{row.employeePosition || 'N/A'}</span>
                            <span className="separator">•</span>
                            <span className="employee-department">{row.employeeDepartment || 'N/A'}</span>
                        </div>
                        <div className="employee-id">ID: {row.employeeId || 'N/A'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Leave Type',
            accessor: 'leaveType',
            sortable: true,
            render: (row, value) => (
                <span className={`leave-type leave-type-${value?.toLowerCase()}`}>
                    {row.leaveTypeDisplay || value || 'N/A'}
                </span>
            )
        },
        {
            header: 'Duration',
            accessor: 'startDate',
            sortable: true,
            render: (row) => (
                <div className="duration-cell">
                    <div className="date-range">
                        <div className="start-date">
                            <FaCalendarAlt className="date-icon" />
                            {formatDate(row.startDate)}
                        </div>
                        <div className="date-separator">to</div>
                        <div className="end-date">
                            <FaCalendarAlt className="date-icon" />
                            {formatDate(row.endDate)}
                        </div>
                    </div>
                    <div className="days-info">
                        <span className="working-days">{row.workingDaysRequested || row.daysRequested || 0} working days</span>
                        <span className="total-days">({row.daysRequested || 0} total days)</span>
                    </div>
                </div>
            )

        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row, value) => (
                <div className="status-cell">
                    {getStatusBadge(value)}
                    {row.overdue && (
                        <div className="overdue-indicator">
                            <FaClock className="overdue-icon" />
                            <span>Overdue</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Submitted',
            accessor: 'createdAt',
            sortable: true,
            render: (row, value) => (
                <div className="submitted-cell">
                    <div className="submitted-date">{formatDate(value)}</div>
                    <div className="submitted-by">by {row.createdBy || 'Unknown'}</div>
                </div>
            )
        },
        {
            header: 'Review Info',
            accessor: 'reviewedAt',
            sortable: true,
            render: (row, value) => {
                if (!value || row.status === 'PENDING') {
                    return <span className="no-review">Pending review</span>;
                }
                return (
                    <div className="review-cell">
                        <div className="reviewed-date">{formatDate(value)}</div>
                        <div className="reviewed-by">by {row.reviewedBy || 'Unknown'}</div>
                        {row.reviewComments && (
                            <div className="review-comments" title={row.reviewComments}>
                                {row.reviewComments.length > 30 ? `${row.reviewComments.substring(0, 30)}...` : row.reviewComments}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Reason',
            accessor: 'reason',
            render: (row, value) => (
                <div className="reason-cell" title={value}>
                    {value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-'}
                </div>
            )
        },
        {
            header: 'Work Delegation',
            accessor: 'workDelegatedTo',
            render: (row, value) => (
                <div className="delegation-cell">
                    {value ? (
                        <div>
                            <div className="delegated-to">{value}</div>
                            {row.delegationNotes && (
                                <div className="delegation-notes" title={row.delegationNotes}>
                                    {row.delegationNotes.length > 30 ? `${row.delegationNotes.substring(0, 30)}...` : row.delegationNotes}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="no-delegation">Not specified</span>
                    )}
                </div>
            )
        },
        {
            header: 'Emergency Contact',
            accessor: 'emergencyContact',
            render: (row, value) => (
                <div className="emergency-cell">
                    {value ? (
                        <div>
                            <div className="contact-name">{value}</div>
                            {row.emergencyPhone && (
                                <div className="contact-phone">{row.emergencyPhone}</div>
                            )}
                        </div>
                    ) : (
                        <span className="no-emergency">Not provided</span>
                    )}
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'Approve',
            icon: <FaCheck />,
            onClick: (row) => setApproveConfirmId(row.id),
            className: 'primary',
            condition: (row) => row.status === 'PENDING'
        },
        {
            label: 'Reject',
            icon: <FaTimes />,
            onClick: (row) => setRejectConfirmId(row.id),
            className: 'danger',
            condition: (row) => row.status === 'PENDING'
        }
    ];

    return (
        <div className="leave-request-list-container">
            <PageHeader
                title="Leave Requests"
                subtitle="Review and manage employee leave requests and time-off approvals"
            />

            {error && !isModalOpen && (
                <div className="leave-request-error">
                    {error}
                    <button onClick={fetchLeaveRequests} className="retry-button">
                        Try Again
                    </button>
                </div>
            )}

            <DataTable
                data={leaveRequests}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                onRowClick={(leaveRequest) => navigate(`/hr/leave-requests/${leaveRequest.id}`)}
                emptyMessage="No leave requests found. Create a new request to get started."
                showAddButton={true}
                addButtonText="New Request"
                addButtonIcon={<FaPlus />}
                onAddClick={handleOpenCreateModal}
                showExportButton={true}
                exportFileName="leave-requests"
                exportButtonText="Export Leave Requests"
            />

            {/* Leave Request Modal */}
            <LeaveRequestModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleModalSuccess}
            />

            {/* Approve Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={!!approveConfirmId}
                type="success"
                title="Approve Leave Request"
                message="Are you sure you want to approve this leave request?"
                confirmText="Approve"
                cancelText="Cancel"
                onConfirm={handleApproveRequest}
                onCancel={handleCancelApprove}
                isLoading={isProcessing}
                size="medium"
            />

            {/* Reject Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={!!rejectConfirmId}
                type="danger"
                title="Reject Leave Request"
                message="Are you sure you want to reject this leave request? Please provide a reason."
                confirmText="Reject"
                cancelText="Cancel"
                onConfirm={handleRejectRequest}
                onCancel={handleCancelReject}
                isLoading={isProcessing}
                showInput={true}
                inputLabel="Rejection Reason"
                inputPlaceholder="Please provide a reason for rejection..."
                inputRequired={true}
                inputValue={rejectionReason}
                onInputChange={setRejectionReason}
                size="medium"
            />
        </div>
    );
};

export default LeaveRequestList;