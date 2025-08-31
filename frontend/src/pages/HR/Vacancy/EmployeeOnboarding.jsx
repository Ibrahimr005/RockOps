import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaUser,
    FaBriefcase,
    FaFileContract,
    FaCheckCircle,
    FaTimes,
    FaArrowLeft,
    FaArrowRight,
    FaUpload,
    FaInfoCircle,
    FaUserPlus
} from 'react-icons/fa';
import './EmployeeOnboarding.scss';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { employeeService } from '../../../services/hr/employeeService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';
import { candidateService } from '../../../services/hr/candidateService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import {hrEmployeeService} from "../../../services/hr/hrEmployeeService.js";

// Salary calculation function matching AddEmployeeModal
const calculateMonthlySalary = (jobPosition, baseSalaryOverride, salaryMultiplier) => {
    if (!jobPosition) return 0;
    const multiplier = salaryMultiplier ? parseFloat(salaryMultiplier) : 1.0;

    switch (jobPosition.contractType) {
        case 'HOURLY': {
            const hourlyRate = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.hourlyRate || 0);
            return hourlyRate * multiplier * (jobPosition.workingDaysPerWeek * 4) * jobPosition.hoursPerShift;
        }
        case 'DAILY': {
            const dailyRate = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.dailyRate || 0);
            return dailyRate * multiplier * jobPosition.workingDaysPerMonth;
        }
        case 'MONTHLY': {
            const monthlyBaseSalary = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.monthlyBaseSalary || 0);
            return monthlyBaseSalary * multiplier;
        }
        default:
            return 0;
    }
};

const EmployeeOnboarding = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, showWarning } = useSnackbar();

    // State for form steps
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Candidate context
    const [isFromCandidate, setIsFromCandidate] = useState(false);
    const [candidateId, setCandidateId] = useState(null);
    const [candidateData, setCandidateData] = useState(null);

    // Dropdown data
    const [jobPositions, setJobPositions] = useState([]);

    // Form data state - UPDATED to match AddEmployeeModal exactly
    const [formData, setFormData] = useState({
        // From candidate (if applicable)
        candidateId: null,

        // Personal Information - matching EmployeeRequestDTO
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phoneNumber: '',
        address: '',
        city: '',
        country: '',
        birthDate: '', // Changed from dateOfBirth to match backend DTO
        nationalIDNumber: '', // Changed from nationalId to match backend DTO
        gender: '',
        maritalStatus: '',
        militaryStatus: '',
        education: '',

        // Employment Details
        jobPositionId: '',
        hireDate: new Date().toISOString().split('T')[0], // Changed from startDate to match backend DTO
        status: 'ACTIVE',

        // Compensation
        baseSalaryOverride: '',
        salaryMultiplier: 1.0,

        // Previous employment (from candidate)
        previousPosition: '',
        previousCompany: ''
    });

    // File states
    const [photoFile, setPhotoFile] = useState(null);
    const [idFrontFile, setIdFrontFile] = useState(null);
    const [idBackFile, setIdBackFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: null
    });

    const steps = [
        {
            number: 1,
            title: 'Personal Information',
            icon: <FaUser />,
            description: 'Basic employee details and contact information'
        },
        {
            number: 2,
            title: 'Employment Details',
            icon: <FaBriefcase />,
            description: 'Job position, department, and employment terms'
        },
        {
            number: 3,
            title: 'Documents & Files',
            icon: <FaFileContract />,
            description: 'Upload required documents and photos'
        },
        {
            number: 4,
            title: 'Review & Confirm',
            icon: <FaCheckCircle />,
            description: 'Review all information before creating employee'
        }
    ];

    // Load prepopulated data from candidate and fetch dropdown data
    useEffect(() => {
        fetchJobPositions();

        const prepopulatedData = sessionStorage.getItem('prepopulatedEmployeeData');
        if (prepopulatedData) {
            try {
                const parsedData = JSON.parse(prepopulatedData);
                setCandidateData(parsedData);

                // Map candidate data to match our form structure
                const mappedData = {
                    ...parsedData,
                    // Map any field name differences
                    birthDate: parsedData.dateOfBirth || parsedData.birthDate || '',
                    nationalIDNumber: parsedData.nationalId || parsedData.nationalIDNumber || '',
                    hireDate: parsedData.startDate || parsedData.hireDate || new Date().toISOString().split('T')[0]
                };

                // Populate form with candidate data
                setFormData(prev => ({
                    ...prev,
                    ...mappedData
                }));

                // Save candidate ID if available
                if (parsedData.candidateId) {
                    setCandidateId(parsedData.candidateId);
                    setIsFromCandidate(true);
                }

            } catch (error) {
                console.error('Error parsing prepopulated data:', error);
                showError('Error loading candidate data');
            }
        }
    }, [showError]);

    const fetchJobPositions = async () => {
        try {
            const response = await jobPositionService.getAll();
            setJobPositions(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching job positions:', error);
            showError('Failed to load job positions');
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    // Handle number input changes (for financial fields)
    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        // Allow empty value or valid number
        if (value === '' || !isNaN(parseFloat(value))) {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle job position selection
    const handleJobPositionChange = (e) => {
        const selectedPositionId = e.target.value;
        setFormData(prev => ({ ...prev, jobPositionId: selectedPositionId }));

        // Find selected position details
        if (selectedPositionId) {
            const selectedPosition = jobPositions.find(pos => pos.id === selectedPositionId);
            if (selectedPosition) {
                setFormData(prev => ({
                    ...prev,
                    departmentId: selectedPosition.departmentId || ''
                }));
            }
        }
    };

    // Get selected job position details
    const getSelectedJobPosition = () => {
        return jobPositions.find(pos => pos.id === formData.jobPositionId);
    };

    // Handle file changes
    const handleFileChange = (e, fileType) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showError('File size must be less than 5MB');
            return;
        }

        switch (fileType) {
            case 'photo':
                setPhotoFile(file);
                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => setPhotoPreview(e.target.result);
                reader.readAsDataURL(file);
                break;
            case 'idFront':
                setIdFrontFile(file);
                break;
            case 'idBack':
                setIdBackFile(file);
                break;
            default:
                break;
        }
    };

    // Navigate between steps
    const nextStep = () => {
        if (currentStep < 4) {
            if (validateCurrentStep()) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Validate current step
    const validateCurrentStep = () => {
        const errors = [];

        switch (currentStep) {
            case 1:
                // Required fields matching AddEmployeeModal validation
                if (!formData.firstName?.trim()) errors.push('First name is required');
                if (!formData.lastName?.trim()) errors.push('Last name is required');
                if (!formData.nationalIDNumber?.trim()) errors.push('National ID is required');
                if (!formData.birthDate) errors.push('Date of birth is required');
                if (!formData.country?.trim()) errors.push('Country is required');
                if (!formData.gender) errors.push('Gender is required');

                // Email validation (optional but must be valid if provided)
                if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                    errors.push('Email is invalid');
                }

                // Phone validation (optional but must be valid if provided)
                if (formData.phoneNumber && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(formData.phoneNumber)) {
                    errors.push('Phone number is invalid');
                }

                // Date validations
                if (formData.birthDate) {
                    const birthDateObj = new Date(formData.birthDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    birthDateObj.setHours(0, 0, 0, 0);

                    if (birthDateObj > today) {
                        errors.push('Birth date cannot be in the future');
                    }
                }
                break;
            case 2:
                if (!formData.jobPositionId) errors.push('Job position is required');
                if (!formData.hireDate) errors.push('Hire date is required');

                // Hire date validation
                if (formData.hireDate) {
                    const hireDateObj = new Date(formData.hireDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    hireDateObj.setHours(0, 0, 0, 0);

                    if (hireDateObj > today) {
                        errors.push('Hire date cannot be in the future');
                    }
                }
                break;
            case 3:
                // File validation is optional but can be added here
                break;
            default:
                break;
        }

        if (errors.length > 0) {
            showError(errors.join(', '));
            return false;
        }
        return true;
    };

    // Handle form submission
    const handleSubmit = () => {
        if (!validateCurrentStep()) return;

        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: isFromCandidate ? 'Complete Hiring Process' : 'Create New Employee',
            message: isFromCandidate
                ? `Are you sure you want to finalize the hiring of ${formData.firstName} ${formData.lastName}? This will complete the hiring process and mark the candidate as hired.`
                : `Are you sure you want to create employee record for ${formData.firstName} ${formData.lastName}?`,
            onConfirm: submitEmployee
        });
    };

    const submitEmployee = async () => {
        try {
            setIsLoading(true);

            // Prepare final data according to DTO structure
            const finalData = {
                ...formData,
                jobPositionId: formData.jobPositionId ? formData.jobPositionId : null,
                // Convert number strings to appropriate types for API
                baseSalaryOverride: formData.baseSalaryOverride ? parseFloat(formData.baseSalaryOverride) : null,
                salaryMultiplier: formData.salaryMultiplier ? parseFloat(formData.salaryMultiplier) : 1.0,
                // Convert empty date strings to null to prevent backend parsing errors
                birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : null,
                hireDate: formData.hireDate && formData.hireDate.trim() !== '' ? formData.hireDate : null
            };

            // Remove siteId as it's not in the DTO
            const { siteId, ...dtoData } = finalData;

            // Add candidate ID if from candidate conversion
            if (isFromCandidate && candidateId) {
                dtoData.candidateId = candidateId;
            }

            console.log("Employee data being sent:", dtoData);

            // Create FormData for multipart/form-data request
            const formDataToSubmit = new FormData();

            // Add employee data as a JSON Blob
            formDataToSubmit.append("employeeData", new Blob([JSON.stringify(dtoData)], {
                type: "application/json"
            }));

            // Add image files if provided with correct field names
            if (photoFile) {
                formDataToSubmit.append('photo', photoFile);
                console.log('Added photo file:', photoFile.name);
            }

            if (idFrontFile) {
                formDataToSubmit.append('idFrontImage', idFrontFile);
                console.log('Added ID front file:', idFrontFile.name);
            }

            if (idBackFile) {
                formDataToSubmit.append('idBackImage', idBackFile);
                console.log('Added ID back file:', idBackFile.name);
            }

            // Debug FormData contents
            for (let pair of formDataToSubmit.entries()) {
                console.log(pair[0], pair[1] instanceof Blob ? `Blob: ${pair[1].type}, size: ${pair[1].size}` : pair[1]);
            }

            // Call the service with FormData
            const response = await hrEmployeeService.employee.create(formDataToSubmit);
            await candidateService.updateStatus(candidateId, 'HIRED');

            console.log('Employee created successfully:', response.data);

            // If this is from a candidate, finalize the hiring process
            if (isFromCandidate && candidateId) {
                try {
                    // Update candidate status to HIRED
                    await candidateService.updateStatus(candidateId, 'HIRED');
                    console.log('Candidate status updated to HIRED for candidate ID:', candidateId);
                    showSuccess('Employee created and candidate hiring process completed successfully!');
                } catch (error) {
                    console.error('Error finalizing candidate hiring:', error);
                    showWarning('Employee created successfully, but there was an issue finalizing the candidate status. Please check manually.');
                }
            } else {
                showSuccess('Employee created successfully!');
            }

            // Clear prepopulated data from session storage
            sessionStorage.removeItem('prepopulatedEmployeeData');

            // Navigate to employee list or details
            navigate('/hr/employees', {
                state: {
                    message: isFromCandidate ? 'Hiring process completed successfully!' : 'Employee created successfully!',
                    newEmployeeId: response.data?.employee?.id
                }
            });

        } catch (error) {
            console.error('Error creating employee:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create employee';
            showError(errorMessage);
        } finally {
            setIsLoading(false);
            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
        }
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <div className="step-indicator">
            {steps.map((step, index) => (
                <div key={step.number} className={`step-item ${currentStep === step.number ? 'active' : currentStep > step.number ? 'completed' : ''}`}>
                    <div className="step-circle">
                        {currentStep > step.number ? <FaCheckCircle /> : step.icon}
                    </div>
                    <div className="step-content">
                        <div className="step-title">{step.title}</div>
                        <div className="step-description">{step.description}</div>
                    </div>
                    {index < steps.length - 1 && <div className="step-connector" />}
                </div>
            ))}
        </div>
    );

    // Render step 1 - Personal Information (UPDATED to match AddEmployeeModal)
    const renderStep1 = () => (
        <div className="form-step">
            {isFromCandidate && candidateData && (
                <div className="candidate-info-banner">
                    <FaInfoCircle />
                    <div>
                        <strong>Hiring from Candidate Application</strong>
                        <p>Some information has been pre-filled from the candidate's application. You can modify any details below.</p>
                    </div>
                </div>
            )}

            <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>First Name *</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Middle Name</label>
                        <input
                            type="text"
                            name="middleName"
                            value={formData.middleName}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Last Name *</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Personal Details</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>National ID Number *</label>
                        <input
                            type="text"
                            name="nationalIDNumber"
                            value={formData.nationalIDNumber}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Date of Birth *</label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Gender *</label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Marital Status</label>
                        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}>
                            <option value="">Select Status</option>
                            <option value="SINGLE">Single</option>
                            <option value="MARRIED">Married</option>
                            <option value="DIVORCED">Divorced</option>
                            <option value="WIDOWED">Widowed</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Military Status</label>
                        <select name="militaryStatus" value={formData.militaryStatus} onChange={handleInputChange}>
                            <option value="">Select Status</option>
                            <option value="NONE">None</option>
                            <option value="ACTIVE">Active</option>
                            <option value="VETERAN">Veteran</option>
                            <option value="RESERVE">Reserve</option>
                            <option value="EXEMPT">Exempt</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Education</label>
                        <select name="education" value={formData.education} onChange={handleInputChange}>
                            <option value="">Select Education Level</option>
                            <option value="HIGH_SCHOOL">High School</option>
                            <option value="ASSOCIATE">Associate Degree</option>
                            <option value="BACHELOR">Bachelor's Degree</option>
                            <option value="MASTER">Master's Degree</option>
                            <option value="DOCTORATE">Doctorate</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Contact Information</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Country *</label>
                        <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Address</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                    />
                </div>
            </div>
        </div>
    );

    // Render step 2 - Employment Details (UPDATED to match AddEmployeeModal)
    const renderStep2 = () => {
        const selectedJobPosition = getSelectedJobPosition();

        return (
            <div className="form-step">
                <div className="form-section">
                    <h3>Position & Department</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Job Position *</label>
                            <select
                                name="jobPositionId"
                                value={formData.jobPositionId}
                                onChange={handleJobPositionChange}
                                required
                            >
                                <option value="">Select Job Position</option>
                                {jobPositions.map(position => (
                                    <option key={position.id} value={position.id}>
                                        {position.positionName} - {position.department || position.departmentName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedJobPosition && (
                        <div className="job-details">
                            <h4>Position Details</h4>
                            <p><strong>Position:</strong> {selectedJobPosition.positionName}</p>
                            <p><strong>Department:</strong> {selectedJobPosition.department || selectedJobPosition.departmentName || 'N/A'}</p>
                            <p><strong>Contract Type:</strong> {selectedJobPosition.contractType?.replace('_', ' ') || 'N/A'}</p>
                            {selectedJobPosition.contractType === 'HOURLY' && (
                                <>
                                    <p><strong>Working Days/Week:</strong> {selectedJobPosition.workingDaysPerWeek || 'N/A'}</p>
                                    <p><strong>Hours/Shift:</strong> {selectedJobPosition.hoursPerShift || 'N/A'}</p>
                                    <p><strong>Hourly Rate:</strong> ${selectedJobPosition.hourlyRate?.toFixed(2) || 'N/A'}</p>
                                </>
                            )}
                            {selectedJobPosition.contractType === 'DAILY' && (
                                <>
                                    <p><strong>Working Days/Month:</strong> {selectedJobPosition.workingDaysPerMonth || 'N/A'}</p>
                                    <p><strong>Daily Rate:</strong> ${selectedJobPosition.dailyRate?.toFixed(2) || 'N/A'}</p>
                                </>
                            )}
                            {selectedJobPosition.contractType === 'MONTHLY' && (
                                <>
                                    <p><strong>Monthly Base Salary:</strong> ${selectedJobPosition.monthlyBaseSalary?.toFixed(2) || 'N/A'}</p>
                                    <p><strong>Working Hours:</strong> {selectedJobPosition.workingHours || 'N/A'}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Employment Terms</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Hire Date *</label>
                            <input
                                type="date"
                                name="hireDate"
                                value={formData.hireDate}
                                onChange={handleInputChange}
                                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="ON_LEAVE">On Leave</option>
                                <option value="SUSPENDED">Suspended</option>
                                <option value="TERMINATED">Terminated</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Compensation</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Base Salary Override</label>
                            <input
                                type="number"
                                name="baseSalaryOverride"
                                value={formData.baseSalaryOverride}
                                onChange={handleNumberChange}
                                min="0"
                                step="0.01"
                                placeholder={selectedJobPosition?.baseSalary || 'Enter amount'}
                            />
                            <small>Optional: Override the default salary for this position</small>
                        </div>
                        <div className="form-group">
                            <label>Salary Multiplier</label>
                            <input
                                type="number"
                                name="salaryMultiplier"
                                value={formData.salaryMultiplier}
                                onChange={handleNumberChange}
                                min="0.1"
                                max="5"
                                step="0.1"
                            />
                            <small>Multiplier applied to base salary (1.0 = 100%)</small>
                        </div>
                    </div>

                    {selectedJobPosition && (
                        <div className="salary-info">
                            <p>
                                <strong>Base Salary: </strong>
                                ${formData.baseSalaryOverride ?
                                parseFloat(formData.baseSalaryOverride).toFixed(2) :
                                (selectedJobPosition.baseSalary || 0).toFixed(2)}
                            </p>
                            <p>
                                <strong>Monthly Salary: </strong>
                                ${calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier).toFixed(2)}
                            </p>
                            <p>
                                <strong>Annual Salary: </strong>
                                ${(calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier) * 12).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>

                {(formData.previousPosition || formData.previousCompany) && (
                    <div className="form-section">
                        <h3>Previous Employment</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Previous Position</label>
                                <input
                                    type="text"
                                    name="previousPosition"
                                    value={formData.previousPosition}
                                    onChange={handleInputChange}
                                    readOnly={isFromCandidate}
                                />
                            </div>
                            <div className="form-group">
                                <label>Previous Company</label>
                                <input
                                    type="text"
                                    name="previousCompany"
                                    value={formData.previousCompany}
                                    onChange={handleInputChange}
                                    readOnly={isFromCandidate}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render step 3 - Documents & Files
    const renderStep3 = () => (
        <div className="form-step">
            <div className="form-section">
                <h3>Employee Photo</h3>
                <div className="file-upload-section">
                    <div className="photo-upload">
                        <div className="photo-preview">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Employee Preview" />
                            ) : (
                                <div className="photo-placeholder">
                                    <FaUser />
                                    <span>No photo selected</span>
                                </div>
                            )}
                        </div>
                        <div className="upload-controls">
                            <label className="upload-button">
                                <FaUpload />
                                Select Photo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'photo')}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <small>Upload employee photo (JPG, PNG - Max 5MB)</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Identification Documents</h3>
                <div className="documents-grid">
                    <div className="document-upload">
                        <label>ID Front</label>
                        <label className="upload-button">
                            <FaUpload />
                            {idFrontFile ? idFrontFile.name : 'Select ID Front'}
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileChange(e, 'idFront')}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <small>Front side of national ID (Image or PDF - Max 5MB)</small>
                    </div>
                    <div className="document-upload">
                        <label>ID Back</label>
                        <label className="upload-button">
                            <FaUpload />
                            {idBackFile ? idBackFile.name : 'Select ID Back'}
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileChange(e, 'idBack')}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <small>Back side of national ID (Image or PDF - Max 5MB)</small>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render step 4 - Review & Confirm
    const renderStep4 = () => {
        const selectedJobPosition = jobPositions.find(pos => pos.id === formData.jobPositionId);

        return (
            <div className="form-step">
                <div className="review-section">
                    <h3>Review Employee Information</h3>

                    {isFromCandidate && (
                        <div className="hiring-notice">
                            <FaUserPlus />
                            <div>
                                <strong>Finalizing Hiring Process</strong>
                                <p>This will complete the hiring of the candidate and create their employee record.</p>
                            </div>
                        </div>
                    )}

                    <div className="review-grid">
                        <div className="review-card">
                            <h4><FaUser /> Personal Information</h4>
                            <div className="review-item">
                                <span>Name:</span>
                                <span>{formData.firstName} {formData.middleName} {formData.lastName}</span>
                            </div>
                            <div className="review-item">
                                <span>Email:</span>
                                <span>{formData.email || 'N/A'}</span>
                            </div>
                            <div className="review-item">
                                <span>Phone:</span>
                                <span>{formData.phoneNumber || 'N/A'}</span>
                            </div>
                            <div className="review-item">
                                <span>National ID:</span>
                                <span>{formData.nationalIDNumber}</span>
                            </div>
                            <div className="review-item">
                                <span>Date of Birth:</span>
                                <span>{formData.birthDate}</span>
                            </div>
                            <div className="review-item">
                                <span>Gender:</span>
                                <span>{formData.gender}</span>
                            </div>
                            <div className="review-item">
                                <span>Country:</span>
                                <span>{formData.country}</span>
                            </div>
                            {formData.maritalStatus && (
                                <div className="review-item">
                                    <span>Marital Status:</span>
                                    <span>{formData.maritalStatus.replace('_', ' ')}</span>
                                </div>
                            )}
                            {formData.education && (
                                <div className="review-item">
                                    <span>Education:</span>
                                    <span>{formData.education.replace('_', ' ')}</span>
                                </div>
                            )}
                        </div>

                        <div className="review-card">
                            <h4><FaBriefcase /> Employment Details</h4>
                            <div className="review-item">
                                <span>Position:</span>
                                <span>{selectedJobPosition?.positionName || 'N/A'}</span>
                            </div>
                            <div className="review-item">
                                <span>Department:</span>
                                <span>{selectedJobPosition?.department || selectedJobPosition?.departmentName || 'N/A'}</span>
                            </div>
                            <div className="review-item">
                                <span>Hire Date:</span>
                                <span>{formData.hireDate}</span>
                            </div>
                            <div className="review-item">
                                <span>Status:</span>
                                <span>{formData.status?.replace('_', ' ')}</span>
                            </div>
                            {selectedJobPosition && (
                                <>
                                    <div className="review-item">
                                        <span>Base Salary:</span>
                                        <span>
                                            ${formData.baseSalaryOverride ?
                                            parseFloat(formData.baseSalaryOverride).toFixed(2) :
                                            (selectedJobPosition.baseSalary || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="review-item">
                                        <span>Monthly Salary:</span>
                                        <span>
                                            ${calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier).toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="review-card">
                            <h4><FaFileContract /> Documents</h4>
                            <div className="review-item">
                                <span>Photo:</span>
                                <span>{photoFile ? photoFile.name : 'Not provided'}</span>
                            </div>
                            <div className="review-item">
                                <span>ID Front:</span>
                                <span>{idFrontFile ? idFrontFile.name : 'Not provided'}</span>
                            </div>
                            <div className="review-item">
                                <span>ID Back:</span>
                                <span>{idBackFile ? idBackFile.name : 'Not provided'}</span>
                            </div>
                        </div>

                        {(formData.previousPosition || formData.previousCompany) && (
                            <div className="review-card">
                                <h4>Previous Employment</h4>
                                <div className="review-item">
                                    <span>Position:</span>
                                    <span>{formData.previousPosition || 'N/A'}</span>
                                </div>
                                <div className="review-item">
                                    <span>Company:</span>
                                    <span>{formData.previousCompany || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Render current step content
    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return null;
        }
    };

    return (
        <div className="employee-onboarding">
            <div className="onboarding-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <FaArrowLeft />
                    Back
                </button>
                <div className="header-content">
                    <h1>
                        {isFromCandidate ? 'Complete Hiring Process' : 'Add New Employee'}
                    </h1>
                    <p>
                        {isFromCandidate
                            ? 'Complete the employee information to finalize the hiring process'
                            : 'Fill in the employee information step by step'
                        }
                    </p>
                </div>
            </div>

            <div className="onboarding-content">
                {renderStepIndicator()}

                <div className="form-container">
                    {renderCurrentStep()}
                </div>

                <div className="navigation-controls">
                    <button
                        className="nav-button secondary"
                        onClick={prevStep}
                        disabled={currentStep === 1 || isLoading}
                    >
                        <FaArrowLeft />
                        Previous
                    </button>

                    {currentStep < 4 ? (
                        <button
                            className="nav-button primary"
                            onClick={nextStep}
                            disabled={isLoading}
                        >
                            Next
                            <FaArrowRight />
                        </button>
                    ) : (
                        <button
                            className="nav-button success"
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : isFromCandidate ? 'Complete Hiring' : 'Create Employee'}
                            <FaCheckCircle />
                        </button>
                    )}
                </div>
            </div>

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={isFromCandidate ? "Complete Hiring" : "Create Employee"}
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
                isLoading={isLoading}
                size="medium"
            />
        </div>
    );
};

export default EmployeeOnboarding;