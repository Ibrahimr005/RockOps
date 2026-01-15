import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiCheck, FiTrash2, FiPackage } from 'react-icons/fi';
import './ModifyRequestItemsModal.scss';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { offerRequestItemService } from '../../../../../services/procurement/offerRequestItemService.js';
import { itemCategoryService } from '../../../../../services/warehouse/itemCategoryService.js';

const ModifyRequestItemsModal = ({
                                     isVisible,
                                     onClose,
                                     offer,
                                     onSuccess,
                                     itemTypes,
                                     onShowSnackbar
                                 }) => {
    const [requestItems, setRequestItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Categories for filtering
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategories, setChildCategories] = useState([]);

    // Form state for editing
    const [editFormData, setEditFormData] = useState({});

    // Form state for adding (includes filter fields)
    const [addFormData, setAddFormData] = useState({
        itemTypeId: '',
        quantity: '',
        parentCategoryId: '',
        childCategoryId: ''
    });

    // Confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        if (isVisible && offer) {
            loadRequestItems();
            fetchParentCategories();
            setIsInitialized(false); // Reset initialization state when modal opens
        }
    }, [isVisible, offer]);

    // Fetch child categories when parent category changes
    useEffect(() => {
        if (addFormData.parentCategoryId) {
            fetchChildCategories(addFormData.parentCategoryId);
        } else {
            setChildCategories([]);
        }
    }, [addFormData.parentCategoryId]);

    const fetchParentCategories = async () => {
        try {
            const categories = await itemCategoryService.getParents();
            setParentCategories(categories);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            setParentCategories([]);
        }
    };

    const fetchChildCategories = async (parentCategoryId) => {
        try {
            const allCategories = await itemCategoryService.getChildren();
            const filtered = allCategories.filter(cat =>
                cat.parentCategory?.id === parentCategoryId
            );
            setChildCategories(filtered);
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategories([]);
        }
    };

    const loadRequestItems = async () => {
        try {
            setIsLoading(true);
            const items = await offerRequestItemService.getEffectiveRequestItems(offer.id);
            setRequestItems(items);
            return items; // RETURN the items
        } catch (error) {
            console.error('Error loading request items:', error);
            if (onShowSnackbar) onShowSnackbar('error', 'Failed to load request items');
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = async (item) => {
        // Initialize if needed before editing
        const initialized = await ensureInitialized();
        if (!initialized) return;

        // After initialization, requestItems already has the fresh data with correct IDs
        // Just find the item by itemTypeId
        const currentItem = requestItems.find(i => i.itemTypeId === item.itemTypeId);

        if (!currentItem) {
            if (onShowSnackbar) onShowSnackbar('error', 'Item not found');
            return;
        }

        setEditingItemId(currentItem.id);  // Use the CURRENT id, not the old one
        setEditFormData({
            [currentItem.id]: {
                quantity: currentItem.quantity
            }
        });
        setShowAddForm(false);
    };

    // Helper function to check if items need initialization
    const needsInitialization = () => {
        return requestItems.some(item => item.id === item.originalRequestOrderItemId);
    };

    // Helper function to initialize if needed
    const ensureInitialized = async () => {
        if (isInitialized) return true; // Already initialized in this session

        if (needsInitialization()) {
            try {
                setIsLoading(true);
                const initializedItems = await offerRequestItemService.initializeModifiedItems(offer.id);
                setRequestItems(initializedItems);
                setIsInitialized(true);
                if (onShowSnackbar) onShowSnackbar('success', 'Items prepared for editing');
                return true;
            } catch (error) {
                console.error('Error initializing items:', error);
                if (onShowSnackbar) onShowSnackbar('error', 'Failed to prepare items for editing');
                return false;
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsInitialized(true);
            return true;
        }
    };

    const handleAddClick = async () => {
        // Initialize if needed before adding
        const initialized = await ensureInitialized();
        if (!initialized) return;

        setAddFormData({ itemTypeId: '', quantity: '', parentCategoryId: '', childCategoryId: '' });
        setShowAddForm(true);
        setEditingItemId(null);
    };


    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditFormData({});
    };

    const handleSaveEdit = async (item) => {
        console.log("=== ATTEMPTING TO SAVE ===");
        console.log("Item ID being sent:", item.id);
        console.log("Full item object:", item);
        console.log("editFormData:", editFormData);
        console.log("editFormData[item.id]:", editFormData[item.id]);

        const updatedData = editFormData[item.id];

        const quantityNum = parseFloat(updatedData?.quantity);
        if (!updatedData || !updatedData.quantity || quantityNum <= 0 || isNaN(quantityNum)) {
            if (onShowSnackbar) onShowSnackbar('error', 'Please enter a valid quantity greater than 0');
            return;
        }

        try {
            setIsLoading(true);

            console.log("API Call - Offer ID:", offer.id);
            console.log("API Call - Item ID:", item.id);
            console.log("API Call - Payload:", {
                itemTypeId: item.itemTypeId,
                quantity: quantityNum,
                comment: item.comment || null
            });

            await offerRequestItemService.updateRequestItem(offer.id, item.id, {
                itemTypeId: item.itemTypeId,
                quantity: quantityNum,
                comment: item.comment || null
            });

            if (onShowSnackbar) onShowSnackbar('success', 'Item updated successfully');
            await loadRequestItems();
            setEditingItemId(null);
            setEditFormData({});

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error updating item:', error);
            if (onShowSnackbar) onShowSnackbar('error', 'Failed to update item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = async (item) => {
        // Initialize if needed before deleting
        const initialized = await ensureInitialized();
        if (!initialized) return;

        const itemTypeName = item.itemTypeName || 'this item';
        setConfirmDialog({
            show: true,
            title: 'Delete Request Item',
            message: `Are you sure you want to delete "${itemTypeName}"? This will also delete all associated procurement solutions.`,
            onConfirm: () => handleDeleteConfirm(item)
        });
    };

    const handleDeleteConfirm = async (item) => {
        try {
            await offerRequestItemService.deleteRequestItem(offer.id, item.id);
            await loadRequestItems();
            if (onShowSnackbar) onShowSnackbar('success', 'Item deleted successfully');
            setConfirmDialog({ ...confirmDialog, show: false });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error deleting item:', error);
            if (onShowSnackbar) onShowSnackbar('error', 'Failed to delete item');
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();

        // Validate quantity
        const quantityNum = parseFloat(addFormData.quantity);
        if (!addFormData.itemTypeId || !addFormData.quantity || quantityNum <= 0 || isNaN(quantityNum)) {
            if (onShowSnackbar) onShowSnackbar('error', 'Please enter a valid item type and quantity greater than 0');
            return;
        }

        try {
            setIsLoading(true);
            // Only send itemTypeId and quantity - not the filter fields
            await offerRequestItemService.addRequestItem(offer.id, {
                itemTypeId: addFormData.itemTypeId,
                quantity: quantityNum
            });

            if (onShowSnackbar) onShowSnackbar('success', 'Item added successfully');
            await loadRequestItems();
            setShowAddForm(false);
            setAddFormData({ itemTypeId: '', quantity: '', parentCategoryId: '', childCategoryId: '' });

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error adding item:', error);
            if (onShowSnackbar) onShowSnackbar('error', 'Failed to add item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setShowAddForm(false);
        setEditingItemId(null);
        setEditFormData({});
        setAddFormData({ itemTypeId: '', quantity: '', parentCategoryId: '', childCategoryId: '' });
        onClose();
    };

    const updateEditQuantity = (itemId, value) => {
        setEditFormData({
            ...editFormData,
            [itemId]: {
                quantity: value
            }
        });
    };

    // Filter item types based on selected categories
    const getFilteredItemTypes = () => {
        if (!itemTypes || !Array.isArray(itemTypes)) return [];

        let filtered = itemTypes;

        // Filter by child category if selected
        if (addFormData.childCategoryId) {
            filtered = filtered.filter(type =>
                type.itemCategory?.id === addFormData.childCategoryId
            );
        }
        // Otherwise filter by parent category if selected
        else if (addFormData.parentCategoryId) {
            filtered = filtered.filter(type =>
                type.itemCategory?.parentCategory?.id === addFormData.parentCategoryId
            );
        }

        // Filter out items that are already in the request
        filtered = filtered.filter(type =>
            !requestItems.some(item =>
                item.itemTypeId === type.id || item.itemType?.id === type.id
            )
        );

        return filtered;
    };

    if (!isVisible) return null;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content modal-lg modify-items-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FiPackage />
                        Modify Request Items
                    </h2>
                    <button className="btn-close" onClick={handleClose}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="items-section">
                        <div className="section-header">
                            <h3>Request Items ({requestItems.length})</h3>
                            <button
                                className="btn-add"
                                onClick={handleAddClick}
                                disabled={showAddForm}
                            >
                                <FiPlus /> Add Item
                            </button>
                        </div>

                        {showAddForm && (
                            <form className="add-item-form" onSubmit={handleAddSubmit}>
                                <div className="form-fields">
                                    {/* Category Filters Row */}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Parent Category</label>
                                            <select
                                                value={addFormData.parentCategoryId || ''}
                                                onChange={(e) => {
                                                    setAddFormData({
                                                        ...addFormData,
                                                        parentCategoryId: e.target.value,
                                                        childCategoryId: '',
                                                        itemTypeId: ''
                                                    });
                                                }}
                                            >
                                                <option value="">All Categories</option>
                                                {parentCategories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Child Category</label>
                                            <select
                                                value={addFormData.childCategoryId || ''}
                                                onChange={(e) => {
                                                    setAddFormData({
                                                        ...addFormData,
                                                        childCategoryId: e.target.value,
                                                        itemTypeId: ''
                                                    });
                                                }}
                                                disabled={!addFormData.parentCategoryId}
                                            >
                                                <option value="">All child categories</option>
                                                {childCategories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Item Type and Quantity Row */}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Item Type <span className="required">*</span></label>
                                            <select
                                                value={addFormData.itemTypeId}
                                                onChange={(e) => setAddFormData({ ...addFormData, itemTypeId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select item type...</option>
                                                {getFilteredItemTypes().map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name} ({type.measuringUnit})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Quantity <span className="required">*</span></label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={addFormData.quantity}
                                                onChange={(e) => setAddFormData({ ...addFormData, quantity: e.target.value })}
                                                placeholder="Enter quantity"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setAddFormData({ itemTypeId: '', quantity: '', parentCategoryId: '', childCategoryId: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-save"
                                        disabled={isLoading}
                                    >
                                        <FiCheck /> {isLoading ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="items-list">
                            {isLoading ? (
                                <div className="loading-state">Loading items...</div>
                            ) : requestItems.length === 0 ? (
                                <div className="empty-state">
                                    <FiPackage size={48} />
                                    <p>No request items yet. Click "Add Item" to get started.</p>
                                </div>
                            ) : (
                                requestItems.map(item => (
                                    <div key={item.id} className={`item-card ${editingItemId === item.id ? 'editing' : ''}`}>
                                        <div className="item-icon">
                                            <FiPackage />
                                        </div>
                                        <div className="item-details">
                                            <h4>{item.itemTypeName}</h4>
                                            {editingItemId === item.id ? (
                                                <div className="inline-edit">
                                                    <label>Quantity:</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={editFormData[item.id]?.quantity ?? ''}
                                                        onChange={(e) => updateEditQuantity(item.id, e.target.value)}
                                                        onBlur={(e) => {
                                                            // Restore original if empty or invalid
                                                            if (!e.target.value || parseFloat(e.target.value) <= 0) {
                                                                updateEditQuantity(item.id, item.quantity);
                                                            }
                                                        }}
                                                        className="quantity-input"
                                                    />
                                                    <span className="unit">{item.itemTypeMeasuringUnit}</span>
                                                </div>
                                            ) : (
                                                <p className="quantity">
                                                    Quantity: {item.quantity} {item.itemTypeMeasuringUnit}
                                                </p>
                                            )}
                                        </div>
                                        <div className="item-actions">
                                            {editingItemId === item.id ? (
                                                <>
                                                    <button
                                                        className="btn-icon save"
                                                        onClick={() => handleSaveEdit(item)}
                                                        title="Save"
                                                        disabled={isLoading}
                                                    >
                                                        <FiCheck />
                                                    </button>
                                                    <button
                                                        className="btn-icon cancel"
                                                        onClick={handleCancelEdit}
                                                        title="Cancel"
                                                    >
                                                        <FiX />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="btn-icon edit"
                                                        onClick={() => handleEditClick(item)}
                                                        title="Edit"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="btn-icon delete"
                                                        onClick={() => handleDeleteClick(item)}
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-btn-secondary" onClick={handleClose}>
                        Close
                    </button>
                </div>
            </div>

            <ConfirmationDialog
                isVisible={confirmDialog.show}
                type="delete"
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, show: false })}
            />
        </div>
    );
};

export default ModifyRequestItemsModal;