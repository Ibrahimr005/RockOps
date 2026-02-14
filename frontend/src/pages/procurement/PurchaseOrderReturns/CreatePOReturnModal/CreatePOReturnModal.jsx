import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaBoxOpen, FaUndo, FaCheck } from 'react-icons/fa';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import { poReturnService } from '../../../../services/procurement/poReturnService';
import './CreatePOReturnModal.scss';

const CreatePOReturnModal = ({ isOpen, onClose, onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [availableItems, setAvailableItems] = useState([]); // All PO items
    const [selectedItemIds, setSelectedItemIds] = useState([]); // Items user chose to return
    const [formData, setFormData] = useState({
        reason: '',
        items: []
    });

    useEffect(() => {
        if (isOpen) {
            fetchPurchaseOrders();
        }
    }, [isOpen]);

    const fetchPurchaseOrders = async () => {
        try {
            const data = await purchaseOrderService.getAll();
            // Filter POs that have items and are not in draft status
            const eligiblePOs = data.filter(po =>
                po.purchaseOrderItems &&
                po.purchaseOrderItems.length > 0 &&
                po.status !== 'DRAFT'
            );
            setPurchaseOrders(eligiblePOs);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            if (onError) onError('Failed to load purchase orders');
        }
    };

    const handlePOSelection = (e) => {
        const poId = e.target.value;
        const po = purchaseOrders.find(p => p.id === poId);
        setSelectedPO(po);
        setSelectedItemIds([]); // Reset selected items
        setFormData({ reason: '', items: [] }); // Reset form

        // Set available items for selection
        if (po && po.purchaseOrderItems) {
            const items = po.purchaseOrderItems.map(item => ({
                purchaseOrderItemId: item.id,
                itemTypeName: item.itemTypeName || item.itemType?.name,
                orderedQuantity: item.quantity,
                measuringUnit: item.measuringUnit || item.itemType?.measuringUnit,
                unitPrice: item.unitPrice,
                merchantName: item.merchantName || item.merchant?.name,
            }));
            setAvailableItems(items);
        }
    };

    const handleItemSelection = (itemId) => {
        setSelectedItemIds(prev => {
            if (prev.includes(itemId)) {
                // Remove item
                const newSelected = prev.filter(id => id !== itemId);
                // Also remove from formData
                setFormData(prevForm => ({
                    ...prevForm,
                    items: prevForm.items.filter(item => item.purchaseOrderItemId !== itemId)
                }));
                return newSelected;
            } else {
                // Add item - CHECK if it already exists first
                const itemToAdd = availableItems.find(item => item.purchaseOrderItemId === itemId);
                if (itemToAdd) {
                    setFormData(prevForm => {
                        // Check if item already exists in formData
                        const exists = prevForm.items.some(item => item.purchaseOrderItemId === itemId);
                        if (exists) {
                            return prevForm; // Don't add duplicate
                        }

                        return {
                            ...prevForm,
                            items: [...prevForm.items, {
                                ...itemToAdd,
                                returnQuantity: 0,
                                reason: ''
                            }]
                        };
                    });
                }
                return [...prev, itemId];
            }
        });
    };
    const handleReasonChange = (e) => {
        setFormData(prev => ({
            ...prev,
            reason: e.target.value
        }));
    };

    const handleItemQuantityChange = (itemId, value) => {
        const numValue = parseFloat(value) || 0;

        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.purchaseOrderItemId === itemId) {
                    // Don't allow return quantity to exceed ordered quantity
                    if (numValue > item.orderedQuantity) {
                        if (onError) onError(`Return quantity cannot exceed ordered quantity of ${item.orderedQuantity}`);
                        return item;
                    }
                    return { ...item, returnQuantity: numValue };
                }
                return item;
            })
        }));
    };

    const handleItemReasonChange = (itemId, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.purchaseOrderItemId === itemId
                    ? { ...item, reason: value }
                    : item
            )
        }));
    };

    const validateForm = () => {
        if (!selectedPO) {
            if (onError) onError('Please select a purchase order');
            return false;
        }

        if (selectedItemIds.length === 0) {
            if (onError) onError('Please select at least one item to return');
            return false;
        }

        if (!formData.reason.trim()) {
            if (onError) onError('Please provide an overall reason for the return');
            return false;
        }

        const itemsToReturn = formData.items.filter(item => item.returnQuantity > 0);

        if (itemsToReturn.length === 0) {
            if (onError) onError('Please enter return quantities for selected items');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Filter only items with return quantity > 0
            const itemsToReturn = formData.items
                .filter(item => item.returnQuantity > 0)
                .map(item => ({
                    purchaseOrderItemId: item.purchaseOrderItemId,
                    returnQuantity: item.returnQuantity,
                    reason: item.reason || formData.reason
                }));

            const returnData = {
                reason: formData.reason,
                items: itemsToReturn
            };

            const result = await poReturnService.create(selectedPO.id, returnData);

            if (result.success) {
                if (onSuccess) {
                    onSuccess(`Successfully created ${result.count} return request(s)`);
                }
                handleClose();
            }
        } catch (error) {
            console.error('Error creating PO return:', error);
            if (onError) onError(error.message || 'Failed to create purchase order return');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedPO(null);
        setAvailableItems([]);
        setSelectedItemIds([]);
        setFormData({ reason: '', items: [] });
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    const totalReturnItems = formData.items.filter(item => item.returnQuantity > 0).length;
    const totalReturnValue = formData.items.reduce((sum, item) => {
        return sum + (item.returnQuantity * item.unitPrice);
    }, 0);

    return (
        <div className="modal-backdrop" onClick={handleOverlayClick}>
            <div className="modal-container modal-xl po-return-modal">
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FaUndo />
                        Create Purchase Order Return
                    </h2>
                    <button
                        className="btn-close"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="po-return-form">
                        {/* PO Selection Section */}
                        <div className="modal-section">
                            <h3 className="modal-section-title">Select Purchase Order</h3>

                            <div className="form-group">
                                <label className="form-label">
                                    Purchase Order <span className="required">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedPO?.id || ''}
                                    onChange={handlePOSelection}
                                    disabled={loading}
                                >
                                    <option value="">Select a purchase order...</option>
                                    {purchaseOrders.map(po => (
                                        <option key={po.id} value={po.id}>
                                            {po.poNumber} - {po.requestOrder?.title || 'N/A'}
                                            {po.totalAmount && ` (${po.currency} ${po.totalAmount.toFixed(2)})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedPO && (
                                <div className="selected-po-info">
                                    <div className="info-row">
                                        <span className="info-label">PO Number:</span>
                                        <span className="info-value">{selectedPO.poNumber}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Total Items:</span>
                                        <span className="info-value">{selectedPO.purchaseOrderItems.length}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Total Amount:</span>
                                        <span className="info-value">
                                            {selectedPO.currency} {selectedPO.totalAmount?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Item Selection Section */}
                        {selectedPO && availableItems.length > 0 && (
                            <div className="modal-section">
                                <h3 className="modal-section-title">
                                    <FaBoxOpen />
                                    Choose Items to Return
                                </h3>
                                <div className="item-selection-list">
                                    {availableItems.map((item) => (
                                        <div
                                            key={item.purchaseOrderItemId}
                                            className={`item-selection-card ${selectedItemIds.includes(item.purchaseOrderItemId) ? 'selected' : ''}`}
                                            onClick={() => handleItemSelection(item.purchaseOrderItemId)}
                                        >
                                            <div className="selection-checkbox">
                                                {selectedItemIds.includes(item.purchaseOrderItemId) && (
                                                    <FaCheck />
                                                )}
                                            </div>
                                            <div className="item-selection-info">
                                                <span className="item-selection-name">{item.itemTypeName}</span>
                                                <span className="item-selection-meta">
                                                    {item.merchantName} • {item.orderedQuantity} {item.measuringUnit}
                                                </span>
                                            </div>
                                            <div className="item-selection-price">
                                                {selectedPO.currency} {item.unitPrice.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected Items Details Section */}
                        {selectedItemIds.length > 0 && (
                            <div className="modal-section">
                                <div className="section-header">
                                    <h3 className="modal-section-title">Return Details for Selected Items</h3>
                                </div>

                                <div className="items-container">
                                    {formData.items.map((item) => (
                                        <div
                                            key={item.purchaseOrderItemId}
                                            className={`item-card ${item.returnQuantity > 0 ? 'selected' : ''}`}
                                        >
                                            <div className="item-header">
                                                <div className="item-info">
                                                    <span className="item-name">{item.itemTypeName}</span>
                                                    <span className="item-merchant">{item.merchantName}</span>
                                                </div>
                                                <div className="item-meta">
                                                    <span className="item-ordered">
                                                        Ordered: {item.orderedQuantity} {item.measuringUnit}
                                                    </span>
                                                    <span className="item-price">
                                                        {selectedPO.currency} {item.unitPrice.toFixed(2)} / {item.measuringUnit}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="item-body">
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label className="form-label">Return Quantity</label>
                                                        <div className="quantity-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="form-input quantity-input"
                                                                value={item.returnQuantity || ''}
                                                                onChange={(e) => handleItemQuantityChange(item.purchaseOrderItemId, e.target.value)}
                                                                onWheel={(e) => e.target.blur()}
                                                                min="0"
                                                                max={item.orderedQuantity}
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                disabled={loading}
                                                            />
                                                            <span className="unit-badge">
                                                                {item.measuringUnit}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label className="form-label">Specific Reason (Optional)</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={item.reason}
                                                            onChange={(e) => handleItemReasonChange(item.purchaseOrderItemId, e.target.value)}
                                                            placeholder="Specific reason for this item..."
                                                            disabled={loading || item.returnQuantity === 0}
                                                        />
                                                    </div>
                                                </div>

                                                {item.returnQuantity > 0 && (
                                                    <div className="return-value-display">
                                                        Return Value: {selectedPO.currency} {(item.returnQuantity * item.unitPrice).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary at bottom of items */}
                                {totalReturnItems > 0 && (
                                    <div className="return-summary-bottom">
                                        <div className="summary-row">
                                            <span className="summary-label">Total Items Selected:</span>
                                            <span className="summary-value">
                                                {totalReturnItems} item{totalReturnItems !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Total Return Amount:</span>
                                            <span className="summary-value">
                                                {selectedPO.currency} {totalReturnValue.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overall Return Reason - AT THE BOTTOM */}
                        {selectedItemIds.length > 0 && totalReturnItems > 0 && (
                            <div className="modal-section overall-reason-section">
                                <h3 className="modal-section-title">Overall Return Reason</h3>
                                <div className="form-group">
                                    <label className="form-label">
                                        Explain why you're returning these items <span className="required">*</span>
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.reason}
                                        onChange={handleReasonChange}
                                        placeholder="Provide a detailed explanation for the return request..."
                                        rows={4}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer">
                    <div className="footer-left"></div>
                    <div className="footer-right">
                        <button
                            type="button"
                            className="modal-btn-secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-success"
                            onClick={handleSubmit}
                            disabled={loading || !selectedPO || totalReturnItems === 0}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <FaUndo />
                                    Create Return Request
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePOReturnModal;