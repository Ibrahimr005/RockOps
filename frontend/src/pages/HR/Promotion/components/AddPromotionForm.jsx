// src/pages/HR/Promotion/components/AddPromotionForm.jsx
import React, {useEffect, useState} from 'react';
import {Building, Calendar, DollarSign, FileText, TrendingUp, User, ArrowUp, AlertTriangle} from 'lucide-react';
import {useSnackbar} from '../../../../contexts/SnackbarContext';
import {employeeService} from '../../../../services/hr/employeeService';
import {jobPositionService} from '../../../../services/hr/jobPositionService';
import promotionService from '../../../../services/hr/promotionService';
import './AddPromotionForm.scss';

const AddPromotionForm = ({isOpen, onClose, onSubmit}) => {
    const {showError, showWarning, showInfo, showSuccess} = useSnackbar();

    const [formData, setFormData] = useState({
        employeeId: '',
        promotedToJobPositionId: '',
        requestTitle: '',
        justification: '',
        proposedEffectiveDate: '',
        proposedSalary: '',
        priority: 'NORMAL',
        hrComments: '',
        performanceRating: '',
        educationalQualifications: '',
        additionalCertifications: '',
        requiresAdditionalTraining: false,
        trainingPlan: ''
    });

    const [employees, setEmployees] = useState([]);
    const [availablePromotionTargets, setAvailablePromotionTargets] = useState([]); // NEW: Hierarchy-based targets
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [currentPositionInfo, setCurrentPositionInfo] = useState(null); // NEW: Current position hierarchy info
    const [loading, setLoading] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingPromotionTargets, setLoadingPromotionTargets] = useState(false); // NEW: Loading state for targets
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            resetForm();
        }
    }, [isOpen]);

    const fetchEmployees = async () => {
        try {
            setLoadingEmployees(true);
            const response = await employeeService.getAll();
            // Handle response structure - check if data is nested
            const employeesData = response.data?.data || response.data || response;

            // Filter only active employees
            const activeEmployees = Array.isArray(employeesData)
                ? employeesData.filter(emp => emp.status === 'ACTIVE')
                : [];

            setEmployees(activeEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            showError('Failed to load employees');
        } finally {
            setLoadingEmployees(false);
        }
    };

    // NEW: Fetch available promotion targets based on hierarchy
    const fetchPromotionTargets = async (employeeId) => {
        try {
            setLoadingPromotionTargets(true);

            // Get employee details first
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) return;

            // Get current position details
            let currentPositionId = employee.jobPosition?.id || employee.jobPositionId;
            if (!currentPositionId) {
                showWarning('Employee does not have a current position assigned');
                setAvailablePromotionTargets([]);
                return;
            }

            // Get current position details with hierarchy info
            const currentPositionResponse = await jobPositionService.getById(currentPositionId);
            const currentPosition = currentPositionResponse.data;
            setCurrentPositionInfo(currentPosition);

            // Get valid promotion targets (parent position only in hierarchy system)
            const targetsResponse = await jobPositionService.getValidPromotionTargets(currentPositionId);
            const targets = targetsResponse.data || [];

            if (targets.length === 0) {
                showInfo(`No promotion targets available for ${currentPosition.positionName}. This may be a root position in the hierarchy.`);
            }

            setAvailablePromotionTargets(targets);

        } catch (error) {
            console.error('Error fetching promotion targets:', error);
            showError('Failed to load available promotion targets');
            setAvailablePromotionTargets([]);
        } finally {
            setLoadingPromotionTargets(false);
        }
    };

    const resetForm = () => {
        setFormData({
            employeeId: '',
            promotedToJobPositionId: '',
            requestTitle: '',
            justification: '',
            proposedEffectiveDate: '',
            proposedSalary: '',
            priority: 'NORMAL',
            hrComments: '',
            performanceRating: '',
            educationalQualifications: '',
            additionalCertifications: '',
            requiresAdditionalTraining: false,
            trainingPlan: ''
        });
        setSelectedEmployee(null);
        setSelectedPosition(null);
        setCurrentPositionInfo(null); // NEW: Reset current position info
        setAvailablePromotionTargets([]); // NEW: Reset targets
        setErrors({});
    };

    const handleEmployeeChange = async (employeeId) => {
        const employee = employees.find(emp => emp.id === employeeId);
        setSelectedEmployee(employee);

        if (employee) {
            // Generate request title based on employee and current position
            const currentPositionName = employee.jobPosition?.positionName ||
                employee.jobPositionName ||
                'Current Position';
            const requestTitle = `Promotion Request for ${employee.fullName} - ${currentPositionName}`;

            setFormData(prev => ({
                ...prev,
                employeeId: employeeId,
                requestTitle: requestTitle,
                promotedToJobPositionId: '', // Reset position selection
                proposedSalary: '' // Reset salary
            }));

            // NEW: Fetch promotion targets based on hierarchy
            await fetchPromotionTargets(employeeId);

            // Check eligibility
            try {
                const eligibilityResponse = await promotionService.checkEmployeePromotionEligibility(employeeId);
                if (eligibilityResponse.data && !eligibilityResponse.data.eligible) {
                    showWarning(`Employee may not be eligible: ${eligibilityResponse.data.reason}`);
                }
            } catch (error) {
                console.error('Error checking eligibility:', error);
                // Don't show error to user as this is optional functionality
            }

            // Check for pending promotions
            try {
                const pendingResponse = await promotionService.checkEmployeeHasPendingPromotion(employeeId);
                if (pendingResponse.data && pendingResponse.data.hasPending) {
                    showWarning(`This employee already has ${pendingResponse.data.count} pending promotion request(s)`);
                }
            } catch (error) {
                console.error('Error checking pending promotions:', error);
                // Don't show error to user as this is optional functionality
            }
        } else {
            setFormData(prev => ({
                ...prev,
                employeeId: employeeId,
                requestTitle: '',
                promotedToJobPositionId: '',
                proposedSalary: ''
            }));
            setCurrentPositionInfo(null);
            setAvailablePromotionTargets([]);
        }
    };

    const handlePositionChange = (positionId) => {
        const position = availablePromotionTargets.find(pos => pos.id === positionId);
        setSelectedPosition(position);

        let proposedSalary = '';
        if (position) {
            // Use different salary fields based on contract type
            if (position.monthlyBaseSalary) {
                proposedSalary = position.monthlyBaseSalary.toString();
            } else if (position.baseSalary) {
                proposedSalary = position.baseSalary.toString();
            } else if (position.calculatedMonthlySalary) {
                proposedSalary = position.calculatedMonthlySalary.toString();
            }
        }

        setFormData(prev => ({
            ...prev,
            promotedToJobPositionId: positionId,
            proposedSalary: proposedSalary
        }));
    };

    const handleInputChange = (e) => {
        const {name, value, type, checked} = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required field validations
        if (!formData.employeeId) {
            newErrors.employeeId = 'Employee is required';
        }

        if (!formData.promotedToJobPositionId) {
            newErrors.promotedToJobPositionId = 'Proposed position is required';
        }

        if (!formData.requestTitle?.trim()) {
            newErrors.requestTitle = 'Request title is required';
        }

        if (!formData.proposedSalary || parseFloat(formData.proposedSalary) <= 0) {
            newErrors.proposedSalary = 'Valid proposed salary is required';
        }

        if (!formData.proposedEffectiveDate) {
            newErrors.proposedEffectiveDate = 'Effective date is required';
        } else {
            const effectiveDate = new Date(formData.proposedEffectiveDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (effectiveDate < today) {
                newErrors.proposedEffectiveDate = 'Effective date cannot be in the past';
            }
        }

        if (!formData.justification?.trim()) {
            newErrors.justification = 'Justification is required';
        } else if (formData.justification.trim().length < 50) {
            newErrors.justification = 'Justification must be at least 50 characters';
        }

        // NEW: Hierarchy-specific validations
        if (selectedEmployee && selectedPosition && currentPositionInfo) {
            // Verify that the selected position is actually a valid promotion target
            const isValidTarget = availablePromotionTargets.some(target => target.id === formData.promotedToJobPositionId);
            if (!isValidTarget) {
                newErrors.promotedToJobPositionId = 'Selected position is not a valid promotion target based on organizational hierarchy';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please fix the validation errors before submitting');
            return;
        }

        try {
            setLoading(true);

            // Prepare submission data according to backend DTO structure
            const submissionData = {
                employeeId: formData.employeeId,
                promotedToJobPositionId: formData.promotedToJobPositionId,
                requestTitle: formData.requestTitle.trim(),
                justification: formData.justification.trim(),
                proposedEffectiveDate: formData.proposedEffectiveDate,
                proposedSalary: parseFloat(formData.proposedSalary),
                priority: formData.priority,
                hrComments: formData.hrComments?.trim() || '',
                performanceRating: formData.performanceRating || null,
                educationalQualifications: formData.educationalQualifications?.trim() || '',
                additionalCertifications: formData.additionalCertifications?.trim() || '',
                requiresAdditionalTraining: Boolean(formData.requiresAdditionalTraining),
                trainingPlan: formData.trainingPlan?.trim() || ''
            };

            // Call the service to create promotion request
            const response = await promotionService.createPromotionRequest(submissionData);

            if (response.data?.success) {
                showSuccess('Promotion request created successfully');
                resetForm();
                onClose();

                // Call parent onSubmit callback if provided
                if (onSubmit) {
                    await onSubmit(response.data.data);
                }
            } else {
                throw new Error(response.data?.error || 'Failed to create promotion request');
            }

        } catch (error) {
            console.error('Error submitting promotion:', error);
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Failed to create promotion request';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getSalaryIncrease = () => {
        if (!selectedEmployee || !formData.proposedSalary) return null;

        const currentSalary = selectedEmployee.monthlySalary ||
            selectedEmployee.jobPosition?.baseSalary ||
            selectedEmployee.baseSalary;

        if (!currentSalary) return null;

        const current = parseFloat(currentSalary);
        const proposed = parseFloat(formData.proposedSalary);

        if (isNaN(current) || isNaN(proposed)) return null;

        const increase = proposed - current;
        const percentage = ((increase / current) * 100).toFixed(1);

        return {increase, percentage};
    };

    const salaryIncrease = getSalaryIncrease();

    if (!isOpen) return null;

    return (
        <div className="promotion-form-modal">
            <div className="modal-overlay">
                <div className="modal-content modal-lg">
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">
                                <TrendingUp size={24}/>
                                Create Promotion Request
                            </h2>
                            <p className="modal-subtitle">
                                Submit a new promotion request for employee advancement within organizational hierarchy
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit} className="promotion-form">
                            {/* Employee and Position Selection */}
                            <div className="form-section">
                                <div className="section-header">
                                    <User size={20}/>
                                    <h3>Employee & Position Information</h3>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="employeeId" className="required">
                                            Employee
                                        </label>
                                        <div className="input-with-icon">
                                            <User size={18}/>
                                            <select
                                                id="employeeId"
                                                name="employeeId"
                                                value={formData.employeeId}
                                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                                className={`form-control ${errors.employeeId ? 'error' : ''}`}
                                                required
                                                disabled={loadingEmployees}
                                            >
                                                <option value="">
                                                    {loadingEmployees ? 'Loading employees...' : 'Select Employee'}
                                                </option>
                                                {employees.map(employee => (
                                                    <option key={employee.id} value={employee.id}>
                                                        {employee.fullName} - {employee.jobPositionName || employee.jobPosition?.positionName || 'No Position'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {errors.employeeId && (
                                            <span className="error-message">{errors.employeeId}</span>
                                        )}
                                    </div>
                                </div>

                                {/* NEW: Current Position Hierarchy Information */}
                                {currentPositionInfo && (
                                    <div className="current-position-info">
                                        <h4>Current Position Information</h4>
                                        <div className="position-hierarchy">
                                            <div className="hierarchy-item">
                                                <span className="label">Current Position:</span>
                                                <span className="value">{currentPositionInfo.positionName}</span>
                                            </div>
                                            <div className="hierarchy-item">
                                                <span className="label">Department:</span>
                                                <span className="value">{currentPositionInfo.department || 'N/A'}</span>
                                            </div>
                                            <div className="hierarchy-item">
                                                <span className="label">Hierarchy Level:</span>
                                                <span className="value">Level {currentPositionInfo.hierarchyLevel || 0}</span>
                                            </div>
                                            {currentPositionInfo.hierarchyPath && (
                                                <div className="hierarchy-item">
                                                    <span className="label">Hierarchy Path:</span>
                                                    <span className="value hierarchy-path">{currentPositionInfo.hierarchyPath}</span>
                                                </div>
                                            )}
                                            {currentPositionInfo.isRootPosition && (
                                                <div className="hierarchy-warning">
                                                    <AlertTriangle size={16}/>
                                                    This is a root position - no further promotion targets may be available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="promotedToJobPositionId" className="required">
                                            Promotion Target Position
                                        </label>
                                        <div className="input-with-icon">
                                            <ArrowUp size={18}/>
                                            <select
                                                id="promotedToJobPositionId"
                                                name="promotedToJobPositionId"
                                                value={formData.promotedToJobPositionId}
                                                onChange={(e) => handlePositionChange(e.target.value)}
                                                className={`form-control ${errors.promotedToJobPositionId ? 'error' : ''}`}
                                                required
                                                disabled={loadingPromotionTargets || !formData.employeeId}
                                            >
                                                <option value="">
                                                    {loadingPromotionTargets ? 'Loading promotion targets...' :
                                                        !formData.employeeId ? 'Select employee first' :
                                                            availablePromotionTargets.length === 0 ? 'No promotion targets available' :
                                                                'Select Promotion Target'}
                                                </option>
                                                {availablePromotionTargets.map(position => (
                                                    <option key={position.id} value={position.id}>
                                                        {position.positionName} - {position.department || 'No Department'}
                                                        {position.hierarchyLevel !== undefined && ` (Level ${position.hierarchyLevel})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {errors.promotedToJobPositionId && (
                                            <span className="error-message">{errors.promotedToJobPositionId}</span>
                                        )}
                                        <small className="field-hint">
                                            Only positions that are valid promotion targets within the organizational hierarchy are shown
                                        </small>
                                    </div>
                                </div>

                                {/* NEW: Promotion Target Information */}
                                {selectedPosition && (
                                    <div className="target-position-info">
                                        <h4>Promotion Target Information</h4>
                                        <div className="position-details">
                                            <div className="detail-item">
                                                <span className="label">Target Position:</span>
                                                <span className="value">{selectedPosition.positionName}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Target Department:</span>
                                                <span className="value">{selectedPosition.department || 'N/A'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Target Level:</span>
                                                <span className="value">Level {selectedPosition.hierarchyLevel || 0}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Contract Type:</span>
                                                <span className="value">{selectedPosition.contractType?.replace('_', ' ') || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="requestTitle" className="required">
                                            Request Title
                                        </label>
                                        <input
                                            type="text"
                                            id="requestTitle"
                                            name="requestTitle"
                                            value={formData.requestTitle}
                                            onChange={handleInputChange}
                                            className={`form-control ${errors.requestTitle ? 'error' : ''}`}
                                            placeholder="Enter request title..."
                                            required
                                        />
                                        {errors.requestTitle && (
                                            <span className="error-message">{errors.requestTitle}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="priority">Priority</label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                            className="form-control"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="proposedSalary" className="required">
                                            Proposed Salary (USD)
                                        </label>
                                        <div className="input-with-icon">
                                            <DollarSign size={18}/>
                                            <input
                                                type="number"
                                                id="proposedSalary"
                                                name="proposedSalary"
                                                value={formData.proposedSalary}
                                                onChange={handleInputChange}
                                                className={`form-control ${errors.proposedSalary ? 'error' : ''}`}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                required
                                            />
                                        </div>
                                        {errors.proposedSalary && (
                                            <span className="error-message">{errors.proposedSalary}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="proposedEffectiveDate" className="required">
                                            Proposed Effective Date
                                        </label>
                                        <div className="input-with-icon">
                                            <Calendar size={18}/>
                                            <input
                                                type="date"
                                                id="proposedEffectiveDate"
                                                name="proposedEffectiveDate"
                                                value={formData.proposedEffectiveDate}
                                                onChange={handleInputChange}
                                                className={`form-control ${errors.proposedEffectiveDate ? 'error' : ''}`}
                                                min={new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>
                                        {errors.proposedEffectiveDate && (
                                            <span className="error-message">{errors.proposedEffectiveDate}</span>
                                        )}
                                    </div>
                                </div>

                                {salaryIncrease && (
                                    <div className="salary-preview">
                                        <h4>Salary Increase Preview</h4>
                                        <div className="salary-comparison">
                                            <div className="salary-item">
                                                <label>Increase Amount:</label>
                                                <span className="salary-increase">
                                                    +${salaryIncrease.increase.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="salary-item">
                                                <label>Percentage Increase:</label>
                                                <span className="salary-percentage">
                                                    +{salaryIncrease.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="performanceRating">Performance Rating</label>
                                        <select
                                            id="performanceRating"
                                            name="performanceRating"
                                            value={formData.performanceRating}
                                            onChange={handleInputChange}
                                            className="form-control"
                                        >
                                            <option value="">Select rating</option>
                                            <option value="EXCEEDS_EXPECTATIONS">Exceeds Expectations</option>
                                            <option value="MEETS_EXPECTATIONS">Meets Expectations</option>
                                            <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                                            <option value="OUTSTANDING">Outstanding</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="form-section">
                                <div className="section-header">
                                    <FileText size={20}/>
                                    <h3>Additional Information</h3>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="educationalQualifications">Educational Qualifications</label>
                                        <textarea
                                            id="educationalQualifications"
                                            name="educationalQualifications"
                                            value={formData.educationalQualifications}
                                            onChange={handleInputChange}
                                            className="form-control textarea"
                                            rows="2"
                                            placeholder="List relevant educational qualifications..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="additionalCertifications">Additional Certifications</label>
                                        <textarea
                                            id="additionalCertifications"
                                            name="additionalCertifications"
                                            value={formData.additionalCertifications}
                                            onChange={handleInputChange}
                                            className="form-control textarea"
                                            rows="2"
                                            placeholder="List any additional certifications..."
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="requiresAdditionalTraining">
                                            <input
                                                type="checkbox"
                                                id="requiresAdditionalTraining"
                                                name="requiresAdditionalTraining"
                                                checked={formData.requiresAdditionalTraining}
                                                onChange={handleInputChange}
                                            />
                                            Requires Additional Training
                                        </label>
                                    </div>
                                </div>

                                {formData.requiresAdditionalTraining && (
                                    <div className="form-group">
                                        <label htmlFor="trainingPlan">Training Plan</label>
                                        <textarea
                                            id="trainingPlan"
                                            name="trainingPlan"
                                            value={formData.trainingPlan}
                                            onChange={handleInputChange}
                                            className="form-control textarea"
                                            rows="3"
                                            placeholder="Describe the training plan and requirements..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Justification & Details */}
                            <div className="form-section">
                                <div className="section-header">
                                    <FileText size={20}/>
                                    <h3>Justification & Supporting Information</h3>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="justification" className="required">
                                        Promotion Justification
                                    </label>
                                    <textarea
                                        id="justification"
                                        name="justification"
                                        value={formData.justification}
                                        onChange={handleInputChange}
                                        className={`form-control textarea ${errors.justification ? 'error' : ''}`}
                                        rows="4"
                                        placeholder="Provide detailed justification for this promotion (minimum 50 characters)..."
                                        required
                                    />
                                    <div className="textarea-help">
                                        {formData.justification?.length || 0}/50 minimum characters
                                    </div>
                                    {errors.justification && (
                                        <span className="error-message">{errors.justification}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="hrComments">HR Comments</label>
                                    <textarea
                                        id="hrComments"
                                        name="hrComments"
                                        value={formData.hrComments}
                                        onChange={handleInputChange}
                                        className="form-control textarea"
                                        rows="3"
                                        placeholder="Additional HR comments or notes..."
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="modal-btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="btn-primary"
                            disabled={loading || !formData.employeeId || availablePromotionTargets.length === 0}
                        >
                            {loading ? (
                                <>
                                    <div className="btn-loading-spinner"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <TrendingUp size={18}/>
                                    Create Promotion Request
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPromotionForm;