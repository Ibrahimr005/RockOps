import React, { useState, useEffect } from 'react';
import './MerchantModal.scss';

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

    // Handle form input changes
    const handleChange = (e) => {
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
        const { name, value } = e.target;
        // Allow empty value or valid number
        if (value === '' || !isNaN(parseFloat(value))) {
            const event = {
                target: { name, value }
            };
            handleInputChange(event);
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.name) newErrors.name = 'Merchant name is required';
        if (!formData.merchantType) newErrors.merchantType = 'Merchant type is required';
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
    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            if (modalMode === 'add') {
                handleAddMerchant(e);
            } else {
                handleUpdateMerchant(e);
            }
        }
    };

    if (!showAddModal) return null;

    return (
        <div className="proc-merchant-modal-overlay">
            <div className="proc-merchant-employee-modal">
                <div className="proc-merchant-modal-header">
                    <h2>{modalMode === 'add' ? 'Add New Merchant' : 'Edit Merchant'}</h2>
                    <button className="proc-merchant-close-button" onClick={handleCloseModals}>×</button>
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
                                            onChange={handleFileChange}
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
                                    />
                                    {errors.name && <span className="proc-merchant-error-message">{errors.name}</span>}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Business Type</label>
                                    <select
                                        name="merchantType"
                                        value={formData.merchantType}
                                        onChange={handleChange}
                                        className={errors.merchantType ? 'error' : ''}
                                    >
                                        <option value="">Select Business Type</option>
                                        <option value="SUPPLIER">Supplier</option>

                                    </select>
                                    {errors.merchantType && <span className="proc-merchant-error-message">{errors.merchantType}</span>}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Tax Identification Number</label>
                                    <input
                                        type="text"
                                        name="taxIdentificationNumber"
                                        value={formData.taxIdentificationNumber}
                                        onChange={handleChange}
                                        placeholder="Enter tax ID number"
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
                                    />
                                    {errors.address && <span className="proc-merchant-error-message">{errors.address}</span>}
                                </div>

                                <div className="proc-merchant-form-group">
                                    <label className="required">Assigned Site</label>
                                    <select
                                        name="siteId"
                                        value={formData.siteId}
                                        onChange={handleChange}

                                    >
                                        <option value="">Select a Site</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.name}</option>
                                        ))}
                                    </select>
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
                                    />
                                    {errors.contactPersonName && <span className="proc-merchant-error-message">{errors.contactPersonName}</span>}
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
                                    />
                                    {errors.contactEmail && <span className="proc-merchant-error-message">{errors.contactEmail}</span>}
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
                                    />
                                    {errors.contactPhone && <span className="proc-merchant-error-message">{errors.contactPhone}</span>}
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
                        <button type="button" className="proc-merchant-cancel-btn" onClick={handleCloseModals}>Cancel</button>
                        <button type="submit" className="proc-merchant-save-btn">
                            {modalMode === 'add' ? 'Save Merchant' : 'Update Merchant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MerchantModal;