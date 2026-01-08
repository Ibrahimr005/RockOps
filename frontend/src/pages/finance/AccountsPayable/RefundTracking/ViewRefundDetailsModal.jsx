import React from 'react';
import { FiX, FiCheckCircle, FiCalendar, FiUser } from 'react-icons/fi';
import './ViewRefundDetailsModal.scss';

const ViewRefundDetailsModal = ({ refund, onClose }) => {
    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="view-refund-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <FiCheckCircle />
                        <h2>Refund Details</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Refund Summary */}
                    <div className="refund-summary">
                        <h3>Refund Information</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="label">PO Number:</span>
                                <span className="value">{refund.purchaseOrderNumber}</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">Merchant:</span>
                                <span className="value">{refund.merchantName}</span>
                            </div>
                            <div className="summary-item highlight">
                                <span className="label">Refund Amount:</span>
                                <span className="value amount">{formatCurrency(refund.totalRefundAmount)}</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">Status:</span>
                                <span className="value status-confirmed">
                                    <FiCheckCircle /> {refund.status}
                                </span>
                            </div>
                        </div>

                        {/* Items List */}
                        {refund.refundItems && refund.refundItems.length > 0 && (
                            <div className="items-list">
                                <h4>Refunded Items:</h4>
                                {refund.refundItems.map((item, index) => (
                                    <div key={index} className="refund-item">
                                        <span className="item-name">{item.itemName}</span>
                                        <span className="item-qty">Qty: {item.affectedQuantity}</span>
                                        <span className="item-amount">{formatCurrency(item.totalRefundAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Confirmation Details */}
                    <div className="confirmation-details">
                        <h3>Confirmation Details</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <FiCalendar className="icon" />
                                <div>
                                    <span className="label">Date Received:</span>
                                    <span className="value">{formatDate(refund.dateReceived)}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <FiUser className="icon" />
                                <div>
                                    <span className="label">Confirmed By:</span>
                                    <span className="value">{refund.confirmedBy || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <span className="label">Balance Type:</span>
                                <span className="value">{refund.balanceType?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Account:</span>
                                <span className="value">{refund.balanceAccountName || 'N/A'}</span>
                            </div>
                        </div>

                        {refund.financeNotes && (
                            <div className="notes-section">
                                <span className="label">Notes:</span>
                                <p className="notes">{refund.financeNotes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-close" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewRefundDetailsModal;