// ========================================
// FILE: PendingFinanceReviewPhase.jsx
// Phase 7: Pending Finance Review
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaFileInvoiceDollar,
    FaCheckCircle,
    FaMoneyCheckAlt,
    FaSpinner,
    FaInfoCircle,
    FaCalendarAlt,
    FaLayerGroup,
    FaUniversity,
    FaCreditCard,
    FaWallet,
    FaUsers,
    FaClock,
    FaTimesCircle,
    FaExclamationTriangle
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import EmployeePayrollsTable from './EmployeePayrollsTable';
import FinanceSubTimeline from './FinanceSubTimeline';
import './PendingFinanceReviewPhase.scss';

const PendingFinanceReviewPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog }) => {
    const { showError, showSuccess } = useSnackbar();
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [markingPaid, setMarkingPaid] = useState(false);

    useEffect(() => {
        fetchEmployeePayrolls();
        fetchBatches();
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

    const handleMarkAsPaid = async () => {
        try {
            setMarkingPaid(true);
            await payrollService.markAsPaid(payroll.id);
            showSuccess('Payroll has been marked as paid');
            if (onRefresh) onRefresh();
        } catch (error) {
            showError(error.message || 'Failed to mark payroll as paid');
        } finally {
            setMarkingPaid(false);
        }
    };

    const getPaymentTypeIcon = (code) => {
        switch (code?.toUpperCase()) {
            case 'BANK_TRANSFER':
                return <FaUniversity />;
            case 'CASH':
                return <FaMoneyCheckAlt />;
            case 'CHEQUE':
                return <FaCreditCard />;
            case 'MOBILE_WALLET':
                return <FaWallet />;
            default:
                return <FaMoneyCheckAlt />;
        }
    };

    const getBatchStatusInfo = (status) => {
        const statusMap = {
            'PENDING_FINANCE_REVIEW': { label: 'Pending Review', class: 'pending', icon: <FaClock /> },
            'FINANCE_APPROVED': { label: 'Approved', class: 'approved', icon: <FaCheckCircle /> },
            'FINANCE_REJECTED': { label: 'Rejected', class: 'rejected', icon: <FaTimesCircle /> },
            'PARTIALLY_PAID': { label: 'Partially Paid', class: 'partial', icon: <FaExclamationTriangle /> },
            'PAID': { label: 'Paid', class: 'paid', icon: <FaCheckCircle /> }
        };
        return statusMap[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', class: 'default', icon: <FaClock /> };
    };

    const formatCurrency = (amount) => {
        return (amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="pending-finance-review-phase">
            {/* Finance Sub-Timeline */}
            <FinanceSubTimeline currentStatus={payroll.status} />

            <div className="phase-action-section">
                <div className="action-card pending-review">
                    <div className="action-content">
                        <FaFileInvoiceDollar className="action-icon" />
                        <div>
                            <h3>Pending Finance Review</h3>
                            <p>This payroll is awaiting finance team review and approval before payment disbursement.</p>
                        </div>
                    </div>
                    <div className="review-badge">
                        <FaInfoCircle />
                        <span>Awaiting Approval</span>
                    </div>
                </div>

                {/* Payment Details - Phase-specific info only */}
                <div className="payment-details-card">
                    <h4>Payment Details</h4>
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="label">Payment Source</span>
                            <span className="value">{payroll.paymentSourceName || payroll.paymentSourceType?.replace(/_/g, ' ') || '-'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Sent to Finance</span>
                            <span className="value">
                                <FaCalendarAlt />
                                {formatDate(payroll.sentToFinanceAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payment Batches Section */}
                <div className="batches-section">
                    <div className="section-header">
                        <h4><FaLayerGroup /> Payment Batches</h4>
                        <span className="batch-count">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
                    </div>

                    {loadingBatches ? (
                        <div className="loading-state">
                            <FaSpinner className="spin" />
                            <span>Loading batches...</span>
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="no-batches">
                            <FaInfoCircle />
                            <p>No payment batches found for this payroll.</p>
                        </div>
                    ) : (
                        <div className="batch-cards">
                            {batches.map((batch) => {
                                const statusInfo = getBatchStatusInfo(batch.status);
                                return (
                                    <div key={batch.id} className={`batch-card ${statusInfo.class}`}>
                                        <div className="batch-header">
                                            <div className="batch-type">
                                                {getPaymentTypeIcon(batch.paymentTypeCode)}
                                                <span>{batch.paymentTypeName || batch.paymentTypeCode}</span>
                                            </div>
                                            <div className={`batch-status-badge ${statusInfo.class}`}>
                                                {statusInfo.icon}
                                                <span>{statusInfo.label}</span>
                                            </div>
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
                                                <span className="label">Total Amount:</span>
                                                <span className="value">{formatCurrency(batch.totalAmount)}</span>
                                            </div>
                                        </div>
                                        {batch.paymentRequestNumber && (
                                            <div className="batch-footer">
                                                <span className="pr-label">Payment Request:</span>
                                                <span className="pr-number">{batch.paymentRequestNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <EmployeePayrollsTable
                employeePayrolls={employeePayrolls}
                payroll={payroll}
                onRefresh={fetchEmployeePayrolls}
                loading={loading}
            />
        </div>
    );
};

export default PendingFinanceReviewPhase;
