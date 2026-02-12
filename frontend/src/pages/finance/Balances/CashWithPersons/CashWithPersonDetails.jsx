import React, { useEffect } from 'react';
import { FaTimes, FaEdit, FaUserTie } from 'react-icons/fa';
import './CashWithPersonDetails.css';

const CashWithPersonDetails = ({ person, onClose, onEdit }) => {
    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
            <div className="modal-container cash-with-person-details-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUserTie />
                        <h2>Cash Holder Details</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="details-section">
                        <h3>Personal Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Person Name</label>
                                <span>{person.personName}</span>
                            </div>
                            <div className="detail-item highlight">
                                <label>Current Balance</label>
                                <span className="balance-amount">{formatCurrency(person.currentBalance)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Phone Number</label>
                                <span>{person.phoneNumber || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Email</label>
                                <span>{person.email || 'N/A'}</span>
                            </div>
                            <div className="detail-item full-width">
                                <label>Address</label>
                                <span>{person.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>Bank Information</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Personal Bank Name</label>
                                <span>{person.personalBankName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Personal Bank Account</label>
                                <span>{person.personalBankAccountNumber || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>Status & Audit</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Status</label>
                                <span className={`status-badge ${person.isActive ? 'status-active' : 'status-inactive'}`}>
                                    {person.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Created By</label>
                                <span>{person.createdBy || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Created At</label>
                                <span>{formatDateTime(person.createdAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Last Updated</label>
                                <span>{formatDateTime(person.updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    {person.notes && (
                        <div className="details-section">
                            <h3>Notes</h3>
                            <div className="notes-content">
                                {person.notes}
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
                        <span>Edit</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashWithPersonDetails;