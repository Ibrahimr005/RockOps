// ========================================
// FILE: ConfirmedLockedPhase.jsx
// Phase 6: Confirmed & Locked - Batch-based Workflow
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaLock,
    FaCheckCircle,
    FaPaperPlane,
    FaLayerGroup,
    FaExclamationTriangle,
    FaSpinner,
    FaUsers,
    FaUniversity,
    FaMoneyBillWave,
    FaWallet,
    FaCreditCard,
    FaRedo,
    FaEye
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import EmployeePayrollsTable from './EmployeePayrollsTable';
import FinanceSubTimeline from './FinanceSubTimeline';
import './ConfirmedLockedPhase.scss';

const ConfirmedLockedPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog, statusOverride }) => {
    const { showError, showSuccess, showWarning, showInfo } = useSnackbar();
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    // Batch state
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [employeesWithoutPaymentType, setEmployeesWithoutPaymentType] = useState([]);
    const [creatingBatches, setCreatingBatches] = useState(false);
    const [sendingToFinance, setSendingToFinance] = useState(false);

    // Modal state
    const [showBatchPreview, setShowBatchPreview] = useState(false);
    const [showMissingPaymentTypeModal, setShowMissingPaymentTypeModal] = useState(false);

    const isRejected = statusOverride === 'rejected';

    // Scroll lock for inline modals
    useEffect(() => {
        if (showBatchPreview || showMissingPaymentTypeModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showBatchPreview, showMissingPaymentTypeModal]);

    useEffect(() => {
        fetchEmployeePayrolls();
        fetchBatches();
        fetchEmployeesWithoutPaymentType();
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

    const fetchBatches = async () => {
        try {
            setLoadingBatches(true);
            const response = await payrollService.getBatches(payroll.id);
            const data = response.data || response;
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatches([]);
        } finally {
            setLoadingBatches(false);
        }
    };

    const fetchEmployeesWithoutPaymentType = async () => {
        try {
            const response = await payrollService.getEmployeesWithoutPaymentType(payroll.id);
            const data = response.data || response;
            setEmployeesWithoutPaymentType(data.employees || []);
        } catch (error) {
            console.error('Error fetching employees without payment type:', error);
            setEmployeesWithoutPaymentType([]);
        }
    };

    const handleCreateBatches = async () => {
        // Check for employees without payment type
        if (employeesWithoutPaymentType.length > 0) {
            setShowMissingPaymentTypeModal(true);
            return;
        }

        try {
            setCreatingBatches(true);
            const response = await payrollService.createBatches(payroll.id);
            const data = response.data || response;

            if (data.success) {
                showSuccess(`${data.batchCount} batches created successfully`);
                setBatches(data.batches || []);
                setShowBatchPreview(true);
            }
        } catch (error) {
            showError(error.message || 'Failed to create batches');
        } finally {
            setCreatingBatches(false);
        }
    };

    const handleSendToFinance = async () => {
        if (batches.length === 0) {
            showWarning('Please create batches first');
            return;
        }

        if (employeesWithoutPaymentType.length > 0) {
            showWarning(`${employeesWithoutPaymentType.length} employees don't have a payment type assigned`);
            setShowMissingPaymentTypeModal(true);
            return;
        }

        try {
            setSendingToFinance(true);
            const response = await payrollService.sendBatchesToFinance(payroll.id);
            const data = response.data || response;

            if (data.success) {
                showSuccess('Batches sent to finance for review');
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            showError(error.message || 'Failed to send batches to finance');
        } finally {
            setSendingToFinance(false);
        }
    };

    const handleResendToFinance = async () => {
        // For rejected payrolls, allow resending
        try {
            setSendingToFinance(true);
            await payrollService.createBatches(payroll.id);
            const response = await payrollService.sendBatchesToFinance(payroll.id);
            const data = response.data || response;

            if (data.success) {
                showSuccess('Payroll re-sent to finance for review');
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            showError(error.message || 'Failed to resend to finance');
        } finally {
            setSendingToFinance(false);
        }
    };

    const formatCurrency = (amount) => {
        return (amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getPaymentTypeIcon = (code) => {
        switch (code?.toUpperCase()) {
            case 'BANK_TRANSFER':
                return <FaUniversity />;
            case 'CASH':
                return <FaMoneyBillWave />;
            case 'CHEQUE':
                return <FaCreditCard />;
            case 'MOBILE_WALLET':
                return <FaWallet />;
            default:
                return <FaMoneyBillWave />;
        }
    };

    const getBatchStatusBadge = (status) => {
        const statusMap = {
            'PENDING_FINANCE_REVIEW': { label: 'Pending Review', class: 'pending' },
            'FINANCE_APPROVED': { label: 'Approved', class: 'approved' },
            'FINANCE_REJECTED': { label: 'Rejected', class: 'rejected' },
            'PARTIALLY_PAID': { label: 'Partially Paid', class: 'partial' },
            'PAID': { label: 'Paid', class: 'paid' }
        };
        const info = statusMap[status] || { label: status, class: 'default' };
        return <span className={`batch-status-badge ${info.class}`}>{info.label}</span>;
    };

    return (
        <div className="confirmed-locked-phase">
            {/* Finance Sub-Timeline - Only show for rejected status */}
            {isRejected && <FinanceSubTimeline currentStatus="FINANCE_REJECTED" />}

            {/* Status Banner */}
            <div className={`phase-action-section ${isRejected ? 'rejected' : ''}`}>
                <div className={`action-card ${isRejected ? 'rejected' : 'locked'}`}>
                    <div className="action-content">
                        {isRejected ? <FaExclamationTriangle className="action-icon warning" /> : <FaLock className="action-icon" />}
                        <div>
                            <h3>{isRejected ? 'Finance Rejected - Review Required' : 'Payroll Confirmed & Locked'}</h3>
                            <p>
                                {isRejected
                                    ? 'Finance has rejected one or more batches. Please review and resend when ready.'
                                    : 'All calculations are complete. Create batches by payment type and send to finance for review.'
                                }
                            </p>
                        </div>
                    </div>
                    <div className={`lock-badge ${isRejected ? 'rejected' : ''}`}>
                        {isRejected ? <FaExclamationTriangle /> : <FaCheckCircle />}
                        <span>{isRejected ? 'Rejected' : 'Locked'}</span>
                    </div>
                </div>

                {/* Warning for employees without payment type */}
                {employeesWithoutPaymentType.length > 0 && (
                    <div className="warning-banner" onClick={() => setShowMissingPaymentTypeModal(true)}>
                        <FaExclamationTriangle />
                        <span>
                            <strong>{employeesWithoutPaymentType.length} employees</strong> don't have a payment type assigned.
                            Click to view and assign payment types before creating batches.
                        </span>
                    </div>
                )}

                {/* Batches Section */}
                <div className="batches-section">
                    <div className="section-header">
                        <h4><FaLayerGroup /> Payment Batches</h4>
                        {batches.length > 0 && (
                            <button className="btn-preview" onClick={() => setShowBatchPreview(true)}>
                                <FaEye /> View Details
                            </button>
                        )}
                    </div>

                    {loadingBatches ? (
                        <div className="loading-state">
                            <FaSpinner className="spin" />
                            <span>Loading batches...</span>
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="no-batches">
                            <p>No batches created yet. Click "Create Batches" to group employees by payment type.</p>
                        </div>
                    ) : (
                        <div className="batch-cards">
                            {batches.map((batch) => (
                                <div key={batch.id} className="batch-card">
                                    <div className="batch-header">
                                        <div className="batch-type">
                                            {getPaymentTypeIcon(batch.paymentTypeCode)}
                                            <span>{batch.paymentTypeName || batch.paymentTypeCode}</span>
                                        </div>
                                        {getBatchStatusBadge(batch.status)}
                                    </div>
                                    <div className="batch-details">
                                        <div className="detail-row">
                                            <span className="label">Batch #:</span>
                                            <span className="value">{batch.batchNumber}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label"><FaUsers /> Employees:</span>
                                            <span className="value">{batch.employeeCount}</span>
                                        </div>
                                        <div className="detail-row total">
                                            <span className="label">Total:</span>
                                            <span className="value">{formatCurrency(batch.totalAmount)}</span>
                                        </div>
                                    </div>
                                    {batch.paymentRequestNumber && (
                                        <div className="batch-footer">
                                            <span className="pr-number">PR: {batch.paymentRequestNumber}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    {isRejected ? (
                        <button
                            className="btn-resend"
                            onClick={handleResendToFinance}
                            disabled={sendingToFinance || employeesWithoutPaymentType.length > 0}
                        >
                            {sendingToFinance ? (
                                <>
                                    <FaSpinner className="spin" />
                                    Resending...
                                </>
                            ) : (
                                <>
                                    <FaRedo />
                                    Resend to Finance
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            {batches.length === 0 ? (
                                <button
                                    className="btn-create-batches"
                                    onClick={handleCreateBatches}
                                    disabled={creatingBatches || processing}
                                >
                                    {creatingBatches ? (
                                        <>
                                            <FaSpinner className="spin" />
                                            Creating Batches...
                                        </>
                                    ) : (
                                        <>
                                            <FaLayerGroup />
                                            Create Batches by Payment Type
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    className="btn-send-finance"
                                    onClick={handleSendToFinance}
                                    disabled={sendingToFinance || processing || employeesWithoutPaymentType.length > 0}
                                >
                                    {sendingToFinance ? (
                                        <>
                                            <FaSpinner className="spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <FaPaperPlane />
                                            Send Batches to Finance
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <EmployeePayrollsTable
                employeePayrolls={employeePayrolls}
                payroll={payroll}
                onRefresh={fetchEmployeePayrolls}
                loading={loading}
                showPaymentType={true}
            />

            {/* Batch Preview Modal */}
            {showBatchPreview && (
                <div className="modal-overlay" onClick={() => setShowBatchPreview(false)}>
                    <div className="modal-content batch-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FaLayerGroup /> Payment Batch Details</h3>
                            <button className="close-btn" onClick={() => setShowBatchPreview(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="batch-summary">
                                <p>Employees are grouped by their payment type. Each batch will create a separate payment request for Finance to process.</p>
                            </div>
                            <div className="batch-list">
                                {batches.map((batch) => (
                                    <div key={batch.id} className="batch-detail-card">
                                        <div className="batch-detail-header">
                                            {getPaymentTypeIcon(batch.paymentTypeCode)}
                                            <h4>{batch.paymentTypeName}</h4>
                                            {getBatchStatusBadge(batch.status)}
                                        </div>
                                        <div className="batch-detail-body">
                                            <div className="info-row">
                                                <span>Batch Number:</span>
                                                <strong>{batch.batchNumber}</strong>
                                            </div>
                                            <div className="info-row">
                                                <span>Number of Employees:</span>
                                                <strong>{batch.employeeCount}</strong>
                                            </div>
                                            <div className="info-row highlight">
                                                <span>Total Amount:</span>
                                                <strong>{formatCurrency(batch.totalAmount)}</strong>
                                            </div>
                                            {batch.paymentRequestNumber && (
                                                <div className="info-row">
                                                    <span>Payment Request:</span>
                                                    <strong>{batch.paymentRequestNumber}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="batch-totals">
                                <div className="total-row">
                                    <span>Total Batches:</span>
                                    <strong>{batches.length}</strong>
                                </div>
                                <div className="total-row">
                                    <span>Total Employees:</span>
                                    <strong>{batches.reduce((sum, b) => sum + (b.employeeCount || 0), 0)}</strong>
                                </div>
                                <div className="total-row highlight">
                                    <span>Grand Total:</span>
                                    <strong>{formatCurrency(batches.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}</strong>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-close" onClick={() => setShowBatchPreview(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Payment Type Modal */}
            {showMissingPaymentTypeModal && (
                <div className="modal-overlay" onClick={() => setShowMissingPaymentTypeModal(false)}>
                    <div className="modal-content missing-payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <h3><FaExclamationTriangle /> Employees Without Payment Type</h3>
                            <button className="close-btn" onClick={() => setShowMissingPaymentTypeModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="warning-text">
                                The following employees don't have a payment type assigned.
                                Please assign payment types in the Employee Management module before creating batches.
                            </p>
                            <div className="employee-list">
                                {employeesWithoutPaymentType.map((emp) => (
                                    <div key={emp.id} className="employee-item">
                                        <span className="emp-name">{emp.employeeName}</span>
                                        <span className="emp-position">{emp.jobPositionName || 'No position'}</span>
                                        <span className="emp-dept">{emp.departmentName || 'No department'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-close" onClick={() => setShowMissingPaymentTypeModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfirmedLockedPhase;
