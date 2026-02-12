import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './AddPositionForm.scss';
import { employeeService } from "../../../../services/hr/employeeService.js";
import { departmentService } from "../../../../services/hr/departmentService.js";
import { jobPositionService } from "../../../../services/hr/jobPositionService.js";

const EditPositionForm = ({ isOpen, onClose, onSubmit, position }) => {
    const { showError, showWarning } = useSnackbar();

    // Initial state matching JobPositionDTO fields
    const [formData, setFormData] = useState({
        positionName: '',
        department: '', // State for the department name
        head: '',
        contractType: 'MONTHLY',
        experienceLevel: 'ENTRY_LEVEL',
        probationPeriod: 90,
        active: true,

        // Hierarchy fields
        parentJobPositionId: '',

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
        vacationDays: 21,

        // Time fields for MONTHLY contracts
        startTime: '09:00',
        endTime: '17:00',

        // Monthly deduction fields (matching Backend DTO BigDecimal/Integer)
        absentDeduction: '',
        lateDeduction: '',
        lateForgivenessMinutes: 0,
        lateForgivenessCountPerQuarter: 0,
        leaveDeduction: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingPositions, setLoadingPositions] = useState(false);
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

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Fetch dependencies when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            fetchDepartments();
            fetchJobPositions();
        }
    }, [isOpen]);

    // Map existing position data to form state
    useEffect(() => {
        if (position && isOpen) {
            // Convert time from HH:mm:ss to HH:mm for input
            const formatTimeForInput = (timeString) => {
                if (!timeString) return '';
                if (timeString.includes(':')) {
                    const parts = timeString.split(':');
                    return `${parts[0]}:${parts[1]}`;
                }
                return timeString;
            };

            const contractType = position.contractType || position.type || 'MONTHLY';

            const mappedData = {
                positionName: position.positionName || '',
                // FIX APPLIED HERE: Check for departmentName (from Details) first, then department (from List)
                department: position.departmentName || position.department || '',
                head: position.head || '',
                contractType: contractType,
                experienceLevel: position.experienceLevel || 'ENTRY_LEVEL',
                probationPeriod: position.probationPeriod || 90,
                active: position.active !== undefined ? position.active : true,

                // Hierarchy
                parentJobPositionId: position.parentJobPositionId || '',

                // HOURLY
                workingDaysPerWeek: position.workingDaysPerWeek || 5,
                hoursPerShift: position.hoursPerShift || 8,
                hourlyRate: position.hourlyRate || 0,
                overtimeMultiplier: position.overtimeMultiplier || 1.5,
                trackBreaks: position.trackBreaks || false,
                breakDurationMinutes: position.breakDurationMinutes || 30,

                // DAILY
                dailyRate: position.dailyRate || 0,
                workingDaysPerMonth: position.workingDaysPerMonth || 22,
                includesWeekends: position.includesWeekends || false,

                // MONTHLY
                monthlyBaseSalary: position.monthlyBaseSalary || position.baseSalary || 0,
                shifts: position.shifts || 'Day Shift',
                workingHours: position.workingHours || 8,
                vacations: position.vacations || '21 days annual leave',
                vacationDays: position.vacationDays != null ? position.vacationDays : 21,

                // Time
                startTime: formatTimeForInput(position.startTime) || '09:00',
                endTime: formatTimeForInput(position.endTime) || '17:00',

                // Deduction fields - Handle nulls from backend
                absentDeduction: position.absentDeduction !== null && position.absentDeduction !== undefined ? position.absentDeduction : '',
                lateDeduction: position.lateDeduction !== null && position.lateDeduction !== undefined ? position.lateDeduction : '',
                lateForgivenessMinutes: position.lateForgivenessMinutes || 0,
                lateForgivenessCountPerQuarter: position.lateForgivenessCountPerQuarter || 0,
                leaveDeduction: position.leaveDeduction !== null && position.leaveDeduction !== undefined ? position.leaveDeduction : ''
            };

            setFormData(mappedData);
            setError(null);
        }
    }, [position, isOpen]);

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
                daily = (formData.hourlyRate || 0) * (formData.hoursPerShift || 0);
                monthly = daily * (formData.workingDaysPerWeek || 0) * 4;
                workingHours = formData.hoursPerShift || 0;
                break;
            case 'DAILY':
                daily = formData.dailyRate || 0;
                monthly = daily * (formData.workingDaysPerMonth || 0);
                workingHours = formData.workingHours || 8;
                break;
            case 'MONTHLY':
                monthly = formData.monthlyBaseSalary || 0;
                // Using standard 22 working days per month
                daily = monthly > 0 ? monthly / 22 : 0;

                if (formData.startTime && formData.endTime) {
                    const start = new Date(`1970-01-01T${formData.startTime}:00`);
                    const end = new Date(`1970-01-01T${formData.endTime}:00`);
                    let diffHours = (end - start) / (1000 * 60 * 60);
                    if (diffHours < 0) diffHours += 24;

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
            const response = await employeeService.getAll();
            setEmployees(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching employees:', err);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
            const response = await departmentService.getAll();
            setDepartments(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching departments:', err);
        } finally {
            setLoadingDepartments(false);
        }
    };

    const fetchJobPositions = async () => {
        try {
            setLoadingPositions(true);
            const response = await jobPositionService.getAll();
            setJobPositions(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching job positions:', err);
        } finally {
            setLoadingPositions(false);
        }
    };

    const getSelectedParentHierarchyInfo = () => {
        if (!formData.parentJobPositionId) return null;
        const parentPosition = jobPositions.find(pos => pos.id === formData.parentJobPositionId);
        if (!parentPosition) return null;

        return {
            name: parentPosition.positionName,
            department: parentPosition.department || parentPosition.departmentName, // Use fallback here too
            hierarchyPath: parentPosition.hierarchyPath || parentPosition.positionName,
            hierarchyLevel: (parentPosition.hierarchyLevel || 0) + 1
        };
    };

    const getCurrentHierarchyInfo = () => {
        if (!position) return null;
        return {
            currentLevel: position.hierarchyLevel || 0,
            isRootPosition: position.isRootPosition || false,
            hierarchyPath: position.hierarchyPath || position.positionName,
            parentPositionName: position.parentJobPositionName || null,
            childCount: position.childPositionIds ? position.childPositionIds.length : 0
        };
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

        if (!formData.positionName.trim()) errors.push('Position name is required');
        if (!formData.department) errors.push('Department is required');

        // Hierarchy validation
        if (formData.parentJobPositionId && position) {
            if (formData.parentJobPositionId === position.id) {
                errors.push('A position cannot be its own parent');
            }
            const parentPosition = jobPositions.find(pos => pos.id === formData.parentJobPositionId);
            // NOTE: The current position details DTO does not expose childPositionIds directly
            // when fetched from the details API. This validation assumes it is populated
            // from the list API's data (jobPositions state).
            if (parentPosition && position.childPositionIds && position.childPositionIds.includes(formData.parentJobPositionId)) {
                errors.push('Cannot select a child position as parent (would create circular reference)');
            }
        }

        // Contract Specifics
        if (formData.contractType === 'HOURLY') {
            if (formData.hourlyRate <= 0) errors.push('Hourly rate must be greater than 0');
            if (formData.hoursPerShift <= 0) errors.push('Hours per shift must be greater than 0');
        } else if (formData.contractType === 'DAILY') {
            if (formData.dailyRate <= 0) errors.push('Daily rate must be greater than 0');
        } else if (formData.contractType === 'MONTHLY') {
            if (formData.monthlyBaseSalary <= 0) errors.push('Monthly salary must be greater than 0');

            if (formData.startTime && formData.endTime) {
                const start = new Date(`1970-01-01T${formData.startTime}:00`);
                const end = new Date(`1970-01-01T${formData.endTime}:00`);
                if (start >= end && (end.getHours() !== 0 || end.getMinutes() !== 0)) {
                    if (start.getTime() === end.getTime()) errors.push('End time must be different from start time');
                }
            }

            // Negative values check for deductions
            if (formData.absentDeduction === '' || formData.absentDeduction === null || formData.absentDeduction === undefined) {
                errors.push('Absent penalty is required for monthly contracts');
            } else if (Number(formData.absentDeduction) < 0) {
                errors.push('Absent deduction cannot be negative');
            }
            if (formData.lateDeduction === '' || formData.lateDeduction === null || formData.lateDeduction === undefined) {
                errors.push('Late penalty is required for monthly contracts');
            } else if (Number(formData.lateDeduction) < 0) {
                errors.push('Late deduction cannot be negative');
            }
            if (formData.lateForgivenessMinutes === '' || formData.lateForgivenessMinutes === null || formData.lateForgivenessMinutes === undefined) {
                errors.push('Late forgiveness minutes is required for monthly contracts');
            }
            if (formData.lateForgivenessCountPerQuarter === '' || formData.lateForgivenessCountPerQuarter === null || formData.lateForgivenessCountPerQuarter === undefined) {
                errors.push('Forgiveness count per quarter is required for monthly contracts');
            }
            if (formData.leaveDeduction !== '' && Number(formData.leaveDeduction) < 0) errors.push('Leave deduction cannot be negative');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const validationErrors = validateForm();
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n'));
            }

            // Construct DTO
            const submitData = {
                id: position.id, // Ensure ID is present
                positionName: formData.positionName.trim(),
                department: formData.department,
                head: formData.head || null,
                contractType: formData.contractType,
                experienceLevel: formData.experienceLevel,
                probationPeriod: formData.probationPeriod,
                active: formData.active,

                // Explicitly send null if string is empty to allow removal of parent
                parentJobPositionId: formData.parentJobPositionId || null,
                vacationDays: formData.vacationDays ? Number(formData.vacationDays) : 21,

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
                    shifts: formData.shifts,
                    workingHours: formData.workingHours,
                    vacations: formData.vacations,
                    // Append seconds to time for LocalTime parsing in Java
                    ...(formData.startTime && { startTime: formData.startTime + ':00' }),
                    ...(formData.endTime && { endTime: formData.endTime + ':00' }),

                    // Deduction fields - Send null if empty string to clear values on backend
                    absentDeduction: formData.absentDeduction !== '' ? Number(formData.absentDeduction) : null,
                    lateDeduction: formData.lateDeduction !== '' ? Number(formData.lateDeduction) : null,
                    leaveDeduction: formData.leaveDeduction !== '' ? Number(formData.leaveDeduction) : null,

                    lateForgivenessMinutes: formData.lateForgivenessMinutes || 0,
                    lateForgivenessCountPerQuarter: formData.lateForgivenessCountPerQuarter || 0,
                }),

                // Note: We do NOT send calculated fields (calculatedDailySalary, etc.)
                // as the backend re-calculates them on save.
            };

            await onSubmit(submitData);

        } catch (err) {
            console.error('Error submitting form:', err);
            // Check for the "userMessage" field from the Backend Controller's custom error response
            const msg = err?.response?.data?.userMessage ||
                err?.response?.data?.message ||
                err.message ||
                'Failed to update position';
            showError(msg);
            setError(msg);
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
                                <label htmlFor="hourlyRate">Hourly Rate ($) <span className="jp-required">*</span></label>
                                <input type="number" id="hourlyRate" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} min="0" step="0.01" required placeholder="0.00" />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="hoursPerShift">Hours per Shift <span className="jp-required">*</span></label>
                                <input type="number" id="hoursPerShift" name="hoursPerShift" value={formData.hoursPerShift} onChange={handleChange} min="1" max="24" required />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="workingDaysPerWeek">Working Days per Week <span className="jp-required">*</span></label>
                                <input type="number" id="workingDaysPerWeek" name="workingDaysPerWeek" value={formData.workingDaysPerWeek} onChange={handleChange} min="1" max="7" required />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="overtimeMultiplier">Overtime Multiplier</label>
                                <input type="number" id="overtimeMultiplier" name="overtimeMultiplier" value={formData.overtimeMultiplier} onChange={handleChange} min="1" max="3" step="0.1" />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group jp-checkbox-group">
                                <label>
                                    <input type="checkbox" name="trackBreaks" checked={formData.trackBreaks} onChange={handleChange} />
                                    Track Break Time
                                </label>
                            </div>
                            {formData.trackBreaks && (
                                <div className="jp-form-group">
                                    <label htmlFor="breakDurationMinutes">Break Duration (minutes)</label>
                                    <input type="number" id="breakDurationMinutes" name="breakDurationMinutes" value={formData.breakDurationMinutes} onChange={handleChange} min="0" max="120" />
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
                                <label htmlFor="dailyRate">Daily Rate ($) <span className="jp-required">*</span></label>
                                <input type="number" id="dailyRate" name="dailyRate" value={formData.dailyRate} onChange={handleChange} min="0" step="0.01" required placeholder="0.00" />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="workingDaysPerMonth">Working Days per Month <span className="jp-required">*</span></label>
                                <input type="number" id="workingDaysPerMonth" name="workingDaysPerMonth" value={formData.workingDaysPerMonth} onChange={handleChange} min="1" max="31" required />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group jp-checkbox-group">
                                <label>
                                    <input type="checkbox" name="includesWeekends" checked={formData.includesWeekends} onChange={handleChange} />
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
                                <label htmlFor="monthlyBaseSalary">Monthly Base Salary ($) <span className="jp-required">*</span></label>
                                <input type="number" id="monthlyBaseSalary" name="monthlyBaseSalary" value={formData.monthlyBaseSalary} onChange={handleChange} min="0" step="0.01" required placeholder="0.00" />
                            </div>
                        </div>

                        <div className="jp-time-section">
                            <h5>Working Hours Schedule</h5>
                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="startTime">Start Time</label>
                                    <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleChange} className="jp-time-input" />
                                </div>
                                <div className="jp-form-group">
                                    <label htmlFor="endTime">End Time</label>
                                    <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={handleChange} className="jp-time-input" />
                                </div>
                            </div>
                            {calculatedSalary.workingTimeRange && (
                                <div className="jp-time-preview">
                                    <span className="jp-time-label">Working Hours:</span>
                                    <span className="jp-time-value">{calculatedSalary.workingTimeRange} ({calculatedSalary.workingHours}h/day)</span>
                                </div>
                            )}
                        </div>

                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="shifts">Shifts</label>
                                <div className="jp-select-wrapper">
                                    <select id="shifts" name="shifts" value={formData.shifts} onChange={handleChange}>
                                        <option value="Day Shift">Day Shift</option>
                                        <option value="Night Shift">Night Shift</option>
                                        <option value="Rotating Shifts">Rotating Shifts</option>
                                        <option value="Flexible">Flexible</option>
                                    </select>
                                </div>
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="workingHours">Manual Working Hours per Day</label>
                                <input type="number" id="workingHours" name="workingHours" value={formData.workingHours} onChange={handleChange} min="1" max="24" placeholder="Leave empty to auto-calculate" />
                            </div>
                        </div>
                        <div className="jp-form-row">
                            <div className="jp-form-group">
                                <label htmlFor="vacationDays">Annual Vacation Days <span className="required">*</span></label>
                                <input type="number" id="vacationDays" name="vacationDays" value={formData.vacationDays} onChange={handleChange} min="0" placeholder="e.g., 21" />
                            </div>
                            <div className="jp-form-group">
                                <label htmlFor="vacations">Vacation Policy Description</label>
                                <input type="text" id="vacations" name="vacations" value={formData.vacations} onChange={handleChange} placeholder="e.g., 21 days annual leave" />
                            </div>
                        </div>

                        <div className="jp-deduction-section">
                            <h5>Deduction Settings</h5>
                            <p className="jp-section-description">Configure automatic deductions for attendance violations and leave excess.</p>

                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="absentDeduction">Absent Penalty ($) <span className="required">*</span></label>
                                    <input type="number" id="absentDeduction" name="absentDeduction" value={formData.absentDeduction} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                                    <small className="jp-field-hint">Amount deducted when attendance status is Absent</small>
                                </div>
                                <div className="jp-form-group">
                                    <label htmlFor="lateDeduction">Late Penalty ($) <span className="required">*</span></label>
                                    <input type="number" id="lateDeduction" name="lateDeduction" value={formData.lateDeduction} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                                    <small className="jp-field-hint">Amount deducted when attendance status is Late</small>
                                </div>
                            </div>

                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="lateForgivenessMinutes">Late Forgiveness (Mins) <span className="required">*</span></label>
                                    <input type="number" id="lateForgivenessMinutes" name="lateForgivenessMinutes" value={formData.lateForgivenessMinutes} onChange={handleChange} min="0" max="60" placeholder="0" required />
                                    <small className="jp-field-hint">Grace period in minutes before late deduction is applied</small>
                                </div>
                                <div className="jp-form-group">
                                    <label htmlFor="lateForgivenessCountPerQuarter">Forgiveness Count (Per Qtr) <span className="required">*</span></label>
                                    <input type="number" id="lateForgivenessCountPerQuarter" name="lateForgivenessCountPerQuarter" value={formData.lateForgivenessCountPerQuarter} onChange={handleChange} min="0" max="20" placeholder="0" required />
                                    <small className="jp-field-hint">Number of late occurrences forgiven per quarter</small>
                                </div>
                            </div>

                            <div className="jp-form-row">
                                <div className="jp-form-group">
                                    <label htmlFor="leaveDeduction">Leave Excess Deduction per Day ($)</label>
                                    <input type="number" id="leaveDeduction" name="leaveDeduction" value={formData.leaveDeduction} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
                                    <small className="jp-field-hint">Amount deducted per day when exceeding annual leave</small>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content modal-xl">
                <div className="modal-header">
                    <h2>Edit Position: {position?.positionName}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                {(loadingDepartments || loadingEmployees || loadingPositions) ? (
                    <div className="jp-loading">Loading form data...</div>
                ) : (
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="jp-section">
                                <h3>Basic Information</h3>
                                <div className="jp-form-row">
                                    <div className="jp-form-group">
                                        <label htmlFor="positionName">Position Name <span className="jp-required">*</span></label>
                                        <input type="text" id="positionName" name="positionName" value={formData.positionName} onChange={handleChange} required placeholder="e.g. Software Engineer" />
                                    </div>
                                    <div className="jp-form-group">
                                        <label htmlFor="department">Department <span className="jp-required">*</span></label>
                                        <div className="jp-select-wrapper">
                                            <select id="department" name="department" value={formData.department} onChange={handleChange} required>
                                                <option value="" disabled>Select Department</option>
                                                {departments.map(department => (
                                                    <option key={department.id} value={department.name}>{department.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="jp-form-row">
                                    <div className="jp-form-group">
                                        <label htmlFor="experienceLevel">Experience Level</label>
                                        <div className="jp-select-wrapper">
                                            <select id="experienceLevel" name="experienceLevel" value={formData.experienceLevel} onChange={handleChange}>
                                                {experienceLevels.map(level => (
                                                    <option key={level.value} value={level.value}>{level.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="jp-form-group">
                                        <label htmlFor="probationPeriod">Probation Period (days)</label>
                                        <input type="number" id="probationPeriod" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} min="0" max="365" placeholder="90" />
                                    </div>
                                </div>
                                <div className="jp-form-row">
                                    <div className="jp-checkbox-group">
                                        <label>
                                            <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
                                            Active Position
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="jp-section">
                                <h3>Position Hierarchy</h3>
                                {getCurrentHierarchyInfo() && (
                                    <div className="jp-current-hierarchy">
                                        <h5>Current Hierarchy</h5>
                                        <div className="jp-hierarchy-info">
                                            <div className="jp-hierarchy-item">
                                                <span className="jp-hierarchy-label">Current Level:</span>
                                                <span className="jp-hierarchy-value">Level {getCurrentHierarchyInfo().currentLevel}{getCurrentHierarchyInfo().isRootPosition && ' (Root Position)'}</span>
                                            </div>
                                            {getCurrentHierarchyInfo().parentPositionName && (
                                                <div className="jp-hierarchy-item">
                                                    <span className="jp-hierarchy-label">Current Parent:</span>
                                                    <span className="jp-hierarchy-value">{getCurrentHierarchyInfo().parentPositionName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="jp-form-row">
                                    <div className="jp-form-group">
                                        <label htmlFor="parentJobPositionId">Parent Position (Optional)</label>
                                        <div className="jp-select-wrapper">
                                            <select id="parentJobPositionId" name="parentJobPositionId" value={formData.parentJobPositionId} onChange={handleChange}>
                                                <option value="">Set as Root Position (No Parent)</option>
                                                {jobPositions
                                                    .filter(pos =>
                                                        pos.active &&
                                                        pos.id !== position?.id &&
                                                        // NOTE: Filtering children relies on pos.childPositionIds being available in the jobPositions list.
                                                        !(position?.childPositionIds || []).includes(pos.id)
                                                    )
                                                    .map(jobPosition => (
                                                        <option key={jobPosition.id} value={jobPosition.id}>
                                                            {jobPosition.positionName} ({jobPosition.department || jobPosition.departmentName})
                                                            {jobPosition.hierarchyLevel !== undefined && ` - Level ${jobPosition.hierarchyLevel}`}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <small className="jp-field-hint">Select a parent position to update the hierarchical relationship. Child positions cannot be selected as parents.</small>
                                    </div>
                                </div>

                                {getSelectedParentHierarchyInfo() && (
                                    <div className="jp-hierarchy-preview">
                                        <h5>New Hierarchy Preview</h5>
                                        <div className="jp-hierarchy-info">
                                            <div className="jp-hierarchy-item">
                                                <span className="jp-hierarchy-label">New Parent:</span>
                                                <span className="jp-hierarchy-value">{getSelectedParentHierarchyInfo().name}</span>
                                            </div>
                                            <div className="jp-hierarchy-item">
                                                <span className="jp-hierarchy-label">New Level:</span>
                                                <span className="jp-hierarchy-value">Level {getSelectedParentHierarchyInfo().hierarchyLevel}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="jp-section">
                                <h3>Contract Type</h3>
                                <div className="jp-contract-selector">
                                    {contractTypes.map(type => (
                                        <div key={type.value} className={`jp-contract-option ${formData.contractType === type.value ? 'selected' : ''}`} onClick={() => setFormData(prev => ({ ...prev, contractType: type.value }))}>
                                            <div className="jp-contract-header">
                                                <input type="radio" name="contractType" value={type.value} checked={formData.contractType === type.value} onChange={handleChange} />
                                                <span className="jp-contract-label">{type.label}</span>
                                            </div>
                                            <p className="jp-contract-description">{type.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {renderContractSpecificFields()}

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
                                </div>
                            </div>

                            {error && <div className="jp-error-message">{error}</div>}


                        </form>
                    </div>
                )}
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading} onClick={handleSubmit}>{loading ? 'Updating...' : 'Update Position'}</button>
                </div>
            </div>
        </div>
    );
};

export default EditPositionForm;