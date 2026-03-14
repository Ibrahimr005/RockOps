import React, { useState, useEffect } from 'react';
import { Button, CloseButton } from '../../../../../components/common/Button';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { FiX, FiCheck } from 'react-icons/fi';
import { equipmentPurchaseSpecService } from '../../../../../services/procurement/equipmentPurchaseSpecService.js';
import './ProcurementSolutionModal.scss';

const ProcurementSolutionModal = ({
    isVisible = false,
    mode = 'add', // 'add' or 'edit'
    requestItem = null,
    offerItem = null,
    merchants = [],
    onClose,
    onSave,
    defaultCurrency = 'EGP'
}) => {
    // Detect if this is an equipment item
    const isEquipment = !!(requestItem?.equipmentSpecId || requestItem?.equipmentSpec);

    const [formData, setFormData] = useState({
        merchantId: '',
        currency: defaultCurrency,
        quantity: '',
        unitPrice: '',
        totalPrice: 0,
        estimatedDeliveryDays: 7,
        deliveryNotes: '',
        comment: ''
    });
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isVisible]);

    // Equipment details state (fetched from backend)
    const [equipmentDetails, setEquipmentDetails] = useState(null);
    const [equipmentLoading, setEquipmentLoading] = useState(false);

    // Fetch equipment details when modal opens for equipment items
    useEffect(() => {
        if (!isVisible || !isEquipment) {
            setEquipmentDetails(null);
            return;
        }

        const specId = requestItem?.equipmentSpecId || requestItem?.equipmentSpec?.id;
        if (!specId) return;

        const fetchEquipmentDetails = async () => {
            setEquipmentLoading(true);
            try {
                const data = await equipmentPurchaseSpecService.getById(specId);
                setEquipmentDetails(data);
            } catch (err) {
                console.warn('Failed to fetch equipment details:', err);
                setEquipmentDetails(null);
            } finally {
                setEquipmentLoading(false);
            }
        };

        fetchEquipmentDetails();
    }, [isVisible, isEquipment, requestItem]);

    // Initialize form data when modal opens
    useEffect(() => {
        if (!isVisible) return;

        if (mode === 'edit' && offerItem) {
            // Pre-populate form with existing offer item data
            setFormData({
                merchantId: offerItem.merchant?.id || offerItem.merchantId || '',
                currency: offerItem.currency || defaultCurrency,
                quantity: offerItem.quantity || '',
                unitPrice: parseFloat(offerItem.unitPrice) || '',
                totalPrice: parseFloat(offerItem.totalPrice) || 0,
                estimatedDeliveryDays: offerItem.estimatedDeliveryDays || 7,
                deliveryNotes: offerItem.deliveryNotes || '',
                comment: offerItem.comment || ''
            });
        } else if (mode === 'add' && requestItem) {
            // Reset form for new item — equipment defaults to quantity 1
            setFormData({
                merchantId: '',
                currency: defaultCurrency,
                quantity: isEquipment ? 1 : '',
                unitPrice: '',
                totalPrice: 0,
                estimatedDeliveryDays: 7,
                deliveryNotes: '',
                comment: ''
            });
        }
    }, [isVisible, mode, offerItem, requestItem, defaultCurrency, isEquipment]);

    // Handle form field changes
    const handleFieldChange = (field, value) => {
        setIsFormDirty(true);
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate total price when quantity or unit price changes
            if (field === 'quantity' || field === 'unitPrice') {
                const quantity = field === 'quantity' ? value : updated.quantity;
                const unitPrice = field === 'unitPrice' ? value : updated.unitPrice;
                updated.totalPrice = (quantity || 0) * (unitPrice || 0);
            }

            return updated;
        });
    };

    // Handle quantity input
    const handleQuantityChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid positive integers
        if (value === '' || (!isNaN(value) && parseInt(value) >= 0)) {
            handleFieldChange('quantity', value === '' ? '' : parseInt(value));
        }
    };

    // Handle unit price input
    const handleUnitPriceChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid numbers (including 0)
        if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
            handleFieldChange('unitPrice', value === '' ? '' : parseFloat(value));
        }
    };

// Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // ADD THESE DEBUG LOGS

        const submissionData = {
            itemTypeId: requestItem.itemTypeId,
            equipmentSpecId: requestItem.equipmentSpecId,
            merchantId: formData.merchantId,
            currency: formData.currency,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            totalPrice: formData.totalPrice,
            estimatedDeliveryDays: formData.estimatedDeliveryDays,
            deliveryNotes: formData.deliveryNotes,
            comment: mode === 'edit' ? formData.comment : undefined
        };


        onSave(submissionData);
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    if (!isVisible || !requestItem) return null;


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
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content modal-lg procurement-solution-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {mode === 'edit' ? 'Edit' : 'Add'} Procurement Solution for: {requestItem.itemTypeName || requestItem.equipmentName || 'Item'}
                    </h2>
                    <CloseButton onClick={handleCloseAttempt} />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Equipment Details Summary Card — only for equipment items */}
                        {isEquipment && (
                            <div className="equipment-details-card">
                                <div className="equipment-details-header">
                                    <span className="equipment-icon">🔧</span>
                                    <span className="equipment-title">Equipment Details</span>
                                </div>
                                {equipmentLoading ? (
                                    <div className="equipment-details-loading">Loading equipment details...</div>
                                ) : equipmentDetails ? (
                                    <div className="equipment-details-grid">
                                        {equipmentDetails.equipmentType?.name && (
                                            <div className="equipment-detail-item">
                                                <span className="detail-label">Type</span>
                                                <span className="detail-value">{equipmentDetails.equipmentType.name}</span>
                                            </div>
                                        )}
                                        {equipmentDetails.brand?.name && (
                                            <div className="equipment-detail-item">
                                                <span className="detail-label">Brand</span>
                                                <span className="detail-value">{equipmentDetails.brand.name}</span>
                                            </div>
                                        )}
                                        {equipmentDetails.model && (
                                            <div className="equipment-detail-item">
                                                <span className="detail-label">Model</span>
                                                <span className="detail-value">{equipmentDetails.model}</span>
                                            </div>
                                        )}
                                        {equipmentDetails.manufactureYear && (
                                            <div className="equipment-detail-item">
                                                <span className="detail-label">Year</span>
                                                <span className="detail-value">{equipmentDetails.manufactureYear}</span>
                                            </div>
                                        )}
                                        {equipmentDetails.estimatedBudget != null && (
                                            <div className="equipment-detail-item">
                                                <span className="detail-label">Estimated Budget</span>
                                                <span className="detail-value budget">
                                                    EGP {Number(equipmentDetails.estimatedBudget).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="equipment-details-loading">Equipment details not available</div>
                                )}
                            </div>
                        )}

                        <div className="solution-form">
                            {/* Merchant and Currency Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Merchant <span className="required">*</span></label>
                                    <select
                                        value={formData.merchantId}
                                        onChange={(e) => handleFieldChange('merchantId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select a merchant</option>
                                        {(Array.isArray(merchants) ? merchants : []).map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Currency <span className="required">*</span></label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => handleFieldChange('currency', e.target.value)}
                                        required
                                    >
                                        <option value="EGP">EGP (Egyptian Pound)</option>
                                        <option value="USD">USD (US Dollar)</option>
                                        <option value="EUR">EUR (Euro)</option>
                                        <option value="GBP">GBP (British Pound)</option>
                                        <option value="JPY">JPY (Japanese Yen)</option>
                                        <option value="CAD">CAD (Canadian Dollar)</option>
                                        <option value="AUD">AUD (Australian Dollar)</option>
                                        <option value="CHF">CHF (Swiss Franc)</option>
                                        <option value="CNY">CNY (Chinese Yuan)</option>
                                        <option value="INR">INR (Indian Rupee)</option>
                                        <option value="SGD">SGD (Singapore Dollar)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Quantity and Unit Price Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quantity <span className="required">*</span></label>
                                    <div className="input-with-unit">
                                        <input
                                            type="number"
                                            min={isEquipment ? 1 : 1}
                                            max={isEquipment ? 1 : undefined}
                                            value={formData.quantity}
                                            onChange={handleQuantityChange}
                                            placeholder="Enter quantity"
                                            required
                                            readOnly={isEquipment}
                                        />
                                        <span className="unit-badge">
                                            {isEquipment ? 'unit' : (requestItem.itemTypeMeasuringUnit || 'units')}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Unit Price <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.unitPrice}
                                        onChange={handleUnitPriceChange}
                                        placeholder="Enter unit price"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Total Price and Delivery Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Total Price</label>
                                    <div className="input-with-unit">
                                        <input
                                            type="text"
                                            value={formData.totalPrice.toFixed(2)}
                                            readOnly
                                        />
                                        <span className="unit-badge currency">
                                            {formData.currency}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Est. Delivery (days) <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.estimatedDeliveryDays}
                                        onChange={(e) => handleFieldChange('estimatedDeliveryDays', parseInt(e.target.value) || 7)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Delivery Notes */}
                            <div className="form-group-full">
                                <label>Delivery Notes</label>
                                <textarea
                                    value={formData.deliveryNotes}
                                    onChange={(e) => handleFieldChange('deliveryNotes', e.target.value)}
                                    placeholder="Any special delivery instructions"
                                    rows={3}
                                />
                            </div>

                            {/* Comments (only show in edit mode) */}
                            {mode === 'edit' && (
                                <div className="form-group-full">
                                    <label>Comments</label>
                                    <textarea
                                        value={formData.comment}
                                        onChange={(e) => handleFieldChange('comment', e.target.value)}
                                        placeholder="Additional comments about this item"
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <div className="footer-left"></div>
                        <div className="footer-right">
                            <Button variant="ghost" onClick={handleCloseAttempt}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {mode === 'edit' ? 'Save Changes' : 'Add to Offer'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
};

export default ProcurementSolutionModal;