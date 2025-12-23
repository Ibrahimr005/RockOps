import React, { useState, useEffect } from 'react';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './RequestOrderFormModal.scss';

const RequestOrderFormModal = ({
                                   isOpen,
                                   onClose,
                                   onSubmit,
                                   isEditMode = false,
                                   initialFormData,
                                   warehouseId,
                                   itemTypes,
                                   employees,
                                   parentCategories,
                                   onShowSnackbar
                               }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
        deadline: '',
        employeeRequestedBy: '',
    });

    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});
    const [showFilters, setShowFilters] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Track initial form state for comparison
    const [initialFormState, setInitialFormState] = useState(null);

    // Initialize form data when modal opens or initialFormData changes
    useEffect(() => {
        if (isOpen && initialFormData) {
            setFormData(initialFormData);
            setInitialFormState(JSON.stringify(initialFormData));
            setHasUnsavedChanges(false);
        } else if (isOpen && !initialFormData) {
            const defaultData = {
                title: '',
                description: '',
                items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
                deadline: '',
                employeeRequestedBy: '',
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

    const fetchChildCategories = async (parentCategoryId, itemIndex) => {
        if (!parentCategoryId) {
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
            return;
        }

        try {
            const { itemCategoryService } = await import('../../../../services/warehouse/itemCategoryService');
            const data = await itemCategoryService.getChildrenByParent(parentCategoryId);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: data
            }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
        }
    };

    const getFilteredItemTypes = (itemIndex) => {
        const item = formData.items[itemIndex];
        if (!item) return itemTypes;

        if (item.itemCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.id === item.itemCategoryId
            );
        }

        if (item.parentCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === item.parentCategoryId
            );
        }

        return itemTypes;
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
                    setChildCategoriesByItem(prev => ({
                        ...prev,
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
            items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
            deadline: '',
            employeeRequestedBy: '',
        });
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
            <div className="warehouse-request-modal-backdrop" onClick={handleOverlayClick}>
                <div className="warehouse-request-modal">
                    <div className="warehouse-request-modal-header">
                        <h2>{isEditMode ? 'Edit Request' : 'Create New Request'}</h2>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                        </button>
                    </div>

                    <div className="warehouse-request-modal-content">
                        <form className="warehouse-request-form" onSubmit={handleSubmit}>
                            {/* Basic Request Information */}
                            <div className="warehouse-request-form-section">
                                <div className="warehouse-request-form-field warehouse-request-full-width">
                                    <label htmlFor="title">Title <span style={{ color: 'red' }}>*</span></label>
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

                                <div className="warehouse-request-form-field">
                                    <label htmlFor="deadline">Deadline <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="datetime-local"
                                        id="deadline"
                                        name="deadline"
                                        value={formData.deadline || ''}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="warehouse-request-form-field">
                                    <label htmlFor="employeeRequestedBy">Employee Requested By</label>
                                    <select
                                        id="employeeRequestedBy"
                                        name="employeeRequestedBy"
                                        value={formData.employeeRequestedBy || ''}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(employee => (
                                            <option key={employee.id} value={employee.id}>
                                                {employee.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="warehouse-request-form-field warehouse-request-full-width">
                                    <label htmlFor="description">Description <span style={{ color: 'red' }}>*</span></label>
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
                            <div className="warehouse-request-form-section">
                                <div className="warehouse-request-section-header">
                                    <h3>Request Items</h3>
                                    <button
                                        type="button"
                                        className="warehouse-request-add-item-button"
                                        onClick={handleAddItem}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        Add Another Item
                                    </button>
                                </div>

                                {formData.items.map((item, index) => (
                                    <div key={index} className="warehouse-request-item-card">
                                        <div className="warehouse-request-item-header">
                                            <span>Item {index + 1}</span>
                                            <div className="warehouse-request-item-header-actions">
                                                <button
                                                    type="button"
                                                    className={`warehouse-request-filter-toggle ${showFilters[index] ? 'active' : ''}`}
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
                                                        className="warehouse-request-remove-button"
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
                                                className="warehouse-request-collapsible-filters"
                                                data-filter-index={index}
                                            >
                                                <div className="warehouse-request-filters-header">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                    </svg>
                                                    <h4>Category Filters</h4>
                                                </div>

                                                <div className="warehouse-request-filters-content">
                                                    <div className="warehouse-request-form-field">
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
                                                        <span className="form-helper-text">
                                                            Choose a parent category to filter item types
                                                        </span>
                                                    </div>

                                                    <div className="warehouse-request-form-field">
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
                                                        <span className="form-helper-text">
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

                                        {/* MAIN ITEM FIELDS */}
                                        <div className="warehouse-request-item-fields">
                                            <div className="warehouse-request-form-field">
                                                <label>Item Type <span style={{ color: 'red' }}>*</span></label>
                                                <select
                                                    value={item.itemTypeId || ''}
                                                    onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Item Type</option>
                                                    {getFilteredItemTypes(index)
                                                        .filter(type =>
                                                            type.id === item.itemTypeId ||
                                                            !formData.items.some(i => i !== item && i.itemTypeId === type.id)
                                                        )
                                                        .map(type => (
                                                            <option key={type.id} value={type.id}>{type.name}</option>
                                                        ))}
                                                </select>
                                            </div>

                                            <div className="warehouse-request-form-field">
                                                <label>Quantity <span style={{ color: 'red' }}>*</span></label>
                                                <div className="warehouse-request-quantity-unit-container">
                                                    <input
                                                        type="number"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        min="0.01"
                                                        step="0.01"
                                                        required
                                                        className="warehouse-request-quantity-input"
                                                    />
                                                    {item.itemTypeId && (
                                                        <span className="warehouse-request-unit-label">
                                                            {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="warehouse-request-form-field warehouse-request-full-width">
                                            <label>Comment</label>
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

                            <div className="warehouse-request-modal-footer">
                                <button
                                    type="submit"
                                    className="warehouse-request-submit-button"
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

export default RequestOrderFormModal;