// ========================================
// FILE: LeaveReviewPhase.jsx
// Iterative, collaborative leave review workflow
// Similar pattern to AttendanceImportPhase
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaClock,
    FaCheckCircle,
    FaLock,
    FaRedo,
    FaBell,
    FaExclamationTriangle,
    FaInfoCircle,
    FaChartBar,
    FaCalendarAlt
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './LeaveReviewPhase.scss';

const LeaveReviewPhase = ({ payroll, onTransition, onRefresh, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();

    // State
    const [leaveStatus, setLeaveStatus] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingLeave, setProcessingLeave] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [notifying, setNotifying] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    // Fetch all data
    const fetchData = async () => {
        await Promise.all([
            fetchLeaveStatus(),
            fetchLeaveRequests()
        ]);
        setLoading(false);
    };

    // Fetch leave review status
    const fetchLeaveStatus = async () => {
        try {
            const status = await payrollService.getLeaveStatus(payroll.id);
            console.log('📊 Leave Status:', status);
            setLeaveStatus(status);
        } catch (error) {
            console.error('Error fetching leave status:', error);
        }
    };

    // Fetch leave requests for this payroll period
    const fetchLeaveRequests = async () => {
        try {
            const data = await payrollService.getLeaveRequestsForPayroll(payroll.id);
            console.log('📊 Leave Requests:', data);
            setLeaveRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            setLeaveRequests([]);
        }
    };

    // Process leave review
    const handleProcessLeaveReview = async () => {
        try {
            setProcessingLeave(true);

            const result = await payrollService.processLeaveReview(payroll.id);
            console.log('📊 Process Leave Result:', result);

            if (result.status === 'SUCCESS') {
                showSuccess(result.message);
            } else if (result.status === 'SUCCESS_WITH_WARNINGS') {
                showWarning(`${result.message} - ${result.issues?.length || 0} issue(s) found`);
            } else {
                showError(result.message || 'Leave processing completed with issues');
            }

            // Refresh data
            await fetchData();
            await onRefresh();

        } catch (error) {
            console.error('Process leave error:', error);

            let errorMessage = 'Failed to process leave review';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setProcessingLeave(false);
        }
    };

    // Finalize leave review
    const handleFinalizeLeave = async () => {
        try {
            setFinalizing(true);

            const result = await payrollService.finalizeLeave(payroll.id);

            if (result.success) {
                showSuccess('Leave review finalized and locked successfully!');
                await onRefresh();
            } else {
                showError(result.message || 'Failed to finalize leave review');
            }

        } catch (error) {
            console.error('Finalize leave error:', error);

            let errorMessage = 'Failed to finalize leave review';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setFinalizing(false);
        }
    };

    // Notify HR
    const handleNotifyHR = async () => {
        try {
            setNotifying(true);

            const result = await payrollService.notifyHRForLeave(payroll.id);

            if (result.success) {
                showSuccess('HR notification sent successfully!');
                await fetchLeaveStatus();
            } else {
                showError(result.message || 'Failed to send HR notification');
            }

        } catch (error) {
            console.error('Notify HR error:', error);

            let errorMessage = 'Failed to send HR notification';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setNotifying(false);
        }
    };

    // Confirm finalization
    const confirmFinalize = () => {
        openConfirmDialog(
            'finalize-leave',
            'Finalize and Lock Leave Review?',
            'This action will LOCK all leave data. No further changes can be made. This will move the payroll to the Overtime Review phase. Are you sure?'
        );
    };

    // Render based on state
    const renderContent = () => {
        if (loading) {
            return <div className="loading-state">Loading leave review data...</div>;
        }

        if (!leaveStatus) {
            return <div className="error-state">Failed to load leave status</div>;
        }

        console.log('🎯 Rendering decision:', {
            leaveFinalized: leaveStatus.leaveFinalized,
            leaveProcessed: leaveStatus.leaveProcessed
        });

        // Finalized state
        if (leaveStatus.leaveFinalized) {
            return renderFinalizedState();
        }

        // Review/Draft state
        if (leaveStatus.leaveProcessed) {
            return renderReviewState();
        }

        // Initial state
        return renderInitialState();
    };

    // Initial state - not processed yet
    const renderInitialState = () => (
        <div className="leave-review-initial">
            <div className="review-card">
                <div className="review-header">
                    <FaCalendarAlt className="review-icon" />
                    <div>
                        <h3>Process Leave Requests</h3>
                        <p>Review and process all leave requests for this payroll period. Approved leaves will be deducted from employee payrolls.</p>
                    </div>
                </div>

                <div className="review-actions">
                    <button
                        className="btn-primary btn-large"
                        onClick={handleProcessLeaveReview}
                        disabled={processingLeave}
                    >
                        {processingLeave ? (
                            <>
                                <FaClock className="spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaCalendarAlt />
                                Process Leave Review
                            </>
                        )}
                    </button>

                    <button
                        className="btn-secondary-outline"
                        onClick={handleNotifyHR}
                        disabled={notifying}
                    >
                        <FaBell />
                        Notify HR to Review
                    </button>
                </div>

                <div className="review-info">
                    <FaInfoCircle />
                    <span>This will review all approved leave requests and apply deductions for excess leave days.</span>
                </div>
            </div>
        </div>
    );

    // Review state - processed but not finalized
    const renderReviewState = () => (
        <div className="leave-review-review">
            {/* Status Banner */}
            <div className="status-banner draft">
                <div className="banner-content">
                    <FaExclamationTriangle />
                    <div>
                        <h4>Draft Mode - Leave Not Finalized</h4>
                        <p>You can re-process or make changes. Click "Finalize" when ready to lock and proceed.</p>
                    </div>
                </div>
                <div className="banner-badge">
                    <span className="badge-draft">DRAFT</span>
                </div>
            </div>

            {/* Leave Summary */}
            {leaveStatus.summary && (
                <div className="leave-summary">
                    <div className="summary-header">
                        <FaChartBar />
                        <h4>Leave Review Summary</h4>
                    </div>

                    <StatisticsCards
                        cards={[
                            { icon: <FaChartBar />, label: "Total Requests", value: leaveStatus.summary.totalRequests || 0, variant: "total" },
                            { icon: <FaCheckCircle />, label: "Approved", value: leaveStatus.summary.approvedRequests || 0, variant: "success" },
                            { icon: <FaClock />, label: "Pending", value: leaveStatus.summary.pendingRequests || 0, variant: "warning" },
                            { icon: <FaExclamationTriangle />, label: "Excess Days", value: leaveStatus.summary.excessLeaveDays || 0, variant: "danger" },
                        ]}
                        columns={4}
                    />

                    <div className="summary-meta">
                        <span>Processed: {new Date(leaveStatus.lastProcessedAt).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="review-actions">
                <button
                    className="btn-secondary"
                    onClick={handleProcessLeaveReview}
                    disabled={processingLeave || finalizing}
                >
                    {processingLeave ? (
                        <>
                            <FaClock className="spin" />
                            Re-processing...
                        </>
                    ) : (
                        <>
                            <FaRedo />
                            Re-Process Leave Review
                        </>
                    )}
                </button>

                <button
                    className="btn-secondary-outline"
                    onClick={handleNotifyHR}
                    disabled={notifying || leaveStatus.hrNotificationSent}
                >
                    <FaBell />
                    {leaveStatus.hrNotificationSent ? 'HR Notified ✓' : 'Notify HR'}
                </button>

                <button
                    className="btn-success btn-large"
                    onClick={confirmFinalize}
                    disabled={finalizing || processingLeave}
                >
                    {finalizing ? (
                        <>
                            <FaClock className="spin" />
                            Finalizing...
                        </>
                    ) : (
                        <>
                            <FaLock />
                            Finalize Leave Review
                        </>
                    )}
                </button>
            </div>

            {/* Leave Requests Table */}
            {leaveRequests.length > 0 ? (
                <div className="leave-requests-table">
                    <h4>Leave Requests ({leaveRequests.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {leaveRequests.map((request) => (
                            <tr key={request.id}>
                                <td>{request.employeeName}</td>
                                <td>{request.leaveType}</td>
                                <td>{new Date(request.startDate).toLocaleDateString()}</td>
                                <td>{new Date(request.endDate).toLocaleDateString()}</td>
                                <td>{request.numberOfDays}</td>
                                <td>
                                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                                            {request.status}
                                        </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-data-message">
                    <FaInfoCircle />
                    <p>No leave requests found for this payroll period.</p>
                </div>
            )}
        </div>
    );

    // Finalized state - locked
    const renderFinalizedState = () => (
        <div className="leave-review-finalized">
            {/* Status Banner */}
            <div className="status-banner finalized">
                <div className="banner-content">
                    <FaCheckCircle />
                    <div>
                        <h4>Leave Review Finalized and Locked</h4>
                        <p>All leave data is locked. No further changes can be made.</p>
                    </div>
                </div>
                <div className="banner-badge">
                    <FaLock />
                    <span className="badge-finalized">LOCKED</span>
                </div>
            </div>

            {/* Finalization Info */}
            <div className="finalization-info">
                <div className="info-row">
                    <span className="info-label">Finalized By:</span>
                    <span className="info-value">{leaveStatus.finalizedBy}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Finalized At:</span>
                    <span className="info-value">
                        {new Date(leaveStatus.finalizedAt).toLocaleString()}
                    </span>
                </div>
                {leaveStatus.summary && (
                    <>
                        <div className="info-row">
                            <span className="info-label">Total Requests:</span>
                            <span className="info-value">{leaveStatus.summary.totalRequests}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Approved:</span>
                            <span className="info-value">{leaveStatus.summary.approvedRequests}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Leave Requests Table (Read-only) */}
            {leaveRequests.length > 0 && (
                <div className="leave-requests-table">
                    <h4>Leave Requests ({leaveRequests.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {leaveRequests.map((request) => (
                            <tr key={request.id}>
                                <td>{request.employeeName}</td>
                                <td>{request.leaveType}</td>
                                <td>{new Date(request.startDate).toLocaleDateString()}</td>
                                <td>{new Date(request.endDate).toLocaleDateString()}</td>
                                <td>{request.numberOfDays}</td>
                                <td>
                                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                                            {request.status}
                                        </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="leave-review-phase">
            {renderContent()}
        </div>
    );
};

export default LeaveReviewPhase;