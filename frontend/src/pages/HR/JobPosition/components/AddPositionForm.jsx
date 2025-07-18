import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './AddPositionForm.scss';

const AddPositionForm = ({ isOpen, onClose, onSubmit }) => {
    const { showError, showWarning } = useSnackbar();
    const [formData, setFormData] = useState({
        positionName: '',
        department: '',
        head: '',
        contractType: 'MONTHLY',
        experienceLevel: 'ENTRY_LEVEL',
        probationPeriod: 90,
        active: true,

        // HOURLY fields
        workingDaysPerWeek: 5,
        hoursPerShift: 8,
        hourlyRate: 0,
        overtimeMultiplier: 1.5,
        trackBreaks: false,
        breakDurationMinutes: 30,

        // DAILY fields
        dailyRate: 0,
        includesWeekends: false,

        // MONTHLY fields
        monthlyBaseSalary: 0,
        shifts: 'Day Shift',
        workingHours: 8,
        workingDaysPerMonth: 22,
        vacations: '21 days annual leave',

        // NEW: Time fields for MONTHLY contracts
        startTime: '09:00',
        endTime: '17:00',

        // Legacy compatibility
        baseSalary: '',
        type: '',
        workingDays: '',
        customVacationDays: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [calculatedSalary, setCalculatedSalary] = useState({
        daily: 0,
        monthly: 0,
        workingHours: 0,
        workingTimeRange: ''
    });

    const contractTypes = [
        { value: 'HOURLY', label: 'Hourly Contract', description: 'Pay per hour worked with time tracking' },
        { value: 'DAILY', label: 'Daily Contract', description: 'Fixed daily rate for attendance' },
        { value: 'MONTHLY', label: 'Monthly Contract', description: 'Fixed monthly salary with set working hours' }
    ];

    const experienceLevels = [
        { value: 'ENTRY_LEVEL', label: 'Entry Level' },
        { value: 'MID_LEVEL', label: 'Mid Level' },
        { value: 'SENIOR_LEVEL', label: 'Senior Level' },
        { value: 'EXPERT_LEVEL', label: 'Expert Level' }
    ];

    // Fetch employees and departments when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            fetchDepartments();
        }
    }, [isOpen]);

    // Reset form data when modal is opened
    useEffect(() => {
        if (isOpen) {
            setFormData({
                positionName: '',
                department: '',
                head: '',
                contractType: 'MONTHLY',
                experienceLevel: 'ENTRY_LEVEL',
                probationPeriod: 90,
                active: true,

                // HOURLY fields
                workingDaysPerWeek: 5,
                hoursPerShift: 8,
                hourlyRate: 0,
                overtimeMultiplier: 1.5,
                trackBreaks: false,
                breakDurationMinutes: 30,

                // DAILY fields
                dailyRate: 0,
                workingDaysPerMonth: 22,
                includesWeekends: false,

                // MONTHLY fields
                monthlyBaseSalary: 0,
                shifts: 'Day Shift',
                workingHours: 8,
                vacations: '21 days annual leave',

                // NEW: Time fields for MONTHLY contracts
                startTime: '09:00',
                endTime: '17:00',

                // Legacy compatibility
                baseSalary: '',
                type: '',
                workingDays: '',
                customVacationDays: ''
            });
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        calculateSalaries();
    }, [formData]);

    const calculateSalaries = () => {
        let daily = 0;
        let monthly = 0;
        let workingHours = 0;
        let workingTimeRange = '';

        switch (formData.contractType) {
            case 'HOURLY':
                // Daily salary: hourly rate * hours per shift
                daily = (formData.hourlyRate || 0) * (formData.hoursPerShift || 0);
                // Monthly salary: hourly rate * hours per shift * working days per week * 4 weeks
                monthly = daily * (formData.workingDaysPerWeek || 0) * 4;
                workingHours = formData.hoursPerShift || 0;
                break;
            case 'DAILY':
                // Daily salary: daily rate
                daily = formData.dailyRate || 0;
                // Monthly salary: daily rate * working days per month
                monthly = daily * (formData.workingDaysPerMonth || 0);
                workingHours = formData.workingHours || 8; // Default to 8 hours
                break;
            case 'MONTHLY':
                // Monthly salary: monthly base salary
                monthly = formData.monthlyBaseSalary || 0;
                // Daily salary: monthly salary / working days per month (default 22)
                const workingDaysPerMonth = formData.workingDaysPerMonth || 22;
                daily = workingDaysPerMonth > 0 ? monthly / workingDaysPerMonth : 0;

                // Calculate working hours from time range
                if (formData.startTime && formData.endTime) {
                    const start = new Date(`1970-01-01T${formData.startTime}:00`);
                    const end = new Date(`1970-01-01T${formData.endTime}:00`);
                    let diffHours = (end - start) / (1000 * 60 * 60);

                    // Handle overnight shifts
                    if (diffHours < 0) {
                        diffHours += 24;
                    }

                    workingHours = Math.round(diffHours * 100) / 100;
                    workingTimeRange = `${formData.startTime} - ${formData.endTime}`;
                } else {
                    workingHours = formData.workingHours || 8;
                }
                break;
            default:
                daily = 0;
                monthly = 0;
                workingHours = 0;
        }

        setCalculatedSalary({
            daily: Math.round(daily * 100) / 100,
            monthly: Math.round(monthly * 100) / 100,
            workingHours: workingHours,
            workingTimeRange: workingTimeRange
        });
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const response = await fetch('http://localhost:8080/api/v1/employees', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch employees');
            }

            const data = await response.json();
            setEmployees(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            showError('Failed to load employees. Please try again.');
            setError(prev => prev || 'Failed to load employees');
        } finally {
            setLoadingEmployees(false);
        }
    };

    const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
            const response = await fetch('http://localhost:8080/api/v1/departments', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }

            const data = await response.json();
            setDepartments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching departments:', err);
            showError('Failed to load departments. Please try again.');
            setError(prev => prev || 'Failed to load departments');
        } finally {
            setLoadingDepartments(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));
    };

    const validateForm = () => {
        const errors = [];

        // Basic validation
        if (!formData.positionName.trim()) {
            errors.push('Position name is required');
        }

        if (!formData.department) {
            errors.push('Department is required');
        }

        // Contract-specific validation
        switch (formData.contractType) {
            case 'HOURLY':
                if (!formData.hourlyRate || formData.hourlyRate <= 0) {
                    errors.push('Hourly rate must be greater than 0');
                }
                if (!formData.hoursPerShift || formData.hoursPerShift <= 0) {
                    errors.push('Hours per shift must be greater than 0');
                }
                if (!formData.workingDaysPerWeek || formData.workingDaysPerWeek <= 0 || formData.workingDaysPerWeek > 7) {
                    errors.push('Working days per week must be between 1 and 7');
                }
                break;

            case 'DAILY':
                if (!formData.dailyRate || formData.dailyRate <= 0) {
                    errors.push('Daily rate must be greater than 0');
                }
                if (!formData.workingDaysPerMonth || formData.workingDaysPerMonth <= 0 || formData.workingDaysPerMonth > 31) {
                    errors.push('Working days per month must be between 1 and 31');
                }
                break;

            case 'MONTHLY':
                if (!formData.monthlyBaseSalary || formData.monthlyBaseSalary <= 0) {
                    errors.push('Monthly salary must be greater than 0');
                }
                if (!formData.workingDaysPerMonth || formData.workingDaysPerMonth <= 0 || formData.workingDaysPerMonth > 31) {
                    errors.push('Working days per month must be between 1 and 31');
                }

                // Validate time fields if provided
                if (formData.startTime && formData.endTime) {
                    const start = new Date(`1970-01-01T${formData.startTime}:00`);
                    const end = new Date(`1970-01-01T${formData.endTime}:00`);

                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                        errors.push('Invalid time format. Please use HH:MM format');
                    } else if (start >= end && (end.getHours() !== 0 || end.getMinutes() !== 0)) {
                        // Allow overnight shifts but warn if end time is same as start time
                        if (start.getTime() === end.getTime()) {
                            errors.push('End time must be different from start time');
                        }
                    }
                }
                break;
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate form
            const validationErrors = validateForm();
            if (validationErrors.length > 0) {
                const errorMessage = validationErrors.join('\n');
                showError(errorMessage);
                throw new Error(errorMessage);
            }

            // Prepare data for submission
            const submitData = {
                positionName: formData.positionName.trim(),
                department: formData.department,
                head: formData.head || null,
                contractType: formData.contractType,
                experienceLevel: formData.experienceLevel,
                probationPeriod: formData.probationPeriod,
                active: formData.active,

                // Contract-specific fields
                ...(formData.contractType === 'HOURLY' && {
                    workingDaysPerWeek: formData.workingDaysPerWeek,
                    hoursPerShift: formData.hoursPerShift,
                    hourlyRate: formData.hourlyRate,
                    overtimeMultiplier: formData.overtimeMultiplier,
                    trackBreaks: formData.trackBreaks,
                    breakDurationMinutes: formData.trackBreaks ? formData.breakDurationMinutes : null
                }),

                ...(formData.contractType === 'DAILY' && {
                    dailyRate: formData.dailyRate,
                    workingDaysPerMonth: formData.workingDaysPerMonth,
                    includesWeekends: formData.includesWeekends
                }),

                ...(formData.contractType === 'MONTHLY' && {
                    monthlyBaseSalary: formData.monthlyBaseSalary,
                    workingDaysPerMonth: formData.workingDaysPerMonth,
                    shifts: formData.shifts,
                    workingHours: formData.workingHours,
                    vacations: formData.vacations,
                    // NEW: Include time fields
                    ...(formData.startTime && { startTime: formData.startTime + ':00' }), // Convert to HH:mm:ss format
                    ...(formData.endTime && { endTime: formData.endTime + ':00' })
                }),

                // Calculated fields
                calculatedDailySalary: calculatedSalary.daily,
                calculatedMonthlySalary: calculatedSalary.monthly,
                calculatedWorkingHours: calculatedSalary.workingHours,
                workingTimeRange: calculatedSalary.workingTimeRange
            };

            await onSubmit(submitData);

        } catch (err) {
            console.error('Error submitting form:', err);
            showError(err.message || 'Failed to add position');
            setError(err.message || 'Failed to add position');
        } finally {
            setLoading(false);
        }
    };

    const renderContractSpecificFields = () => {
        switch (formData.contractType) {
            case 'HOURLY':
                return (
                    <div className="jp-section">
                        <h4>Hourly Contract Configuration</h4>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="hourlyRate">
                                    Hourly Rate ($) <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="hourlyRate"
                                    name="hourlyRate"
                                    value={formData.hourlyRate}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="hoursPerShift">
                                    Hours per Shift <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="hoursPerShift"
                                    name="hoursPerShift"
                                    value={formData.hoursPerShift}
                                    onChange={handleChange}
                                    min="1"
                                    max="24"
                                    required
                                />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="workingDaysPerWeek">
                                    Working Days per Week <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="workingDaysPerWeek"
                                    name="workingDaysPerWeek"
                                    value={formData.workingDaysPerWeek}
                                    onChange={handleChange}
                                    min="1"
                                    max="7"
                                    required
                                />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="overtimeMultiplier">Overtime Multiplier</label>
                                <input
                                    type="number"
                                    id="overtimeMultiplier"
                                    name="overtimeMultiplier"
                                    value={formData.overtimeMultiplier}
                                    onChange={handleChange}
                                    min="1"
                                    max="3"
                                    step="0.1"
                                />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group jp-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="trackBreaks"
                                        checked={formData.trackBreaks}
                                        onChange={handleChange}
                                    />
                                    Track Break Time
                                </label>
                            </div>
                            {formData.trackBreaks && (
                                <div className="jp-form-group">
                                    <label htmlFor="breakDurationMinutes">Break Duration (minutes)</label>
                                    <input
                                        type="number"
                                        id="breakDurationMinutes"
                                        name="breakDurationMinutes"
                                        value={formData.breakDurationMinutes}
                                        onChange={handleChange}
                                        min="0"
                                        max="120"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'DAILY':
                return (
                    <div className="jp-section">
                        <h4>Daily Contract Configuration</h4>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="dailyRate">
                                    Daily Rate ($) <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="dailyRate"
                                    name="dailyRate"
                                    value={formData.dailyRate}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="workingDaysPerMonth">
                                    Working Days per Month <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="workingDaysPerMonth"
                                    name="workingDaysPerMonth"
                                    value={formData.workingDaysPerMonth}
                                    onChange={handleChange}
                                    min="1"
                                    max="31"
                                    required
                                />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group jp-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="includesWeekends"
                                        checked={formData.includesWeekends}
                                        onChange={handleChange}
                                    />
                                    Includes Weekend Work
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 'MONTHLY':
                return (
                    <div className="jp-section">
                        <h4>Monthly Contract Configuration</h4>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="monthlyBaseSalary">
                                    Monthly Base Salary ($) <span className="jp-required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="monthlyBaseSalary"
                                    name="monthlyBaseSalary"
                                    value={formData.monthlyBaseSalary}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="workingDaysPerMonth">Working Days per Month</label>
                                <input
                                    type="number"
                                    id="workingDaysPerMonth"
                                    name="workingDaysPerMonth"
                                    value={formData.workingDaysPerMonth}
                                    onChange={handleChange}
                                    min="1"
                                    max="31"
                                    placeholder="22"
                                />
                            </div>
                        </div>

                        {/* NEW: Working Time Section */}
                        <div className="jp-time-section">
                            <h5>Working Hours Schedule</h5>
                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="startTime">Start Time</label>
                                    <input
                                        type="time"
                                        id="startTime"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className="jp-time-input"
                                    />
                                </div>
                                <div className="jp-form-group">
                                    <label htmlFor="endTime">End Time</label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        className="jp-time-input"
                                    />
                                </div>
                            </div>
                            {calculatedSalary.workingTimeRange && (
                                <div className="jp-time-preview">
                                    <span className="jp-time-label">Working Hours:</span>
                                    <span className="jp-time-value">
                                        {calculatedSalary.workingTimeRange} ({calculatedSalary.workingHours}h/day)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="shifts">Shifts</label>
                                <div className="jp-select-wrapper">
                                    <select
                                        id="shifts"
                                        name="shifts"
                                        value={formData.shifts}
                                        onChange={handleChange}
                                    >
                                        <option value="Day Shift">Day Shift</option>
                                        <option value="Night Shift">Night Shift</option>
                                        <option value="Rotating Shifts">Rotating Shifts</option>
                                        <option value="Flexible">Flexible</option>
                                    </select>
                                </div>
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="workingHours">Manual Working Hours per Day</label>
                                <input
                                    type="number"
                                    id="workingHours"
                                    name="workingHours"
                                    value={formData.workingHours}
                                    onChange={handleChange}
                                    min="1"
                                    max="24"
                                    placeholder="Leave empty to auto-calculate from time range"
                                />
                                <small className="jp-field-hint">
                                    Leave empty to auto-calculate from start/end time
                                </small>
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="vacations">Vacation Policy</label>
                                <input
                                    type="text"
                                    id="vacations"
                                    name="vacations"
                                    value={formData.vacations}
                                    onChange={handleChange}
                                    placeholder="e.g., 21 days annual leave"
                                />
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="jp-modal">
            <div className="jp-modal-content">
                <div className="jp-modal-header">
                    <h2>Add New Position</h2>
                    <button className="jp-modal-close" onClick={onClose}>×</button>
                </div>

                {error && (
                    <div className="jp-error">
                        {error}
                    </div>
                )}

                {(loadingDepartments || loadingEmployees) ? (
                    <div className="jp-loading">Loading form data...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Basic Information */}
                        <div className="jp-section">
                            <h3>Basic Information</h3>
                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="positionName">
                                        Position Name <span className="jp-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="positionName"
                                        name="positionName"
                                        value={formData.positionName}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Software Engineer"
                                    />
                                </div>

                                <div className="jp-form-group">
                                    <label htmlFor="department">
                                        Department <span className="jp-required">*</span>
                                    </label>
                                    <div className="jp-select-wrapper">
                                        <select
                                            id="department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="" disabled>Select Department</option>
                                            {departments.map(department => (
                                                <option key={department.id} value={department.name}>
                                                    {department.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="head">Reporting To</label>
                                    <div className="jp-select-wrapper">
                                        <select
                                            id="head"
                                            name="head"
                                            value={formData.head}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Manager (Optional)</option>
                                            {employees.map(employee => (
                                                <option
                                                    key={employee.id}
                                                    value={employee.fullName || `${employee.firstName} ${employee.lastName}`}
                                                >
                                                    {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="jp-form-group">
                                    <label htmlFor="experienceLevel">Experience Level</label>
                                    <div className="jp-select-wrapper">
                                        <select
                                            id="experienceLevel"
                                            name="experienceLevel"
                                            value={formData.experienceLevel}
                                            onChange={handleChange}
                                        >
                                            {experienceLevels.map(level => (
                                                <option key={level.value} value={level.value}>
                                                    {level.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="probationPeriod">Probation Period (days)</label>
                                    <input
                                        type="number"
                                        id="probationPeriod"
                                        name="probationPeriod"
                                        value={formData.probationPeriod}
                                        onChange={handleChange}
                                        min="0"
                                        max="365"
                                        placeholder="90"
                                    />
                                </div>
                                <div className="jp-checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            name="active"
                                            checked={formData.active}
                                            onChange={handleChange}
                                        />
                                        Active Position
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Contract Type Selection */}
                        <div className="jp-section">
                            <h3>Contract Type</h3>
                            <div className="jp-contract-selector">
                                {contractTypes.map(type => (
                                    <div
                                        key={type.value}
                                        className={`jp-contract-option ${formData.contractType === type.value ? 'selected' : ''}`}
                                        onClick={() => setFormData(prev => ({ ...prev, contractType: type.value }))}
                                    >
                                        <div className="jp-contract-header">
                                            <input
                                                type="radio"
                                                name="contractType"
                                                value={type.value}
                                                checked={formData.contractType === type.value}
                                                onChange={handleChange}
                                            />
                                            <span className="jp-contract-label">{type.label}</span>
                                        </div>
                                        <p className="jp-contract-description">{type.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contract-Specific Fields */}
                        {renderContractSpecificFields()}

                        {/* Salary Calculation Preview */}
                        <div className="jp-section">
                            <h3>Salary Calculation Preview</h3>
                            <div className="jp-salary-preview">
                                <div className="jp-salary-item">
                                    <span className="jp-salary-label">Calculated Daily Rate:</span>
                                    <span className="jp-salary-value">${calculatedSalary.daily.toFixed(2)}</span>
                                </div>
                                <div className="jp-salary-item">
                                    <span className="jp-salary-label">Calculated Monthly Salary:</span>
                                    <span className="jp-salary-value">${calculatedSalary.monthly.toFixed(2)}</span>
                                </div>
                                {formData.contractType === 'MONTHLY' && calculatedSalary.workingHours > 0 && (
                                    <div className="jp-salary-item">
                                        <span className="jp-salary-label">Working Hours per Day:</span>
                                        <span className="jp-salary-value">{calculatedSalary.workingHours}h</span>
                                    </div>
                                )}
                                {formData.contractType === 'MONTHLY' && calculatedSalary.workingTimeRange && (
                                    <div className="jp-salary-item">
                                        <span className="jp-salary-label">Working Time Range:</span>
                                        <span className="jp-salary-value">{calculatedSalary.workingTimeRange}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="jp-form-actions">
                            <button
                                type="button"
                                className="jp-cancel-button"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="jp-submit-button"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : 'Add Position'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AddPositionForm;