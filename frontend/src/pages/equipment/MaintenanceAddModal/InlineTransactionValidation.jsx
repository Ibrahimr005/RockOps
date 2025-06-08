import React, { useState, useEffect } from 'react';
import './InlineTransactionValidation.scss';

const InlineTransactionValidation = ({ 
    transaction, 
    onValidationDataChange,
    onCancel,
    isLoading 
}) => {
    const [validationAction, setValidationAction] = useState('accept'); // 'accept' or 'reject'
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [itemsNotReceived, setItemsNotReceived] = useState({});
    const [comments, setComments] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        // Initialize received quantities with original quantities
        if (transaction?.items) {
            const initialQuantities = {};
            transaction.items.forEach(item => {
                initialQuantities[item.id] = item.quantity;
            });
            setReceivedQuantities(initialQuantities);
        }
    }, [transaction]);

    // Update parent component whenever validation data changes
    useEffect(() => {
        updateValidationData();
    }, [validationAction, receivedQuantities, itemsNotReceived, comments, rejectionReason]);

    const handleQuantityChange = (itemId, value) => {
        setReceivedQuantities(prev => ({
            ...prev,
            [itemId]: value
        }));
        
        // Clear any previous errors for this item
        if (formErrors[itemId]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[itemId];
                return newErrors;
            });
        }
    };

    const handleItemNotReceivedChange = (itemId, notReceived) => {
        setItemsNotReceived(prev => ({
            ...prev,
            [itemId]: notReceived
        }));
        
        if (notReceived) {
            setReceivedQuantities(prev => ({
                ...prev,
                [itemId]: 0
            }));
        } else {
            // Reset to original quantity when unchecked
            const originalItem = transaction.items.find(item => item.id === itemId);
            if (originalItem) {
                setReceivedQuantities(prev => ({
                    ...prev,
                    [itemId]: originalItem.quantity
                }));
            }
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (validationAction === 'accept') {
            // Validate received quantities
            transaction.items.forEach(item => {
                const quantity = receivedQuantities[item.id];
                const notReceived = itemsNotReceived[item.id];
                
                if (!notReceived) {
                    if (quantity === '' || quantity === null || quantity === undefined) {
                        errors[item.id] = 'Quantity is required';
                    } else if (isNaN(quantity) || parseInt(quantity) < 0) {
                        errors[item.id] = 'Quantity must be a non-negative number';
                    }
                }
            });
        } else if (validationAction === 'reject') {
            if (!rejectionReason.trim()) {
                errors.rejectionReason = 'Rejection reason is required';
            }
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Update parent component whenever validation data changes
    const updateValidationData = () => {
        const validationData = {
            action: validationAction,
            comments: comments.trim(),
            receivedItems: transaction.items.map(item => ({
                transactionItemId: item.id,
                receivedQuantity: itemsNotReceived[item.id] ? 0 : parseInt(receivedQuantities[item.id]) || 0,
                itemNotReceived: Boolean(itemsNotReceived[item.id])
            })),
            isValid: validateForm()
        };
        
        if (validationAction === 'reject') {
            validationData.rejectionReason = rejectionReason.trim();
        }
        
        onValidationDataChange(validationData);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getItemName = (item) => {
        return item.itemTypeName || "Unknown Item";
    };

    if (!transaction) return null;

    return (
        <div className="inline-transaction-validation">
            <div className="validation-header">
                <h4>Validate Transaction</h4>
                <p>Transaction found! Please validate this transaction to link it to the maintenance record.</p>
            </div>

            <div className="transaction-summary">
                <div className="summary-row">
                    <span className="label">Batch Number:</span>
                    <span className="value">#{transaction.batchNumber}</span>
                </div>
                <div className="summary-row">
                    <span className="label">Transaction Date:</span>
                    <span className="value">{formatDate(transaction.transactionDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="label">Items Count:</span>
                    <span className="value">{transaction.items?.length || 0}</span>
                </div>
                <div className="summary-row">
                    <span className="label">Added By:</span>
                    <span className="value">{transaction.addedBy || 'N/A'}</span>
                </div>
            </div>

            <div className="validation-form">
                <div className="action-selector">
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="action"
                            value="accept"
                            checked={validationAction === 'accept'}
                            onChange={(e) => setValidationAction(e.target.value)}
                        />
                        <span>Accept Transaction</span>
                    </label>
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="action"
                            value="reject"
                            checked={validationAction === 'reject'}
                            onChange={(e) => setValidationAction(e.target.value)}
                        />
                        <span>Reject Transaction</span>
                    </label>
                </div>

                {validationAction === 'accept' && (
                    <div className="items-validation">
                        <h5>Validate Items Received</h5>
                        <div className="items-list">
                            {transaction.items?.map(item => (
                                <div key={item.id} className="item-validation-row">
                                    <div className="item-info">
                                        <strong>{getItemName(item)}</strong>
                                        <div className="item-details">
                                            <span>Expected: {item.quantity} {item.measuringUnit}</span>
                                            <span>Category: {typeof item.category === 'string' ? item.category : (item.category?.name || 'Uncategorized')}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="validation-controls">
                                        <div className="not-received-control">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(itemsNotReceived[item.id])}
                                                    onChange={(e) => handleItemNotReceivedChange(item.id, e.target.checked)}
                                                />
                                                <span>Item not received</span>
                                            </label>
                                        </div>
                                        
                                        {!itemsNotReceived[item.id] && (
                                            <div className="quantity-control">
                                                <label>Received Quantity:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    value={receivedQuantities[item.id] || ''}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    onWheel={(e) => e.target.blur()}
                                                    className={formErrors[item.id] ? 'error' : ''}
                                                />
                                                <span className="unit">{item.measuringUnit}</span>
                                                {formErrors[item.id] && (
                                                    <div className="error-message">{formErrors[item.id]}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="comments-section">
                            <label>Comments (optional):</label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments about the transaction validation..."
                                rows="3"
                            />
                        </div>
                    </div>
                )}

                {validationAction === 'reject' && (
                    <div className="rejection-section">
                        <label>Rejection Reason *</label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please specify why this transaction is being rejected..."
                            rows="4"
                            className={formErrors.rejectionReason ? 'error' : ''}
                            required
                        />
                        {formErrors.rejectionReason && (
                            <div className="error-message">{formErrors.rejectionReason}</div>
                        )}
                    </div>
                )}

                <div className="validation-actions">
                    <button 
                        type="button" 
                        className="cancel-button" 
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel Validation
                    </button>
                    <div className="info-message">
                        <small>Complete the form above and click "Create Maintenance" to save and validate the transaction.</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InlineTransactionValidation; 