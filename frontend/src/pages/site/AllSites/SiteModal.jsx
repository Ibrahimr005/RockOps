import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SiteModal Component
 *
 * A reusable modal component for adding and editing sites with:
 * - Form validation for all required fields
 * - Loading state to prevent multiple submissions
 * - Visual feedback during form submission
 * - Image upload preview
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSubmit - Callback when form is submitted with formData
 * @param {object} initialData - Initial form data (null for add mode, object for edit mode)
 * @param {boolean} isLoading - Loading state from parent component
 * @param {string} mode - 'add' or 'edit' to determine modal title and button text
 */
const SiteModal = ({
                       isOpen,
                       onClose,
                       onSubmit,
                       initialData = null,
                       isLoading = false,
                       mode = 'add'
                   }) => {
    const { t } = useTranslation();

    // Form data state
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        physicalAddress: '',
        companyAddress: '',
        creationDate: new Date().toISOString().split('T')[0],
        photo: null
    });

    // Preview image state
    const [previewImage, setPreviewImage] = useState(null);

    // Validation errors state
    const [errors, setErrors] = useState({});

    // Track which fields have been touched
    const [touched, setTouched] = useState({});

    // Reset form when modal opens with initial data
    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id || '',
                name: initialData.name || '',
                physicalAddress: initialData.physicalAddress || '',
                companyAddress: initialData.companyAddress || '',
                creationDate: initialData.creationDate || new Date().toISOString().split('T')[0],
                photo: null
            });

            // Set preview image if exists
            if (initialData.photoUrl) {
                setPreviewImage(initialData.photoUrl);
            } else if (initialData.photo) {
                setPreviewImage(initialData.photo);
            } else {
                setPreviewImage(null);
            }
        } else {
            // Reset form for add mode
            setFormData({
                id: '',
                name: '',
                physicalAddress: '',
                companyAddress: '',
                creationDate: new Date().toISOString().split('T')[0],
                photo: null
            });
            setPreviewImage(null);
        }

        // Clear validation states
        setErrors({});
        setTouched({});
    }, [initialData, isOpen]);

    // Validation rules
    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'name':
                if (!value || !value.trim()) {
                    error = t('validation.siteNameRequired') || 'Site name is required';
                } else if (value.trim().length < 3) {
                    error = t('validation.siteNameMinLength') || 'Site name must be at least 3 characters';
                }
                break;

            case 'physicalAddress':
                if (!value || !value.trim()) {
                    error = t('validation.physicalAddressRequired') || 'Physical address is required';
                }
                break;

            case 'companyAddress':
                if (!value || !value.trim()) {
                    error = t('validation.companyAddressRequired') || 'Company address is required';
                }
                break;

            case 'creationDate':
                if (!value) {
                    error = t('validation.creationDateRequired') || 'Creation date is required';
                } else {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate > today) {
                        error = t('validation.futureDateNotAllowed') || 'Future dates are not allowed';
                    }
                }
                break;

            default:
                break;
        }

        return error;
    };

    // Validate all fields
    const validateForm = () => {
        const newErrors = {};
        const fieldsToValidate = ['name', 'physicalAddress', 'companyAddress', 'creationDate'];

        fieldsToValidate.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                newErrors[field] = error;
            }
        });

        return newErrors;
    };

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field when user starts typing (only if field was touched)
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({
                ...prev,
                [name]: error
            }));
        }
    };

    // Handle input blur (mark field as touched)
    const handleBlur = (e) => {
        const { name, value } = e.target;

        setTouched(prev => ({
            ...prev,
            [name]: true
        }));

        const error = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    // Handle file change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                setErrors(prev => ({
                    ...prev,
                    photo: t('validation.invalidImageType') || 'Please upload a valid image (JPG, PNG, or GIF)'
                }));
                return;
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                setErrors(prev => ({
                    ...prev,
                    photo: t('validation.imageTooLarge') || 'Image size must be less than 5MB'
                }));
                return;
            }

            setFormData(prev => ({ ...prev, photo: file }));
            setPreviewImage(URL.createObjectURL(file));

            // Clear photo error if exists
            if (errors.photo) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.photo;
                    return newErrors;
                });
            }
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // If already loading, prevent submission
        if (isLoading) {
            return;
        }

        // Mark all fields as touched
        const allTouched = {
            name: true,
            physicalAddress: true,
            companyAddress: true,
            creationDate: true
        };
        setTouched(allTouched);

        // Validate all fields
        const validationErrors = validateForm();
        setErrors(validationErrors);

        // If there are errors, don't submit
        if (Object.keys(validationErrors).length > 0) {
            // Scroll to first error
            const firstErrorField = Object.keys(validationErrors)[0];
            const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
            if (errorElement) {
                errorElement.focus();
            }
            return;
        }

        // Submit the form
        onSubmit(formData);
    };

    // Handle modal close
    const handleClose = () => {
        // Prevent closing while loading
        if (!isLoading) {
            onClose();
        }
    };

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !isLoading) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    const isEditMode = mode === 'edit' || initialData !== null;

    return (
        <div className="modern-modal-overlay" onClick={handleOverlayClick}>
            <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modern-modal-header">
                    <h2>{isEditMode ? t('site.editSite') : t('site.addSite')}</h2>
                    <button
                        className="modern-modal-close"
                        onClick={handleClose}
                        disabled={isLoading}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="modern-modal-body">
                        <div className="modern-modal-layout">
                            {/* Image Upload */}
                            <label className={`modern-image-upload ${previewImage ? 'has-image' : ''}`}>
                                <input
                                    type="file"
                                    name="photo"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                />
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="modern-image-preview"
                                    />
                                ) : (
                                    <div className="modern-image-placeholder">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                        <span className="upload-text">{t('common.uploadPhoto')}</span>
                                        <span className="upload-hint">JPG, PNG or GIF (Max 5MB)</span>
                                    </div>
                                )}
                            </label>
                            {errors.photo && (
                                <span className="error-message photo-error">{errors.photo}</span>
                            )}

                            {/* Form Fields */}
                            <div className="modern-form-section">
                                {isEditMode && (
                                    <input type="hidden" name="id" value={formData.id} />
                                )}

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        {t('site.siteName')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        className={`modern-form-input ${errors.name && touched.name ? 'error' : ''}`}
                                        placeholder="Enter site name"
                                        required
                                    />
                                    {errors.name && touched.name && (
                                        <span className="error-message">{errors.name}</span>
                                    )}
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        {t('site.physicalAddress')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="physicalAddress"
                                        value={formData.physicalAddress}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        className={`modern-form-input ${errors.physicalAddress && touched.physicalAddress ? 'error' : ''}`}
                                        placeholder="Enter physical address"
                                        required
                                    />
                                    {errors.physicalAddress && touched.physicalAddress && (
                                        <span className="error-message">{errors.physicalAddress}</span>
                                    )}
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        {t('site.companyAddress')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="companyAddress"
                                        value={formData.companyAddress}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        className={`modern-form-input ${errors.companyAddress && touched.companyAddress ? 'error' : ''}`}
                                        placeholder="Enter company address"
                                        required
                                    />
                                    {errors.companyAddress && touched.companyAddress && (
                                        <span className="error-message">{errors.companyAddress}</span>
                                    )}
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        {t('site.creationDate')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="creationDate"
                                        value={formData.creationDate}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`modern-form-input ${errors.creationDate && touched.creationDate ? 'error' : ''}`}
                                        required
                                    />
                                    {errors.creationDate && touched.creationDate && (
                                        <span className="error-message">{errors.creationDate}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modern-modal-footer">
                        <button
                            type="button"
                            className="modern-btn modern-btn-cancel"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="modern-btn modern-btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    {t('common.saving') || 'Saving...'}
                                </>
                            ) : (
                                isEditMode ? t('common.save') : t('site.addSite')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SiteModal;