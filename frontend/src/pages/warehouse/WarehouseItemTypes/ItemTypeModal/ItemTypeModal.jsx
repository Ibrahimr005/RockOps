import React, { useState, useEffect, useRef } from "react";
import "./ItemTypeModal.scss";

const ItemTypeModal = ({
                           isOpen,
                           onClose,
                           selectedItem,
                           categories,
                           onSubmit
                       }) => {
    const modalRef = useRef(null);
    const [formData, setFormData] = useState({
        name: "",
        itemCategory: "",
        minQuantity: '',
        measuringUnit: "",
        serialNumber: "",
        basePrice: '',
        status: "AVAILABLE",
        comment: ""
    });

    // Initialize form data when modal opens or selected item changes
    useEffect(() => {
        if (selectedItem) {
            setFormData({
                name: selectedItem.name,
                itemCategory: selectedItem.itemCategory ? selectedItem.itemCategory.id : "",
                minQuantity: selectedItem.minQuantity,
                measuringUnit: selectedItem.measuringUnit,
                serialNumber: selectedItem.serialNumber,
                basePrice: selectedItem.basePrice || '',
                status: selectedItem.status,
                comment: selectedItem.comment
            });
        } else {
            setFormData({
                name: "",
                itemCategory: "",
                minQuantity: '',
                measuringUnit: "",
                serialNumber: "",
                basePrice: '',
                status: "AVAILABLE",
                comment: ""
            });
        }
    }, [selectedItem, isOpen]);

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

        if (name === "minQuantity") {
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
        <div className="modal-backdrop-item-type">
            <div className="modal-item-type" ref={modalRef}>
                <div className="modal-header-item-type">
                    <h2>{selectedItem ? 'Edit Item Type' : 'Add New Item Type'}</h2>
                    <button className="close-modal" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Category Info Card */}
                <div className="category-info-card-modal">
                    <div className="category-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="category-info-content">
                        <h3>Categories Available</h3>
                        <p>
                            Only child categories are shown in the dropdown below.
                            If you need to create a new category, please go to the Categories section first.
                        </p>
                    </div>
                </div>

                <form className="form-item-type" onSubmit={handleSubmit}>
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
                            <label htmlFor="itemCategory">Category <span className="required">*</span></label>
                            <select
                                id="itemCategory"
                                name="itemCategory"
                                value={formData.itemCategory}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="" disabled>Select category</option>
                                {categories && categories.length > 0 ? (
                                    categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Loading categories...</option>
                                )}
                            </select>
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

                    <div className="form-row">
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
                    </div>

                    <div className="modal-footer-item-type">
                        <button type="submit" className="btn-primary">
                            {selectedItem ? 'Update Item Type' : 'Add Item Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ItemTypeModal;