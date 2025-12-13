import React from 'react';
import { FaTimes, FaEdit, FaPiggyBank } from 'react-icons/fa';
import './CashSafeDetails.css';

const CashSafeDetails = ({ safe, onClose, onEdit }) => {
    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container cash-safe-details-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaPiggyBank />
                        <h2>Cash Safe Details</h2>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="details-section">
                        <h3>Safe Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Safe Name</label>
                                <span>{safe.safeName}</span>
                            </div>
                            <div className="detail-item">
                                <label>Location</label>
                                <span>{safe.location}</span>
                            </div>
                            <div className="detail-item highlight">
                                <label>Current Balance</label>
                                <span className="balance-amount">{formatCurrency(safe.currentBalance)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Status</label>
                                <span className={`status-badge ${safe.isActive ? 'status-active' : 'status-inactive'}`}>
                                    {safe.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>Audit Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Created At</label>
                                <span>{formatDateTime(safe.createdAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Last Updated</label>
                                <span>{formatDateTime(safe.updatedAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Created By</label>
                                <span>{safe.createdBy || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {safe.notes && (
                        <div className="details-section">
                            <h3>Notes</h3>
                            <div className="notes-content">
                                {safe.notes}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="btn-primary" onClick={onEdit}>
                        <FaEdit />
                        <span>Edit Safe</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashSafeDetails;