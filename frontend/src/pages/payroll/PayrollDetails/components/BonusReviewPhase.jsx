// ========================================
// FILE: BonusReviewPhase.jsx
// Bonus review workflow component
// Reviews all bonuses for the payroll period
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
    FaGift,
    FaUsers,
    FaMoneyBillWave
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './BonusReviewPhase.scss';

const BonusReviewPhase = ({ payroll, onTransition, onRefresh, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();

    // State
    const [bonusStatus, setBonusStatus] = useState(null);
    const [bonusSummaries, setBonusSummaries] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingBonus, setProcessingBonus] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    // Fetch all data
    const fetchData = async () => {
        await Promise.all([
            fetchBonusStatus(),
            fetchBonusSummaries()
        ]);
        setLoading(false);
    };

    // Fetch bonus review status
    const fetchBonusStatus = async () => {
        try {
            const status = await payrollService.getBonusStatus(payroll.id);
            console.log('Bonus Status:', status);
            setBonusStatus(status);
        } catch (error) {
            console.error('Error fetching bonus status:', error);
        }
    };

    // Fetch bonus summaries for this payroll period
    const fetchBonusSummaries = async () => {
        try {
            const data = await payrollService.getBonusSummaries(payroll.id);
            console.log('Bonus Summaries:', data);
            setBonusSummaries(data);
        } catch (error) {
            console.error('Error fetching bonus summaries:', error);
            setBonusSummaries(null);
        }
    };

    // Process bonus review
    const handleProcessBonusReview = async () => {
        try {
            setProcessingBonus(true);

            const result = await payrollService.processBonusReview(payroll.id);
            console.log('Process Bonus Result:', result);

            showSuccess(result.message || 'Bonus review processed successfully');

            // Refresh data
            await fetchData();
            await onRefresh();

        } catch (error) {
            console.error('Process bonus error:', error);

            let errorMessage = 'Failed to process bonus review';

            if (error.response) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
        } finally {
            setProcessingBonus(false);
        }
    };

    // Finalize bonus review
    const handleFinalizeBonus = async () => {
        try {
            setFinalizing(true);

            const result = await payrollService.finalizeBonus(payroll.id);

            if (result.success !== false) {
                showSuccess('Bonus review finalized and locked successfully!');
                await onRefresh();
            } else {
                showError(result.message || 'Failed to finalize bonus review');
            }

        } catch (error) {
            console.error('Finalize bonus error:', error);

            let errorMessage = 'Failed to finalize bonus review';

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

    // Confirm finalization
    const confirmFinalize = () => {
        openConfirmDialog(
            'finalize-bonus',
            'Finalize and Lock Bonus Review?',
            'This action will LOCK all bonus data for this payroll period. No further changes can be made. This will move the payroll to the Deduction Review phase. Are you sure?'
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
            return <div className="loading-state">Loading bonus review data...</div>;
        }

        if (!bonusStatus) {
            return <div className="error-state">Failed to load bonus status</div>;
        }

        // Finalized state
        if (bonusStatus.bonusFinalized) {
            return renderFinalizedState();
        }

        // Review/Draft state
        if (bonusStatus.bonusProcessed) {
            return renderReviewState();
        }

        // Initial state
        return renderInitialState();
    };

    // Initial state - not processed yet
    const renderInitialState = () => (
        <div className="bonus-review-initial">
            <div className="review-card">
                <div className="review-header">
                    <FaGift className="review-icon" />
                    <div>
                        <h3>Process Bonus Review</h3>
                        <p>Review and process all approved bonuses for this payroll period. This will fetch eligible bonuses and apply them to employee payrolls.</p>
                    </div>
                </div>

                <div className="bonus-categories">
                    <div className="category-item">
                        <FaGift />
                        <span>Performance Bonuses</span>
                    </div>
                    <div className="category-item">
                        <FaMoneyBillWave />
                        <span>Annual Bonuses</span>
                    </div>
                    <div className="category-item">
                        <FaUsers />
                        <span>Team Bonuses</span>
                    </div>
                </div>

                <div className="review-actions">
                    <button
                        className="btn-primary btn-large"
                        onClick={handleProcessBonusReview}
                        disabled={processingBonus}
                    >
                        {processingBonus ? (
                            <>
                                <FaClock className="spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaGift />
                                Process Bonus Review
                            </>
                        )}
                    </button>
                </div>

                <div className="review-info">
                    <FaInfoCircle />
                    <span>This will fetch all HR-approved bonuses for the payroll period and apply their amounts to employee payrolls.</span>
                </div>
            </div>
        </div>
    );

    // Review state - processed but not finalized
    const renderReviewState = () => {
        const summary = bonusStatus.summary || bonusSummaries || {};

        return (
            <div className="bonus-review-review">
                {/* Status Banner */}
                <div className="status-banner draft">
                    <div className="banner-content">
                        <FaExclamationTriangle />
                        <div>
                            <h4>Draft Mode - Bonuses Not Finalized</h4>
                            <p>You can re-process or make changes. Click "Finalize" when ready to lock and proceed.</p>
                        </div>
                    </div>
                    <div className="banner-badge">
                        <span className="badge-draft">DRAFT</span>
                    </div>
                </div>

                {/* Bonus Summary */}
                <div className="bonus-summary">
                    <div className="summary-header">
                        <FaChartBar />
                        <h4>Bonus Review Summary</h4>
                    </div>

                    <StatisticsCards
                        cards={[
                            { icon: <FaChartBar />, label: "Total Bonuses", value: summary.totalBonusCount || 0, variant: "total" },
                            { icon: <FaGift />, label: "Paid Bonuses", value: summary.paidBonusCount || 0, variant: "success" },
                            { icon: <FaMoneyBillWave />, label: "Total Amount", value: formatCurrency(summary.totalBonusAmount), variant: "info" },
                            { icon: <FaClock />, label: "Pending", value: summary.pendingBonusCount || 0, variant: "warning" },
                        ]}
                        columns={4}
                    />

                    {/* Bonus Type Breakdown */}
                    {summary.byType && summary.byType.length > 0 && (
                        <div className="bonus-breakdown">
                            <h5>Breakdown by Type</h5>
                            <div className="breakdown-grid">
                                {summary.byType.map((type, index) => (
                                    <div key={index} className="breakdown-item">
                                        <span className="breakdown-label">{type.typeName} ({type.typeCode})</span>
                                        <span className="breakdown-value">
                                            {type.count} - {formatCurrency(type.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="summary-meta">
                        <span>Processed: {bonusStatus.lastProcessedAt ? new Date(bonusStatus.lastProcessedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                </div>

                {/* Issues/Warnings */}
                {summary.issues && summary.issues.length > 0 && (
                    <div className="bonus-issues">
                        <h4>
                            <FaExclamationTriangle />
                            Issues & Warnings ({summary.issues.length})
                        </h4>
                        <div className="issues-list">
                            {summary.issues.map((issue, index) => (
                                <div key={index} className="issue-item warning">
                                    <div className="issue-description">{issue}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="review-actions">
                    <button
                        className="btn-secondary"
                        onClick={handleProcessBonusReview}
                        disabled={processingBonus || finalizing}
                    >
                        {processingBonus ? (
                            <>
                                <FaClock className="spin" />
                                Re-processing...
                            </>
                        ) : (
                            <>
                                <FaRedo />
                                Re-Process Bonus Review
                            </>
                        )}
                    </button>

                    <button
                        className="btn-success btn-large"
                        onClick={confirmFinalize}
                        disabled={finalizing || processingBonus}
                    >
                        {finalizing ? (
                            <>
                                <FaClock className="spin" />
                                Finalizing...
                            </>
                        ) : (
                            <>
                                <FaLock />
                                Finalize Bonus Review
                            </>
                        )}
                    </button>
                </div>

                {/* Employee Bonus Summaries Table */}
                {summary.byEmployee && summary.byEmployee.length > 0 ? (
                    <div className="bonus-summaries-table">
                        <h4>Employee Bonuses ({summary.byEmployee.length})</h4>
                        <table>
                            <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Bonus Count</th>
                                <th>Total Amount</th>
                            </tr>
                            </thead>
                            <tbody>
                            {summary.byEmployee.map((emp) => (
                                <tr key={emp.employeeId}>
                                    <td>{emp.employeeName}</td>
                                    <td>{emp.count}</td>
                                    <td className="total-bonus">
                                        {formatCurrency(emp.amount)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-data-message">
                        <FaInfoCircle />
                        <p>No employee bonuses found for this payroll period.</p>
                    </div>
                )}
            </div>
        );
    };

    // Finalized state - locked
    const renderFinalizedState = () => {
        const summary = bonusStatus.summary || bonusSummaries || {};

        return (
            <div className="bonus-review-finalized">
                {/* Status Banner */}
                <div className="status-banner finalized">
                    <div className="banner-content">
                        <FaCheckCircle />
                        <div>
                            <h4>Bonus Review Finalized and Locked</h4>
                            <p>All bonus data is locked. No further changes can be made.</p>
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
                        <span className="info-value">{bonusStatus.finalizedBy || '-'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Finalized At:</span>
                        <span className="info-value">
                            {bonusStatus.finalizedAt ? new Date(bonusStatus.finalizedAt).toLocaleString() : 'N/A'}
                        </span>
                    </div>
                    {summary.totalBonusCount != null && (
                        <div className="info-row">
                            <span className="info-label">Total Bonuses:</span>
                            <span className="info-value">{summary.totalBonusCount}</span>
                        </div>
                    )}
                    {summary.totalBonusAmount != null && (
                        <div className="info-row">
                            <span className="info-label">Total Amount:</span>
                            <span className="info-value">{formatCurrency(summary.totalBonusAmount)}</span>
                        </div>
                    )}
                </div>

                {/* Bonus Type Breakdown (Read-only) */}
                {summary.byType && summary.byType.length > 0 && (
                    <div className="bonus-breakdown readonly">
                        <h5>Breakdown by Type</h5>
                        <div className="breakdown-grid">
                            {summary.byType.map((type, index) => (
                                <div key={index} className="breakdown-item">
                                    <span className="breakdown-label">{type.typeName} ({type.typeCode})</span>
                                    <span className="breakdown-value">
                                        {type.count} - {formatCurrency(type.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Employee Bonus Summaries Table (Read-only) */}
                {summary.byEmployee && summary.byEmployee.length > 0 && (
                    <div className="bonus-summaries-table">
                        <h4>Employee Bonuses ({summary.byEmployee.length})</h4>
                        <table>
                            <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Bonus Count</th>
                                <th>Total Amount</th>
                            </tr>
                            </thead>
                            <tbody>
                            {summary.byEmployee.map((emp) => (
                                <tr key={emp.employeeId}>
                                    <td>{emp.employeeName}</td>
                                    <td>{emp.count}</td>
                                    <td className="total-bonus">
                                        {formatCurrency(emp.amount)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bonus-review-phase">
            {renderContent()}
        </div>
    );
};

export default BonusReviewPhase;
