// RequestOrderModal.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaCheck } from 'react-icons/fa';
import { siteService } from '../../../services/siteService.js';
import { warehouseService } from '../../../services/warehouse/warehouseService.js';
import { itemTypeService } from '../../../services/warehouse/itemTypeService.js';
import { itemCategoryService } from '../../../services/warehouse/itemCategoryService.js';
import { employeeService } from '../../../services/hr/employeeService.js';
import { requestOrderService } from '../../../services/procurement/requestOrderService.js';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './RequestOrderModal.scss';

const RequestOrderModal = ({
                               isOpen,
                               onClose,
                               onSuccess,
                               onError,
                               isEditMode = false,
                               existingOrder = null,
                               userType = 'PROCUREMENT', // 'PROCUREMENT' or 'WAREHOUSE'
                               currentWarehouseId = null,
                               currentSiteId = null
                           }) => {
    // Current step state (1, 2, or 3)
    const [currentStep, setCurrentStep] = useState(1);

    // Form data state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        siteId: '',
        requesterId: '',
        requesterName: '',
        items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
        status: 'PENDING',
        deadline: '',
        employeeRequestedBy: ''
    });

    // Track if form has been modified
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Data states
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});

    // Loading state
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setIsFormDirty(false);
            setCurrentStep(1); // Always start at step 1

            if (userType === 'WAREHOUSE' && currentWarehouseId && currentSiteId) {
                setFormData(prev => ({
                    ...prev,
                    siteId: currentSiteId,
                    requesterId: currentWarehouseId
                }));
            }
        }
    }, [isOpen, userType, currentWarehouseId, currentSiteId]);

    useEffect(() => {
        if (isOpen && existingOrder) {
            populateFormWithExistingOrder(existingOrder);
        }
    }, [isOpen, existingOrder]);

    const populateFormWithExistingOrder = async (order) => {
        try {
            const deadline = order.deadline
                ? new Date(order.deadline).toISOString().slice(0, 16)
                : '';

            let itemsToSet = [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }];

            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToSet = order.items.map(item => ({
                    id: item.id || null,
                    itemTypeId: item.itemTypeId,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '',
                    itemCategoryId: ''
                }));
            } else if (order.requestItems && Array.isArray(order.requestItems) && order.requestItems.length > 0) {
                itemsToSet = order.requestItems.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemTypeId || item.itemType?.id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '',
                    itemCategoryId: ''
                }));
            }

            setFormData({
                title: order.title || '',
                description: order.description || '',
                siteId: order.siteId || (userType === 'WAREHOUSE' ? currentSiteId : ''),
                requesterId: order.requesterId || (userType === 'WAREHOUSE' ? currentWarehouseId : ''),
                requesterName: order.requesterName || '',
                status: order.status || 'PENDING',
                deadline: deadline,
                employeeRequestedBy: order.employeeRequestedBy || '',
                items: itemsToSet
            });

            if (userType === 'WAREHOUSE' && currentWarehouseId && currentSiteId) {
                setFormData(prev => ({
                    ...prev,
                    siteId: currentSiteId,
                    requesterId: currentWarehouseId
                }));
            }

            if (order.siteId && userType === 'PROCUREMENT') {
                try {
                    const data = await warehouseService.getBySite(order.siteId);
                    setWarehouses(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('Error fetching warehouses:', err);
                    setWarehouses([]);
                }
            }

            if (isEditMode) {
                setIsFormDirty(false);
            }
        } catch (error) {
            console.error('Error populating form:', error);
            onError?.('Failed to load order data');
        }
    };

    const fetchInitialData = async () => {
        try {
            await Promise.all([
                fetchSites(),
                fetchItemTypes(),
                fetchEmployees(),
                fetchParentCategories()
            ]);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            onError?.('Failed to load initial data');
        }
    };

    const fetchSites = async () => {
        try {
            const response = await siteService.getAllSites();
            const data = response.data || response;
            setSites(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching sites:', err);
            setSites([]);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching item types:', err);
            setItemTypes([]);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            const employeesData = response.data || response;
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setEmployees([]);
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            setParentCategories([]);
        }
    };

    const fetchChildCategories = async (parentCategoryId, itemIndex) => {
        if (!parentCategoryId) {
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
            return;
        }

        try {
            const data = await itemCategoryService.getChildren();
            const filteredChildren = data.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: filteredChildren
            }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
        }
    };

    const handleSiteChange = async (e) => {
        const siteId = e.target.value;
        setIsFormDirty(true);

        setFormData(prev => ({
            ...prev,
            siteId,
            requesterId: '',
            requesterName: ''
        }));

        if (siteId) {
            try {
                const data = await warehouseService.getBySite(siteId);
                setWarehouses(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching warehouses:', err);
                setWarehouses([]);
                onError?.('Failed to load warehouses');
            }
        } else {
            setWarehouses([]);
        }
    };

    const handleWarehouseChange = (e) => {
        const requesterId = e.target.value;
        setIsFormDirty(true);

        const selectedWarehouse = Array.isArray(warehouses)
            ? warehouses.find(warehouse => warehouse.id === requesterId)
            : null;
        const requesterName = selectedWarehouse ? selectedWarehouse.name : '';

        setFormData(prev => ({
            ...prev,
            requesterId,
            requesterName
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setIsFormDirty(true);
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        setIsFormDirty(true);
        setFormData(prev => {
            const newItems = [...prev.items];

            if (field === 'parentCategoryId') {
                newItems[index] = {
                    ...newItems[index],
                    parentCategoryId: value,
                    itemCategoryId: '',
                    itemTypeId: ''
                };
                if (value) {
                    fetchChildCategories(value, index);
                } else {
                    setChildCategoriesByItem(prevState => ({
                        ...prevState,
                        [index]: []
                    }));
                }
            } else if (field === 'itemCategoryId') {
                newItems[index] = {
                    ...newItems[index],
                    itemCategoryId: value,
                    itemTypeId: ''
                };
            } else {
                newItems[index] = {
                    ...newItems[index],
                    [field]: value
                };
            }

            return {
                ...prev,
                items: newItems
            };
        });
    };

    const handleAddItem = () => {
        setIsFormDirty(true);
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length <= 1) return;
        setIsFormDirty(true);

        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return {
                ...prev,
                items: newItems
            };
        });

        setChildCategoriesByItem(prev => {
            const newChildCategories = { ...prev };
            delete newChildCategories[index];
            const reindexed = {};
            Object.keys(newChildCategories).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newChildCategories[key];
                } else {
                    reindexed[key] = newChildCategories[key];
                }
            });
            return reindexed;
        });
    };

    const getFilteredItemTypes = (itemIndex) => {
        const item = formData.items[itemIndex];
        if (!item) return itemTypes;

        let filteredTypes = itemTypes;

        if (item.itemCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.id === item.itemCategoryId
            );
        } else if (item.parentCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === item.parentCategoryId
            );
        }

        return filteredTypes;
    };

    const getAvailableItemTypes = (currentIndex) => {
        const selectedItemTypeIds = formData.items
            .filter((_, idx) => idx !== currentIndex && !!_.itemTypeId)
            .map(item => item.itemTypeId);

        const filteredTypes = getFilteredItemTypes(currentIndex);

        return filteredTypes.filter(itemType =>
            !selectedItemTypeIds.includes(itemType.id)
        );
    };

    const getUserInfo = () => {
        let username = "system";
        const userInfoString = localStorage.getItem('userInfo');

        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo.username) {
                    username = userInfo.username;
                }
            } catch (error) {
                console.error("Error parsing user info:", error);
            }
        }
        return username;
    };

    const handleSaveAsDraft = async () => {
        const username = getUserInfo();

        // Validate minimum requirements for draft
        if (!formData.title || formData.title.trim() === '') {
            onError?.('Please provide at least a title to save as draft');
            return;
        }

        const requestPayload = {
            title: formData.title.trim(),
            description: formData.description.trim() || '',
            createdBy: isEditMode ? undefined : username,
            updatedBy: isEditMode ? username : undefined,
            status: 'DRAFT',
            partyType: 'WAREHOUSE',
            requesterId: formData.requesterId || null,
            employeeRequestedBy: formData.employeeRequestedBy || null,
            deadline: formData.deadline || null,
            items: formData.items
                .filter(item => item.itemTypeId && item.quantity)
                .map(item => ({
                    id: item.id || null,
                    itemTypeId: item.itemTypeId,
                    quantity: parseFloat(item.quantity),
                    comment: (item.comment || '').trim()
                }))
        };

        // Remove items array if empty
        if (requestPayload.items.length === 0) {
            delete requestPayload.items;
        }

        setIsSubmitting(true);

        try {
            if (isEditMode && existingOrder?.id) {
                await requestOrderService.update(existingOrder.id, requestPayload);
                onSuccess?.('Draft updated successfully');
            } else {
                await requestOrderService.create(requestPayload);
                onSuccess?.('Draft saved successfully');
            }

            setIsFormDirty(false);
            handleClose();
        } catch (err) {
            console.error('Error saving draft:', err);

            let errorMessage = 'Failed to save draft';

            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }

            onError?.(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isStepCompleted = (step) => {
        if (step === 1) {
            // Step 1: Basic Information
            return formData.title && formData.description && formData.deadline;
        } else if (step === 2) {
            // Step 2: Request Items
            return formData.items.some(item => item.itemTypeId && item.quantity);
        } else if (step === 3) {
            // Step 3: Requester Information
            return formData.requesterId;
        }
        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const username = getUserInfo();

        if (!formData.title || !formData.description || !formData.requesterId || !formData.deadline) {
            onError?.('Please fill in all required fields');
            return;
        }

        if (!formData.items.some(item => item.itemTypeId && item.quantity)) {
            onError?.('Please add at least one item with type and quantity');
            return;
        }

        const requestPayload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            createdBy: isEditMode ? undefined : username,
            updatedBy: isEditMode ? username : undefined,
            status: 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: formData.requesterId,
            employeeRequestedBy: formData.employeeRequestedBy || null,
            deadline: formData.deadline,
            items: formData.items
                .filter(item => item.itemTypeId && item.quantity)
                .map(item => ({
                    id: item.id || null,
                    itemTypeId: item.itemTypeId,
                    quantity: parseFloat(item.quantity),
                    comment: (item.comment || '').trim()
                }))
        };

        setIsSubmitting(true);

        try {
            if (isEditMode && existingOrder?.id) {
                await requestOrderService.update(existingOrder.id, requestPayload);
                onSuccess?.('Request Order updated successfully');
            } else {
                await requestOrderService.create(requestPayload);
                onSuccess?.('Request Order created successfully');
            }

            setIsFormDirty(false);
            handleClose();
        } catch (err) {
            console.error('Error submitting request order:', err);

            let errorMessage = isEditMode ? 'Failed to update request order' : 'Failed to create request order';

            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }

            onError?.(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            siteId: '',
            requesterId: '',
            requesterName: '',
            items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
            status: 'PENDING',
            deadline: '',
            employeeRequestedBy: ''
        });
        setWarehouses([]);
        setChildCategoriesByItem({});
        setIsFormDirty(false);
        setCurrentStep(1);
        onClose();
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    };

    const handleDiscardChanges = () => {
        setShowDiscardDialog(false);
        handleClose();
    };

    const handleCancelDiscard = () => {
        setShowDiscardDialog(false);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    const handleNextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-xl request-order-modal">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            {isEditMode ? 'Update Request Order' : 'Create New Request Order'}
                        </h2>
                        <button
                            className="btn-close"
                            onClick={handleCloseAttempt}
                            disabled={isSubmitting}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="step-indicator">
                        <div className="step-indicator-container">
                            {[1, 2, 3].map((step) => (
                                <div
                                    key={step}
                                    className={`step-item ${currentStep === step ? 'active' : ''} ${isStepCompleted(step) ? 'completed' : ''}`}
                                    onClick={() => handleStepClick(step)}
                                >
                                    <div className="step-circle">
                                        {isStepCompleted(step) ? (
                                            <FaCheck className="step-icon" />
                                        ) : (
                                            <span className="step-number">{step}</span>
                                        )}
                                    </div>
                                    <div className="step-label">
                                        {step === 1 && 'Basic Information'}
                                        {step === 2 && 'Request Items'}
                                        {step === 3 && 'Requester Details'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit} className="request-order-form-modal">
                            {/* Step 1: Basic Information */}
                            {currentStep === 1 && (
                                <div className="modal-section">
                                    <h3 className="modal-section-title">Basic Information</h3>

                                    <div className="form-group">
                                        <label htmlFor="title" className="form-label">
                                            Request Title <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            className="form-input"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter a descriptive title for this request"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="description" className="form-label">
                                            Description <span className="required">*</span>
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            className="form-textarea"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            placeholder="Provide details about what items are needed and why"
                                            rows={4}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="deadline" className="form-label">
                                            Deadline <span className="required">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            id="deadline"
                                            name="deadline"
                                            className="form-input"
                                            value={formData.deadline}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Request Items */}
                            {currentStep === 2 && (
                                <div className="modal-section">
                                    <div className="section-header">
                                        <h3 className="modal-section-title">Request Items</h3>
                                        <button
                                            type="button"
                                            className="btn-add-item"
                                            onClick={handleAddItem}
                                            disabled={isSubmitting}
                                        >
                                            <FaPlus />
                                            Add Another Item
                                        </button>
                                    </div>

                                    <div className="items-container">
                                        {formData.items.map((item, index) => (
                                            <div key={index} className="item-card">
                                                <div className="item-header">
                                                    <span className="item-number">Item {index + 1}</span>
                                                    {formData.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn-remove-item"
                                                            onClick={() => handleRemoveItem(index)}
                                                            disabled={isSubmitting}
                                                        >
                                                            <FaTimes />
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="item-body">
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label className="form-label">Parent Category</label>
                                                            <select
                                                                className="form-select"
                                                                value={item.parentCategoryId}
                                                                onChange={(e) => handleItemChange(index, 'parentCategoryId', e.target.value)}
                                                                disabled={isSubmitting}
                                                            >
                                                                <option value="">All Categories</option>
                                                                {parentCategories.map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">Child Category</label>
                                                            <select
                                                                className="form-select"
                                                                value={item.itemCategoryId}
                                                                onChange={(e) => handleItemChange(index, 'itemCategoryId', e.target.value)}
                                                                disabled={!item.parentCategoryId || isSubmitting}
                                                            >
                                                                <option value="">All child categories</option>
                                                                {(childCategoriesByItem[index] || []).map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label className="form-label">
                                                                Item Type <span className="required">*</span>
                                                            </label>
                                                            <select
                                                                className="form-select"
                                                                value={item.itemTypeId}
                                                                onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                                disabled={isSubmitting}
                                                            >
                                                                <option value="">Select Item Type</option>
                                                                {getAvailableItemTypes(index).map(type => (
                                                                    <option key={type.id} value={type.id}>
                                                                        {type.name || 'Unknown Item Type'}
                                                                        {type.measuringUnit ? ` (${type.measuringUnit})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">
                                                                Quantity <span className="required">*</span>
                                                            </label>
                                                            <div className="quantity-input-wrapper">
                                                                <input
                                                                    type="number"
                                                                    className="form-input quantity-input"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    disabled={isSubmitting}
                                                                />
                                                                {item.itemTypeId && (
                                                                    <span className="unit-badge">
                                                                        {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || 'units'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label className="form-label">Additional Notes</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={item.comment}
                                                            onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                                                            placeholder="Add any special instructions or details about this item"
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Requester Information */}
                            {currentStep === 3 && (
                                <div className="modal-section">
                                    <h3 className="modal-section-title">Requester Details</h3>

                                    <div className="form-group">
                                        <label htmlFor="employeeRequestedBy" className="form-label">
                                            Requested By (Employee)
                                        </label>
                                        <select
                                            id="employeeRequestedBy"
                                            name="employeeRequestedBy"
                                            className="form-select"
                                            value={formData.employeeRequestedBy}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(employee => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.name || employee.fullName ||
                                                        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                                                        'Unknown Employee'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {userType === 'PROCUREMENT' && (
                                        <>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="site" className="form-label">
                                                        Site <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="site"
                                                        name="siteId"
                                                        className="form-select"
                                                        value={formData.siteId}
                                                        onChange={handleSiteChange}
                                                        disabled={isSubmitting}
                                                    >
                                                        <option value="">Select Site</option>
                                                        {sites.map(site => (
                                                            <option key={site.id} value={site.id}>
                                                                {site.name || 'Unknown Site'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {formData.siteId && (
                                                    <div className="form-group">
                                                        <label htmlFor="requesterId" className="form-label">
                                                            Warehouse <span className="required">*</span>
                                                        </label>
                                                        <select
                                                            id="requesterId"
                                                            name="requesterId"
                                                            className="form-select"
                                                            value={formData.requesterId}
                                                            onChange={handleWarehouseChange}
                                                            disabled={isSubmitting}
                                                        >
                                                            <option value="">Select Warehouse</option>
                                                            {warehouses.map(warehouse => (
                                                                <option key={warehouse.id} value={warehouse.id}>
                                                                    {warehouse.name || 'Unknown Warehouse'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {formData.requesterId && formData.requesterName && (
                                                <div className="selected-requester-info">
                                                    <div className="info-icon">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="info-content">
                                                        <span className="info-label">Selected Warehouse:</span>
                                                        <span className="info-value">{formData.requesterName}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="modal-footer">
                        <div className="footer-left">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    className="modal-btn-secondary"
                                    onClick={handlePreviousStep}
                                    disabled={isSubmitting}
                                >
                                    Previous
                                </button>
                            )}
                        </div>

                        <div className="footer-right">
                            <button
                                type="button"
                                className="btn-draft"
                                onClick={handleSaveAsDraft}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        Saving...
                                    </>
                                ) : (
                                    'Save as Draft'
                                )}
                            </button>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleNextStep}
                                    disabled={isSubmitting}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn-success"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        isEditMode ? 'Create Request' : 'Submit Request'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discard Changes Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={handleDiscardChanges}
                onCancel={handleCancelDiscard}
                size="medium"
            />
        </>
    );
};

export default RequestOrderModal;