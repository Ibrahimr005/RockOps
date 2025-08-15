import React, { useState, useEffect } from 'react';
import { FaPlus, FaEye, FaSpinner, FaExclamationTriangle, FaMoneyBillWave, FaCalendarAlt, FaPercent } from 'react-icons/fa';
import {loanService} from "../../../../services/payroll/loanService.js";
import {useSnackbar} from "../../../../contexts/SnackbarContext.jsx";
import LoanDetailsModal from "../../../payroll/Loans/components/LoanDetailsModal.jsx";
import LoanFormModal from "../../../payroll/Loans/components/LoanFormModal.jsx";

const LoansTab = ({ employee, formatCurrency }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // State management
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [outstandingBalance, setOutstandingBalance] = useState(0);
    const [monthlyRepayment, setMonthlyRepayment] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [loanSummary, setLoanSummary] = useState({
        totalLoans: 0,
        activeLoans: 0,
        pendingLoans: 0,
        completedLoans: 0,
        totalBorrowed: 0,
        totalOutstanding: 0,
        monthlyRepayment: 0,
        utilizationRatio: 0
    });

    // Load employee loan data
    useEffect(() => {
        if (employee?.id) {
            loadEmployeeLoans();
            loadOutstandingBalance();
        }
    }, [employee?.id]);

    const loadEmployeeLoans = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await loanService.getLoansByEmployee(employee.id);
            const employeeLoans = response.data || [];

            setLoans(employeeLoans);
            calculateLoanSummary(employeeLoans);

        } catch (error) {
            console.error('Error loading employee loans:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load loans';
            setError(errorMessage);
            showError(`Failed to load loan information: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const loadOutstandingBalance = async () => {
        try {
            const response = await loanService.getOutstandingBalance(employee.id);
            setOutstandingBalance(response.data || 0);
        } catch (error) {
            console.error('Error loading outstanding balance:', error);
            setOutstandingBalance(0);
        }
    };

    const calculateLoanSummary = (employeeLoans) => {
        if (!employeeLoans || employeeLoans.length === 0) {
            setLoanSummary({
                totalLoans: 0,
                activeLoans: 0,
                pendingLoans: 0,
                completedLoans: 0,
                totalBorrowed: 0,
                totalOutstanding: 0,
                monthlyRepayment: 0,
                utilizationRatio: 0
            });
            setMonthlyRepayment(0);
            return;
        }

        const summary = {
            totalLoans: employeeLoans.length,
            activeLoans: employeeLoans.filter(loan => loan.status === 'ACTIVE').length,
            pendingLoans: employeeLoans.filter(loan => loan.status === 'PENDING').length,
            completedLoans: employeeLoans.filter(loan => loan.status === 'COMPLETED').length,
            totalBorrowed: employeeLoans.reduce((sum, loan) => sum + (loan.loanAmount || 0), 0),
            totalOutstanding: employeeLoans
                .filter(loan => ['ACTIVE', 'PENDING'].includes(loan.status))
                .reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0),
            monthlyRepayment: employeeLoans
                .filter(loan => loan.status === 'ACTIVE')
                .reduce((sum, loan) => sum + (loan.installmentAmount || 0), 0)
        };

        // Calculate utilization ratio if employee has salary info
        if (employee?.monthlySalary && summary.totalOutstanding > 0) {
            summary.utilizationRatio = (summary.totalOutstanding / employee.monthlySalary) * 100;
        } else {
            summary.utilizationRatio = 0;
        }

        setLoanSummary(summary);
        setMonthlyRepayment(summary.monthlyRepayment);
    };

    const handleViewLoan = (loan) => {
        setSelectedLoan(loan);
        setShowDetailsModal(true);
    };

    const handleAddLoan = () => {
        setSelectedLoan(null);
        setShowAddModal(true);
    };

    const handleLoanSaved = () => {
        setShowAddModal(false);
        setSelectedLoan(null);
        loadEmployeeLoans();
        loadOutstandingBalance();
        showSuccess('Loan application submitted successfully');
    };

    const handleProcessRepayment = async (scheduleId, amount) => {
        try {
            await loanService.processRepayment(scheduleId, amount);
            showSuccess('Repayment processed successfully');
            loadEmployeeLoans();
            loadOutstandingBalance();
        } catch (error) {
            console.error('Error processing repayment:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to process repayment';
            showError(`Failed to process repayment: ${errorMessage}`);
        }
    };

    const getLoanStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'pending', text: 'Pending', color: '#ff9800' },
            ACTIVE: { class: 'active', text: 'Active', color: '#2196f3' },
            COMPLETED: { class: 'completed', text: 'Completed', color: '#4caf50' },
            REJECTED: { class: 'rejected', text: 'Rejected', color: '#f44336' },
            CANCELLED: { class: 'cancelled', text: 'Cancelled', color: '#9e9e9e' }
        };

        const config = statusConfig[status] || { class: 'unknown', text: status, color: '#9e9e9e' };

        return (
            <span
                className={`status-badge ${config.class}`}
                style={{
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                    border: `1px solid ${config.color}40`
                }}
            >
                {config.text}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getProgressPercentage = (loan) => {
        if (!loan.totalInstallments || loan.totalInstallments === 0) return 0;
        return Math.round(((loan.paidInstallments || 0) / loan.totalInstallments) * 100);
    };

    const canApplyForNewLoan = () => {
        // Business rules for loan eligibility
        const hasPendingLoan = loanSummary.pendingLoans > 0;
        const exceedsMaxOutstanding = outstandingBalance >= 100000; // $100k limit
        const exceedsUtilizationLimit = (loanSummary.utilizationRatio || 0) > 50; // 50% of salary

        return !hasPendingLoan && !exceedsMaxOutstanding && !exceedsUtilizationLimit;
    };

    const getEligibilityMessage = () => {
        if (loanSummary.pendingLoans > 0) {
            return "You have a pending loan application. Only one pending application is allowed.";
        }
        if (outstandingBalance >= 100000) {
            return "You have reached the maximum outstanding balance limit of $100,000.";
        }
        if ((loanSummary.utilizationRatio || 0) > 50) {
            return "Your loan utilization exceeds 50% of your monthly salary.";
        }
        return null;
    };

    if (loading) {
        return (
            <div className="loans-info tab-panel">
                <div className="loading-state">
                    <FaSpinner className="spinning" />
                    <p>Loading loan information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loans-info tab-panel">
                <div className="error-state">
                    <FaExclamationTriangle />
                    <h3>Error Loading Loan Information</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={loadEmployeeLoans}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="loans-info tab-panel">
            <div className="loans-header">
                <h3>Loans & Advances</h3>
                <div className="loans-actions">
                    {canApplyForNewLoan() ? (
                        <button className="btn btn-primary" onClick={handleAddLoan}>
                            <FaPlus /> Apply for Loan
                        </button>
                    ) : (
                        <button
                            className="btn btn-secondary"
                            disabled
                            title={getEligibilityMessage()}
                        >
                            <FaPlus /> Apply for Loan
                        </button>
                    )}
                </div>
            </div>

            {/* Loan Summary Cards */}
            <div className="loans-summary">
                <div className="summary-card summary-card--primary">
                    <div className="summary-card__icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="summary-card__content">
                        <h4>Total Outstanding</h4>
                        <div className="amount">{formatCurrency(loanSummary.totalOutstanding)}</div>
                        <div className="period">Current Balance</div>
                    </div>
                </div>

                <div className="summary-card summary-card--info">
                    <div className="summary-card__icon">
                        <FaCalendarAlt />
                    </div>
                    <div className="summary-card__content">
                        <h4>Monthly Deduction</h4>
                        <div className="amount">{formatCurrency(loanSummary.monthlyRepayment)}</div>
                        <div className="period">Per Month</div>
                    </div>
                </div>

                <div className="summary-card summary-card--warning">
                    <div className="summary-card__icon">
                        <FaPercent />
                    </div>
                    <div className="summary-card__content">
                        <h4>Utilization Ratio</h4>
                        <div className="amount">{(loanSummary.utilizationRatio || 0).toFixed(1)}%</div>
                        <div className="period">Of Salary</div>
                    </div>
                </div>

                <div className="summary-card summary-card--success">
                    <div className="summary-card__icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="summary-card__content">
                        <h4>Total Borrowed</h4>
                        <div className="amount">{formatCurrency(loanSummary.totalBorrowed)}</div>
                        <div className="period">Lifetime</div>
                    </div>
                </div>
            </div>

            {/* Eligibility Warning */}
            {!canApplyForNewLoan() && (
                <div className="eligibility-warning">
                    <FaExclamationTriangle />
                    <span>{getEligibilityMessage()}</span>
                </div>
            )}

            {/* Loans Table */}
            <div className="loans-table-container">
                {loans.length > 0 ? (
                    <table className="loans-table">
                        <thead>
                        <tr>
                            <th>Date Applied</th>
                            <th>Amount</th>
                            <th>Remaining</th>
                            <th>Monthly Payment</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loans.map((loan) => (
                            <tr key={loan.id}>
                                <td>{formatDate(loan.startDate)}</td>
                                <td className="amount-cell">
                                    {formatCurrency(loan.loanAmount)}
                                </td>
                                <td className="amount-cell">
                                    {formatCurrency(loan.remainingBalance)}
                                </td>
                                <td className="amount-cell">
                                    {formatCurrency(loan.installmentAmount)}
                                </td>
                                <td>
                                    <div className="progress-container">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${getProgressPercentage(loan)}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">
                                                {loan.paidInstallments || 0}/{loan.totalInstallments}
                                            ({getProgressPercentage(loan)}%)
                                            </span>
                                    </div>
                                </td>
                                <td>{getLoanStatusBadge(loan.status)}</td>
                                <td>
                                    <button
                                        className="view-details-btn"
                                        onClick={() => handleViewLoan(loan)}
                                    >
                                        <FaEye /> Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-loans-message">
                        <FaMoneyBillWave className="no-loans-icon" />
                        <h4>No Loans Found</h4>
                        <p>This employee has no loan history.</p>
                        {canApplyForNewLoan() && (
                            <button className="btn btn-primary" onClick={handleAddLoan}>
                                <FaPlus /> Apply for First Loan
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Loan Statistics */}
            <div className="loan-statistics">
                <h4>Loan Statistics</h4>
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Total Loans:</span>
                        <span className="stat-value">{loanSummary.totalLoans}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Active Loans:</span>
                        <span className="stat-value">{loanSummary.activeLoans}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Completed Loans:</span>
                        <span className="stat-value">{loanSummary.completedLoans}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Available Credit:</span>
                        <span className="stat-value">
                            {formatCurrency(Math.max(0, 100000 - outstandingBalance))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <LoanFormModal
                    loan={selectedLoan}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleLoanSaved}
                    prefilledEmployeeId={employee.id}
                />
            )}

            {showDetailsModal && selectedLoan && (
                <LoanDetailsModal
                    loan={selectedLoan}
                    onClose={() => setShowDetailsModal(false)}
                    onProcessRepayment={handleProcessRepayment}
                />
            )}

            <style jsx>{`
                .loans-info {
                    padding: 1.5rem;
                }

                .loans-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .loans-header h3 {
                    margin: 0;
                    color: var(--color-text-primary);
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .loans-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .summary-card {
                    background: var(--section-background-color);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.2s ease;
                }

                .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .summary-card__icon {
                    font-size: 2rem;
                    color: var(--color-primary);
                    flex-shrink: 0;
                }

                .summary-card--primary .summary-card__icon {
                    color: var(--color-primary);
                }

                .summary-card--info .summary-card__icon {
                    color: var(--color-info);
                }

                .summary-card--warning .summary-card__icon {
                    color: var(--color-warning);
                }

                .summary-card--success .summary-card__icon {
                    color: var(--color-success);
                }

                .summary-card__content h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.9rem;
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .summary-card .amount {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    margin-bottom: 0.25rem;
                }

                .summary-card .period {
                    font-size: 0.8rem;
                    color: var(--color-text-tertiary);
                }

                .eligibility-warning {
                    background: rgba(255, 152, 0, 0.1);
                    border: 1px solid rgba(255, 152, 0, 0.3);
                    color: var(--color-warning);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .loans-table-container {
                    background: var(--section-background-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    margin-bottom: 2rem;
                }

                .loans-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .loans-table th,
                .loans-table td {
                    padding: 1rem;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }

                .loans-table th {
                    background: var(--color-surface-hover);
                    font-weight: 600;
                    color: var(--color-text-primary);
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .loans-table tbody tr:hover {
                    background: var(--color-surface-hover);
                }

                .amount-cell {
                    font-weight: 600;
                    color: var(--color-text-primary);
                }

                .progress-container {
                    min-width: 120px;
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: var(--color-surface-hover);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 0.25rem;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--color-success) 0%, #45a049 100%);
                    transition: width 0.3s ease;
                }

                .progress-text {
                    font-size: 0.8rem;
                    color: var(--color-text-secondary);
                }

                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .view-details-btn {
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    transition: all 0.2s ease;
                }

                .view-details-btn:hover {
                    background: var(--color-primary-dark);
                    transform: translateY(-1px);
                }

                .no-loans-message {
                    text-align: center;
                    padding: 3rem;
                    color: var(--color-text-secondary);
                }

                .no-loans-icon {
                    font-size: 3rem;
                    color: var(--color-text-tertiary);
                    margin-bottom: 1rem;
                }

                .no-loans-message h4 {
                    margin: 0 0 0.5rem 0;
                    color: var(--color-text-primary);
                }

                .no-loans-message p {
                    margin: 0 0 1.5rem 0;
                }

                .loan-statistics {
                    background: var(--section-background-color);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    border: 1px solid var(--border-color);
                }

                .loan-statistics h4 {
                    margin: 0 0 1rem 0;
                    color: var(--color-text-primary);
                    font-size: 1.1rem;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    background: var(--color-surface);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }

                .stat-label {
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                }

                .stat-value {
                    color: var(--color-text-primary);
                    font-weight: 600;
                }

                .loading-state,
                .error-state {
                    text-align: center;
                    padding: 3rem;
                    color: var(--color-text-secondary);
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .loans-summary {
                        grid-template-columns: 1fr;
                    }

                    .loans-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .loans-table {
                        font-size: 0.8rem;
                    }

                    .loans-table th,
                    .loans-table td {
                        padding: 0.5rem;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default LoansTab;