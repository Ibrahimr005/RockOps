import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { Button, CloseButton } from '../../../../components/common/Button';
import EmployeeSelector from '../../../../components/common/EmployeeSelector/EmployeeSelector';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { salaryIncreaseService } from '../../../../services/hr/salaryIncreaseService.js';
import { employeeService } from '../../../../services/hr/employeeService.js';
import { jobPositionService } from '../../../../services/hr/jobPositionService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';

const CreateSalaryIncreaseModal = ({ onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();

    const [formData, setFormData] = useState({
        requestType: 'EMPLOYEE_LEVEL',
        employeeId: '',
        jobPositionId: '',
        requestedSalary: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [positions, setPositions] = useState([]);
    const [currentSalary, setCurrentSalary] = useState(null);
    const [validation, setValidation] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) handleCloseAttempt();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [loading, isFormDirty]);

    // Load employees and positions
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);
                const [empRes, posRes] = await Promise.all([
                    employeeService.getAll(),
                    jobPositionService.getAll()
                ]);
                const empData = empRes.data || [];
                setEmployees(empData.map(emp => ({
                    id: emp.id,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    employeeId: emp.employeeNumber,
                    email: emp.email,
                    departmentName: emp.departmentName || emp.jobPosition?.department?.name,
                    jobPositionName: emp.jobPositionName || emp.jobPosition?.positionName,
                    photoUrl: emp.photoUrl,
                    monthlySalary: emp.monthlySalary,
                    baseSalaryOverride: emp.baseSalaryOverride
                })));
                setPositions(posRes.data || []);
            } catch (error) {
                showError('Failed to load employee and position data');
            } finally {
                setLoadingData(false);
            }
        };
        loadData();
    }, [showError]);

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            handleCloseAttempt();
        }
    };

    const handleInputChange = (field, value) => {
        setIsFormDirty(true);
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validation[field]) {
            setValidation(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleEmployeeSelect = (employee) => {
        setIsFormDirty(true);
        setSelectedEmployee(employee);
        setFormData(prev => ({ ...prev, employeeId: employee?.id || '' }));
        if (employee) {
            const salary = employee.monthlySalary || employee.baseSalaryOverride || 0;
            setCurrentSalary(salary);
        } else {
            setCurrentSalary(null);
        }
        if (validation.employeeId) {
            setValidation(prev => ({ ...prev, employeeId: null }));
        }
    };

    const handlePositionSelect = (e) => {
        const positionId = e.target.value;
        setIsFormDirty(true);
        setFormData(prev => ({ ...prev, jobPositionId: positionId }));
        const pos = positions.find(p => p.id === positionId);
        setSelectedPosition(pos);
        if (pos) {
            const salary = pos.monthlyBaseSalary || pos.baseSalary || 0;
            setCurrentSalary(salary);
        } else {
            setCurrentSalary(null);
        }
    };

    const handleRequestTypeChange = (type) => {
        setIsFormDirty(true);
        setFormData(prev => ({
            ...prev,
            requestType: type,
            employeeId: '',
            jobPositionId: '',
            requestedSalary: ''
        }));
        setSelectedEmployee(null);
        setSelectedPosition(null);
        setCurrentSalary(null);
    };

    const validateForm = () => {
        const errors = {};
        if (formData.requestType === 'EMPLOYEE_LEVEL' && !formData.employeeId) {
            errors.employeeId = 'Please select an employee';
        }
        if (formData.requestType === 'POSITION_LEVEL' && !formData.jobPositionId) {
            errors.jobPositionId = 'Please select a job position';
        }
        if (!formData.requestedSalary || parseFloat(formData.requestedSalary) <= 0) {
            errors.requestedSalary = 'Please enter a valid salary amount';
        }
        if (currentSalary && parseFloat(formData.requestedSalary) <= currentSalary) {
            errors.requestedSalary = 'Requested salary must be higher than current salary';
        }
        if (!formData.reason.trim()) errors.reason = 'Please provide a reason';
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidation(errors);
            return;
        }

        try {
            setLoading(true);
            await salaryIncreaseService.createRequest({
                requestType: formData.requestType,
                employeeId: formData.requestType === 'EMPLOYEE_LEVEL' ? formData.employeeId : null,
                jobPositionId: formData.requestType === 'POSITION_LEVEL' ? formData.jobPositionId : null,
                requestedSalary: parseFloat(formData.requestedSalary),
                effectiveDate: formData.effectiveDate || null,
                reason: formData.reason
            });
            showSuccess('Salary increase request created successfully');
            onSuccess();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create salary increase request');
        } finally {
            setLoading(false);
        }
    };

    const increaseAmount = currentSalary && formData.requestedSalary
        ? parseFloat(formData.requestedSalary) - currentSalary
        : null;
    const increasePercent = currentSalary && increaseAmount && currentSalary > 0
        ? ((increaseAmount / currentSalary) * 100).toFixed(2)
        : null;

    const formatCurrency = (amount) => {
        if (amount == null) return '-';
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container">
                    <div className="modal-header">
                        <h2 className="modal-title">Create Salary Increase Request</h2>
                        <CloseButton onClick={handleCloseAttempt} disabled={loading} />
                    </div>

                    <div className="modal-body">
                        {loadingData ? (
                            <div className="modal-loading">
                                <FaSpinner className="spin" /> Loading data...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* Request Type Selector */}
                                <div className="salary-increase-form-group">
                                    <label className="salary-increase-form-label">Request Type</label>
                                    <div className="salary-increase-type-selector">
                                        <button
                                            type="button"
                                            className={`salary-increase-type-btn ${formData.requestType === 'EMPLOYEE_LEVEL' ? 'active' : ''}`}
                                            onClick={() => handleRequestTypeChange('EMPLOYEE_LEVEL')}
                                        >
                                            Employee Level
                                        </button>
                                        <button
                                            type="button"
                                            className={`salary-increase-type-btn ${formData.requestType === 'POSITION_LEVEL' ? 'active' : ''}`}
                                            onClick={() => handleRequestTypeChange('POSITION_LEVEL')}
                                        >
                                            Position Level
                                        </button>
                                    </div>
                                </div>

                                {/* Employee Selector (only for EMPLOYEE_LEVEL) */}
                                {formData.requestType === 'EMPLOYEE_LEVEL' && (
                                    <div className="salary-increase-form-group">
                                        <label className="salary-increase-form-label">Employee *</label>
                                        <EmployeeSelector
                                            employees={employees}
                                            selectedEmployee={selectedEmployee}
                                            onSelect={handleEmployeeSelect}
                                            placeholder="Search employees..."
                                            error={validation.employeeId}
                                            disabled={loading}
                                        />
                                        {validation.employeeId && (
                                            <span className="salary-increase-form-error">{validation.employeeId}</span>
                                        )}
                                    </div>
                                )}

                                {/* Position Selector (only for POSITION_LEVEL) */}
                                {formData.requestType === 'POSITION_LEVEL' && (
                                    <div className="salary-increase-form-group">
                                        <label className="salary-increase-form-label">Job Position *</label>
                                        <select
                                            className={`salary-increase-form-select ${validation.jobPositionId ? 'error' : ''}`}
                                            value={formData.jobPositionId}
                                            onChange={handlePositionSelect}
                                            disabled={loading}
                                        >
                                            <option value="">Select a position...</option>
                                            {positions.map(pos => (
                                                <option key={pos.id} value={pos.id}>
                                                    {pos.positionName} — {pos.department?.name || 'No dept'} (
                                                    {formatCurrency(pos.monthlyBaseSalary || pos.baseSalary || 0)})
                                                </option>
                                            ))}
                                        </select>
                                        {validation.jobPositionId && (
                                            <span className="salary-increase-form-error">{validation.jobPositionId}</span>
                                        )}
                                    </div>
                                )}

                                {/* Current Salary Display */}
                                {currentSalary != null && (
                                    <div className="salary-increase-form-group">
                                        <label className="salary-increase-form-label">Current Monthly Salary</label>
                                        <div className="salary-increase-current-salary">
                                            {formatCurrency(currentSalary)}
                                        </div>
                                    </div>
                                )}

                                {/* Requested Salary */}
                                <div className="salary-increase-form-group">
                                    <label className="salary-increase-form-label">Requested Salary *</label>
                                    <input
                                        type="number"
                                        className={`salary-increase-form-input ${validation.requestedSalary ? 'error' : ''}`}
                                        value={formData.requestedSalary}
                                        onChange={(e) => handleInputChange('requestedSalary', e.target.value)}
                                        placeholder="Enter requested salary..."
                                        step="0.01"
                                        min="0"
                                        disabled={loading}
                                    />
                                    {validation.requestedSalary && (
                                        <span className="salary-increase-form-error">{validation.requestedSalary}</span>
                                    )}
                                </div>

                                {/* Increase Preview */}
                                {increaseAmount != null && increaseAmount > 0 && (
                                    <div className="salary-increase-preview">
                                        <div className="salary-increase-preview-item">
                                            <span>Increase Amount:</span>
                                            <span className="salary-increase-preview-value positive">
                                                +{formatCurrency(increaseAmount)}
                                            </span>
                                        </div>
                                        <div className="salary-increase-preview-item">
                                            <span>Increase Percentage:</span>
                                            <span className="salary-increase-preview-value positive">
                                                +{increasePercent}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Effective Date */}
                                <div className="salary-increase-form-group">
                                    <label className="salary-increase-form-label">Effective Date</label>
                                    <input
                                        type="date"
                                        className="salary-increase-form-input"
                                        value={formData.effectiveDate}
                                        onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Reason */}
                                <div className="salary-increase-form-group">
                                    <label className="salary-increase-form-label">Reason *</label>
                                    <textarea
                                        className={`salary-increase-form-textarea ${validation.reason ? 'error' : ''}`}
                                        value={formData.reason}
                                        onChange={(e) => handleInputChange('reason', e.target.value)}
                                        placeholder="Enter reason for salary increase..."
                                        rows={4}
                                        maxLength={2000}
                                        disabled={loading}
                                    />
                                    <span className="salary-increase-form-char-count">
                                        {formData.reason.length}/2000
                                    </span>
                                    {validation.reason && (
                                        <span className="salary-increase-form-error">{validation.reason}</span>
                                    )}
                                </div>

                                {/* Workflow Note */}
                                <div className="salary-increase-workflow-note">
                                    This request will go through a two-tier approval: HR Manager review, then Finance Manager approval.
                                    Salary will be updated automatically upon final approval.
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="modal-footer">
                        <Button variant="ghost" onClick={handleCloseAttempt} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={loadingData}
                            loading={loading}
                            loadingText="Submitting..."
                        >
                            Submit Request
                        </Button>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close?"
                onConfirm={() => { setShowDiscardDialog(false); onClose(); }}
                onCancel={() => setShowDiscardDialog(false)}
            />
        </>
    );
};

export default CreateSalaryIncreaseModal;
