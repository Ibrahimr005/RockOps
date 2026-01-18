// ========================================
// FILE: ConfirmedLockedPhase.jsx
// Phase 5: Confirmed & Locked
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaLock,
    FaCheckCircle,
    FaPaperPlane,
    FaUniversity,
    FaMoneyBillWave,
    FaUserTie,
    FaSpinner,
    FaExclamationTriangle
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import { financeService } from '../../../../services/financeService';
import EmployeePayrollsTable from './EmployeePayrollsTable';
import './ConfirmedLockedPhase.scss';

const ConfirmedLockedPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog }) => {
    const { showError, showSuccess, showWarning } = useSnackbar();
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    // Send to finance modal state
    const [showSendModal, setShowSendModal] = useState(false);
    const [balances, setBalances] = useState({
        bankAccounts: [],
        cashSafes: [],
        cashWithPersons: []
    });
    const [loadingBalances, setLoadingBalances] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchEmployeePayrolls();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    const fetchEmployeePayrolls = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getEmployeePayrolls(payroll.id);
            const data = response.data || response;
            setEmployeePayrolls(Array.isArray(data) ? data : []);
        } catch (error) {
            showError(error.message || 'Failed to load employee payrolls');
            setEmployeePayrolls([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalances = async () => {
        try {
            setLoadingBalances(true);
            const [bankRes, safeRes, personRes] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            setBalances({
                bankAccounts: bankRes.data || [],
                cashSafes: safeRes.data || [],
                cashWithPersons: personRes.data || []
            });
        } catch (error) {
            console.error('Error fetching balances:', error);
            showError('Failed to load payment sources');
        } finally {
            setLoadingBalances(false);
        }
    };

    const handleOpenSendModal = () => {
        setShowSendModal(true);
        setSelectedSource(null);
        fetchBalances();
    };

    const handleCloseSendModal = () => {
        setShowSendModal(false);
        setSelectedSource(null);
    };

    const handleSelectSource = (type, source) => {
        setSelectedSource({
            type,
            id: source.id,
            name: source.accountName || source.safeName || source.personName || 'Unknown',
            balance: source.currentBalance || source.balance || 0
        });
    };

    const handleSendToFinance = async () => {
        if (!selectedSource) {
            showWarning('Please select a payment source');
            return;
        }

        // Check if balance is sufficient
        const totalNet = payroll.totalNetAmount || 0;
        if (selectedSource.balance < totalNet) {
            showWarning(`Insufficient balance. Required: ${totalNet.toLocaleString()}, Available: ${selectedSource.balance.toLocaleString()}`);
            return;
        }

        try {
            setSending(true);
            await payrollService.sendToFinance(payroll.id, selectedSource);
            showSuccess('Payroll sent to finance for review');
            handleCloseSendModal();
            if (onRefresh) onRefresh();
        } catch (error) {
            showError(error.message || 'Failed to send payroll to finance');
        } finally {
            setSending(false);
        }
    };

    const formatCurrency = (amount) => {
        return (amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    return (
        <div className="confirmed-locked-phase">
            <div className="phase-action-section">
                <div className="action-card locked">
                    <div className="action-content">
                        <FaLock className="action-icon" />
                        <div>
                            <h3>Payroll Confirmed & Locked</h3>
                            <p>All calculations are complete and the payroll is now locked. Ready for payment processing.</p>
                        </div>
                    </div>
                    <div className="lock-badge">
                        <FaCheckCircle />
                        <span>Locked</span>
                    </div>
                </div>

                {/* Payroll Summary */}
                <div className="payroll-summary-card">
                    <h4>Payroll Summary</h4>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="label">Employees</span>
                            <span className="value">{payroll.employeeCount || 0}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Gross Amount</span>
                            <span className="value">{formatCurrency(payroll.totalGrossAmount)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Total Deductions</span>
                            <span className="value deduction">-{formatCurrency(payroll.totalDeductions)}</span>
                        </div>
                        <div className="summary-item highlight">
                            <span className="label">Net Amount</span>
                            <span className="value">{formatCurrency(payroll.totalNetAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Send to Finance Button */}
                <div className="action-buttons">
                    <button
                        className="btn-send-finance"
                        onClick={handleOpenSendModal}
                        disabled={processing}
                    >
                        <FaPaperPlane />
                        Send to Finance for Payment
                    </button>
                </div>
            </div>

            <EmployeePayrollsTable
                employeePayrolls={employeePayrolls}
                payroll={payroll}
                onRefresh={fetchEmployeePayrolls}
                loading={loading}
            />

            {/* Send to Finance Modal */}
            {showSendModal && (
                <div className="modal-overlay" onClick={handleCloseSendModal}>
                    <div className="modal-content send-finance-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FaPaperPlane /> Send Payroll to Finance</h3>
                            <button className="close-btn" onClick={handleCloseSendModal}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-section">
                                <p>Select a payment source for salary disbursement. Finance team will be notified to review and process the payment.</p>
                                <div className="payroll-info">
                                    <span>Total Net Amount:</span>
                                    <strong>{formatCurrency(payroll.totalNetAmount)}</strong>
                                </div>
                            </div>

                            {loadingBalances ? (
                                <div className="loading-state">
                                    <FaSpinner className="spin" />
                                    <span>Loading payment sources...</span>
                                </div>
                            ) : (
                                <div className="balance-sources">
                                    {/* Bank Accounts */}
                                    <div className="source-category">
                                        <h4><FaUniversity /> Bank Accounts</h4>
                                        {balances.bankAccounts.length === 0 ? (
                                            <p className="no-items">No active bank accounts</p>
                                        ) : (
                                            <div className="source-list">
                                                {balances.bankAccounts.map(account => (
                                                    <div
                                                        key={account.id}
                                                        className={`source-item ${selectedSource?.id === account.id ? 'selected' : ''} ${account.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}`}
                                                        onClick={() => handleSelectSource('BANK_ACCOUNT', account)}
                                                    >
                                                        <div className="source-info">
                                                            <span className="name">{account.accountName}</span>
                                                            <span className="details">{account.bankName} - {account.accountNumber}</span>
                                                        </div>
                                                        <div className="source-balance">
                                                            <span className={account.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}>
                                                                {formatCurrency(account.currentBalance)}
                                                            </span>
                                                            {account.currentBalance < payroll.totalNetAmount && (
                                                                <FaExclamationTriangle className="warning-icon" title="Insufficient balance" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cash Safes */}
                                    <div className="source-category">
                                        <h4><FaMoneyBillWave /> Cash Safes</h4>
                                        {balances.cashSafes.length === 0 ? (
                                            <p className="no-items">No active cash safes</p>
                                        ) : (
                                            <div className="source-list">
                                                {balances.cashSafes.map(safe => (
                                                    <div
                                                        key={safe.id}
                                                        className={`source-item ${selectedSource?.id === safe.id ? 'selected' : ''} ${safe.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}`}
                                                        onClick={() => handleSelectSource('CASH_SAFE', safe)}
                                                    >
                                                        <div className="source-info">
                                                            <span className="name">{safe.safeName}</span>
                                                            <span className="details">{safe.location || 'No location'}</span>
                                                        </div>
                                                        <div className="source-balance">
                                                            <span className={safe.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}>
                                                                {formatCurrency(safe.currentBalance)}
                                                            </span>
                                                            {safe.currentBalance < payroll.totalNetAmount && (
                                                                <FaExclamationTriangle className="warning-icon" title="Insufficient balance" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cash With Persons */}
                                    <div className="source-category">
                                        <h4><FaUserTie /> Cash With Persons</h4>
                                        {balances.cashWithPersons.length === 0 ? (
                                            <p className="no-items">No active cash holders</p>
                                        ) : (
                                            <div className="source-list">
                                                {balances.cashWithPersons.map(person => (
                                                    <div
                                                        key={person.id}
                                                        className={`source-item ${selectedSource?.id === person.id ? 'selected' : ''} ${person.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}`}
                                                        onClick={() => handleSelectSource('CASH_WITH_PERSON', person)}
                                                    >
                                                        <div className="source-info">
                                                            <span className="name">{person.personName}</span>
                                                            <span className="details">{person.department || 'No department'}</span>
                                                        </div>
                                                        <div className="source-balance">
                                                            <span className={person.currentBalance < payroll.totalNetAmount ? 'insufficient' : ''}>
                                                                {formatCurrency(person.currentBalance)}
                                                            </span>
                                                            {person.currentBalance < payroll.totalNetAmount && (
                                                                <FaExclamationTriangle className="warning-icon" title="Insufficient balance" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedSource && (
                                <div className="selected-source-summary">
                                    <h5>Selected Payment Source</h5>
                                    <div className="summary-row">
                                        <span>Source:</span>
                                        <strong>{selectedSource.name}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Type:</span>
                                        <span>{selectedSource.type.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Available Balance:</span>
                                        <span>{formatCurrency(selectedSource.balance)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={handleCloseSendModal}>
                                Cancel
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={handleSendToFinance}
                                disabled={!selectedSource || sending}
                            >
                                {sending ? (
                                    <>
                                        <FaSpinner className="spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        Send to Finance
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfirmedLockedPhase;
