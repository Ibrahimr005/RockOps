// ========================================
// FILE: DeductionReviewPhase.jsx
// Deduction review workflow component
// Reviews all deductions including loans
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
    FaMoneyBillWave,
    FaMinus,
    FaUserMinus,
    FaCreditCard
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './DeductionReviewPhase.scss';

const DeductionReviewPhase = ({ payroll, onTransition, onRefresh, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();

    // State
    const [deductionStatus, setDeductionStatus] = useState(null);
    const [deductionSummaries, setDeductionSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingDeduction, setProcessingDeduction] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [notifying, setNotifying] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    // Fetch all data
    const fetchData = async () => {
        await Promise.all([
            fetchDeductionStatus(),
            fetchDeductionSummaries()
        ]);
        setLoading(false);
    };

    // Fetch deduction review status
    const fetchDeductionStatus = async () => {
        try {
            const status = await payrollService.getDeductionStatus(payroll.id);
            console.log('📊 Deduction Status:', status);
            setDeductionStatus(status);
        } catch (error) {
            console.error('Error fetching deduction status:', error);
        }
    };

    // Fetch deduction summaries for this payroll period
    const fetchDeductionSummaries = async () => {
        try {
            const data = await payrollService.getDeductionSummaries(payroll.id);
            console.log('📊 Deduction Summaries:', data);
            setDeductionSummaries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching deduction summaries:', error);
            setDeductionSummaries([]);
        }
    };

    // Process deduction review
    const handleProcessDeductionReview = async () => {
        try {
            setProcessingDeduction(true);

            const result = await payrollService.processDeductionReview(payroll.id);
            console.log('📊 Process Deduction Result:', result);

            if (result.status === 'SUCCESS') {
                showSuccess(result.message);
            } else if (result.status === 'SUCCESS_WITH_WARNINGS') {
                showWarning(`${result.message} - ${result.issues?.length || 0} issue(s) found`);
            } else if (result.status === 'SUCCESS_WITH_ERRORS') {
                showWarning(`${result.message} - Some errors occurred during processing`);
            } else {
                showError(result.message || 'Deduction processing completed with issues');
            }

            // Refresh data
            await fetchData();
            await onRefresh();

        } catch (error) {
            console.error('Process deduction error:', error);

            let errorMessage = 'Failed to process deduction review';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setProcessingDeduction(false);
        }
    };

    // Finalize deduction review
    const handleFinalizeDeduction = async () => {
        try {
            setFinalizing(true);

            const result = await payrollService.finalizeDeduction(payroll.id);

            if (result.success) {
                showSuccess('Deduction review finalized and locked successfully!');
                await onRefresh();
            } else {
                showError(result.message || 'Failed to finalize deduction review');
            }

        } catch (error) {
            console.error('Finalize deduction error:', error);

            let errorMessage = 'Failed to finalize deduction review';

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

            const result = await payrollService.notifyHRForDeduction(payroll.id);

            if (result.success) {
                showSuccess('HR notification sent successfully!');
                await fetchDeductionStatus();
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
            'finalize-deduction',
            'Finalize and Lock Deduction Review?',
            'This action will LOCK all deduction data including loan deductions. No further changes can be made. This will move the payroll to the Confirmed & Locked phase. Are you sure?'
        );
    };

    // Format currency
    const formatCurrency = (value) => {
        if (value == null) return '$0.00';
        return `$${parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    // Render based on state
    const renderContent = () => {
        if (loading) {
            return <div className="loading-state">Loading deduction review data...</div>;
        }

        if (!deductionStatus) {
            return <div className="error-state">Failed to load deduction status</div>;
        }

        console.log('🎯 Rendering decision:', {
            deductionFinalized: deductionStatus.deductionFinalized,
            deductionProcessed: deductionStatus.deductionProcessed
        });

        // Finalized state
        if (deductionStatus.deductionFinalized) {
            return renderFinalizedState();
        }

        // Review/Draft state
        if (deductionStatus.deductionProcessed) {
            return renderReviewState();
        }

        // Initial state
        return renderInitialState();
    };

    // Initial state - not processed yet
    const renderInitialState = () => (
        <div className="deduction-review-initial">
            <div className="review-card">
                <div className="review-header">
                    <FaMoneyBillWave className="review-icon" />
                    <div>
                        <h3>Process All Deductions</h3>
                        <p>Review and process all deductions for this payroll period including absence, late, leave, loan repayments, and other deductions.</p>
                    </div>
                </div>

                <div className="deduction-categories">
                    <div className="category-item">
                        <FaUserMinus />
                        <span>Absence Deductions</span>
                    </div>
                    <div className="category-item">
                        <FaClock />
                        <span>Late Deductions</span>
                    </div>
                    <div className="category-item">
                        <FaMinus />
                        <span>Leave Deductions</span>
                    </div>
                    <div className="category-item">
                        <FaCreditCard />
                        <span>Loan Repayments</span>
                    </div>
                    <div className="category-item">
                        <FaMinus />
                        <span>Other Deductions</span>
                    </div>
                </div>

                <div className="review-actions">
                    <button
                        className="btn-primary btn-large"
                        onClick={handleProcessDeductionReview}
                        disabled={processingDeduction}
                    >
                        {processingDeduction ? (
                            <>
                                <FaClock className="spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaMoneyBillWave />
                                Process Deduction Review
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
                    <span>This will calculate all deductions based on attendance, leave, and active loan repayments, then apply them to employee payrolls.</span>
                </div>
            </div>
        </div>
    );

    // Review state - processed but not finalized
    const renderReviewState = () => (
        <div className="deduction-review-review">
            {/* Status Banner */}
            <div className="status-banner draft">
                <div className="banner-content">
                    <FaExclamationTriangle />
                    <div>
                        <h4>Draft Mode - Deductions Not Finalized</h4>
                        <p>You can re-process or make changes. Click "Finalize" when ready to lock and proceed.</p>
                    </div>
                </div>
                <div className="banner-badge">
                    <span className="badge-draft">DRAFT</span>
                </div>
            </div>

            {/* Deduction Summary */}
            {deductionStatus.summary && (
                <div className="deduction-summary">
                    <div className="summary-header">
                        <FaChartBar />
                        <h4>Deduction Review Summary</h4>
                    </div>

                    <StatisticsCards
                        cards={[
                            { icon: <FaChartBar />, label: "Total Employees", value: deductionStatus.summary.totalEmployees || 0, variant: "total" },
                            { icon: <FaUserMinus />, label: "With Deductions", value: deductionStatus.summary.employeesWithDeductions || 0, variant: "warning" },
                            { icon: <FaMoneyBillWave />, label: "Total Deductions", value: formatCurrency(deductionStatus.summary.totalDeductionAmount), variant: "danger" },
                            { icon: <FaCreditCard />, label: "Active Loans", value: deductionStatus.summary.activeLoansCount || 0, variant: "info" },
                        ]}
                        columns={4}
                    />

                    {/* Deduction Breakdown */}
                    <div className="deduction-breakdown">
                        <h5>Deduction Breakdown</h5>
                        <div className="breakdown-grid">
                            <div className="breakdown-item">
                                <span className="breakdown-label">Absence</span>
                                <span className="breakdown-value">
                                    {formatCurrency(deductionStatus.summary.totalAbsenceDeductions)}
                                </span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">Late</span>
                                <span className="breakdown-value">
                                    {formatCurrency(deductionStatus.summary.totalLateDeductions)}
                                </span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">Leave</span>
                                <span className="breakdown-value">
                                    {formatCurrency(deductionStatus.summary.totalLeaveDeductions)}
                                </span>
                            </div>
                            <div className="breakdown-item loan">
                                <span className="breakdown-label">Loan Repayments</span>
                                <span className="breakdown-value">
                                    {formatCurrency(deductionStatus.summary.totalLoanDeductions)}
                                </span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">Other</span>
                                <span className="breakdown-value">
                                    {formatCurrency(deductionStatus.summary.totalOtherDeductions)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="summary-meta">
                        <span>Processed: {deductionStatus.lastProcessedAt ? new Date(deductionStatus.lastProcessedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                </div>
            )}

            {/* Issues/Warnings */}
            {deductionStatus.issues && deductionStatus.issues.length > 0 && (
                <div className="deduction-issues">
                    <h4>
                        <FaExclamationTriangle />
                        Issues & Warnings ({deductionStatus.issues.length})
                    </h4>
                    <div className="issues-list">
                        {deductionStatus.issues.map((issue, index) => (
                            <div key={index} className={`issue-item ${issue.severity?.toLowerCase() || 'info'}`}>
                                <div className="issue-header">
                                    <span className="issue-employee">{issue.employeeName}</span>
                                    <span className={`issue-severity ${issue.severity?.toLowerCase()}`}>
                                        {issue.severity}
                                    </span>
                                </div>
                                <div className="issue-description">{issue.description}</div>
                                {issue.amount && (
                                    <div className="issue-amount">
                                        Amount: {formatCurrency(issue.amount)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="review-actions">
                <button
                    className="btn-secondary"
                    onClick={handleProcessDeductionReview}
                    disabled={processingDeduction || finalizing}
                >
                    {processingDeduction ? (
                        <>
                            <FaClock className="spin" />
                            Re-processing...
                        </>
                    ) : (
                        <>
                            <FaRedo />
                            Re-Process Deduction Review
                        </>
                    )}
                </button>

                <button
                    className="btn-secondary-outline"
                    onClick={handleNotifyHR}
                    disabled={notifying || deductionStatus.hrNotificationSent}
                >
                    <FaBell />
                    {deductionStatus.hrNotificationSent ? 'HR Notified ✓' : 'Notify HR'}
                </button>

                <button
                    className="btn-success btn-large"
                    onClick={confirmFinalize}
                    disabled={finalizing || processingDeduction}
                >
                    {finalizing ? (
                        <>
                            <FaClock className="spin" />
                            Finalizing...
                        </>
                    ) : (
                        <>
                            <FaLock />
                            Finalize Deduction Review
                        </>
                    )}
                </button>
            </div>

            {/* Employee Deduction Summaries Table */}
            {deductionSummaries.length > 0 ? (
                <div className="deduction-summaries-table">
                    <h4>Employee Deductions ({deductionSummaries.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Absence</th>
                            <th>Late</th>
                            <th>Leave</th>
                            <th>Loan</th>
                            <th>Other</th>
                            <th>Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {deductionSummaries.map((summary) => (
                            <tr key={summary.employeeId}>
                                <td>{summary.employeeName}</td>
                                <td>{formatCurrency(summary.absenceDeduction)}</td>
                                <td>{formatCurrency(summary.lateDeduction)}</td>
                                <td>{formatCurrency(summary.leaveDeduction)}</td>
                                <td className="loan-deduction">{formatCurrency(summary.loanDeduction)}</td>
                                <td>{formatCurrency(summary.otherDeduction)}</td>
                                <td className="total-deduction">
                                    {formatCurrency(summary.totalDeductions)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-data-message">
                    <FaInfoCircle />
                    <p>No employee deductions found for this payroll period.</p>
                </div>
            )}
        </div>
    );

    // Finalized state - locked
    const renderFinalizedState = () => (
        <div className="deduction-review-finalized">
            {/* Status Banner */}
            <div className="status-banner finalized">
                <div className="banner-content">
                    <FaCheckCircle />
                    <div>
                        <h4>Deduction Review Finalized and Locked</h4>
                        <p>All deduction data is locked. No further changes can be made.</p>
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
                    <span className="info-value">{deductionStatus.finalizedBy}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Finalized At:</span>
                    <span className="info-value">
                        {deductionStatus.finalizedAt ? new Date(deductionStatus.finalizedAt).toLocaleString() : 'N/A'}
                    </span>
                </div>
                {deductionStatus.summary && (
                    <>
                        <div className="info-row">
                            <span className="info-label">Total Deductions:</span>
                            <span className="info-value">
                                {formatCurrency(deductionStatus.summary.totalDeductionAmount)}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Employees with Deductions:</span>
                            <span className="info-value">{deductionStatus.summary.employeesWithDeductions}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Loan Deductions Applied:</span>
                            <span className="info-value">{deductionStatus.summary.loanDeductionsApplied}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Deduction Breakdown (Read-only) */}
            {deductionStatus.summary && (
                <div className="deduction-breakdown readonly">
                    <h5>Deduction Breakdown</h5>
                    <div className="breakdown-grid">
                        <div className="breakdown-item">
                            <span className="breakdown-label">Absence</span>
                            <span className="breakdown-value">
                                {formatCurrency(deductionStatus.summary.totalAbsenceDeductions)}
                            </span>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-label">Late</span>
                            <span className="breakdown-value">
                                {formatCurrency(deductionStatus.summary.totalLateDeductions)}
                            </span>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-label">Leave</span>
                            <span className="breakdown-value">
                                {formatCurrency(deductionStatus.summary.totalLeaveDeductions)}
                            </span>
                        </div>
                        <div className="breakdown-item loan">
                            <span className="breakdown-label">Loan Repayments</span>
                            <span className="breakdown-value">
                                {formatCurrency(deductionStatus.summary.totalLoanDeductions)}
                            </span>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-label">Other</span>
                            <span className="breakdown-value">
                                {formatCurrency(deductionStatus.summary.totalOtherDeductions)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Deduction Summaries Table (Read-only) */}
            {deductionSummaries.length > 0 && (
                <div className="deduction-summaries-table">
                    <h4>Employee Deductions ({deductionSummaries.length})</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Absence</th>
                            <th>Late</th>
                            <th>Leave</th>
                            <th>Loan</th>
                            <th>Other</th>
                            <th>Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {deductionSummaries.map((summary) => (
                            <tr key={summary.employeeId}>
                                <td>{summary.employeeName}</td>
                                <td>{formatCurrency(summary.absenceDeduction)}</td>
                                <td>{formatCurrency(summary.lateDeduction)}</td>
                                <td>{formatCurrency(summary.leaveDeduction)}</td>
                                <td className="loan-deduction">{formatCurrency(summary.loanDeduction)}</td>
                                <td>{formatCurrency(summary.otherDeduction)}</td>
                                <td className="total-deduction">
                                    {formatCurrency(summary.totalDeductions)}
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
        <div className="deduction-review-phase">
            {renderContent()}
        </div>
    );
};

export default DeductionReviewPhase;
