import React, { useState, useEffect } from 'react';
import './MerchantModal.scss';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';

const MerchantModal = ({
                           showAddModal,
                           modalMode,
                           formData,
                           handleInputChange,
                           handleFileChange,
                           previewImage,
                           sites,
                           handleCloseModals,
                           handleAddMerchant,
                           handleUpdateMerchant
                       }) => {
    const [errors, setErrors] = useState({});
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        if (showAddModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showAddModal]);

    // Handle form input changes
    const handleChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        handleInputChange(e);

        // Clear error for this field
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    // Handle number input changes (for financial fields)
    const handleNumberChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        // Allow empty value or valid number
        if (value === '' || !isNaN(parseFloat(value))) {
            const event = {
                target: { name, value }
            };
            handleInputChange(event);
        }
    };

    // Handle file input change
    const handleFileInputChange = (e) => {
        setIsFormDirty(true);
        // Clear any previous errors for photo
        if (errors.photo) {
            setErrors({
                ...errors,
                photo: null
            });
        }
        handleFileChange(e);
    };

    // Validate form
    // Validate form
    const validateForm = () => {
        console.log('Validating formData:', formData);
        console.log('merchantTypes:', formData.merchantTypes);
        const newErrors = {};

        // Required fields
        if (!formData.name) newErrors.name = 'Merchant name is required';
        if (!formData.merchantTypes || formData.merchantTypes.length === 0) {
            newErrors.merchantType = 'At least one merchant type is required';
        }
        if (!formData.contactPersonName) newErrors.contactPersonName = 'Contact person name is required';
        if (!formData.contactEmail) newErrors.contactEmail = 'Contact email is required';
        if (!formData.contactPhone) newErrors.contactPhone = 'Contact phone is required';
        if (!formData.address) newErrors.address = 'Address is required';

        // Email validation
        if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Email is invalid';
        }

        // Phone validation
        if (formData.contactPhone && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(formData.contactPhone)) {
            newErrors.contactPhone = 'Phone number is invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
// Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate form before submitting
        if (!validateForm()) {
            return; // Stop submission if validation fails
        }

        if (modalMode === 'add') {
            handleAddMerchant(e);
        } else {
            handleUpdateMerchant(e);
        }
    };

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            handleCloseModals();
        }
    };

    if (!showAddModal) return null;

    return (
        <>
        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); handleCloseModals(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        <div className="proc-merchant-modal-overlay"  onClick={handleOverlayClick}>
            <div className="proc-merchant-employee-modal">
                <div className="proc-merchant-modal-header">
                    <h2>{modalMode === 'add' ? 'Add New Merchant' : 'Edit Merchant'}</h2>
                    <button className="proc-merchant-close-button" onClick={handleCloseAttempt}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="proc-merchant-modal-body">
                        <div className="proc-merchant-form-columns">
                            {/* Company Information Column */}
                            <div className="proc-merchant-form-column">
                                <h3>Company Information</h3>

                                <div className="proc-merchant-logo-section">
                                    <label className="proc-merchant-logo-upload-area">
                                        <input
                                            type="file"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileInputChange}
                                            style={{ display: 'none' }}
                                        />
                                        {previewImage ? (
                                            <div className="proc-merchant-logo-preview">
                                                <img src={previewImage} alt="Company logo" />
                                                <div className="proc-merchant-logo-overlay">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                                        <polyline points="17,8 12,3 7,8"/>
                                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                                    </svg>
                                                    <span>Change Logo</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="proc-merchant-logo-placeholder">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                                    <polyline points="17,8 12,3 7,8"/>
                                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                                </svg>
                                                <span>Upload Logo</span>
                                            </div>
                                        )}
                                    </label>
                                    {errors.photo && (
                                        <div className="proc-merchant-error-message">{errors.photo}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Merchant Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={errors.name ? 'error' : ''}
                                        placeholder="Enter company name"
                                        required
                                    />
                                    {errors.name && (
                                        <div className="proc-merchant-error-message">{errors.name}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Merchant Types</label>
                                    <select
                                        name="merchantType"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const currentTypes = formData.merchantTypes || [];
                                                if (!currentTypes.includes(e.target.value)) {
                                                    const newTypes = [...currentTypes, e.target.value];
                                                    handleInputChange({ target: { name: 'merchantTypes', value: newTypes } });
                                                }
                                            }
                                        }}
                                        className={errors.merchantType ? 'error' : ''}
                                    >
                                        <option value="">Select Merchant Type</option>
                                        <option value="SUPPLIER">Supplier</option>
                                        <option value="SERVICE">Service</option>
                                    </select>

                                    {formData.merchantTypes && formData.merchantTypes.length > 0 && (
                                        <div className="proc-merchant-type-tags">
                                            {formData.merchantTypes.map(type => (
                                                <span key={type} className="proc-merchant-type-tag">
                    {type}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTypes = formData.merchantTypes.filter(t => t !== type);
                                                            handleInputChange({ target: { name: 'merchantTypes', value: newTypes } });
                                                        }}
                                                    >
                        ×
                    </button>
                </span>
                                            ))}
                                        </div>
                                    )}

                                    {errors.merchantType && (
                                        <div className="proc-merchant-error-message">{errors.merchantType}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Tax Identification Number</label>
                                    <input
                                        type="text"
                                        name="taxIdentificationNumber"
                                        value={formData.taxIdentificationNumber}
                                        onChange={handleChange}
                                        placeholder="Enter tax ID number"
                                        required
                                    />
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Company Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className={errors.address ? 'error' : ''}
                                        placeholder="Enter company address"
                                        required
                                    />
                                    {errors.address && (
                                        <div className="proc-merchant-error-message">{errors.address}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Assigned Sites</label>
                                    <select
                                        name="site"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const currentSites = formData.siteIds || [];
                                                if (!currentSites.includes(e.target.value)) {
                                                    const newSites = [...currentSites, e.target.value];
                                                    handleInputChange({ target: { name: 'siteIds', value: newSites } });
                                                }
                                            }
                                        }}
                                        className={errors.siteIds ? 'error' : ''}
                                    >
                                        <option value="">Select Site</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.name}</option>
                                        ))}
                                    </select>

                                    {formData.siteIds && formData.siteIds.length > 0 && (
                                        <div className="proc-merchant-type-tags">
                                            {formData.siteIds.map(siteId => {
                                                const site = sites.find(s => s.id === siteId);
                                                return (
                                                    <span key={siteId} className="proc-merchant-type-tag">
                        {site ? site.name : siteId}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newSites = formData.siteIds.filter(id => id !== siteId);
                                                                handleInputChange({ target: { name: 'siteIds', value: newSites } });
                                                            }}
                                                        >
                            ×
                        </button>
                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {errors.siteIds && (
                                        <div className="proc-merchant-error-message">{errors.siteIds}</div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information Column */}
                            <div className="proc-merchant-form-column">
                                <h3>Contact Information</h3>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Contact Person Name</label>
                                    <input
                                        type="text"
                                        name="contactPersonName"
                                        value={formData.contactPersonName}
                                        onChange={handleChange}
                                        className={errors.contactPersonName ? 'error' : ''}
                                        placeholder="Enter contact person name"
                                        required
                                    />
                                    {errors.contactPersonName && (
                                        <div className="proc-merchant-error-message">{errors.contactPersonName}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Email Address</label>
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        className={errors.contactEmail ? 'error' : ''}
                                        placeholder="Enter email address"
                                        required
                                    />
                                    {errors.contactEmail && (
                                        <div className="proc-merchant-error-message">{errors.contactEmail}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Primary Phone</label>
                                    <input
                                        type="tel"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        className={errors.contactPhone ? 'error' : ''}
                                        placeholder="Enter primary phone number"
                                        required
                                    />
                                    {errors.contactPhone && (
                                        <div className="proc-merchant-error-message">{errors.contactPhone}</div>
                                    )}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label>Secondary Phone</label>
                                    <input
                                        type="tel"
                                        name="contactSecondPhone"
                                        value={formData.contactSecondPhone}
                                        onChange={handleChange}
                                        placeholder="Enter secondary phone number"
                                    />
                                </div>
                            </div>

                            {/* Business Terms & Notes Column */}
                            <div className="proc-merchant-form-column">
                                <h3>Business Terms & Performance</h3>

                                <div className="proc-merchant-form-group">
                                    <label>Preferred Payment Method</label>
                                    <select
                                        name="preferredPaymentMethod"
                                        value={formData.preferredPaymentMethod}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Payment Method</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CREDIT_CARD">Credit Card</option>
                                        <option value="CASH">Cash</option>
                                        <option value="CHECK">Check</option>
                                        <option value="PAYPAL">PayPal</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label>Reliability Score (0-5)</label>
                                    <input
                                        type="number"
                                        name="reliabilityScore"
                                        value={formData.reliabilityScore}
                                        onChange={handleNumberChange}
                                        placeholder="Rate reliability (0-5)"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                    />
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label>Average Delivery Time (days)</label>
                                    <input
                                        type="number"
                                        name="averageDeliveryTime"
                                        value={formData.averageDeliveryTime}
                                        onChange={handleNumberChange}
                                        placeholder="Enter average delivery days"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label>Additional Notes</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Enter any additional notes, terms, or special requirements"
                                        rows="4"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="proc-merchant-modal-footer">
                        <button type="button" className="proc-merchant-cancel-btn" onClick={handleCloseAttempt}>Cancel</button>
                        <button type="submit" className="proc-merchant-save-btn">
                            {modalMode === 'add' ? 'Save Merchant' : 'Update Merchant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
};

export default MerchantModal;