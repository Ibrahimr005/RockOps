import React, { useState, useEffect } from 'react';
import { vacationBalanceService } from '../../../../services/hr/vacationBalanceService';
import { leaveRequestService } from '../../../../services/hr/leaveRequestService';
import './VacationTab.scss';
import LeaveRequestModal from "../../LeaveRequests/LeaveRequestModal.jsx";

const VacationTab = ({ employee, formatDate }) => {
    const [vacationBalance, setVacationBalance] = useState(null);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);

    useEffect(() => {
        if (employee?.id) {
            fetchVacationData();
        }
    }, [employee]);

    const fetchVacationData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch vacation balance
            const balanceResponse = await vacationBalanceService.getVacationBalance(employee.id);
            console.log('Vacation balance response:', balanceResponse);
            setVacationBalance(balanceResponse.data);

            // Fetch leave history
            const historyResponse = await leaveRequestService.getEmployeeLeaveRequests(employee.id);
            console.log('Leave history response:', historyResponse);
            console.log('Leave history response.data:', historyResponse.data);
            console.log('Type of response.data:', typeof historyResponse.data);
            console.log('Is Array?:', Array.isArray(historyResponse.data));

            // Ensure we have an array
            const historyData = historyResponse.data;
            if (Array.isArray(historyData)) {
                setLeaveHistory(historyData);
            } else if (historyData && typeof historyData === 'object') {
                // If data is wrapped in another object, try to extract the array
                console.log('Data is object, checking for nested array...');
                console.log('historyData.data:', historyData.data);
                console.log('historyData.content:', historyData.content);
                console.log('historyData.leaveRequests:', historyData.leaveRequests);
                setLeaveHistory(historyData.data || historyData.content || historyData.leaveRequests || []);
            } else {
                console.log('Setting empty array');
                setLeaveHistory([]);
            }

        } catch (err) {
            console.error('Error fetching vacation data:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load vacation data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'status-badge completed';
            case 'pending':
                return 'status-badge pending';
            case 'rejected':
                return 'status-badge cancelled';
            case 'cancelled':
                return 'status-badge cancelled';
            default:
                return 'status-badge';
        }
    };

    const getLeaveTypeDisplay = (type) => {
        switch (type) {
            case 'ANNUAL_LEAVE':
                return 'Annual Leave';
            case 'SICK_LEAVE':
                return 'Sick Leave';
            case 'PERSONAL_LEAVE':
                return 'Personal Leave';
            case 'MATERNITY_LEAVE':
                return 'Maternity Leave';
            case 'PATERNITY_LEAVE':
                return 'Paternity Leave';
            case 'BEREAVEMENT_LEAVE':
                return 'Bereavement Leave';
            case 'UNPAID_LEAVE':
                return 'Unpaid Leave';
            default:
                return type;
        }
    };

    const calculateUtilizationPercentage = () => {
        if (!vacationBalance?.totalAllocated) return 0;
        return Math.round((vacationBalance.usedDays / vacationBalance.totalAllocated) * 100);
    };

    if (loading) {
        return (
            <div className="vacation-info tab-panel">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading vacation information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="vacation-info tab-panel">
                <div className="error-message">
                    <p>Error: {error}</p>
                    <button onClick={fetchVacationData} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="vacation-info tab-panel">
            <h3>Vacation & Leave</h3>

            {/* Vacation Balance Overview */}
            <div className="leave-balance">
                <div className="balance-card primary">
                    <h4>Annual Leave Balance</h4>
                    <div className="balance-details">
                        <div className="balance-main">
                            <span className="remaining">{vacationBalance?.remainingDays || 0}</span>
                            <span className="separator">/</span>
                            <span className="total">{vacationBalance?.totalAllocated || 0}</span>
                        </div>
                        <div className="balance-label">Days Remaining of Total</div>
                    </div>
                    <div className="balance-breakdown">
                        <div className="breakdown-item">
                            <span className="label">Used</span>
                            <span className="value">{vacationBalance?.usedDays || 0}</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="label">Pending</span>
                            <span className="value">{vacationBalance?.pendingDays || 0}</span>
                        </div>
                        {vacationBalance?.carriedForward > 0 && (
                            <div className="breakdown-item">
                                <span className="label">Carried Forward</span>
                                <span className="value success">+{vacationBalance.carriedForward}</span>
                            </div>
                        )}
                        {vacationBalance?.bonusDays > 0 && (
                            <div className="breakdown-item">
                                <span className="label">Bonus Days</span>
                                <span className="value success">+{vacationBalance.bonusDays}</span>
                            </div>
                        )}
                    </div>
                    <div className="utilization-bar">
                        <div className="utilization-label">
                            <span>Utilization Rate</span>
                            <span>{calculateUtilizationPercentage()}%</span>
                        </div>
                        <div className="vacation-progress-bar">
                            <div
                                className="vacation-progress-fill"
                                style={{ width: `${calculateUtilizationPercentage()}%` }}
                            />
                        </div>
                    </div>
                    {vacationBalance?.hasLowBalance && (
                        <div className="warning-badge">
                            ⚠️ Low Balance Alert
                        </div>
                    )}
                </div>

                <div className="balance-summary">
                    <div className="summary-item">
                        <div className="summary-value">{vacationBalance?.availableDays || 0}</div>
                        <div className="summary-label">Available for Request</div>
                        <div className="summary-hint">Remaining minus Pending</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-value">{vacationBalance?.year || new Date().getFullYear()}</div>
                        <div className="summary-label">Year</div>
                        <div className="summary-hint">Current Period</div>
                    </div>
                </div>
            </div>

            {/* Leave History */}
            <div className="leave-history-section">
                <div className="section-header">
                    <h4>Leave History</h4>
                    <div className="history-stats">
                        <span className="stat">
                            Total Requests: <strong>{Array.isArray(leaveHistory) ? leaveHistory.length : 0}</strong>
                        </span>
                        <span className="stat">
                            Approved: <strong>{Array.isArray(leaveHistory) ? leaveHistory.filter(l => l.status === 'APPROVED').length : 0}</strong>
                        </span>
                        <span className="stat">
                            Pending: <strong>{Array.isArray(leaveHistory) ? leaveHistory.filter(l => l.status === 'PENDING').length : 0}</strong>
                        </span>
                    </div>
                </div>

                {!Array.isArray(leaveHistory) || leaveHistory.length === 0 ? (
                    <div className="empty-state">
                        <p>No leave requests found</p>
                    </div>
                ) : (
                    <div className="leave-history-table-container">
                        <table className="leave-history-table">
                            <thead>
                            <tr>
                                <th>Type</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Days</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Reviewed By</th>
                                <th>Date Submitted</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Array.isArray(leaveHistory) && leaveHistory.map((leave) => (
                                <tr key={leave.id}>
                                    <td>
                                            <span className="leave-type-badge">
                                                {getLeaveTypeDisplay(leave.leaveType)}
                                            </span>
                                    </td>
                                    <td>{formatDate(leave.startDate)}</td>
                                    <td>{formatDate(leave.endDate)}</td>
                                    <td>
                                        <strong>{leave.workingDaysRequested || leave.daysRequested || 0}</strong>
                                    </td>
                                    <td>
                                        <div className="reason-cell" title={leave.reason}>
                                            {leave.reason?.substring(0, 50)}
                                            {leave.reason?.length > 50 && '...'}
                                        </div>
                                    </td>
                                    <td>
                                            <span className={getStatusBadgeClass(leave.status)}>
                                                {leave.statusDisplay || leave.status}
                                            </span>
                                    </td>
                                    <td>{leave.reviewedBy || '-'}</td>
                                    <td>{formatDate(leave.createdAt)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="leave-actions">
                <button
                    className="request-leave-btn primary"
                    onClick={() => setShowRequestModal(true)}
                >
                    + New Leave Request
                </button>
                <button
                    className="refresh-btn secondary"
                    onClick={fetchVacationData}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Leave Request Modal */}
            {showRequestModal && (
                <LeaveRequestModal
                    initialEmployeeId={employee.id}
                    employee={employee}
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={fetchVacationData}
                />
            )}
        </div>
    );
};

export default VacationTab;