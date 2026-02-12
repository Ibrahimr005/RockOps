// ========================================
// FILE: OvertimeReviewPhase.jsx
// Iterative, collaborative overtime review workflow
// Similar pattern to AttendanceImportPhase and LeaveReviewPhase
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
    FaBusinessTime,
    FaDollarSign
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './OvertimeReviewPhase.scss';

const OvertimeReviewPhase = ({ payroll, onTransition, onRefresh, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();

    // State
    const [overtimeStatus, setOvertimeStatus] = useState(null);
    const [overtimeRecords, setOvertimeRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingOvertime, setProcessingOvertime] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [notifying, setNotifying] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    // Fetch all data
    const fetchData = async () => {
        await Promise.all([
            fetchOvertimeStatus(),
            fetchOvertimeRecords()
        ]);
        setLoading(false);
    };

    // Fetch overtime review status
    const fetchOvertimeStatus = async () => {
        try {
            const status = await payrollService.getOvertimeStatus(payroll.id);
            console.log('📊 Overtime Status:', status);
            setOvertimeStatus(status);
        } catch (error) {
            console.error('Error fetching overtime status:', error);
        }
    };

    // Fetch overtime records for this payroll period
    const fetchOvertimeRecords = async () => {
        try {
            const data = await payrollService.getOvertimeRecordsForPayroll(payroll.id);
            console.log('📊 Overtime Records:', data);
            setOvertimeRecords(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching overtime records:', error);
            setOvertimeRecords([]);
        }
    };

    // Process overtime review
    const handleProcessOvertimeReview = async () => {
        try {
            setProcessingOvertime(true);

            const result = await payrollService.processOvertimeReview(payroll.id);
            console.log('📊 Process Overtime Result:', result);

            if (result.status === 'SUCCESS') {
                showSuccess(result.message);
            } else if (result.status === 'SUCCESS_WITH_WARNINGS') {
                showWarning(`${result.message} - ${result.issues?.length || 0} issue(s) found`);
            } else {
                showError(result.message || 'Overtime processing completed with issues');
            }

            // Refresh data
            await fetchData();
            await onRefresh();

        } catch (error) {
            console.error('Process overtime error:', error);

            let errorMessage = 'Failed to process overtime review';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setProcessingOvertime(false);
        }
    };

    // Finalize overtime review
    const handleFinalizeOvertime = async () => {
        try {
            setFinalizing(true);

            const result = await payrollService.finalizeOvertime(payroll.id);

            if (result.success) {
                showSuccess('Overtime review finalized and locked successfully!');
                await onRefresh();
            } else {
                showError(result.message || 'Failed to finalize overtime review');
            }

        } catch (error) {
            console.error('Finalize overtime error:', error);

            let errorMessage = 'Failed to finalize overtime review';

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

            const result = await payrollService.notifyHRForOvertime(payroll.id);

            if (result.success) {
                showSuccess('HR notification sent successfully!');
                await fetchOvertimeStatus();
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
            'finalize-overtime',
            'Finalize and Lock Overtime Review?',
            'This action will LOCK all overtime data. No further changes can be made. This will move the payroll to the Confirmed & Locked phase. Are you sure?'
        );
    };

    // Render based on state
    const renderContent = () => {
        if (loading) {
            return <div className="loading-state">Loading overtime review data...</div>;
        }

        if (!overtimeStatus) {
            return <div className="error-state">Failed to load overtime status</div>;
        }

        console.log('🎯 Rendering decision:', {
            overtimeFinalized: overtimeStatus.overtimeFinalized,
            overtimeProcessed: overtimeStatus.overtimeProcessed
        });

        // Finalized state
        if (overtimeStatus.overtimeFinalized) {
            return renderFinalizedState();
        }

        // Review/Draft state
        if (overtimeStatus.overtimeProcessed) {
            return renderReviewState();
        }

        // Initial state
        return renderInitialState();
    };

    // Initial state - not processed yet
    const renderInitialState = () => (
        <div className="overtime-review-initial">
            <div className="review-card">
                <div className="review-header">
                    <FaBusinessTime className="review-icon" />
                    <div>
                        <h3>Process Overtime Hours</h3>
                        <p>Review and process all overtime hours for this payroll period. Approved overtime will be calculated and added to employee payrolls.</p>
                    </div>
                </div>

                <div className="review-actions">
                    <button
                        className="btn-primary btn-large"
                        onClick={handleProcessOvertimeReview}
                        disabled={processingOvertime}
                    >
                        {processingOvertime ? (
                            <>
                                <FaClock className="spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaBusinessTime />
                                Process Overtime Review
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
                    <span>This will calculate overtime pay based on approved overtime hours and apply bonuses to employee payrolls.</span>
                </div>
            </div>
        </div>
    );

    // Review state - processed but not finalized
    const renderReviewState = () => (
        <div className="overtime-review-review">
            {/* Status Banner */}
            <div className="status-banner draft">
                <div className="banner-content">
                    <FaExclamationTriangle />
                    <div>
                        <h4>Draft Mode - Overtime Not Finalized</h4>
                        <p>You can re-process or make changes. Click "Finalize" when ready to lock and proceed.</p>
                    </div>
                </div>
                <div className="banner-badge">
                    <span className="badge-draft">DRAFT</span>
                </div>
            </div>

            {/* Overtime Summary */}
            {overtimeStatus.summary && (
                <div className="overtime-summary">
                    <div className="summary-header">
                        <FaChartBar />
                        <h4>Overtime Review Summary</h4>
                    </div>

                    <StatisticsCards
                        cards={[
                            { icon: <FaChartBar />, label: "Total Records", value: overtimeStatus.summary.totalRecords || 0, variant: "total" },
                            { icon: <FaBusinessTime />, label: "Total Hours", value: overtimeStatus.summary.totalOvertimeHours || 0, variant: "success" },
                            { icon: <FaClock />, label: "Employees", value: overtimeStatus.summary.employeesWithOvertime || 0, variant: "warning" },
                            { icon: <FaDollarSign />, label: "Total Pay", value: `$${overtimeStatus.summary.totalOvertimePay?.toLocaleString() || 0}`, variant: "success" },
                        ]}
                        columns={4}
                    />

                    <div className="summary-meta">
                        <span>Processed: {new Date(overtimeStatus.lastProcessedAt).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="review-actions">
                <button
                    className="btn-secondary"
                    onClick={handleProcessOvertimeReview}
                    disabled={processingOvertime || finalizing}
                >
                    {processingOvertime ? (
                        <>
                            <FaClock className="spin" />
                            Re-processing...
                        </>
                    ) : (
                        <>
                            <FaRedo />
                            Re-Process Overtime Review
                        </>
                    )}
                </button>

                <button
                    className="btn-secondary-outline"
                    onClick={handleNotifyHR}
                    disabled={notifying || overtimeStatus.hrNotificationSent}
                >
                    <FaBell />
                    {overtimeStatus.hrNotificationSent ? 'HR Notified ✓' : 'Notify HR'}
                </button>

                <button
                    className="btn-success btn-large"
                    onClick={confirmFinalize}
                    disabled={finalizing || processingOvertime}
                >
                    {finalizing ? (
                        <>
                            <FaClock className="spin" />
                            Finalizing...
                        </>
                    ) : (
                        <>
                            <FaLock />
                            Finalize Overtime Review
                        </>
                    )}
                </button>
            </div>

            {/* Overtime Records Table */}
            {overtimeRecords.length > 0 ? (
                <div className="overtime-records-table">
                    <h4>Overtime Records ({overtimeRecords.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Regular Hours</th>
                            <th>Overtime Hours</th>
                            <th>Overtime Rate</th>
                            <th>Overtime Pay</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {overtimeRecords.map((record) => (
                            <tr key={record.id}>
                                <td>{record.employeeName}</td>
                                <td>{new Date(record.date).toLocaleDateString()}</td>
                                <td>{record.regularHours || 0}h</td>
                                <td className="overtime-hours">{record.overtimeHours || 0}h</td>
                                <td>{record.overtimeRate || 1.5}x</td>
                                <td className="overtime-pay">
                                    ${record.overtimePay?.toLocaleString() || 0}
                                </td>
                                <td>
                                    <span className={`status-badge ${record.status?.toLowerCase() || 'pending'}`}>
                                        {record.status || 'PENDING'}
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
                    <p>No overtime records found for this payroll period.</p>
                </div>
            )}
        </div>
    );

    // Finalized state - locked
    const renderFinalizedState = () => (
        <div className="overtime-review-finalized">
            {/* Status Banner */}
            <div className="status-banner finalized">
                <div className="banner-content">
                    <FaCheckCircle />
                    <div>
                        <h4>Overtime Review Finalized and Locked</h4>
                        <p>All overtime data is locked. No further changes can be made.</p>
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
                    <span className="info-value">{overtimeStatus.finalizedBy}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Finalized At:</span>
                    <span className="info-value">
                        {new Date(overtimeStatus.finalizedAt).toLocaleString()}
                    </span>
                </div>
                {overtimeStatus.summary && (
                    <>
                        <div className="info-row">
                            <span className="info-label">Total Overtime Hours:</span>
                            <span className="info-value">{overtimeStatus.summary.totalOvertimeHours}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Total Overtime Pay:</span>
                            <span className="info-value">
                                ${overtimeStatus.summary.totalOvertimePay?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Employees with Overtime:</span>
                            <span className="info-value">{overtimeStatus.summary.employeesWithOvertime}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Overtime Records Table (Read-only) */}
            {overtimeRecords.length > 0 && (
                <div className="overtime-records-table">
                    <h4>Overtime Records ({overtimeRecords.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Regular Hours</th>
                            <th>Overtime Hours</th>
                            <th>Overtime Rate</th>
                            <th>Overtime Pay</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {overtimeRecords.map((record) => (
                            <tr key={record.id}>
                                <td>{record.employeeName}</td>
                                <td>{new Date(record.date).toLocaleDateString()}</td>
                                <td>{record.regularHours || 0}h</td>
                                <td className="overtime-hours">{record.overtimeHours || 0}h</td>
                                <td>{record.overtimeRate || 1.5}x</td>
                                <td className="overtime-pay">
                                    ${record.overtimePay?.toLocaleString() || 0}
                                </td>
                                <td>
                                    <span className={`status-badge ${record.status?.toLowerCase() || 'approved'}`}>
                                        {record.status || 'APPROVED'}
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
        <div className="overtime-review-phase">
            {renderContent()}
        </div>
    );
};

export default OvertimeReviewPhase;