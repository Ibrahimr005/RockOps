import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './AddPositionForm.scss';
import {employeeService} from "../../../../services/hr/employeeService.js";
import {departmentService} from "../../../../services/hr/departmentService.js";
import {jobPositionService} from "../../../../services/hr/jobPositionService.js";

const STEPS = [
    { id: 1, label: 'Basic Info & Hierarchy' },
    { id: 2, label: 'Contract Configuration' },
    { id: 3, label: 'Review & Finish' }
];

const AddPositionForm = ({ isOpen, onClose, onSubmit }) => {
    const { showError } = useSnackbar();

    // --- State Management ---
    const [currentStep, setCurrentStep] = useState(1);
    const [formErrors, setFormErrors] = useState({});

    const [formData, setFormData] = useState({
        // Basics
        positionName: '',
        department: '',
        head: '',
        active: true,
        experienceLevel: 'ENTRY_LEVEL',
        probationPeriod: 90,
        parentJobPositionId: '',

        // Contract General
        contractType: 'MONTHLY',

        // HOURLY
        workingDaysPerWeek: 5,
        hoursPerShift: 8,
        hourlyRate: '',
        overtimeMultiplier: 1.5,
        trackBreaks: false,
        breakDurationMinutes: 30,

        // DAILY
        dailyRate: '',
        includesWeekends: false,

        // MONTHLY
        monthlyBaseSalary: '',
        workingDaysPerMonth: 22,
        shifts: 'Day Shift',
        workingHours: 8,
        vacations: '21 days annual leave',
        vacationDays: 21,
        startTime: '09:00',
        endTime: '17:00',

        // Deductions (Only for MONTHLY)
        absentDeduction: '',
        lateDeduction: '',
        lateForgivenessMinutes: 0,
        lateForgivenessCountPerQuarter: 0,
        leaveDeduction: '',
    });

    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);

    // Calculated values (Visual only)
    const [calculatedSalary, setCalculatedSalary] = useState({
        daily: 0,
        monthly: 0,
        workingHours: 0,
        workingTimeRange: ''
    });

    // --- Options ---
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

    // --- Effects ---

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        calculateSalaries();
    }, [formData]);

    // --- Data Fetching & Calculations ---

    const fetchInitialData = async () => {
        try {
            const [empRes, deptRes, posRes] = await Promise.all([
                employeeService.getAll(),
                departmentService.getAll(),
                jobPositionService.getAll()
            ]);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
            setJobPositions(Array.isArray(posRes.data) ? posRes.data : []);
        } catch (err) {
            console.error(err);
            showError("Failed to load required data.");
        }
    };

    const resetForm = () => {
        setFormData({
            positionName: '', department: '', head: '', active: true,
            experienceLevel: 'ENTRY_LEVEL', probationPeriod: 90, parentJobPositionId: '',
            contractType: 'MONTHLY',
            workingDaysPerWeek: 5, hoursPerShift: 8, hourlyRate: '', overtimeMultiplier: 1.5,
            trackBreaks: false, breakDurationMinutes: 30,
            dailyRate: '', includesWeekends: false,
            monthlyBaseSalary: '', workingDaysPerMonth: 22, shifts: 'Day Shift', workingHours: 8,
            vacations: '21 days annual leave', vacationDays: 21, startTime: '09:00', endTime: '17:00',
            absentDeduction: '', lateDeduction: '', lateForgivenessMinutes: 0,
            lateForgivenessCountPerQuarter: 0, leaveDeduction: ''
        });
        setCurrentStep(1);
        setFormErrors({});
    };

    const calculateSalaries = () => {
        let daily = 0;
        let monthly = 0;
        let workingHours = 0;
        let workingTimeRange = '';

        const { contractType, hourlyRate, hoursPerShift, workingDaysPerWeek, dailyRate, workingDaysPerMonth, monthlyBaseSalary, startTime, endTime } = formData;

        switch (contractType) {
            case 'HOURLY':
                daily = (Number(hourlyRate) || 0) * (Number(hoursPerShift) || 0);
                monthly = daily * (Number(workingDaysPerWeek) || 0) * 4;
                workingHours = Number(hoursPerShift) || 0;
                break;
            case 'DAILY':
                daily = Number(dailyRate) || 0;
                monthly = daily * (Number(workingDaysPerMonth) || 0);
                workingHours = Number(formData.workingHours) || 8;
                break;
            case 'MONTHLY':
                monthly = Number(monthlyBaseSalary) || 0;
                // Using standard 22 working days per month
                daily = monthly > 0 ? monthly / 22 : 0;

                if (startTime && endTime) {
                    const start = new Date(`1970-01-01T${startTime}:00`);
                    const end = new Date(`1970-01-01T${endTime}:00`);
                    let diff = (end - start) / (1000 * 60 * 60);
                    if (diff < 0) diff += 24;
                    workingHours = Math.round(diff * 100) / 100;
                    workingTimeRange = `${startTime} - ${endTime}`;
                } else {
                    workingHours = Number(formData.workingHours) || 8;
                }
                break;
        }

        setCalculatedSalary({
            daily: Math.round(daily * 100) / 100,
            monthly: Math.round(monthly * 100) / 100,
            workingHours,
            workingTimeRange
        });
    };

    const getSelectedParentHierarchyInfo = () => {
        if (!formData.parentJobPositionId) return null;
        const parent = jobPositions.find(p => p.id === formData.parentJobPositionId);
        if (!parent) return null;
        return {
            name: parent.positionName,
            department: parent.department,
            hierarchyPath: parent.hierarchyPath || parent.positionName,
            hierarchyLevel: (parent.hierarchyLevel || 0) + 1
        };
    };

    // --- Validation Logic ---

    const validateStep = (step) => {
        const errors = {};
        let isValid = true;

        // Step 1: Basic Info
        if (step === 1) {
            if (!formData.positionName.trim()) {
                errors.positionName = 'Position name is required';
                isValid = false;
            }
            if (!formData.department) {
                errors.department = 'Department is required';
                isValid = false;
            }
        }

        // Step 2: Contract Config
        if (step === 2) {
            if (formData.contractType === 'HOURLY') {
                if (!formData.hourlyRate || formData.hourlyRate <= 0) {
                    errors.hourlyRate = 'Valid hourly rate is required';
                    isValid = false;
                }
                if (!formData.hoursPerShift || formData.hoursPerShift <= 0) {
                    errors.hoursPerShift = 'Shift hours must be positive';
                    isValid = false;
                }
            } else if (formData.contractType === 'DAILY') {
                if (!formData.dailyRate || formData.dailyRate <= 0) {
                    errors.dailyRate = 'Valid daily rate is required';
                    isValid = false;
                }
                if (!formData.workingDaysPerMonth || formData.workingDaysPerMonth > 31) {
                    errors.workingDaysPerMonth = 'Invalid days per month';
                    isValid = false;
                }
            } else if (formData.contractType === 'MONTHLY') {
                if (!formData.monthlyBaseSalary || formData.monthlyBaseSalary <= 0) {
                    errors.monthlyBaseSalary = 'Valid monthly salary is required';
                    isValid = false;
                }
                if (formData.startTime === formData.endTime) {
                    errors.endTime = 'End time cannot be same as start time';
                    isValid = false;
                }
            }
        }

        // Step 3: Deductions (Only validate if Monthly)
        if (step === 3) {
            if (formData.contractType === 'MONTHLY') {
                if (formData.absentDeduction === '' || formData.absentDeduction === null || formData.absentDeduction === undefined) {
                    errors.absentDeduction = 'Absent penalty is required';
                } else if (Number(formData.absentDeduction) < 0) {
                    errors.absentDeduction = 'Cannot be negative';
                }
                if (formData.lateDeduction === '' || formData.lateDeduction === null || formData.lateDeduction === undefined) {
                    errors.lateDeduction = 'Late penalty is required';
                } else if (Number(formData.lateDeduction) < 0) {
                    errors.lateDeduction = 'Cannot be negative';
                }
                if (formData.lateForgivenessMinutes === '' || formData.lateForgivenessMinutes === null || formData.lateForgivenessMinutes === undefined) {
                    errors.lateForgivenessMinutes = 'Late forgiveness minutes is required';
                }
                if (formData.lateForgivenessCountPerQuarter === '' || formData.lateForgivenessCountPerQuarter === null || formData.lateForgivenessCountPerQuarter === undefined) {
                    errors.lateForgivenessCountPerQuarter = 'Forgiveness count is required';
                }
                if (formData.leaveDeduction !== '' && Number(formData.leaveDeduction) < 0) errors.leaveDeduction = 'Cannot be negative';
            }

            if (Object.keys(errors).length > 0) isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    // --- Event Handlers ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setLoading(true);
        try {
            const { contractType } = formData;

            // Start with essential fields
            const submitData = {
                positionName: formData.positionName.trim(),
                department: formData.department,
                head: formData.head,
                active: formData.active,
                experienceLevel: formData.experienceLevel,
                probationPeriod: Number(formData.probationPeriod),
                parentJobPositionId: formData.parentJobPositionId || null,
                contractType: contractType,
                vacationDays: formData.vacationDays ? Number(formData.vacationDays) : 21,
                // NOTE: We do NOT send calculated fields (daily, monthly, workingHours, timeRange)
                // as they are derived on the backend and sending them may cause deserialization errors.
            };

            // Add contract-specific fields and ensure numbers are parsed
            if (contractType === 'HOURLY') {
                Object.assign(submitData, {
                    workingDaysPerWeek: Number(formData.workingDaysPerWeek),
                    hoursPerShift: Number(formData.hoursPerShift),
                    hourlyRate: Number(formData.hourlyRate),
                    overtimeMultiplier: Number(formData.overtimeMultiplier),
                    trackBreaks: formData.trackBreaks,
                    breakDurationMinutes: Number(formData.breakDurationMinutes),
                    dailyRate: null,
                    monthlyBaseSalary: null,
                    baseSalary: null, // Let backend calculate based on hourly rate
                });
            } else if (contractType === 'DAILY') {
                Object.assign(submitData, {
                    dailyRate: Number(formData.dailyRate),
                    workingDaysPerMonth: Number(formData.workingDaysPerMonth),
                    includesWeekends: formData.includesWeekends,
                    hourlyRate: null,
                    monthlyBaseSalary: null,
                    baseSalary: null, // Let backend calculate based on daily rate
                });
            } else if (contractType === 'MONTHLY') {
                Object.assign(submitData, {
                    monthlyBaseSalary: Number(formData.monthlyBaseSalary),
                    baseSalary: Number(formData.monthlyBaseSalary),
                    workingDaysPerMonth: Number(formData.workingDaysPerMonth),
                    shifts: formData.shifts,
                    workingHours: Number(formData.workingHours),
                    vacations: formData.vacations,
                    startTime: formData.startTime ? `${formData.startTime}:00` : null,
                    endTime: formData.endTime ? `${formData.endTime}:00` : null,

                    // Deductions
                    absentDeduction: formData.absentDeduction ? Number(formData.absentDeduction) : null,
                    lateDeduction: formData.lateDeduction ? Number(formData.lateDeduction) : null,
                    leaveDeduction: formData.leaveDeduction ? Number(formData.leaveDeduction) : null,
                    lateForgivenessMinutes: Number(formData.lateForgivenessMinutes),
                    lateForgivenessCountPerQuarter: Number(formData.lateForgivenessCountPerQuarter),

                    hourlyRate: null,
                    dailyRate: null,
                });
            }

            // Remove any fields that are null/empty/undefined
            Object.keys(submitData).forEach(key => {
                if (submitData[key] === null || submitData[key] === '' || submitData[key] === undefined) {
                    delete submitData[key];
                }
            });

            await onSubmit(submitData);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const renderField = (label, name, type = "text", required = false, props = {}) => (
        <div className="jp-form-group">
            <label htmlFor={name}>
                {label} {required && <span className="jp-required">*</span>}
            </label>
            <input
                type={type}
                id={name}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={formErrors[name] ? 'has-error' : ''}
                {...props}
            />
            {formErrors[name] && <div className="jp-field-error">{formErrors[name]}</div>}
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="jp-modal" onClick={(e) => e.target.className === 'jp-modal' && onClose()}>
            <div className=" modal-content modal-lg">
                <div className="modal-header">
                    <h2>Add New Position</h2>
                    <button className="jp-modal-close" onClick={onClose}>×</button>
                </div>



                <div className="modal-body">
                    {/* Stepper Indicator */}
                    <div className="jp-stepper">
                        {STEPS.map(step => (
                            <div key={step.id} className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">{currentStep > step.id ? '✓' : step.id}</div>
                                <span className="step-label">{step.label}</span>
                            </div>
                        ))}
                    </div>
                    {/* STEP 1: BASIC INFO & HIERARCHY */}
                    {currentStep === 1 && (
                        <div className="step-content animation-fade">
                            <div className="jp-section">
                                <h3>Basic Information</h3>
                                <div className="jp-form-row">
                                    {renderField("Position Name", "positionName", "text", true, { placeholder: "e.g. Senior Developer" })}

                                    <div className="jp-form-group">
                                        <label>Department <span className="jp-required">*</span></label>
                                        <div className="jp-select-wrapper">
                                            <select
                                                name="department"
                                                value={formData.department}
                                                onChange={handleChange}
                                                className={formErrors.department ? 'has-error' : ''}
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        {formErrors.department && <div className="jp-field-error">{formErrors.department}</div>}
                                    </div>
                                </div>

                                <div className="jp-form-row">
                                    <div className="jp-form-group">
                                        <label>Experience Level</label>
                                        <div className="jp-select-wrapper">
                                            <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange}>
                                                {experienceLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {renderField("Probation Period (days)", "probationPeriod", "number", false, { min: 0, max: 365 })}
                                </div>
                            </div>

                            <div className="jp-section">
                                <h3>Hierarchy</h3>
                                <div className="jp-form-group">
                                    <label>Parent Position (Optional)</label>
                                    <div className="jp-select-wrapper">
                                        <select name="parentJobPositionId" value={formData.parentJobPositionId} onChange={handleChange}>
                                            <option value="">No Parent (Root Position)</option>
                                            {jobPositions.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.positionName} ({p.department})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <small className="jp-field-hint">Defines the promotion path and reporting structure.</small>
                                </div>

                                {getSelectedParentHierarchyInfo() && (
                                    <div className="jp-hierarchy-preview">
                                        <h5>Hierarchy Preview</h5>
                                        <div className="jp-hierarchy-info">
                                            <div className="jp-hierarchy-item">
                                                <span className="jp-hierarchy-label">Parent:</span>
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
                        </div>
                    )}

                    {/* STEP 2: CONTRACT CONFIGURATION */}
                    {currentStep === 2 && (
                        <div className="step-content animation-fade">
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
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="jp-section">
                                <h4>{formData.contractType} Details</h4>

                                {formData.contractType === 'HOURLY' && (
                                    <>
                                        <div className="jp-form-row">
                                            {renderField("Hourly Rate ($)", "hourlyRate", "number", true, { step: "0.01", placeholder: "0.00" })}
                                            {renderField("Hours Per Shift", "hoursPerShift", "number", true)}
                                        </div>
                                        <div className="jp-form-row">
                                            {renderField("Working Days/Week", "workingDaysPerWeek", "number", true, { max: 7 })}
                                            {renderField("Overtime Multiplier", "overtimeMultiplier", "number", false, { step: "0.1" })}
                                        </div>
                                    </>
                                )}

                                {formData.contractType === 'DAILY' && (
                                    <div className="jp-form-row">
                                        {renderField("Daily Rate ($)", "dailyRate", "number", true, { step: "0.01", placeholder: "0.00" })}
                                        {renderField("Days Per Month", "workingDaysPerMonth", "number", true, { max: 31 })}
                                    </div>
                                )}

                                {formData.contractType === 'MONTHLY' && (
                                    <>
                                        <div className="jp-form-row">
                                            {renderField("Monthly Salary ($)", "monthlyBaseSalary", "number", true, { step: "0.01", placeholder: "0.00" })}
                                        </div>
                                        <div className="jp-form-row">
                                            {renderField("Start Time", "startTime", "time", false)}
                                            {renderField("End Time", "endTime", "time", false)}
                                        </div>
                                        <div className="jp-form-row">
                                            <div className="jp-form-group">
                                                <label>Shift Type</label>
                                                <div className="jp-select-wrapper">
                                                    <select name="shifts" value={formData.shifts} onChange={handleChange}>
                                                        <option>Day Shift</option>
                                                        <option>Night Shift</option>
                                                        <option>Rotating</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {renderField("Manual Hours (Optional)", "workingHours", "number", false)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DEDUCTIONS & REVIEW */}
                    {currentStep === 3 && (
                        <div className="step-content animation-fade">

                            {/* DEDUCTIONS SECTION - ONLY VISIBLE IF MONTHLY */}
                            {formData.contractType === 'MONTHLY' && (
                                <div className="jp-section">
                                    <h3>Deductions & Policies</h3>
                                    <p className="jp-section-description">Set automatic penalties for attendance violations.</p>

                                    <div className="jp-form-row">
                                        {renderField("Absent Penalty ($)", "absentDeduction", "number", true, { min: 0, step: "0.01" })}
                                        {renderField("Late Penalty ($)", "lateDeduction", "number", true, { min: 0, step: "0.01" })}
                                    </div>

                                    <div className="jp-form-row">
                                        {renderField("Late Forgiveness (Mins)", "lateForgivenessMinutes", "number", true, { placeholder: "e.g. 15" })}
                                        {renderField("Forgiveness Count (Per Qtr)", "lateForgivenessCountPerQuarter", "number", true)}
                                    </div>

                                    <div className="jp-form-row">
                                        {renderField("Annual Vacation Days", "vacationDays", "number", true, { min: 0, placeholder: "e.g. 21" })}
                                        {renderField("Vacation Policy Description", "vacations", "text", false, { placeholder: "e.g. 21 days annual leave" })}
                                    </div>
                                </div>
                            )}

                            {/* SUMMARY SECTION - VISIBLE FOR ALL */}
                            <div className="jp-section">
                                <h3>Final Summary</h3>
                                <div className="jp-salary-preview">
                                    <div className="jp-salary-item">
                                        <span className="jp-salary-label">Calculated Daily:</span>
                                        <span className="jp-salary-value">${calculatedSalary.daily.toFixed(2)}</span>
                                    </div>
                                    <div className="jp-salary-item">
                                        <span className="jp-salary-label">Calculated Monthly:</span>
                                        <span className="jp-salary-value">${calculatedSalary.monthly.toFixed(2)}</span>
                                    </div>
                                    {calculatedSalary.workingTimeRange && (
                                        <div className="jp-salary-item">
                                            <span className="jp-salary-label">Schedule:</span>
                                            <span className="jp-salary-value">{calculatedSalary.workingTimeRange}</span>
                                        </div>
                                    )}
                                    <div className="jp-salary-item">
                                        <span className="jp-salary-label">Contract Type:</span>
                                        <span className="jp-salary-value" style={{fontSize: '1rem', textTransform: 'capitalize'}}>
                                            {formData.contractType.toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="jp-wizard-actions modal-footer">
                    <button
                        type="button"
                        className="jp-btn-secondary"
                        onClick={currentStep === 1 ? onClose : handleBack}
                        disabled={loading}
                    >
                        {currentStep === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {currentStep < 3 ? (
                        <button
                            type="button"
                            className="jp-submit-button"
                            onClick={handleNext}
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="jp-submit-button"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Creating Position...' : 'Create Position'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPositionForm;