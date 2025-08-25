
// ==================== MANUAL DEDUCTION MODAL ====================
// frontend/src/pages/payroll/DeductionManagement/components/ManualDeductionModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaMinusCircle, FaCalendarAlt, FaPercent, FaDollarSign } from 'react-icons/fa';
import { deductionService } from '../../../../services/payroll/deductionService';
import { employeeService } from '../../../../services/hr/employeeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './ManualDeductionModal.scss';

const ManualDeductionModal = ({ deduction, onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [deductionTypes, setDeductionTypes] = useState([]);
    const [formData, setFormData] = useState({
        employeeId: '',
        deductionTypeId: '',
        customAmount: '',
        customPercentage: '',
        effectiveFrom: '',
        effectiveTo: '',
        amountType: 'fixed' // 'fixed' or 'percentage'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadEmployees();
        loadDeductionTypes();

        if (deduction) {
            setFormData({
                employeeId: deduction.employeeId || '',
                deductionTypeId: deduction.deductionTypeId || '',
                customAmount: deduction.customAmount || '',
                customPercentage: deduction.customPercentage || '',
                effectiveFrom: deduction.effectiveFrom ? deduction.effectiveFrom.split('T')[0] : '',
                effectiveTo: deduction.effectiveTo ? deduction.effectiveTo.split('T')[0] : '',
                amountType: deduction.customAmount ? 'fixed' : 'percentage'
            });
        }
    }, [deduction]);

    const loadEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            setEmployees(response.data);
        } catch (error) {
            console.error('Error loading employees:', error);
            showError('Failed to load employees');
        }
    };

    const loadDeductionTypes = async () => {
        try {
            const response = await deductionService.getActiveDeductionTypes();
            setDeductionTypes(response.data);
        } catch (error) {
            console.error('Error loading deduction types:', error);
            showError('Failed to load deduction types');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }

        // Clear opposite amount type when switching
        if (field === 'amountType') {
            if (value === 'fixed') {
                setFormData(prev => ({ ...prev, customPercentage: '' }));
            } else {
                setFormData(prev => ({ ...prev, customAmount: '' }));
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.employeeId) {
            newErrors.employeeId = 'Employee is required';
        }

        if (!formData.deductionTypeId) {
            newErrors.deductionTypeId = 'Deduction type is required';
        }

        if (!formData.effectiveFrom) {
            newErrors.effectiveFrom = 'Effective from date is required';
        }

        if (formData.amountType === 'fixed') {
            if (!formData.customAmount || parseFloat(formData.customAmount) <= 0) {
                newErrors.customAmount = 'Valid amount is required';
            }
        } else {
            if (!formData.customPercentage || parseFloat(formData.customPercentage) <= 0 || parseFloat(formData.customPercentage) > 100) {
                newErrors.customPercentage = 'Percentage must be between 0 and 100';
            }
        }

        if (formData.effectiveTo && formData.effectiveFrom) {
            if (new Date(formData.effectiveTo) <= new Date(formData.effectiveFrom)) {
                newErrors.effectiveTo = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            const requestData = {
                employeeId: formData.employeeId,
                deductionTypeId: formData.deductionTypeId,
                effectiveFrom: formData.effectiveFrom,
                effectiveTo: formData.effectiveTo || null
            };

            if (formData.amountType === 'fixed') {
                requestData.customAmount = parseFloat(formData.customAmount);
                requestData.customPercentage = null;
            } else {
                requestData.customPercentage = parseFloat(formData.customPercentage);
                requestData.customAmount = null;
            }

            if (deduction) {
                await deductionService.updateManualDeduction(deduction.id, requestData);
                showSuccess('Deduction updated successfully');
            } else {
                await deductionService.createManualDeduction(requestData);
                showSuccess('Deduction created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving deduction:', error);
            showError('Failed to save deduction');
        } finally {
            setLoading(false);
        }
    };

    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    const selectedDeductionType = deductionTypes.find(type => type.id === formData.deductionTypeId);

    return (
        <div className="modal-overlay">
            <div className="modal-container manual-deduction-modal">
                <div className="modal-header">
                    <h3>
                        <FaMinusCircle className="modal-icon" />
                        {deduction ? 'Edit' : 'Create'} Manual Deduction
                    </h3>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Employee Selection */}
                    <div className="form-section">
                        <h4>Employee Information</h4>
                        <div className="form-group">
                            <label htmlFor="employeeId">
                                Employee <span className="required">*</span>
                            </label>
                            <select
                                id="employeeId"
                                className={`form-control ${errors.employeeId ? 'error' : ''}`}
                                value={formData.employeeId}
                                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                                disabled={!!deduction} // Don't allow changing employee for existing deductions
                            >
                                <option value="">Select Employee</option>
                                {employees.map(employee => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.fullName} - {employee.email}
                                    </option>
                                ))}
                            </select>
                            {errors.employeeId && (
                                <div className="error-message">{errors.employeeId}</div>
                            )}
                            {selectedEmployee && (
                                <div className="employee-preview">
                                    <FaUser className="preview-icon" />
                                    <div className="preview-content">
                                        <div className="employee-name">{selectedEmployee.fullName}</div>
                                        <div className="employee-details">
                                            {selectedEmployee.departmentName} • {selectedEmployee.jobPositionName}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Deduction Type Selection */}
                    <div className="form-section">
                        <h4>Deduction Details</h4>
                        <div className="form-group">
                            <label htmlFor="deductionTypeId">
                                Deduction Type <span className="required">*</span>
                            </label>
                            <select
                                id="deductionTypeId"
                                className={`form-control ${errors.deductionTypeId ? 'error' : ''}`}
                                value={formData.deductionTypeId}
                                onChange={(e) => handleInputChange('deductionTypeId', e.target.value)}
                            >
                                <option value="">Select Deduction Type</option>
                                {deductionTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} ({type.type})
                                    </option>
                                ))}
                            </select>
                            {errors.deductionTypeId && (
                                <div className="error-message">{errors.deductionTypeId}</div>
                            )}
                            {selectedDeductionType && (
                                <div className="type-preview">
                                    <div className="type-description">{selectedDeductionType.description}</div>
                                </div>
                            )}
                        </div>

                        {/* Amount Type Selection */}
                        <div className="form-group">
                            <label>Amount Type</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="amountType"
                                        value="fixed"
                                        checked={formData.amountType === 'fixed'}
                                        onChange={(e) => handleInputChange('amountType', e.target.value)}
                                    />
                                    <FaDollarSign className="radio-icon" />
                                    Fixed Amount
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="amountType"
                                        value="percentage"
                                        checked={formData.amountType === 'percentage'}
                                        onChange={(e) => handleInputChange('amountType', e.target.value)}
                                    />
                                    <FaPercent className="radio-icon" />
                                    Percentage of Salary
                                </label>
                            </div>
                        </div>

                        {/* Amount Input */}
                        {formData.amountType === 'fixed' ? (
                            <div className="form-group">
                                <label htmlFor="customAmount">
                                    Deduction Amount <span className="required">*</span>
                                </label>
                                <div className="input-with-icon">
                                    <FaDollarSign className="input-icon" />
                                    <input
                                        id="customAmount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className={`form-control ${errors.customAmount ? 'error' : ''}`}
                                        placeholder="0.00"
                                        value={formData.customAmount}
                                        onChange={(e) => handleInputChange('customAmount', e.target.value)}
                                    />
                                </div>
                                {errors.customAmount && (
                                    <div className="error-message">{errors.customAmount}</div>
                                )}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="customPercentage">
                                    Deduction Percentage <span className="required">*</span>
                                </label>
                                <div className="input-with-icon">
                                    <FaPercent className="input-icon" />
                                    <input
                                        id="customPercentage"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className={`form-control ${errors.customPercentage ? 'error' : ''}`}
                                        placeholder="0.00"
                                        value={formData.customPercentage}
                                        onChange={(e) => handleInputChange('customPercentage', e.target.value)}
                                    />
                                </div>
                                {errors.customPercentage && (
                                    <div className="error-message">{errors.customPercentage}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Effective Period */}
                    <div className="form-section">
                        <h4>Effective Period</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="effectiveFrom">
                                    Start Date <span className="required">*</span>
                                </label>
                                <input
                                    id="effectiveFrom"
                                    type="date"
                                    className={`form-control ${errors.effectiveFrom ? 'error' : ''}`}
                                    value={formData.effectiveFrom}
                                    onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                                />
                                {errors.effectiveFrom && (
                                    <div className="error-message">{errors.effectiveFrom}</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="effectiveTo">
                                    End Date (Optional)
                                </label>
                                <input
                                    id="effectiveTo"
                                    type="date"
                                    className={`form-control ${errors.effectiveTo ? 'error' : ''}`}
                                    value={formData.effectiveTo}
                                    onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                                />
                                {errors.effectiveTo && (
                                    <div className="error-message">{errors.effectiveTo}</div>
                                )}
                                <div className="help-text">
                                    Leave empty for ongoing deduction
                                </div>
                            </div>
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
                        {loading ? 'Saving...' : (deduction ? 'Update' : 'Create')} Deduction
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualDeductionModal;