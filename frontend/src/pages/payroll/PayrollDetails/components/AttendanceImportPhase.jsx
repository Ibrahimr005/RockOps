// ========================================
// FILE: AttendanceImportPhase.jsx (COMPLETE - FIXED)
// Iterative, collaborative attendance workflow
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
    FaChartBar
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import EmployeePayrollsTable from './EmployeePayrollsTable';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './AttendanceImportPhase.scss';

const AttendanceImportPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();

    // State
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [importSummary, setImportSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [notifying, setNotifying] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    // Fetch all data
    const fetchData = async () => {
        await Promise.all([
            fetchAttendanceStatus(),
            fetchEmployeePayrolls()
        ]);
        setLoading(false);
    };

    // Fetch attendance status
    const fetchAttendanceStatus = async () => {
        try {
            const response = await payrollService.getAttendanceStatus(payroll.id);
            const status = response
            setAttendanceStatus(status);
        } catch (error) {
            console.error('Error fetching attendance status:', error);
        }
    };

    // Fetch employee payrolls
    const fetchEmployeePayrolls = async () => {
        try {
            const response = await payrollService.getEmployeePayrolls(payroll.id);
            console.log('📊 Employee Payrolls Data:', response);
            setEmployeePayrolls(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Error fetching employee payrolls:', error);
            setEmployeePayrolls([]);
        }
    };

    // Import attendance with proper error handling
    const handleImportAttendance = async () => {
        try {
            setImporting(true);

            const summary = await payrollService.importAttendance(payroll.id);
            console.log('📊 Import Summary:', summary);

            setImportSummary(summary);

            if (summary.status === 'SUCCESS') {
                showSuccess(summary.message);
            } else if (summary.status === 'SUCCESS_WITH_WARNINGS') {
                showWarning(`${summary.message} - ${summary.issues?.length || 0} issue(s) found`);
            } else {
                showError(summary.message || 'Import completed with issues');
            }

            // Refresh data
            await fetchData();
            await onRefresh();

        } catch (error) {
            console.error('Import attendance error:', error);

            // Proper error message extraction
            let errorMessage = 'Failed to import attendance';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setImporting(false);
        }
    };

    // Finalize attendance with proper error handling
    const handleFinalizeAttendance = async () => {
        try {
            setFinalizing(true);

            const result = await payrollService.finalizeAttendance(payroll.id);

            if (result.success) {
                showSuccess('Attendance finalized and locked successfully!');
                await onRefresh();
            } else {
                showError(result.message || 'Failed to finalize attendance');
            }

        } catch (error) {
            console.error('Finalize attendance error:', error);

            let errorMessage = 'Failed to finalize attendance';

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

    // Notify HR with proper error handling
    const handleNotifyHR = async () => {
        try {
            setNotifying(true);

            const result = await payrollService.notifyHR(payroll.id);

            if (result.success) {
                showSuccess('HR notification sent successfully!');
                await fetchAttendanceStatus();
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
            'finalize-attendance',
            'Finalize and Lock Attendance?',
            'This action will LOCK all attendance data. No further imports or edits will be allowed. This will move the payroll to the Leave Review phase. Are you sure?'
        );
    };

    // Render based on state
    const renderContent = () => {
        if (loading) {
            return <div className="loading-state">Loading attendance data...</div>;
        }

        if (!attendanceStatus) {
            return <div className="error-state">Failed to load attendance status</div>;
        }

        console.log('🎯 Rendering decision:', {
            attendanceFinalized: attendanceStatus.attendanceFinalized,
            attendanceImported: attendanceStatus.attendanceImported,
            employeePayrollsCount: employeePayrolls.length
        });

        // Finalized state
        if (attendanceStatus.attendanceFinalized) {
            return renderFinalizedState();
        }

        // Draft/Review state
        if (attendanceStatus.attendanceImported) {
            return renderReviewState();
        }

        // Initial state (not imported yet)
        return renderInitialState();
    };

    // Initial state - not imported yet
    const renderInitialState = () => (
        <div className="attendance-import-initial">
            <div className="import-card">
                <div className="import-header">
                    <FaClock className="import-icon" />
                    <div>
                        <h3>Import Attendance Data</h3>
                        <p>Start by importing attendance records for this payroll period. You can re-import multiple times if needed.</p>
                    </div>
                </div>

                <div className="import-actions">
                    <button
                        className="btn-primary btn-large"
                        onClick={handleImportAttendance}
                        disabled={importing}
                    >
                        {importing ? (
                            <>
                                <FaClock className="spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <FaClock />
                                Import Attendance
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

                <div className="import-info">
                    <FaInfoCircle />
                    <span>This will create attendance snapshots for all active employees based on their punch records.</span>
                </div>
            </div>
        </div>
    );

    // Review state - imported but not finalized
    const renderReviewState = () => (
        <div className="attendance-import-review">
            {/* Status Banner */}
            <div className="status-banner draft">
                <div className="banner-content">
                    <FaExclamationTriangle />
                    <div>
                        <h4>Draft Mode - Attendance Not Finalized</h4>
                        <p>You can re-import or make changes. Click "Finalize" when ready to lock and proceed.</p>
                    </div>
                </div>
                <div className="banner-badge">
                    <span className="badge-draft">DRAFT</span>
                </div>
            </div>

            {/* Import Summary */}
            {importSummary && (
                <div className={`import-summary ${importSummary.status.toLowerCase()}`}>
                    <div className="summary-header">
                        <FaChartBar />
                        <h4>Last Import Summary</h4>
                    </div>

                    <StatisticsCards
                        cards={[
                            { icon: <FaChartBar />, label: "Employees", value: importSummary.totalEmployees || employeePayrolls.length, variant: "total" },
                            { icon: <FaCheckCircle />, label: "Created", value: importSummary.employeePayrollsCreated || 0, variant: "success" },
                            { icon: <FaRedo />, label: "Updated", value: importSummary.employeePayrollsUpdated || 0, variant: "info" },
                            { icon: <FaClock />, label: "Working Days", value: importSummary.totalWorkingDays || '-', variant: "warning" },
                        ]}
                        columns={4}
                    />

                    {/* Issues */}
                    {importSummary.issues && importSummary.issues.length > 0 && (
                        <div className="summary-issues">
                            <h5>
                                <FaExclamationTriangle />
                                Issues Found ({importSummary.issues.length})
                            </h5>
                            <ul>
                                {importSummary.issues.slice(0, 5).map((issue, idx) => (
                                    <li key={idx} className={`issue-${issue.severity.toLowerCase()}`}>
                                        <strong>{issue.employeeName}:</strong> {issue.description}
                                    </li>
                                ))}
                                {importSummary.issues.length > 5 && (
                                    <li className="issue-more">
                                        ... and {importSummary.issues.length - 5} more issue(s)
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    <div className="summary-meta">
                        <span>Import #{attendanceStatus.importCount}</span>
                        <span>•</span>
                        <span>{new Date(attendanceStatus.lastImportAt).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="review-actions">
                <button
                    className="btn-secondary"
                    onClick={handleImportAttendance}
                    disabled={importing || finalizing}
                >
                    {importing ? (
                        <>
                            <FaClock className="spin" />
                            Re-importing...
                        </>
                    ) : (
                        <>
                            <FaRedo />
                            Re-Import Attendance
                        </>
                    )}
                </button>

                <button
                    className="btn-secondary-outline"
                    onClick={handleNotifyHR}
                    disabled={notifying || attendanceStatus.hrNotificationSent}
                >
                    <FaBell />
                    {attendanceStatus.hrNotificationSent ? 'HR Notified ✓' : 'Notify HR'}
                </button>

                <button
                    className="btn-success btn-large"
                    onClick={confirmFinalize}
                    disabled={finalizing || importing}
                >
                    {finalizing ? (
                        <>
                            <FaClock className="spin" />
                            Finalizing...
                        </>
                    ) : (
                        <>
                            <FaLock />
                            Finalize Attendance
                        </>
                    )}
                </button>
            </div>

            {/* Employee Table */}
            {employeePayrolls.length > 0 ? (
                <EmployeePayrollsTable
                    employeePayrolls={employeePayrolls}
                    payroll={payroll}
                    onRefresh={fetchEmployeePayrolls}
                    loading={false}
                />
            ) : (
                <div className="no-data-message">
                    <FaInfoCircle />
                    <p>No employee payroll data found. Try importing attendance data.</p>
                </div>
            )}
        </div>
    );

    // Finalized state - locked
    const renderFinalizedState = () => (
        <div className="attendance-import-finalized">
            {/* Status Banner */}
            <div className="status-banner finalized">
                <div className="banner-content">
                    <FaCheckCircle />
                    <div>
                        <h4>Attendance Finalized and Locked</h4>
                        <p>All attendance data is locked. No further changes can be made.</p>
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
                    <span className="info-value">{attendanceStatus.finalizedBy}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Finalized At:</span>
                    <span className="info-value">
                        {new Date(attendanceStatus.finalizedAt).toLocaleString()}
                    </span>
                </div>
                <div className="info-row">
                    <span className="info-label">Total Imports:</span>
                    <span className="info-value">{attendanceStatus.importCount}</span>
                </div>
            </div>

            {/* Employee Table */}
            {employeePayrolls.length > 0 && (
                <EmployeePayrollsTable
                    employeePayrolls={employeePayrolls}
                    payroll={payroll}
                    onRefresh={fetchEmployeePayrolls}
                    loading={false}
                />
            )}
        </div>
    );

    return (
        <div className="attendance-import-phase">
            {renderContent()}
        </div>
    );
};

export default AttendanceImportPhase;