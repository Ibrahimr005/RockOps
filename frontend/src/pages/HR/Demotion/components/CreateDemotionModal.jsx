import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaSpinner, FaArrowDown } from 'react-icons/fa';
import { Button, CloseButton } from '../../../../components/common/Button';
import EmployeeSelector from '../../../../components/common/EmployeeSelector/EmployeeSelector';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { demotionService } from '../../../../services/hr/demotionService.js';
import { useJobPositions, useEmployees } from '../../../../hooks/queries';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';

const CreateDemotionModal = ({ onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();

    const [formData, setFormData] = useState({
        employeeId: '',
        newPositionId: '',
        newGrade: '',
        newSalary: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const { data: rawEmployees = [], isLoading: employeesLoading } = useEmployees();
    const { data: positions = [], isLoading: positionsLoading } = useJobPositions();
    const [currentSalary, setCurrentSalary] = useState(null);
    const [currentPositionName, setCurrentPositionName] = useState(null);
    const [validation, setValidation] = useState({});
    const [loading, setLoading] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const loadingData = employeesLoading || positionsLoading;

    const employees = useMemo(() => {
        return rawEmployees.map(emp => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeId: emp.employeeNumber,
            email: emp.email,
            departmentName: emp.departmentName || emp.jobPosition?.department?.name,
            jobPositionName: emp.jobPositionName || emp.jobPosition?.positionName,
            jobPositionId: emp.jobPositionId || emp.jobPosition?.id,
            photoUrl: emp.photoUrl,
            monthlySalary: emp.monthlySalary,
            baseSalaryOverride: emp.baseSalaryOverride
        }));
    }, [rawEmployees]);

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
        setFormData(prev => ({ ...prev, employeeId: employee?.id || '', newPositionId: '' }));
        if (employee) {
            const salary = employee.monthlySalary || employee.baseSalaryOverride || 0;
            setCurrentSalary(salary);
            setCurrentPositionName(employee.jobPositionName || null);
        } else {
            setCurrentSalary(null);
            setCurrentPositionName(null);
        }
        if (validation.employeeId) {
            setValidation(prev => ({ ...prev, employeeId: null }));
        }
    };

    const handlePositionSelect = (e) => {
        const positionId = e.target.value;
        setIsFormDirty(true);
        setFormData(prev => ({ ...prev, newPositionId: positionId }));

        // Auto-populate new salary from position
        const pos = positions.find(p => p.id === positionId);
        if (pos) {
            const positionSalary = pos.monthlyBaseSalary || pos.baseSalary || 0;
            setFormData(prev => ({ ...prev, newPositionId: positionId, newSalary: positionSalary.toString() }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.employeeId) errors.employeeId = 'Please select an employee';
        if (!formData.newPositionId) errors.newPositionId = 'Please select a new position';
        if (selectedEmployee?.jobPositionId && formData.newPositionId === selectedEmployee.jobPositionId) {
            errors.newPositionId = 'New position must be different from current position';
        }
        if (!formData.newSalary || parseFloat(formData.newSalary) <= 0) {
            errors.newSalary = 'Please enter a valid salary amount';
        }
        if (!formData.reason || formData.reason.trim().length < 10) {
            errors.reason = 'Please provide a reason (at least 10 characters)';
        }
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
            await demotionService.createRequest({
                employeeId: formData.employeeId,
                newPositionId: formData.newPositionId,
                newGrade: formData.newGrade || null,
                newSalary: parseFloat(formData.newSalary),
                effectiveDate: formData.effectiveDate || null,
                reason: formData.reason
            });
            showSuccess('Demotion request created successfully');
            onSuccess();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create demotion request');
        } finally {
            setLoading(false);
        }
    };

    const reductionAmount = currentSalary && formData.newSalary
        ? currentSalary - parseFloat(formData.newSalary)
        : null;
    const reductionPercent = currentSalary && reductionAmount && currentSalary > 0
        ? ((reductionAmount / currentSalary) * 100).toFixed(2)
        : null;

    const formatCurrency = (amount) => {
        if (amount == null) return '-';
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    // Filter positions: exclude current employee position
    const availablePositions = positions.filter(p =>
        !selectedEmployee?.jobPositionId || p.id !== selectedEmployee.jobPositionId
    );

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container">
                    <div className="modal-header">
                        <h2 className="modal-title">Create Demotion Request</h2>
                        <CloseButton onClick={handleCloseAttempt} disabled={loading} />
                    </div>

                    <div className="modal-body">
                        {loadingData ? (
                            <div className="modal-loading">
                                <FaSpinner className="spin" /> Loading data...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* Employee Selector */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">Employee *</label>
                                    <EmployeeSelector
                                        employees={employees}
                                        selectedEmployee={selectedEmployee}
                                        onSelect={handleEmployeeSelect}
                                        placeholder="Search employees..."
                                        error={validation.employeeId}
                                        disabled={loading}
                                    />
                                    {validation.employeeId && (
                                        <span className="demotion-form-error">{validation.employeeId}</span>
                                    )}
                                </div>

                                {/* Current Position & Salary Display */}
                                {selectedEmployee && (
                                    <div className="demotion-current-info">
                                        <div className="demotion-current-info-item">
                                            <span>Current Position:</span>
                                            <strong>{currentPositionName || 'N/A'}</strong>
                                        </div>
                                        <div className="demotion-current-info-item">
                                            <span>Current Salary:</span>
                                            <strong>{formatCurrency(currentSalary)}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* New Position Selector */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">New Position *</label>
                                    <select
                                        className={`demotion-form-select ${validation.newPositionId ? 'error' : ''}`}
                                        value={formData.newPositionId}
                                        onChange={handlePositionSelect}
                                        disabled={loading || !formData.employeeId}
                                    >
                                        <option value="">Select new position...</option>
                                        {availablePositions.map(pos => (
                                            <option key={pos.id} value={pos.id}>
                                                {pos.positionName} — {pos.department?.name || 'No dept'} ({formatCurrency(pos.monthlyBaseSalary || pos.baseSalary || 0)})
                                            </option>
                                        ))}
                                    </select>
                                    {validation.newPositionId && (
                                        <span className="demotion-form-error">{validation.newPositionId}</span>
                                    )}
                                </div>

                                {/* New Grade (optional) */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">New Grade (optional)</label>
                                    <input
                                        type="text"
                                        className="demotion-form-input"
                                        value={formData.newGrade}
                                        onChange={(e) => handleInputChange('newGrade', e.target.value)}
                                        placeholder="Enter new grade..."
                                        disabled={loading}
                                    />
                                </div>

                                {/* New Salary */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">New Salary *</label>
                                    <input
                                        type="number"
                                        className={`demotion-form-input ${validation.newSalary ? 'error' : ''}`}
                                        value={formData.newSalary}
                                        onChange={(e) => handleInputChange('newSalary', e.target.value)}
                                        placeholder="Enter new salary..."
                                        step="0.01"
                                        min="0"
                                        disabled={loading}
                                    />
                                    {validation.newSalary && (
                                        <span className="demotion-form-error">{validation.newSalary}</span>
                                    )}
                                </div>

                                {/* Impact Preview */}
                                {reductionAmount != null && reductionAmount > 0 && (
                                    <div className="demotion-impact-preview">
                                        <div className="demotion-impact-title">
                                            <FaArrowDown /> Impact Preview
                                        </div>
                                        <div className="demotion-impact-item">
                                            <span>Salary Reduction:</span>
                                            <span className="demotion-impact-value reduction">
                                                -{formatCurrency(reductionAmount)}
                                            </span>
                                        </div>
                                        <div className="demotion-impact-item">
                                            <span>Reduction Percentage:</span>
                                            <span className="demotion-impact-value reduction">
                                                -{reductionPercent}%
                                            </span>
                                        </div>
                                        {currentPositionName && formData.newPositionId && (
                                            <div className="demotion-impact-item">
                                                <span>Position Change:</span>
                                                <span className="demotion-impact-value">
                                                    {currentPositionName} → {availablePositions.find(p => p.id === formData.newPositionId)?.positionName || ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Effective Date */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">Effective Date</label>
                                    <input
                                        type="date"
                                        className="demotion-form-input"
                                        value={formData.effectiveDate}
                                        onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Reason */}
                                <div className="demotion-form-group">
                                    <label className="demotion-form-label">Reason *</label>
                                    <textarea
                                        className={`demotion-form-textarea ${validation.reason ? 'error' : ''}`}
                                        value={formData.reason}
                                        onChange={(e) => handleInputChange('reason', e.target.value)}
                                        placeholder="Enter detailed reason for demotion..."
                                        rows={4}
                                        maxLength={2000}
                                        disabled={loading}
                                    />
                                    <span className="demotion-form-char-count">
                                        {formData.reason.length}/2000
                                    </span>
                                    {validation.reason && (
                                        <span className="demotion-form-error">{validation.reason}</span>
                                    )}
                                </div>

                                {/* Workflow Note */}
                                <div className="demotion-workflow-note">
                                    This request will go through a two-tier approval: Department Head review, then HR Manager final approval.
                                    Position and salary will be updated automatically upon final approval.
                                    Vacation balance will be recalculated based on the new position.
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

export default CreateDemotionModal;
