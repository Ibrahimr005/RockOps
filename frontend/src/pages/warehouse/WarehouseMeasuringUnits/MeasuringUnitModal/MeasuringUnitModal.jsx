import React, { useState, useEffect, useRef } from "react";
import "./MeasuringUnitModal.scss";

const MeasuringUnitModal = ({
                                isOpen,
                                onClose,
                                selectedUnit,
                                onSubmit
                            }) => {
    const modalRef = useRef(null);
    const [formData, setFormData] = useState({
        name: "",
        displayName: "",
        abbreviation: "",
        isActive: true
    });

    // Initialize form data when modal opens or selected unit changes
    useEffect(() => {
        if (selectedUnit) {
            setFormData({
                name: selectedUnit.name || "",
                displayName: selectedUnit.displayName || "",
                abbreviation: selectedUnit.abbreviation || "",
                isActive: selectedUnit.isActive !== undefined ? selectedUnit.isActive : true
            });
        } else {
            setFormData({
                name: "",
                displayName: "",
                abbreviation: "",
                isActive: true
            });
        }
    }, [selectedUnit, isOpen]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                // Only close if clicking on the backdrop itself
                if (event.target.classList.contains('modal-backdrop')) {
                    onClose();
                }
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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            name: formData.name.trim(),
            displayName: formData.displayName.trim() || formData.name.trim(),
            abbreviation: formData.abbreviation.trim() || formData.name.trim(),
            isActive: formData.isActive
        };

        onSubmit(payload, selectedUnit);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" style={{ zIndex: 1060 }}>
            <div className="modal-container modal-md" ref={modalRef}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                        {selectedUnit ? 'Edit Measuring Unit' : 'Add New Measuring Unit'}
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    <div className="modal-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                            <strong>About Measuring Units</strong>
                            <p style={{ margin: 0, marginTop: '0.25rem' }}>
                                Define standardized units of measurement (e.g., kg, liters, pieces) to ensure consistency across your inventory.
                            </p>
                        </div>
                    </div>

                    <form id="measuring-unit-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Unit Name <span className="required">*</span></label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., kilogram, liter, piece"
                                required
                            />
                            <small className="form-hint">This is the unique identifier for the unit</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="displayName">Display Name</label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                placeholder="e.g., Kilogram, Liter, Piece"
                            />
                            <small className="form-hint">Optional: Friendly name for display (defaults to unit name)</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="abbreviation">Abbreviation</label>
                            <input
                                type="text"
                                id="abbreviation"
                                name="abbreviation"
                                value={formData.abbreviation}
                                onChange={handleInputChange}
                                placeholder="e.g., kg, L, pcs"
                            />
                            <small className="form-hint">Optional: Short form (defaults to unit name)</small>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                />
                                <span>Active</span>
                            </label>
                            <small className="form-hint">Inactive units won't appear in dropdowns</small>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button type="button" className="modal-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" form="measuring-unit-form" className="btn-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {selectedUnit ? 'Update Unit' : 'Add Unit'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeasuringUnitModal;