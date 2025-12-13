import React from 'react';
import { FaTimes, FaEdit, FaUniversity, FaCalendarAlt, FaUser } from 'react-icons/fa';
import './BankAccountDetails.css';

const BankAccountDetails = ({ account, onClose, onEdit }) => {
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
            month: 'long',
            day: 'numeric'
        });
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
            <div className="modal-container bank-account-details-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUniversity />
                        <h2>Bank Account Details</h2>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="details-section">
                        <h3>Account Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Bank Name</label>
                                <span>{account.bankName}</span>
                            </div>
                            <div className="detail-item">
                                <label>Account Number</label>
                                <span>{account.accountNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>Account Holder</label>
                                <span>{account.accountHolderName}</span>
                            </div>
                            <div className="detail-item highlight">
                                <label>Current Balance</label>
                                <span className="balance-amount">{formatCurrency(account.currentBalance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>Bank Details</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>IBAN</label>
                                <span>{account.iban || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>SWIFT Code</label>
                                <span>{account.swiftCode || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Branch Name</label>
                                <span>{account.branchName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Branch Code</label>
                                <span>{account.branchCode || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>Status & Dates</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Status</label>
                                <span className={`status-badge ${account.isActive ? 'status-active' : 'status-inactive'}`}>
                                    {account.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Opening Date</label>
                                <span>{formatDate(account.openingDate)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Created At</label>
                                <span>{formatDateTime(account.createdAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Last Updated</label>
                                <span>{formatDateTime(account.updatedAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Created By</label>
                                <span>{account.createdBy || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {account.notes && (
                        <div className="details-section">
                            <h3>Notes</h3>
                            <div className="notes-content">
                                {account.notes}
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
                        <span>Edit Account</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankAccountDetails;