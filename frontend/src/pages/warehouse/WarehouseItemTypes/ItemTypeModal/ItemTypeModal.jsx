import React, { useState, useEffect, useRef } from "react";
import { itemCategoryService } from "../../../../services/warehouse/itemCategoryService.js";
import "./ItemTypeModal.scss"

const ItemTypeModal = ({
                           isOpen,
                           onClose,
                           selectedItem,
                           onSubmit
                       }) => {
    const modalRef = useRef(null);
    const [formData, setFormData] = useState({
        name: "",
        parentCategory: "",
        itemCategory: "",
        minQuantity: '',
        measuringUnit: "",
        serialNumber: "",
        basePrice: '',
        status: "AVAILABLE",
        comment: ""
    });

    const [parentCategories, setParentCategories] = useState([]);
    const [childCategories, setChildCategories] = useState([]);
    const [allChildCategories, setAllChildCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Fetch parent categories and all child categories on mount
    useEffect(() => {
        if (isOpen) {
            fetchParentCategories();
            fetchAllChildCategories();
        }
    }, [isOpen]);

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            setParentCategories([]);
        }
    };

    const fetchAllChildCategories = async () => {
        setLoadingCategories(true);
        try {
            const data = await itemCategoryService.getChildren();
            const children = Array.isArray(data) ? data : [];
            setAllChildCategories(children);
            setChildCategories(children); // Show all by default
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setAllChildCategories([]);
            setChildCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    const filterChildCategories = (parentCategoryId) => {
        if (!parentCategoryId) {
            // No parent selected - show all child categories
            setChildCategories(allChildCategories);
        } else {
            // Filter by parent
            const filteredChildren = allChildCategories.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategories(filteredChildren);
        }
    };

    // Initialize form data when modal opens or selected item changes
    useEffect(() => {
        if (selectedItem) {
            const parentCatId = selectedItem.itemCategory?.parentCategory?.id || "";
            setFormData({
                name: selectedItem.name,
                parentCategory: parentCatId,
                itemCategory: selectedItem.itemCategory ? selectedItem.itemCategory.id : "",
                minQuantity: selectedItem.minQuantity,
                measuringUnit: selectedItem.measuringUnit,
                serialNumber: selectedItem.serialNumber,
                basePrice: selectedItem.basePrice || '',
                status: selectedItem.status,
                comment: selectedItem.comment
            });
            // Filter child categories for the parent (or show all if no parent)
            if (parentCatId && allChildCategories.length > 0) {
                filterChildCategories(parentCatId);
            }
        } else {
            setFormData({
                name: "",
                parentCategory: "",
                itemCategory: "",
                minQuantity: '',
                measuringUnit: "",
                serialNumber: "",
                basePrice: '',
                status: "AVAILABLE",
                comment: ""
            });
        }
    }, [selectedItem, isOpen, allChildCategories]);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "parentCategory") {
            setFormData(prev => ({
                ...prev,
                parentCategory: value,
                itemCategory: "" // Reset child category when parent changes
            }));
            filterChildCategories(value);
        } else if (name === "minQuantity") {
            const numValue = value === '' ? '' : Math.max(1, parseInt(value, 10) || 1);
            setFormData(prev => ({
                ...prev,
                [name]: numValue
            }));
        } else if (name === "basePrice") {
            const numValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
            setFormData(prev => ({
                ...prev,
                [name]: numValue
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

        const payload = {
            name: formData.name.trim(),
            itemCategory: formData.itemCategory,
            minQuantity: parseInt(formData.minQuantity),
            measuringUnit: formData.measuringUnit.trim(),
            serialNumber: formData.serialNumber.trim(),
            basePrice: formData.basePrice !== '' ? parseFloat(formData.basePrice) : null,
            status: formData.status || "AVAILABLE",
            comment: formData.comment?.trim() || ""
        };

        onSubmit(payload, selectedItem);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container modal-lg" ref={modalRef}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {selectedItem ? 'Edit Item Type' : 'Add New Item Type'}
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* Category Info Card */}
                    <div className="modal-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                            <strong>Categories</strong>
                            <p style={{ margin: 0, marginTop: '0.25rem' }}>
                                Select a parent category first to filter the available child categories.
                                If you need to create a new category, please go to the Categories section first.
                            </p>
                        </div>
                    </div>

                    <form id="item-type-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Item Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter item name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="parentCategory">Parent Category</label>
                                <select
                                    id="parentCategory"
                                    name="parentCategory"
                                    value={formData.parentCategory}
                                    onChange={handleInputChange}
                                >
                                    <option value="">All Categories</option>
                                    {parentCategories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="itemCategory">Child Category <span className="required">*</span></label>
                                <select
                                    id="itemCategory"
                                    name="itemCategory"
                                    value={formData.itemCategory}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loadingCategories}
                                >
                                    <option value="" disabled>
                                        {loadingCategories
                                            ? 'Loading...'
                                            : 'Select child category'}
                                    </option>
                                    {childCategories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="measuringUnit">Unit <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="measuringUnit"
                                    name="measuringUnit"
                                    value={formData.measuringUnit}
                                    onChange={handleInputChange}
                                    placeholder="e.g. pieces, kg, litres"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="minQuantity">Minimum Quantity <span className="required">*</span></label>
                                <input
                                    type="number"
                                    id="minQuantity"
                                    name="minQuantity"
                                    value={formData.minQuantity === 0 ? '' : formData.minQuantity}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="Enter minimum quantity"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="basePrice">Base Price (EGP)</label>
                                <input
                                    type="number"
                                    id="basePrice"
                                    name="basePrice"
                                    value={formData.basePrice === 0 ? '' : formData.basePrice}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter base price"
                                />
                            </div>
                        </div>


                            <div className="form-group">
                                <label htmlFor="serialNumber">Serial Number</label>
                                <input
                                    type="text"
                                    id="serialNumber"
                                    name="serialNumber"
                                    value={formData.serialNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter serial number"
                                />
                            </div>


                        <div className="form-group">
                            <label htmlFor="comment">Comment</label>
                            <textarea
                                id="comment"
                                name="comment"
                                value={formData.comment}
                                onChange={handleInputChange}
                                placeholder="Enter comment (optional)"
                                rows="3"
                            ></textarea>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button type="button" className="modal-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" form="item-type-form" className="btn-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {selectedItem ? 'Update Item Type' : 'Add Item Type'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemTypeModal;