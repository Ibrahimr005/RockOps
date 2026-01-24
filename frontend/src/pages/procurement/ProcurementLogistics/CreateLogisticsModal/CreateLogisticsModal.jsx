import React, { useState, useEffect } from 'react';
import { FiX, FiTruck, FiPackage, FiPlus, FiTrash2, FiCheck } from 'react-icons/fi';
import './CreateLogisticsModal.scss';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog'; // Update the path
import {merchantService} from "../../../../services/merchant/merchantService.js";
import {logisticsService} from "../../../../services/procurement/logisticsService.js"

const CreateLogisticsModal = ({
                                  isOpen,
                                  onClose,
                                  onSuccess,
                                  onError,
                                  availablePurchaseOrders = []
                              }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false); // NEW

    // Form state
    const [formData, setFormData] = useState({
        merchantId: '',
        totalCost: '',
        currency: 'EGP',
        carrierCompany: '',
        driverName: '',
        driverPhone: '',
        notes: '',
        purchaseOrders: [{
            purchaseOrderId: '',
            selectedItemIds: []
        }]
    });

    const [merchants, setMerchants] = useState([]);

    // NEW: Initial form state for comparison
    const initialFormState = {
        merchantId: '',
        totalCost: '',
        currency: 'EGP',
        carrierCompany: '',
        driverName: '',
        driverPhone: '',
        notes: '',
        purchaseOrders: [{
            purchaseOrderId: '',
            selectedItemIds: []
        }]
    };

    useEffect(() => {
        if (isOpen) {
            fetchServiceMerchants();
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen]);

    const fetchServiceMerchants = async () => {
        try {
            const response = await merchantService.getServiceMerchants();
            const data = response.data || response;
            setMerchants(data);
        } catch (error) {
            console.error('Error fetching service merchants:', error);
            onError('Failed to load service merchants');
        }
    };

    const resetForm = () => {
        setFormData({
            merchantId: '',
            totalCost: '',
            currency: 'EGP',
            carrierCompany: '',
            driverName: '',
            driverPhone: '',
            notes: '',
            purchaseOrders: [{
                purchaseOrderId: '',
                selectedItemIds: []
            }]
        });
        setCurrentStep(1);
    };

    // NEW: Check if form has been modified
    const hasFormChanged = () => {
        return (
            formData.merchantId !== initialFormState.merchantId ||
            formData.totalCost !== initialFormState.totalCost ||
            formData.currency !== initialFormState.currency ||
            formData.carrierCompany !== initialFormState.carrierCompany ||
            formData.driverName !== initialFormState.driverName ||
            formData.driverPhone !== initialFormState.driverPhone ||
            formData.notes !== initialFormState.notes ||
            formData.purchaseOrders.length !== initialFormState.purchaseOrders.length ||
            formData.purchaseOrders.some((po, index) =>
                po.purchaseOrderId !== initialFormState.purchaseOrders[index]?.purchaseOrderId ||
                po.selectedItemIds.length !== initialFormState.purchaseOrders[index]?.selectedItemIds.length
            )
        );
    };

    // NEW: Handle close with confirmation
    const handleCloseAttempt = () => {
        if (hasFormChanged()) {
            setShowConfirmation(true);
        } else {
            onClose();
        }
    };

    // NEW: Confirm discard changes
    const handleConfirmDiscard = () => {
        setShowConfirmation(false);
        onClose();
    };

    // NEW: Cancel discard
    const handleCancelDiscard = () => {
        setShowConfirmation(false);
    };

    const validateStep1 = () => {
        return !!(formData.merchantId && formData.totalCost && formData.currency);
    };

    const validateStep2 = () => {
        return !!(formData.carrierCompany && formData.driverName);
    };

    const validateStep3 = () => {
        return formData.purchaseOrders.length > 0 &&
            formData.purchaseOrders.every(po => po.purchaseOrderId && po.selectedItemIds.length > 0);
    };

    const isStepComplete = (stepNumber) => {
        switch(stepNumber) {
            case 1:
                return validateStep1();
            case 2:
                return validateStep2();
            case 3:
                return validateStep3();
            default:
                return false;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddPurchaseOrder = () => {
        setFormData(prev => ({
            ...prev,
            purchaseOrders: [
                ...prev.purchaseOrders,
                {
                    purchaseOrderId: '',
                    selectedItemIds: []
                }
            ]
        }));
    };

    const handleRemovePurchaseOrder = (index) => {
        setFormData(prev => ({
            ...prev,
            purchaseOrders: prev.purchaseOrders.filter((_, i) => i !== index)
        }));
    };

    const handlePOChange = (index, field, value) => {
        setFormData(prev => {
            const newPOs = [...prev.purchaseOrders];
            newPOs[index] = {
                ...newPOs[index],
                [field]: value
            };
            // Clear selected items when PO changes
            if (field === 'purchaseOrderId') {
                newPOs[index].selectedItemIds = [];
            }
            return {
                ...prev,
                purchaseOrders: newPOs
            };
        });
    };

    const handleItemToggle = (poIndex, itemId) => {
        setFormData(prev => {
            // Create a deep copy of purchaseOrders
            const newPOs = prev.purchaseOrders.map((po, idx) => {
                if (idx === poIndex) {
                    const currentItems = po.selectedItemIds;
                    let newSelectedItems;

                    if (currentItems.includes(itemId)) {
                        newSelectedItems = currentItems.filter(id => id !== itemId);
                    } else {
                        newSelectedItems = [...currentItems, itemId];
                    }

                    return {
                        ...po,
                        selectedItemIds: newSelectedItems
                    };
                }
                return po;
            });

            return {
                ...prev,
                purchaseOrders: newPOs
            };
        });
    };

    const validateFinalSubmit = () => {
        if (!formData.merchantId || !formData.totalCost || !formData.currency) {
            onError('Please fill in Service Provider and Cost details');
            return false;
        }
        if (!formData.carrierCompany || !formData.driverName) {
            onError('Please fill in Delivery Information');
            return false;
        }
        if (formData.purchaseOrders.length === 0) {
            onError('Please add at least one Purchase Order');
            return false;
        }
        if (!formData.purchaseOrders.every(po => po.purchaseOrderId && po.selectedItemIds.length > 0)) {
            onError('Please select Purchase Orders and their items');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) {
            onError('Please fill in all required fields in Service & Cost');
            return;
        }
        if (currentStep === 2 && !validateStep2()) {
            onError('Please fill in all required fields in Delivery Information');
            return;
        }
        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (!validateFinalSubmit()) {
            return;
        }

        setIsSaving(true);
        try {
            // Transform formData to match backend DTO structure
            const payload = {
                merchantId: formData.merchantId,
                totalCost: parseFloat(formData.totalCost),
                currency: formData.currency,
                carrierCompany: formData.carrierCompany,
                driverName: formData.driverName,
                driverPhone: formData.driverPhone || null,
                notes: formData.notes || null,
                purchaseOrders: formData.purchaseOrders.map(po => ({
                    purchaseOrderId: po.purchaseOrderId,
                    selectedItemIds: po.selectedItemIds
                }))
            };

            await logisticsService.create(payload);
            onSuccess('Logistics created successfully');
            onClose();
        } catch (error) {
            onError(error.message || 'Failed to create logistics');
        } finally {
            setIsSaving(false);
        }
    };

    const getSelectedPO = (poIndex) => {
        const poId = formData.purchaseOrders[poIndex]?.purchaseOrderId;
        return availablePurchaseOrders.find(po => po.id === poId);
    };

    if (!isOpen) return null;

    const steps = [
        { number: 1, label: 'Service & Cost' },
        { number: 2, label: 'Delivery Info' },
        { number: 3, label: 'Purchase Orders' }
    ];

    return (
        <>
            <div className="modal-backdrop" onClick={handleCloseAttempt}> {/* CHANGED */}
                <div className="modal-content modal-xl create-logistics-modal" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <FiTruck />
                            Create Logistics Entry
                        </h2>
                        <button className="btn-close" onClick={handleCloseAttempt}> {/* CHANGED */}
                            <FiX />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="step-indicator">
                        <div className="step-indicator-container">
                            {steps.map((step) => (
                                <div
                                    key={step.number}
                                    className={`step-item ${currentStep === step.number ? 'active' : ''} ${isStepComplete(step.number) ? 'completed' : ''}`}
                                    onClick={() => setCurrentStep(step.number)}
                                >
                                    <div className="step-circle">
                                        {isStepComplete(step.number) ? (
                                            <FiCheck className="step-icon" />
                                        ) : (
                                            <span className="step-number">{step.number}</span>
                                        )}
                                    </div>
                                    <span className="step-label">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body - Keep all your existing step content exactly as is */}
                    <div className="modal-body request-order-form-modal">
                        {/* All your existing step 1, 2, 3 content stays the same */}
                        {/* ... (keeping all the existing JSX for steps) ... */}
                        {currentStep === 1 && (
                            <div className="modal-section">
                                <h3 className="modal-section-title">Service Provider & Cost Details</h3>

                                <div className="form-group">
                                    <label className="form-label">
                                        Service Provider <span className="required">*</span>
                                    </label>
                                    <select
                                        name="merchantId"
                                        value={formData.merchantId}
                                        onChange={handleInputChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">Select a service provider...</option>
                                        {merchants.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Total Cost <span className="required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="totalCost"
                                            value={formData.totalCost}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter total logistics cost"
                                            step="0.01"
                                            min="0"
                                            required
                                            onWheel={(e) => e.target.blur()}  // ADD THIS LINE
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Currency <span className="required">*</span>
                                        </label>
                                        <select
                                            name="currency"
                                            value={formData.currency}
                                            onChange={handleInputChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="EGP">EGP</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="modal-section">
                                <h3 className="modal-section-title">Delivery Information</h3>

                                <div className="form-group">
                                    <label className="form-label">
                                        Carrier Company <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="carrierCompany"
                                        value={formData.carrierCompany}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Enter carrier company name"
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Driver Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="driverName"
                                            value={formData.driverName}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter driver name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Driver Phone <span className="required">*</span> </label>
                                        <input
                                            type="tel"
                                            name="driverPhone"
                                            value={formData.driverPhone}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter driver phone number"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        placeholder="Enter any additional notes..."
                                        rows="4"
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="modal-section">
                                <div className="section-header">
                                    <h3 className="modal-section-title">Select Purchase Orders & Items</h3>
                                    <button
                                        type="button"
                                        className="btn-add-item"
                                        onClick={handleAddPurchaseOrder}
                                    >
                                        <FiPlus />
                                        Add Purchase Order
                                    </button>
                                </div>

                                <div className="items-container">
                                    {formData.purchaseOrders.map((po, poIndex) => {
                                        const selectedPO = getSelectedPO(poIndex);

                                        return (
                                            <div key={poIndex} className="item-card">
                                                <div className="item-header">
                                                    <span className="item-number">Purchase Order #{poIndex + 1}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {selectedPO && (
                                                            <span className={`status-badge status-${selectedPO.status.toLowerCase()}`}>
                                                                {selectedPO.status}
                                                            </span>
                                                        )}
                                                        {formData.purchaseOrders.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn-remove-item"
                                                                onClick={() => handleRemovePurchaseOrder(poIndex)}
                                                            >
                                                                <FiTrash2 />
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="item-body">
                                                    <div className="form-group">
                                                        <label className="form-label">
                                                            Select Purchase Order <span className="required">*</span>
                                                        </label>
                                                        <select
                                                            value={po.purchaseOrderId}
                                                            onChange={(e) => handlePOChange(poIndex, 'purchaseOrderId', e.target.value)}
                                                            className="form-select"
                                                            required
                                                        >
                                                            <option value="">Choose a purchase order...</option>
                                                            {availablePurchaseOrders.map(availablePO => (
                                                                <option key={availablePO.id} value={availablePO.id}>
                                                                    {availablePO.poNumber} - {availablePO.merchantName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {selectedPO && selectedPO.items && selectedPO.items.length > 0 && (
                                                        <div className="form-group">
                                                            <label className="form-label">
                                                                Select Items <span className="required">*</span>
                                                            </label>
                                                            <div className="logistics-checkbox-list">
                                                                {selectedPO.items.map(item => {
                                                                    // ADD THESE CONSOLE LOGS
                                                                    console.log('Full Item Object:', item);
                                                                    console.log('Item Type:', item.itemType);
                                                                    console.log('Item Category Name:', item.itemType?.itemCategoryName);
                                                                    console.log('---');

                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`logistics-checkbox-card ${po.selectedItemIds.includes(item.id) ? 'checked' : ''}`}
                                                                            onClick={() => handleItemToggle(poIndex, item.id)}
                                                                        >
                                                                            <div className="logistics-checkbox-wrapper">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={po.selectedItemIds.includes(item.id)}
                                                                                    readOnly
                                                                                    className="logistics-checkbox-input"
                                                                                />
                                                                                <div className="logistics-checkbox-custom"></div>
                                                                            </div>
                                                                            <div className="logistics-checkbox-body">
                                                                                <div className="logistics-checkbox-title">
                                                                                    <span className="logistics-item-name">{item.itemTypeName}</span>
                                                                                    {item.itemType?.itemCategoryName && (
                                                                                        <span className="logistics-item-badge">
                                        {item.itemType.itemCategoryName}
                                    </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="logistics-item-meta">
                                                                                    <span>Qty: <strong>{item.quantity} {item.measuringUnit}</strong></span>
                                                                                    <span>•</span>
                                                                                    <span>Price: <strong>{item.currency} {item.unitPrice}</strong></span>
                                                                                    <span>•</span>
                                                                                    <span>Total: <strong>{item.currency} {item.totalPrice}</strong></span>
                                                                                    {item.merchantName && (
                                                                                        <>
                                                                                            <span>•</span>
                                                                                            <span>Merchant: <strong>{item.merchantName}</strong></span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <div className="footer-left">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    className="btn-draft"
                                    onClick={handleBack}
                                    disabled={isSaving}
                                >
                                    Back
                                </button>
                            )}
                        </div>
                        <div className="footer-right">
                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleNext}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving && <span className="spinner" />}
                                    {isSaving ? 'Creating...' : 'Create Logistics'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW: Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showConfirmation}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={handleConfirmDiscard}
                onCancel={handleCancelDiscard}
                size="medium"
            />
        </>
    );
};

export default CreateLogisticsModal;