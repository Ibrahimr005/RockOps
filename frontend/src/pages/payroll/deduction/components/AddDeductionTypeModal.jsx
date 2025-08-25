// ==================== ADD DEDUCTION TYPE MODAL ====================
// frontend/src/pages/payroll/DeductionManagement/components/AddDeductionTypeModal.jsx
import React, { useState } from 'react';
import { FaTimes, FaCog, FaExclamationTriangle, FaPlus, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { deductionService } from '../../../../services/payroll/deductionService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './AddDeductionTypeModal.scss';

const AddDeductionTypeModal = ({ deductionType, onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        typeName: deductionType?.name || deductionType?.typeName || '', // Handle both field names
        category: deductionType?.category || '',
        description: deductionType?.description || '',
        isPreTax: deductionType?.isPreTax || false,
        isMandatory: deductionType?.isMandatory || false,
        allowCustomAmount: deductionType?.allowCustomAmount !== false, // Default to true
        allowCustomPercentage: deductionType?.allowCustomPercentage !== false, // Default to true

        isActive: deductionType?.isActive !== false // Default to true
});
const [errors, setErrors] = useState({});

// Deduction categories with descriptions
const deductionCategories = [
    {
        value: 'TAX',
        label: 'Tax Deductions',
        description: 'Federal, state, and local taxes'
    },
    {
        value: 'INSURANCE',
        label: 'Insurance',
        description: 'Health, dental, vision, life insurance'
    },
    {
        value: 'RETIREMENT',
        label: 'Retirement',
        description: '401(k), pension contributions'
    },
    {
        value: 'BENEFITS',
        label: 'Benefits',
        description: 'Employee benefits and perks'
    },
    {
        value: 'LOAN',
        label: 'Loan Repayment',
        description: 'Employee loan repayments'
    },
    {
        value: 'GARNISHMENT',
        label: 'Garnishment',
        description: 'Court-ordered deductions'
    },
    {
        value: 'UNION',
        label: 'Union Dues',
        description: 'Union membership fees'
    },
    {
        value: 'PENALTY',
        label: 'Penalties',
        description: 'Disciplinary deductions'
    },
    {
        value: 'OTHER',
        label: 'Other',
        description: 'Miscellaneous deductions'
    }
];

/**
 * Handle form input changes
 */
const handleInputChange = (field, value) => {
    setFormData(prev => ({
        ...prev,
        [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Special handling for amount restrictions
    if (field === 'allowCustomAmount' && !value) {
        // If custom amounts are disabled, percentage should be allowed
        setFormData(prev => ({ ...prev, allowCustomPercentage: true }));
    }

    if (field === 'allowCustomPercentage' && !value) {
        // If custom percentages are disabled, amount should be allowed
        setFormData(prev => ({ ...prev, allowCustomAmount: true }));
    }
};

/**
 * Validate form data
 */
const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.typeName.trim()) {
        newErrors.typeName = 'Type name is required';
    } else if (formData.typeName.length < 3) {
        newErrors.typeName = 'Type name must be at least 3 characters';
    } else if (formData.typeName.length > 100) {
        newErrors.typeName = 'Type name must be less than 100 characters';
    }

    if (!formData.category) {
        newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
        newErrors.description = 'Description must be less than 500 characters';
    }

    // At least one amount type must be allowed
    if (!formData.allowCustomAmount && !formData.allowCustomPercentage) {
        newErrors.allowCustomAmount = 'At least one amount type must be allowed';
        newErrors.allowCustomPercentage = 'At least one amount type must be allowed';
    }

    // Validate default amounts
    if (formData.defaultAmount && parseFloat(formData.defaultAmount) < 0) {
        newErrors.defaultAmount = 'Default amount cannot be negative';
    }

    if (formData.defaultPercentage) {
        const percentage = parseFloat(formData.defaultPercentage);
        if (percentage < 0 || percentage > 100) {
            newErrors.defaultPercentage = 'Default percentage must be between 0 and 100';
        }
    }

    // Validate max amounts
    if (formData.maxAmount && parseFloat(formData.maxAmount) < 0) {
        newErrors.maxAmount = 'Maximum amount cannot be negative';
    }

    if (formData.maxPercentage) {
        const percentage = parseFloat(formData.maxPercentage);
        if (percentage < 0 || percentage > 100) {
            newErrors.maxPercentage = 'Maximum percentage must be between 0 and 100';
        }
    }

    // Cross-validation
    if (formData.defaultAmount && formData.maxAmount) {
        if (parseFloat(formData.defaultAmount) > parseFloat(formData.maxAmount)) {
            newErrors.defaultAmount = 'Default amount cannot exceed maximum amount';
        }
    }

    if (formData.defaultPercentage && formData.maxPercentage) {
        if (parseFloat(formData.defaultPercentage) > parseFloat(formData.maxPercentage)) {
            newErrors.defaultPercentage = 'Default percentage cannot exceed maximum percentage';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

/**
 * Handle form submission
 */
const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    try {
        setLoading(true);

        // Create request object matching DeductionTypeDTO
        const requestData = {
            name: formData.typeName.trim(), // Backend expects 'name' not 'typeName'
            category: formData.category,
            description: formData.description.trim(),
            isPreTax: formData.isPreTax,
            isMandatory: formData.isMandatory,
            allowCustomAmount: formData.allowCustomAmount,
            allowCustomPercentage: formData.allowCustomPercentage,
            defaultAmount: formData.defaultAmount ? parseFloat(formData.defaultAmount) : null,
            defaultPercentage: formData.defaultPercentage ? parseFloat(formData.defaultPercentage) : null,
            maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
            maxPercentage: formData.maxPercentage ? parseFloat(formData.maxPercentage) : null,
            isActive: formData.isActive
        };

        if (deductionType) {
            await deductionService.updateDeductionType(deductionType.id, requestData);
            showSuccess('Deduction type updated successfully');
        } else {
            await deductionService.createDeductionType(requestData, 'USER');
            showSuccess('Deduction type created successfully');
        }

        onSuccess();
    } catch (error) {
        console.error('Error saving deduction type:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save deduction type';
        showError(`Failed to save deduction type: ${errorMessage}`);
    } finally {
        setLoading(false);
    }
};

/**
 * Get selected category info
 */
const getSelectedCategoryInfo = () => {
    return deductionCategories.find(cat => cat.value === formData.category);
};

const selectedCategory = getSelectedCategoryInfo();

return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
        <div className="modal-container add-deduction-type-modal">
            <div className="modal-header">
                <h3 className="modal-title">
                    <FaCog className="modal-icon" />
                    {deductionType ? 'Edit' : 'Add'} Deduction Type
                </h3>
                <button
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    disabled={loading}
                >
                    <FaTimes />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
                {/* Basic Information */}
                <div className="form-section">
                    <h4 className="section-title">
                        <FaInfoCircle />
                        Basic Information
                    </h4>
                    <p className="section-description">
                        Configure the basic details of the deduction type.
                    </p>

                    <div className="form-group">
                        <label htmlFor="typeName" className="form-label">
                            Type Name <span className="required">*</span>
                        </label>
                        <input
                            id="typeName"
                            type="text"
                            className={`form-control ${errors.typeName ? 'error' : ''}`}
                            placeholder="e.g., Health Insurance, 401(k) Contribution"
                            value={formData.typeName}
                            onChange={(e) => handleInputChange('typeName', e.target.value)}
                            disabled={loading}
                            maxLength={100}
                        />
                        {errors.typeName && (
                            <div className="error-message">
                                <FaExclamationTriangle />
                                {errors.typeName}
                            </div>
                        )}
                        <div className="help-text">
                            A clear, descriptive name for this deduction type.
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="category" className="form-label">
                            Category <span className="required">*</span>
                        </label>
                        <select
                            id="category"
                            className={`form-control ${errors.category ? 'error' : ''}`}
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select Category</option>
                            {deductionCategories.map(category => (
                                <option key={category.value} value={category.value}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                        {errors.category && (
                            <div className="error-message">
                                <FaExclamationTriangle />
                                {errors.category}
                            </div>
                        )}
                        {selectedCategory && (
                            <div className="category-preview">
                                <FaInfoCircle className="preview-icon" />
                                <span>{selectedCategory.description}</span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">
                            Description <span className="required">*</span>
                        </label>
                        <textarea
                            id="description"
                            className={`form-control ${errors.description ? 'error' : ''}`}
                            placeholder="Provide a detailed description of this deduction type..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            disabled={loading}
                            rows={3}
                            maxLength={500}
                        />
                        {errors.description && (
                            <div className="error-message">
                                <FaExclamationTriangle />
                                {errors.description}
                            </div>
                        )}
                        <div className="help-text">
                            {formData.description.length}/500 characters
                        </div>
                    </div>
                </div>

                {/* Configuration Options */}
                <div className="form-section">
                    <h4 className="section-title">
                        <FaCog />
                        Configuration Options
                    </h4>
                    <p className="section-description">
                        Set the behavior and rules for this deduction type.
                    </p>

                    <div className="checkbox-grid">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isPreTax}
                                onChange={(e) => handleInputChange('isPreTax', e.target.checked)}
                                disabled={loading}
                            />
                            <div className="checkbox-content">
                                <span className="checkbox-title">Pre-Tax Deduction</span>
                                <span className="checkbox-description">
                                        Reduces taxable income before tax calculations
                                    </span>
                            </div>
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isMandatory}
                                onChange={(e) => handleInputChange('isMandatory', e.target.checked)}
                                disabled={loading}
                            />
                            <div className="checkbox-content">
                                <span className="checkbox-title">Mandatory Deduction</span>
                                <span className="checkbox-description">
                                        Required for all applicable employees
                                    </span>
                            </div>
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                disabled={loading}
                            />
                            <div className="checkbox-content">
                                <span className="checkbox-title">Active</span>
                                <span className="checkbox-description">
                                        Available for use in payroll processing
                                    </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Amount Configuration */}
                <div className="form-section">
                    <h4 className="section-title">
                        Amount Configuration
                    </h4>
                    <p className="section-description">
                        Configure how amounts can be specified for this deduction type.
                    </p>

                    <div className="amount-type-selection">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.allowCustomAmount}
                                onChange={(e) => handleInputChange('allowCustomAmount', e.target.checked)}
                                disabled={loading}
                            />
                            <div className="checkbox-content">
                                <span className="checkbox-title">Allow Fixed Amounts</span>
                                <span className="checkbox-description">
                                        Users can specify deductions as fixed dollar amounts
                                    </span>
                            </div>
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.allowCustomPercentage}
                                onChange={(e) => handleInputChange('allowCustomPercentage', e.target.checked)}
                                disabled={loading}
                            />
                            <div className="checkbox-content">
                                <span className="checkbox-title">Allow Percentage Amounts</span>
                                <span className="checkbox-description">
                                        Users can specify deductions as percentage of salary
                                    </span>
                            </div>
                        </label>
                    </div>

                    {(errors.allowCustomAmount || errors.allowCustomPercentage) && (
                        <div className="error-message">
                            <FaExclamationTriangle />
                            At least one amount type must be allowed
                        </div>
                    )}

                    {/* Default and Maximum Values */}
                    <div className="form-row">
                        {formData.allowCustomAmount && (
                            <div className="form-group">
                                <label htmlFor="defaultAmount" className="form-label">
                                    Default Amount ($)
                                </label>
                                <input
                                    id="defaultAmount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`form-control ${errors.defaultAmount ? 'error' : ''}`}
                                    placeholder="0.00"
                                    value={formData.defaultAmount}
                                    onChange={(e) => handleInputChange('defaultAmount', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.defaultAmount && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.defaultAmount}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.allowCustomPercentage && (
                            <div className="form-group">
                                <label htmlFor="defaultPercentage" className="form-label">
                                    Default Percentage (%)
                                </label>
                                <input
                                    id="defaultPercentage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className={`form-control ${errors.defaultPercentage ? 'error' : ''}`}
                                    placeholder="0.00"
                                    value={formData.defaultPercentage}
                                    onChange={(e) => handleInputChange('defaultPercentage', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.defaultPercentage && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.defaultPercentage}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-row">
                        {formData.allowCustomAmount && (
                            <div className="form-group">
                                <label htmlFor="maxAmount" className="form-label">
                                    Maximum Amount ($)
                                </label>
                                <input
                                    id="maxAmount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`form-control ${errors.maxAmount ? 'error' : ''}`}
                                    placeholder="No limit"
                                    value={formData.maxAmount}
                                    onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.maxAmount && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.maxAmount}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.allowCustomPercentage && (
                            <div className="form-group">
                                <label htmlFor="maxPercentage" className="form-label">
                                    Maximum Percentage (%)
                                </label>
                                <input
                                    id="maxPercentage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className={`form-control ${errors.maxPercentage ? 'error' : ''}`}
                                    placeholder="No limit"
                                    value={formData.maxPercentage}
                                    onChange={(e) => handleInputChange('maxPercentage', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.maxPercentage && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.maxPercentage}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </form>

            <div className="modal-footer">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <FaSpinner className="spinning" />
                            {deductionType ? 'Updating...' : 'Creating...'}
                        </>
                    ) : (
                        <>
                            <FaPlus />
                            {deductionType ? 'Update' : 'Create'} Type
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
);
};

export default AddDeductionTypeModal;