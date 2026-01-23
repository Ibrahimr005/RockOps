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
    FaCalendarAlt
} from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import EmployeePayrollsTable from './EmployeePayrollsTable';
import './PendingFinanceReviewPhase.scss';

const PendingFinanceReviewPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog }) => {
    const { showError, showSuccess } = useSnackbar();
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingPaid, setMarkingPaid] = useState(false);

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

                {/* Payment Details */}
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
                        <div className="detail-item">
                            <span className="label">Employees</span>
                            <span className="value">{payroll.employeeCount || 0}</span>
                        </div>
                        <div className="detail-item highlight">
                            <span className="label">Total Net Amount</span>
                            <span className="value">{formatCurrency(payroll.totalNetAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Payroll Summary */}
                <div className="payroll-summary-card">
                    <h4>Payroll Summary</h4>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="label">Gross Amount</span>
                            <span className="value">{formatCurrency(payroll.totalGrossAmount)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Total Deductions</span>
                            <span className="value deduction">-{formatCurrency(payroll.totalDeductions)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Overtime Pay</span>
                            <span className="value overtime">+{formatCurrency(payroll.totalOvertimeAmount)}</span>
                        </div>
                        <div className="summary-item highlight">
                            <span className="label">Net Amount</span>
                            <span className="value">{formatCurrency(payroll.totalNetAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Finance Actions */}
                <div className="action-buttons">
                    <button
                        className="btn-mark-paid"
                        onClick={handleMarkAsPaid}
                        disabled={markingPaid || processing}
                    >
                        {markingPaid ? (
                            <>
                                <FaSpinner className="spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaMoneyCheckAlt />
                                Approve & Mark as Paid
                            </>
                        )}
                    </button>
                </div>

                <div className="info-note">
                    <FaInfoCircle />
                    <span>Marking as paid will finalize this payroll cycle. This action cannot be undone.</span>
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
