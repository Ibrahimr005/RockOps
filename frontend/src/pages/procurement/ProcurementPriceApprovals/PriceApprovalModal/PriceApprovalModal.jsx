import React, { useState, useEffect } from 'react';
import './PriceApprovalModal.scss';
import { FiX, FiDollarSign } from 'react-icons/fi';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const PriceApprovalModal = ({ isOpen, onClose, item, onApprove }) => {
    const [approvedPrice, setApprovedPrice] = useState('');
    const [error, setError] = useState('');
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (item) {
            setApprovedPrice('');
            setError('');
        }
    }, [item]);

    const handleApprove = () => {
        if (!approvedPrice || parseFloat(approvedPrice) <= 0) {
            setError('Please enter a valid price');
            return;
        }

        onApprove(item.itemId, parseFloat(approvedPrice));
        onClose();
        setApprovedPrice('');
        setError('');
    };

    const handleUseSuggested = () => {
        if (item?.suggestedPrice) {
            setApprovedPrice(item.suggestedPrice.toString());
            setError('');
        }
    };

    const calculateTotal = () => {
        const price = parseFloat(approvedPrice);
        if (!isNaN(price) && item) {
            return (price * item.quantity).toFixed(2);
        }
        return '0.00';
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handlePriceChange = (e) => {
        setIsFormDirty(true);
        setApprovedPrice(e.target.value);
        setError('');
    };

    if (!isOpen || !item) return null;

    return (
        <>
        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        <div className="modal-overlay" onClick={handleCloseAttempt}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Approve Item Price</h2>
                    <button className="modal-close" onClick={handleCloseAttempt}>
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Item Details */}
                    <div className="price-modal-item-details">
                        <div className="detail-row">
                            <div className="detail-item">
                                <div className="detail-content">
                                    <span className="detail-label">Item Name</span>
                                    <span className="detail-value">{item.itemTypeName || item.itemName}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-content">
                                    <span className="detail-label">Category</span>
                                    <span className="detail-value">{item.itemTypeCategory || item.category}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-row">
                            <div className="detail-item">
                                <div className="detail-content">
                                    <span className="detail-label">Quantity</span>
                                    <span className="detail-value">{item.quantity} {item.measuringUnit || 'units'}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-content">
                                    <span className="detail-label">Warehouse</span>
                                    <span className="detail-value">{item.warehouseName}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price Input Section */}
                    <div className="price-input-section">
                        <div className="input-group">
                            <label className="input-label">
                                Set Unit Price <span className="required">*</span>
                            </label>
                            <div className="input-with-prefix">
                                <FiDollarSign className="input-icon" />
                                <input
                                    type="number"
                                    className={`price-input ${error ? 'error' : ''}`}
                                    placeholder="Enter unit price"
                                    value={approvedPrice}
                                    onChange={handlePriceChange}
                                    min="0"
                                    step="0.01"
                                    autoFocus
                                />
                                <span className="input-suffix">EGP</span>
                            </div>
                            {error && <span className="error-message">{error}</span>}
                        </div>

                        {item.suggestedPrice && (
                            <div className="suggested-section">
                                <div className="suggested-info">
                                    <span className="suggested-label">Suggested:</span>
                                    <span className="suggested-value">{item.suggestedPrice.toFixed(2)} EGP</span>
                                </div>
                                <button
                                    className="use-suggested-link"
                                    onClick={handleUseSuggested}
                                    type="button"
                                >
                                    Use
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Total Calculation */}
                    {approvedPrice && parseFloat(approvedPrice) > 0 && (
                        <div className="total-section">
                            <div className="calculation-line">
                                <span className="calc-text">
                                    {item.quantity} units × {parseFloat(approvedPrice).toFixed(2)} EGP
                                </span>
                            </div>
                            <div className="total-line">
                                <span className="total-label">Total Value</span>
                                <span className="total-value">{calculateTotal()} EGP</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={handleCloseAttempt}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleApprove}
                        disabled={!approvedPrice || parseFloat(approvedPrice) <= 0}
                    >
                        Approve Price
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default PriceApprovalModal;