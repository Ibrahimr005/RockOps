import React, { useState, useEffect } from 'react';
import { FaTimes} from 'react-icons/fa';
import { FiCheckCircle, FiFileText, FiXCircle } from 'react-icons/fi';
import { financeService } from '../../../../services/financeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

const PaymentRequestDetails = ({ request, onClose, onApproveReject }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // ADD THIS
    const [formData, setFormData] = useState({                  // ADD THIS
        paymentRequestId: request.id,
        notes: '',
        rejectionReason: ''
    });
    const [errors, setErrors] = useState({});                   // ADD THIS
    const { showError, showSuccess } = useSnackbar();           // UPDATE THIS - add showSuccess
    // const [showReviewForm, setShowReviewForm] = useState(false);


    useEffect(() => {
        fetchPayments();
    }, [request.id]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await financeService.accountsPayable.payments.getByPaymentRequest(request.id);
            setPayments(response.data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
            showError('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = (action) => {
        const newErrors = {};

        if (action === 'REJECT' && !formData.rejectionReason.trim()) {
            newErrors.rejectionReason = 'Rejection reason is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleApprove = async () => {
        if (!validateForm('APPROVE')) return;

        setActionLoading(true);

        try {
            await financeService.accountsPayable.paymentRequests.approveReject({
                ...formData,
                action: 'APPROVE'
            });
            showSuccess('Payment request approved successfully');
            onApproveReject();
        } catch (err) {
            console.error('Error approving request:', err);
            showError(err.response?.data?.message || 'Failed to approve request');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!validateForm('REJECT')) {
            showError('Please provide rejection reason');
            return;
        }

        setActionLoading(true);

        try {
            await financeService.accountsPayable.paymentRequests.approveReject({
                ...formData,
                action: 'REJECT'
            });
            showSuccess('Payment request rejected successfully');
            onApproveReject();
        } catch (err) {
            console.error('Error rejecting request:', err);
            showError(err.response?.data?.message || 'Failed to reject request');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container payment-request-details-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiFileText />
                        <h2>Payment Request Details</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Request Information */}
                    <div className="details-section">
                        <h3>Request Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Request Number:</label>
                                <span>{request.requestNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>PO Number:</label>
                                <span>{request.purchaseOrderNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>Status:</label>
                                <span className={`status-badge status-${request.status.toLowerCase()}`}>
                                    {request.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Requested By:</label>
                                <span>{request.requestedByUserName}</span>
                            </div>
                            <div className="detail-item">
                                <label>Requested At:</label>
                                <span>{formatDate(request.requestedAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Department:</label>
                                <span>{request.requestedByDepartment || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Merchant Information */}
                    <div className="details-section">
                        <h3>Merchant Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Merchant Name:</label>
                                <span>{request.merchantName}</span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Person:</label>
                                <span>{request.merchantContactPerson || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Phone:</label>
                                <span>{request.merchantContactPhone || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Email:</label>
                                <span>{request.merchantContactEmail || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Information */}
                    <div className="details-section">
                        <h3>Financial Information</h3>
                        <div className="financial-summary">
                            <div className="financial-item">
                                <label>Requested Amount:</label>
                                <span className="amount primary">{formatCurrency(request.requestedAmount)}</span>
                            </div>
                            <div className="financial-item">
                                <label>Total Paid:</label>
                                <span className="amount success">{formatCurrency(request.totalPaidAmount)}</span>
                            </div>
                            <div className="financial-item">
                                <label>Remaining:</label>
                                <span className="amount warning">{formatCurrency(request.remainingAmount)}</span>
                            </div>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Currency:</label>
                                <span>{request.currency}</span>
                            </div>
                            <div className="detail-item">
                                <label>Budget Category:</label>
                                <span>{request.budgetCategory || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Payment Due Date:</label>
                                <span>{formatDate(request.paymentDueDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    {request.items && request.items.length > 0 && (
                        <div className="details-section">
                            <h3>Items ({request.items.length})</h3>
                            <div className="items-table">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Quantity</th>
                                        <th>Unit Price</th>
                                        <th>Total Price</th>
                                        <th>Paid</th>
                                        <th>Remaining</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {request.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.itemName}</td>
                                            <td>{item.quantity} {item.unit}</td>
                                            <td>{formatCurrency(item.unitPrice)}</td>
                                            <td>{formatCurrency(item.totalPrice)}</td>
                                            <td>{formatCurrency(item.paidAmount)}</td>
                                            <td>{formatCurrency(item.remainingAmount)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    {payments.length > 0 && (
                        <div className="details-section">
                            <h3>Payment History ({payments.length})</h3>
                            <div className="payments-list">
                                {payments.map((payment, index) => (
                                    <div key={index} className="payment-item">
                                        <div className="payment-header">
                                            <span className="payment-number">{payment.paymentNumber}</span>
                                            <span className={`payment-status status-${payment.status.toLowerCase()}`}>
                                                {payment.status}
                                            </span>
                                        </div>
                                        <div className="payment-details">
                                            <div className="payment-detail">
                                                <label>Amount:</label>
                                                <span className="amount">{formatCurrency(payment.amount)}</span>
                                            </div>
                                            <div className="payment-detail">
                                                <label>Date:</label>
                                                <span>{formatDate(payment.paymentDate)}</span>
                                            </div>
                                            <div className="payment-detail">
                                                <label>Method:</label>
                                                <span>{payment.paymentMethod.replace('_', ' ')}</span>
                                            </div>
                                            <div className="payment-detail">
                                                <label>Processed By:</label>
                                                <span>{payment.processedByUserName}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review Information */}
                    {request.reviewedByUserName && (
                        <div className="details-section">
                            <h3>Review Information</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Reviewed By:</label>
                                    <span>{request.reviewedByUserName}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Reviewed At:</label>
                                    <span>{formatDate(request.reviewedAt)}</span>
                                </div>
                                {request.approvalNotes && (
                                    <div className="detail-item full-width">
                                        <label>Approval Notes:</label>
                                        <span>{request.approvalNotes}</span>
                                    </div>
                                )}
                                {request.rejectionReason && (
                                    <div className="detail-item full-width">
                                        <label>Rejection Reason:</label>
                                        <span className="rejection-reason">{request.rejectionReason}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Review Form - Only for PENDING requests */}
                    {request.status === 'PENDING' && (
                        <div className="details-section review-form-section">
                            <h3>Review Action</h3>

                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Approval Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Optional notes about this approval..."
                                />
                            </div>

                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Rejection Reason (if rejecting)
                                </label>
                                <textarea
                                    name="rejectionReason"
                                    value={formData.rejectionReason}
                                    onChange={handleChange}
                                    className={errors.rejectionReason ? 'error' : ''}
                                    rows="3"
                                    placeholder="Provide reason if you plan to reject this request..."
                                />
                                {errors.rejectionReason && <span className="error-text">{errors.rejectionReason}</span>}
                            </div>
                        </div>
                    )}
                </div>



                <div className="modal-footer">
                    <button className="modern-btn modern-btn-cancel" onClick={onClose}>
                        Close
                    </button>

                    {request.status === 'PENDING' && (
                        <>
                            <button
                                className="btn-danger"
                                onClick={handleReject}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : (
                                    <>
                                        <FiXCircle />
                                        <span>Reject Request</span>
                                    </>
                                )}
                            </button>
                            <button
                                className="btn-success"
                                onClick={handleApprove}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : (
                                    <>
                                        <FiCheckCircle />
                                        <span>Approve Request</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentRequestDetails;