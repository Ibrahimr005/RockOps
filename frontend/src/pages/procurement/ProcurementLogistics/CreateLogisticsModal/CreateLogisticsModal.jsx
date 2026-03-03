import React, { useState, useEffect } from 'react';
import { FiX, FiTruck, FiPackage, FiPlus, FiTrash2, FiCheck, FiBox } from 'react-icons/fi';
import './CreateLogisticsModal.scss';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import {merchantService} from "../../../../services/merchant/merchantService.js";
import {logisticsService} from "../../../../services/procurement/logisticsService.js"

const CreateLogisticsModal = ({
                                  isOpen,
                                  onClose,
                                  onSuccess,
                                  onError,
                                  availablePurchaseOrders = [],
                                  availablePurchaseOrderReturns = [],
                                  existingLogistics = null,
                                  isEditMode = false
                              }) => {
    const [logisticsType, setLogisticsType] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

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
        }],
        purchaseOrderReturns: [{
            purchaseOrderReturnId: '',
            selectedItemIds: []
        }]
    });

    const [merchants, setMerchants] = useState([]);

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
        }],
        purchaseOrderReturns: [{
            purchaseOrderReturnId: '',
            selectedItemIds: []
        }]
    };

    useEffect(() => {
        if (isOpen) {
            fetchServiceMerchants();
            if (isEditMode && existingLogistics) {
                loadExistingData();
            } else {
                resetForm();
            }
        }
    }, [isOpen, isEditMode, existingLogistics]);

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
            }],
            purchaseOrderReturns: [{
                purchaseOrderReturnId: '',
                selectedItemIds: []
            }]
        });
        setLogisticsType(null);
        setCurrentStep(1);
    };

    const loadExistingData = async () => {
        try {
            const fullLogistics = await logisticsService.getById(existingLogistics.id);

            const isReturn = fullLogistics.logisticsNumber.startsWith('RET-LOG');
            setLogisticsType(isReturn ? 'RETURN' : 'PO');
            setCurrentStep(2);

            if (isReturn) {
                const purchaseOrderReturns = fullLogistics.purchaseOrderReturns.map(por => ({
                    purchaseOrderReturnId: por.purchaseOrderReturnId,
                    selectedItemIds: por.items.map(item => item.purchaseOrderReturnItemId)
                }));

                setFormData({
                    ...formData,
                    merchantId: fullLogistics.merchantId,
                    totalCost: fullLogistics.totalCost.toString(),
                    currency: fullLogistics.currency,
                    carrierCompany: fullLogistics.carrierCompany,
                    driverName: fullLogistics.driverName,
                    driverPhone: fullLogistics.driverPhone || '',
                    notes: fullLogistics.notes || '',
                    purchaseOrderReturns: purchaseOrderReturns
                });
            } else {
                const purchaseOrders = fullLogistics.purchaseOrders.map(po => ({
                    purchaseOrderId: po.purchaseOrderId,
                    selectedItemIds: po.items.map(item => item.purchaseOrderItemId)
                }));

                setFormData({
                    ...formData,
                    merchantId: fullLogistics.merchantId,
                    totalCost: fullLogistics.totalCost.toString(),
                    currency: fullLogistics.currency,
                    carrierCompany: fullLogistics.carrierCompany,
                    driverName: fullLogistics.driverName,
                    driverPhone: fullLogistics.driverPhone || '',
                    notes: fullLogistics.notes || '',
                    purchaseOrders: purchaseOrders
                });
            }
        } catch (error) {
            console.error('Error loading logistics data:', error);
            onError('Failed to load logistics data');
        }
    };

    const hasFormChanged = () => {
        return (
            formData.merchantId !== initialFormState.merchantId ||
            formData.totalCost !== initialFormState.totalCost ||
            formData.currency !== initialFormState.currency ||
            formData.carrierCompany !== initialFormState.carrierCompany ||
            formData.driverName !== initialFormState.driverName ||
            formData.driverPhone !== initialFormState.driverPhone ||
            formData.notes !== initialFormState.notes
        );
    };

    const handleCloseAttempt = () => {
        if (hasFormChanged()) {
            setShowConfirmation(true);
        } else {
            onClose();
        }
    };

    const handleConfirmDiscard = () => {
        setShowConfirmation(false);
        onClose();
    };

    const handleCancelDiscard = () => {
        setShowConfirmation(false);
    };

    const handleTypeSelection = (type) => {
        setLogisticsType(type);
        setCurrentStep(2);
    };

    const validateStep1 = () => {
        return !!(formData.merchantId && formData.totalCost && formData.currency);
    };

    const validateStep2 = () => {
        return !!(formData.carrierCompany && formData.driverName);
    };

    const validateStep3 = () => {
        if (logisticsType === 'PO') {
            return formData.purchaseOrders.length > 0 &&
                formData.purchaseOrders.every(po => po.purchaseOrderId && po.selectedItemIds.length > 0);
        } else {
            return formData.purchaseOrderReturns.length > 0 &&
                formData.purchaseOrderReturns.every(por => por.purchaseOrderReturnId && por.selectedItemIds.length > 0);
        }
    };

    const isStepComplete = (stepNumber) => {
        switch(stepNumber) {
            case 1:
                return logisticsType !== null;
            case 2:
                return validateStep1();
            case 3:
                return validateStep2();
            case 4:
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

    const handleAddPurchaseOrderReturn = () => {
        setFormData(prev => ({
            ...prev,
            purchaseOrderReturns: [
                ...prev.purchaseOrderReturns,
                {
                    purchaseOrderReturnId: '',
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

    const handleRemovePurchaseOrderReturn = (index) => {
        setFormData(prev => ({
            ...prev,
            purchaseOrderReturns: prev.purchaseOrderReturns.filter((_, i) => i !== index)
        }));
    };

    const handlePOChange = (index, field, value) => {
        setFormData(prev => {
            const newPOs = [...prev.purchaseOrders];
            newPOs[index] = {
                ...newPOs[index],
                [field]: value
            };
            if (field === 'purchaseOrderId') {
                newPOs[index].selectedItemIds = [];
            }
            return {
                ...prev,
                purchaseOrders: newPOs
            };
        });
    };

    const handlePORChange = (index, field, value) => {
        setFormData(prev => {
            const newPORs = [...prev.purchaseOrderReturns];
            newPORs[index] = {
                ...newPORs[index],
                [field]: value
            };
            if (field === 'purchaseOrderReturnId') {
                newPORs[index].selectedItemIds = [];
            }
            return {
                ...prev,
                purchaseOrderReturns: newPORs
            };
        });
    };

    const handlePOItemToggle = (poIndex, itemId) => {
        setFormData(prev => {
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

    const handlePORItemToggle = (porIndex, itemId) => {
        setFormData(prev => {
            const newPORs = prev.purchaseOrderReturns.map((por, idx) => {
                if (idx === porIndex) {
                    const currentItems = por.selectedItemIds;
                    let newSelectedItems;

                    if (currentItems.includes(itemId)) {
                        newSelectedItems = currentItems.filter(id => id !== itemId);
                    } else {
                        newSelectedItems = [...currentItems, itemId];
                    }

                    return {
                        ...por,
                        selectedItemIds: newSelectedItems
                    };
                }
                return por;
            });

            return {
                ...prev,
                purchaseOrderReturns: newPORs
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
        if (logisticsType === 'PO') {
            if (formData.purchaseOrders.length === 0) {
                onError('Please add at least one Purchase Order');
                return false;
            }
            if (!formData.purchaseOrders.every(po => po.purchaseOrderId && po.selectedItemIds.length > 0)) {
                onError('Please select Purchase Orders and their items');
                return false;
            }
        } else {
            if (formData.purchaseOrderReturns.length === 0) {
                onError('Please add at least one Purchase Order Return');
                return false;
            }
            if (!formData.purchaseOrderReturns.every(por => por.purchaseOrderReturnId && por.selectedItemIds.length > 0)) {
                onError('Please select Purchase Order Returns and their items');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 2 && !validateStep1()) {
            onError('Please fill in all required fields in Service & Cost');
            return;
        }
        if (currentStep === 3 && !validateStep2()) {
            onError('Please fill in all required fields in Delivery Information');
            return;
        }
        if (currentStep < 4) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep === 2 && !isEditMode) {
            setCurrentStep(1);
            setLogisticsType(null);
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!validateFinalSubmit()) {
            return;
        }

        setIsSaving(true);
        try {
            const basePayload = {
                merchantId: formData.merchantId,
                totalCost: parseFloat(formData.totalCost),
                currency: formData.currency,
                carrierCompany: formData.carrierCompany,
                driverName: formData.driverName,
                driverPhone: formData.driverPhone || null,
                notes: formData.notes || null,
            };

            let payload;
            if (logisticsType === 'PO') {
                payload = {
                    ...basePayload,
                    purchaseOrders: formData.purchaseOrders.map(po => ({
                        purchaseOrderId: po.purchaseOrderId,
                        selectedItemIds: po.selectedItemIds
                    }))
                };
            } else {
                payload = {
                    ...basePayload,
                    purchaseOrderReturns: formData.purchaseOrderReturns.map(por => ({
                        purchaseOrderReturnId: por.purchaseOrderReturnId,
                        selectedItemIds: por.selectedItemIds
                    }))
                };
            }

            if (isEditMode && existingLogistics) {
                await logisticsService.update(existingLogistics.id, payload);
                onSuccess('Logistics updated successfully');
            } else {
                if (logisticsType === 'PO') {
                    await logisticsService.create(payload);
                    onSuccess('Logistics created successfully');
                } else {
                    await logisticsService.createReturn(payload);
                    onSuccess('Return logistics created successfully');
                }
            }

            onClose();
        } catch (error) {
            onError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} logistics`);
        } finally {
            setIsSaving(false);
        }
    };

    const getSelectedPO = (poIndex) => {
        const poId = formData.purchaseOrders[poIndex]?.purchaseOrderId;
        return availablePurchaseOrders.find(po => po.id === poId);
    };

    const getSelectedPOR = (porIndex) => {
        const porId = formData.purchaseOrderReturns[porIndex]?.purchaseOrderReturnId;
        return availablePurchaseOrderReturns.find(por => por.id === porId);
    };

    if (!isOpen) return null;

    const steps = [
        { number: 1, label: 'Type Selection' },
        { number: 2, label: 'Service & Cost' },
        { number: 3, label: 'Delivery Info' },
        { number: 4, label: logisticsType === 'PO' ? 'Purchase Orders' : logisticsType === 'RETURN' ? 'Return Orders' : 'Orders' }
    ];

    return (
        <>
            <div className="modal-backdrop" onClick={handleCloseAttempt}>
                <div className="modal-content modal-xl create-logistics-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <FiTruck />
                            {isEditMode
                                ? `Edit ${logisticsType === 'RETURN' ? 'Return' : ''} Logistics Entry`
                                : 'Create Logistics Entry'
                            }
                        </h2>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FiX />
                        </button>
                    </div>

                    <div className="step-indicator">
                        <div className="step-indicator-container">
                            {steps.map((step) => (
                                <div
                                    key={step.number}
                                    className={`step-item ${currentStep === step.number ? 'active' : ''} ${isStepComplete(step.number) ? 'completed' : ''}`}
                                    onClick={() => {
                                        if (step.number <= currentStep || isStepComplete(step.number)) {
                                            setCurrentStep(step.number);
                                        }
                                    }}
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

                    <div className="modal-body request-order-form-modal">
                        {currentStep === 1 && (
                            <div className="modal-section">
                                <h3 className="modal-section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                    Select Logistics Type
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '2rem',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <button
                                        type="button"
                                        className="logistics-type-card"
                                        onClick={() => handleTypeSelection('PO')}
                                        style={{
                                            flex: '1',
                                            maxWidth: '300px',
                                            minHeight: '200px',
                                            padding: '2rem',
                                            border: '2px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--section-background-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <FiPackage size={48} style={{ color: 'var(--color-primary)' }} />
                                        <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'var(--bold-font-weight)', color: 'var(--color-text-primary)' }}>
                                            Purchase Order
                                        </h4>
                                        <p style={{ margin: 0, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                            Create logistics for incoming purchase orders
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        className="logistics-type-card"
                                        onClick={() => handleTypeSelection('RETURN')}
                                        style={{
                                            flex: '1',
                                            maxWidth: '300px',
                                            minHeight: '200px',
                                            padding: '2rem',
                                            border: '2px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--section-background-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <FiTruck size={48} style={{ color: '#a855f7', transform: 'scaleX(-1)' }} />
                                        <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'var(--bold-font-weight)', color: 'var(--color-text-primary)' }}>
                                            Return Order
                                        </h4>
                                        <p style={{ margin: 0, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                            Create logistics for outgoing return shipments
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
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
                                            onWheel={(e) => e.target.blur()}
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

                        {currentStep === 3 && (
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
                                        <label className="form-label">Driver Phone <span className="required">*</span></label>
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

                        {currentStep === 4 && logisticsType === 'PO' && (
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
                                                            <span className={`status-badge-logistics-create status-${selectedPO.status.toLowerCase()}`}>
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
                                                    <div className="form-section-header">
                                                        <h4 className="form-section-title">
                                                            <FiPackage />
                                                            Purchase Order Selection
                                                        </h4>
                                                    </div>
                                                    <div className="form-group">
                                                        <select
                                                            value={po.purchaseOrderId}
                                                            onChange={(e) => handlePOChange(poIndex, 'purchaseOrderId', e.target.value)}
                                                            className="form-select"
                                                            required
                                                        >
                                                            <option value="">Choose a purchase order...</option>
                                                            {availablePurchaseOrders
                                                                .filter(availablePO => {
                                                                    const isSelectedElsewhere = formData.purchaseOrders.some(
                                                                        (p, idx) => idx !== poIndex && p.purchaseOrderId === availablePO.id
                                                                    );
                                                                    return !isSelectedElsewhere;
                                                                })
                                                                .map(availablePO => (
                                                                    <option key={availablePO.id} value={availablePO.id}>
                                                                        {availablePO.poNumber} - {availablePO.requestOrder?.title || 'No Title'} - {availablePO.merchantName}
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>

                                                    {selectedPO && selectedPO.requestOrder && (
                                                        <div className="request-order-info-logistics-po">
                                                            <div className="info-group">
                                                                <span className="info-label-logistics-po">Title:</span>
                                                                <span className="info-value-logistics-po">{selectedPO.requestOrder.title}</span>
                                                            </div>
                                                            <div className="info-group">
                                                                <span className="info-label-logistics-po">Requester:</span>
                                                                <span className="info-value-logistics-po">{selectedPO.requestOrder.requesterName}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedPO && selectedPO.items && selectedPO.items.length > 0 && (
                                                        <>
                                                            <div className="form-section-header">
                                                                <h4 className="form-section-title">
                                                                    <FiBox />
                                                                    Items Selection
                                                                </h4>
                                                            </div>
                                                            <div className="form-group">
                                                                <div className="logistics-checkbox-list">
                                                                    {selectedPO.items.map(item => (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`logistics-checkbox-card ${po.selectedItemIds.includes(item.id) ? 'checked' : ''}`}
                                                                            onClick={() => handlePOItemToggle(poIndex, item.id)}
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
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && logisticsType === 'RETURN' && (
                            <div className="modal-section">
                                <div className="section-header">
                                    <h3 className="modal-section-title">Select Purchase Order Returns & Items</h3>
                                    <button
                                        type="button"
                                        className="btn-add-item"
                                        onClick={handleAddPurchaseOrderReturn}
                                    >
                                        <FiPlus />
                                        Add Return Order
                                    </button>
                                </div>

                                <div className="items-container">
                                    {formData.purchaseOrderReturns.map((por, porIndex) => {
                                        const selectedPOR = getSelectedPOR(porIndex);

                                        return (
                                            <div key={porIndex} className="item-card">
                                                <div className="item-header">
                                                    <span className="item-number">Return Order #{porIndex + 1}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {selectedPOR && (
                                                            <span className={`status-badge-logistics-create status-${selectedPOR.status.toLowerCase()}`}>
                                                                {selectedPOR.status}
                                                            </span>
                                                        )}
                                                        {formData.purchaseOrderReturns.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn-remove-item"
                                                                onClick={() => handleRemovePurchaseOrderReturn(porIndex)}
                                                            >
                                                                <FiTrash2 />
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="item-body">
                                                    <div className="form-section-header">
                                                        <h4 className="form-section-title">
                                                            <FiPackage />
                                                            Purchase Order Return Selection
                                                        </h4>
                                                    </div>
                                                    <div className="form-group">
                                                        <select
                                                            value={por.purchaseOrderReturnId}
                                                            onChange={(e) => handlePORChange(porIndex, 'purchaseOrderReturnId', e.target.value)}
                                                            className="form-select"
                                                            required
                                                        >
                                                            <option value="">Choose a purchase order return...</option>
                                                            {availablePurchaseOrderReturns
                                                                .filter(availablePOR => {
                                                                    const isSelectedElsewhere = formData.purchaseOrderReturns.some(
                                                                        (p, idx) => idx !== porIndex && p.purchaseOrderReturnId === availablePOR.id
                                                                    );
                                                                    return !isSelectedElsewhere;
                                                                })
                                                                .map(availablePOR => (
                                                                    <option key={availablePOR.id} value={availablePOR.id}>
                                                                        {availablePOR.returnId} - {availablePOR.purchaseOrderNumber} - {availablePOR.merchantName}
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>

                                                    {selectedPOR && (
                                                        <div className="request-order-info-logistics-po">
                                                            <div className="info-group">
                                                                <span className="info-label-logistics-po">PO Number:</span>
                                                                <span className="info-value-logistics-po">{selectedPOR.purchaseOrderNumber}</span>
                                                            </div>
                                                            <div className="info-group">
                                                                <span className="info-label-logistics-po">Reason:</span>
                                                                <span className="info-value-logistics-po">{selectedPOR.reason || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedPOR && selectedPOR.items && selectedPOR.items.length > 0 && (
                                                        <>
                                                            <div className="form-section-header">
                                                                <h4 className="form-section-title">
                                                                    <FiBox />
                                                                    Return Items Selection
                                                                </h4>
                                                            </div>
                                                            <div className="form-group">
                                                                <div className="logistics-checkbox-list">
                                                                    {selectedPOR.items.map(item => (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`logistics-checkbox-card ${por.selectedItemIds.includes(item.id) ? 'checked' : ''}`}
                                                                            onClick={() => handlePORItemToggle(porIndex, item.id)}
                                                                        >
                                                                            <div className="logistics-checkbox-wrapper">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={por.selectedItemIds.includes(item.id)}
                                                                                    readOnly
                                                                                    className="logistics-checkbox-input"
                                                                                />
                                                                                <div className="logistics-checkbox-custom"></div>
                                                                            </div>
                                                                            <div className="logistics-checkbox-body">
                                                                                <div className="logistics-checkbox-title">
                                                                                    <span className="logistics-item-name">{item.itemTypeName}</span>
                                                                                </div>
                                                                                <div className="logistics-item-meta">
                                                                                    <span>Return Qty: <strong>{item.returnQuantity}</strong></span>
                                                                                    <span>•</span>
                                                                                    <span>Price: <strong>EGP {item.unitPrice}</strong></span>
                                                                                    <span>•</span>
                                                                                    <span>Total: <strong>EGP {item.totalReturnAmount}</strong></span>
                                                                                    {item.merchantName && (
                                                                                        <>
                                                                                            <span>•</span>
                                                                                            <span>Merchant: <strong>{item.merchantName}</strong></span>
                                                                                        </>
                                                                                    )}
                                                                                    {item.reason && (
                                                                                        <>
                                                                                            <span>•</span>
                                                                                            <span>Reason: <strong>{item.reason}</strong></span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

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
                            {currentStep < 4 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleNext}
                                    disabled={currentStep === 1 && !logisticsType}
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
                                    {isSaving
                                        ? (isEditMode ? 'Updating...' : 'Creating...')
                                        : (isEditMode ? 'Update Logistics' : 'Create Logistics')
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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