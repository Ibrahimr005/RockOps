import React, { useState, useEffect, useRef } from "react";
import { itemTypeService } from '../../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../../services/warehouse/itemCategoryService';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const AddItemModal = ({
                          isOpen,
                          onClose,
                          onSubmit,
                          loading
                      }) => {
    const modalRef = useRef(null);

    const [formData, setFormData] = useState({
        parentCategoryId: "",
        itemCategoryId: "",
        itemTypeId: "",
        initialQuantity: "",
        createdAt: new Date().toISOString().split('T')[0]
    });

    const [parentCategories, setParentCategories] = useState([]);
    const [childCategories, setChildCategories] = useState([]);
    const [allChildCategories, setAllChildCategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        if (isOpen) {
            fetchParentCategories();
            fetchAllChildCategories();
            fetchItemTypes();
            // Reset form
            setFormData({
                parentCategoryId: "",
                itemCategoryId: "",
                itemTypeId: "",
                initialQuantity: "",
                createdAt: new Date().toISOString().split('T')[0]
            });
        }
    }, [isOpen]);

    // Handle body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => document.body.classList.remove("modal-open");
    }, [isOpen]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch parent categories:", error);
            setParentCategories([]);
        }
    };

    const fetchAllChildCategories = async () => {
        setLoadingCategories(true);
        try {
            const data = await itemCategoryService.getChildren();
            const children = Array.isArray(data) ? data : [];
            setAllChildCategories(children);
            setChildCategories(children);
        } catch (error) {
            console.error("Failed to fetch child categories:", error);
            setAllChildCategories([]);
            setChildCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch item types:", error);
            setItemTypes([]);
        }
    };

    const filterChildCategories = (parentCategoryId) => {
        if (!parentCategoryId) {
            setChildCategories(allChildCategories);
        } else {
            const filteredChildren = allChildCategories.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategories(filteredChildren);
        }
    };

    const getFilteredItemTypes = () => {
        if (formData.itemCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.id === formData.itemCategoryId
            );
        }
        if (formData.parentCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === formData.parentCategoryId
            );
        }
        return itemTypes;
    };

    const handleInputChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;

        if (name === 'parentCategoryId') {
            setFormData(prev => ({
                ...prev,
                parentCategoryId: value,
                itemCategoryId: "",
                itemTypeId: ""
            }));
            filterChildCategories(value);
        } else if (name === 'itemCategoryId') {
            setFormData(prev => ({
                ...prev,
                itemCategoryId: value,
                itemTypeId: ""
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

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
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCloseAttempt(); }}>
            <div className="modal-container modal-lg" ref={modalRef}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add New Item
                    </h2>
                    <button className="btn-close" onClick={handleCloseAttempt}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    <form id="add-item-form" onSubmit={handleSubmit}>
                        {/* Category Filters Section */}
                        <div className="modal-section">

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="parentCategoryId">Parent Category</label>
                                    <select
                                        id="parentCategoryId"
                                        name="parentCategoryId"
                                        value={formData.parentCategoryId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">All Parent Categories</option>
                                        {parentCategories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="itemCategoryId">Child Category</label>
                                    <select
                                        id="itemCategoryId"
                                        name="itemCategoryId"
                                        value={formData.itemCategoryId}
                                        onChange={handleInputChange}
                                        disabled={loadingCategories}
                                    >
                                        <option value="">
                                            {loadingCategories ? 'Loading...' : 'All Child Categories'}
                                        </option>
                                        {childCategories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Item Details Section */}
                        <div className="modal-section">


                            <div className="form-group">
                                <label htmlFor="itemTypeId">Item Type <span className="required">*</span></label>
                                <select
                                    id="itemTypeId"
                                    name="itemTypeId"
                                    value={formData.itemTypeId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="" disabled>Select Item Type</option>
                                    {getFilteredItemTypes().map((itemType) => (
                                        <option key={itemType.id} value={itemType.id}>
                                            {itemType.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="initialQuantity">Quantity <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        id="initialQuantity"
                                        name="initialQuantity"
                                        value={formData.initialQuantity}
                                        onChange={handleInputChange}
                                        placeholder="Enter quantity"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="createdAt">Entry Date <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        id="createdAt"
                                        name="createdAt"
                                        value={formData.createdAt}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Notice */}
                        <div className="modal-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <div>
                                <strong>Awaiting Finance Approval</strong>
                                <p style={{ margin: 0, marginTop: '0.25rem' }}>
                                    This item will be pending until the finance team approves and sets its price.
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button type="button" className="modal-btn-secondary" onClick={handleCloseAttempt}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-item-form"
                        className="btn-success"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg className="spinner" viewBox="0 0 24 24" width="16" height="16">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round" />
                                </svg>
                                Adding...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add Item
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default AddItemModal;