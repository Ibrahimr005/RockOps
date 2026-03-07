import React, { useState, useEffect } from 'react';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';
import './RequestOrderFormModal.scss';

const IncomingRequestOrderFormModal = ({
                                           isOpen,
                                           onClose,
                                           onSubmit,
                                           isEditMode = false,
                                           initialFormData,
                                           sites,
                                           itemTypes,
                                           employees,
                                           parentCategories,
                                           onShowSnackbar
                                       }) => {
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

    const [warehouses, setWarehouses] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});
    const [showFilters, setShowFilters] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [initialFormState, setInitialFormState] = useState(null);

    // Initialize form data when modal opens
    useEffect(() => {
        if (isOpen && initialFormData) {
            setFormData(initialFormData);
            setInitialFormState(JSON.stringify(initialFormData));
            setHasUnsavedChanges(false);

            // Load warehouses if site is already selected
            if (initialFormData.siteId) {
                loadWarehousesForSite(initialFormData.siteId);
            }
        } else if (isOpen && !initialFormData) {
            const defaultData = {
                title: '',
                description: '',
                siteId: '',
                requesterId: '',
                requesterName: '',
                items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
                status: 'PENDING',
                deadline: '',
                employeeRequestedBy: ''
            };
            setFormData(defaultData);
            setInitialFormState(JSON.stringify(defaultData));
            setHasUnsavedChanges(false);
        }
    }, [isOpen, initialFormData]);

    // Detect changes in form data
    useEffect(() => {
        if (initialFormState) {
            const currentState = JSON.stringify(formData);
            setHasUnsavedChanges(currentState !== initialFormState);
        }
    }, [formData, initialFormState]);

    // Manage body scroll
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

    const loadWarehousesForSite = async (siteId) => {
        if (!siteId) {
            setWarehouses([]);
            return;
        }

        try {
            const data = await warehouseService.getBySite(siteId);
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching warehouses:', err);
            setWarehouses([]);
            onShowSnackbar('Failed to load warehouses', 'error');
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

    const toggleFilters = (index) => {
        if (showFilters[index]) {
            const filterElement = document.querySelector(`[data-filter-index="${index}"]`);
            if (filterElement) {
                filterElement.classList.add('collapsing');
                setTimeout(() => {
                    setShowFilters(prev => ({
                        ...prev,
                        [index]: false
                    }));
                }, 300);
            }
        } else {
            setShowFilters(prev => ({
                ...prev,
                [index]: true
            }));
        }
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

    const handleSiteChange = async (e) => {
        const siteId = e.target.value;

        setFormData(prev => ({
            ...prev,
            siteId,
            requesterId: '',
            requesterName: ''
        }));

        await loadWarehousesForSite(siteId);
    };

    const handleWarehouseChange = (e) => {
        const requesterId = e.target.value;

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
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
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

        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return {
                ...prev,
                items: newItems
            };
        });

        // Clean up child categories and filter states
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

        setShowFilters(prev => {
            const newShowFilters = { ...prev };
            delete newShowFilters[index];
            const reindexed = {};
            Object.keys(newShowFilters).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newShowFilters[key];
                } else {
                    reindexed[key] = newShowFilters[key];
                }
            });
            return reindexed;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
        handleCloseModal();
    };

    const handleCloseModal = () => {
        // Reset all states
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
        setShowFilters({});
        setHasUnsavedChanges(false);
        setInitialFormState(null);
        onClose();
    };

    const handleCloseAttempt = () => {
        if (hasUnsavedChanges) {
            setShowDiscardDialog(true);
        } else {
            handleCloseModal();
        }
    };

    const handleDiscardChanges = () => {
        setShowDiscardDialog(false);
        handleCloseModal();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="pro-ro-modal-backdrop" onClick={handleOverlayClick}>
                <div className="pro-ro-modal">
                    <div className="pro-ro-modal-header">
                        <h2>{isEditMode ? 'Update Request Order' : 'Create New Request'}</h2>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div className="pro-ro-modal-content">
                        <form className="pro-ro-form" onSubmit={handleSubmit}>
                            {/* Basic Request Information */}
                            <div className="pro-ro-form-section">
                                <div className="pro-ro-form-field pro-ro-full-width">
                                    <label htmlFor="title">Title <span style={{color: 'red'}}>*</span></label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title || ''}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter request title"
                                    />
                                </div>

                                <div className="pro-ro-form-field">
                                    <label htmlFor="employeeRequestedBy">Requested By (Employee)</label>
                                    <select
                                        id="employeeRequestedBy"
                                        name="employeeRequestedBy"
                                        value={formData.employeeRequestedBy || ''}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Employee</option>
                                        {Array.isArray(employees) && employees.map(employee => (
                                            <option key={employee.id} value={employee.id}>
                                                {employee.name || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pro-ro-form-field">
                                    <label htmlFor="deadline">Deadline <span style={{color: 'red'}}>*</span></label>
                                    <input
                                        type="datetime-local"
                                        id="deadline"
                                        name="deadline"
                                        value={formData.deadline || ''}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="pro-ro-form-field pro-ro-full-width">
                                    <label htmlFor="description">Description <span style={{color: 'red'}}>*</span></label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter request description"
                                        rows={4}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Request Items */}
                            <div className="pro-ro-form-section">
                                <div className="pro-ro-section-header">
                                    <h3>Request Items</h3>
                                    <button
                                        type="button"
                                        className="pro-ro-add-item-button"
                                        onClick={handleAddItem}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        Add Another Item
                                    </button>
                                </div>

                                {formData.items.map((item, index) => (
                                    <div key={index} className="pro-ro-item-card">
                                        <div className="pro-ro-item-header">
                                            <span>Item {index + 1}</span>
                                            <div className="pro-ro-item-header-actions">
                                                <button
                                                    type="button"
                                                    className={`pro-ro-filter-toggle ${showFilters[index] ? 'active' : ''}`}
                                                    onClick={() => toggleFilters(index)}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                    </svg>
                                                    {showFilters[index] ? 'Hide Filters' : 'Filter Categories'}
                                                </button>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="pro-ro-remove-button"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12" />
                                                        </svg>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* COLLAPSIBLE FILTERS */}
                                        {showFilters[index] && (
                                            <div
                                                className="pro-ro-collapsible-filters"
                                                data-filter-index={index}
                                            >
                                                <div className="pro-ro-filters-header">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                    </svg>
                                                    <h4>Category Filters</h4>
                                                </div>

                                                <div className="pro-ro-filters-content">
                                                    <div className="pro-ro-form-field">
                                                        <label>Parent Category</label>
                                                        <select
                                                            value={item.parentCategoryId || ''}
                                                            onChange={(e) => handleItemChange(index, 'parentCategoryId', e.target.value)}
                                                        >
                                                            <option value="">All Categories</option>
                                                            {parentCategories.map((category) => (
                                                                <option key={category.id} value={category.id}>
                                                                    {category.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="pro-ro-form-helper-text">
                                                            Choose a parent category to filter item types
                                                        </span>
                                                    </div>

                                                    <div className="pro-ro-form-field">
                                                        <label>Child Category</label>
                                                        <select
                                                            value={item.itemCategoryId || ''}
                                                            onChange={(e) => handleItemChange(index, 'itemCategoryId', e.target.value)}
                                                            disabled={!item.parentCategoryId}
                                                        >
                                                            <option value="">All child categories</option>
                                                            {(childCategoriesByItem[index] || []).map((category) => (
                                                                <option key={category.id} value={category.id}>
                                                                    {category.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="pro-ro-form-helper-text">
                                                            {!item.parentCategoryId ? (
                                                                "Select a parent category first"
                                                            ) : (childCategoriesByItem[index] || []).length === 0 ? (
                                                                "No child categories found for the selected parent category"
                                                            ) : (
                                                                "Optional - leave empty to show all from parent"
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pro-ro-item-fields">
                                            <div className="pro-ro-form-field">
                                                <label>Item Type <span style={{color: 'red'}}>*</span></label>
                                                <select
                                                    value={item.itemTypeId || ''}
                                                    onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                    required
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

                                            <div className="pro-ro-form-field">
                                                <label>Quantity <span style={{color: 'red'}}>*</span></label>
                                                <div className="pro-ro-quantity-unit-container">
                                                    <input
                                                        type="number"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        min="0.01"
                                                        step="0.01"
                                                        required
                                                        className="pro-ro-quantity-input"
                                                    />
                                                    {item.itemTypeId && Array.isArray(itemTypes) && (
                                                        <span className="pro-ro-unit-label">
                                                            {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pro-ro-form-field pro-ro-full-width">
                                            <label>Comment (Optional)</label>
                                            <input
                                                type="text"
                                                value={item.comment || ''}
                                                onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                                                placeholder="Add any additional details about this item"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Site and Warehouse Selection */}
                            <div className="pro-ro-form-section">
                                <div className="pro-ro-section-header">
                                    <h3>Requester Information</h3>
                                </div>

                                <div className="pro-ro-form-field">
                                    <label htmlFor="site">Site <span style={{color: 'red'}}>*</span></label>
                                    <select
                                        id="site"
                                        name="siteId"
                                        value={formData.siteId || ''}
                                        onChange={handleSiteChange}
                                        required
                                    >
                                        <option value="">Select Site</option>
                                        {Array.isArray(sites) && sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.name || 'Unknown Site'}</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.siteId && (
                                    <div className="pro-ro-form-field">
                                        <label htmlFor="requesterId">Select Warehouse <span style={{color: 'red'}}>*</span></label>
                                        <select
                                            id="requesterId"
                                            name="requesterId"
                                            value={formData.requesterId || ''}
                                            onChange={handleWarehouseChange}
                                            required
                                        >
                                            <option value="">Select Warehouse</option>
                                            {Array.isArray(warehouses) && warehouses.map(warehouse => (
                                                <option key={warehouse.id} value={warehouse.id}>
                                                    {warehouse.name || 'Unknown Warehouse'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {formData.requesterId && (
                                    <div className="pro-ro-form-field pro-ro-selected-requester">
                                        <span className="pro-ro-requester-label">Selected Warehouse:</span>
                                        <span className="pro-ro-requester-value">{formData.requesterName}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pro-ro-modal-footer">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCloseAttempt}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {isEditMode ? 'Update Request' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Discard Changes Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All changes will be lost."
                confirmText="Discard Changes"
                cancelText="Keep Editing"
                onConfirm={handleDiscardChanges}
                onCancel={() => setShowDiscardDialog(false)}
                size="medium"
            />
        </>
    );
};

export default IncomingRequestOrderFormModal;