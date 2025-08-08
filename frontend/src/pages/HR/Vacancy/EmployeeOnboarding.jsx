import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { hrEmployeeService } from '../../../services/hr/hrEmployeeService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { FaUser, FaBriefcase, FaFileContract, FaCheckCircle, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import './EmployeeOnboarding.scss';

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

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [candidateData, setCandidateData] = useState(null);
    const [isFromCandidate, setIsFromCandidate] = useState(false);
    const [candidateId, setCandidateId] = useState(null);
    const [jobPositions, setJobPositions] = useState([]);
    const [sites, setSites] = useState([]);

    const [formData, setFormData] = useState({
        // Personal Information
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phoneNumber: '',
        address: '',
        city: '',
        country: '',
        birthDate: '',
        nationalIDNumber: '',
        gender: '',
        maritalStatus: '',
        militaryStatus: '',
        education: '',

        // Employment Information
        jobPositionId: '',
        siteId: '',
        hireDate: new Date().toISOString().split('T')[0],
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
        fetchSites();

        const prepopulatedData = sessionStorage.getItem('prepopulatedEmployeeData');
        if (prepopulatedData) {
            try {
                const parsedData = JSON.parse(prepopulatedData);
                setCandidateData(parsedData);

                // Populate form with candidate data
                setFormData(prev => ({
                    ...prev,
                    ...parsedData
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

    const fetchSites = async () => {
        try {
            // Assuming you have a site service
            // const response = await siteService.getAll();
            // setSites(Array.isArray(response.data) ? response.data : []);
            setSites([]); // Placeholder
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const selectedJobPosition = formData.jobPositionId ?
        jobPositions.find(pos => String(pos.id).trim() === String(formData.jobPositionId).trim()) : null;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'file') {
            handleFileChange(e);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        // Allow empty value or valid number
        if (value === '' || !isNaN(parseFloat(value))) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;

        if (name === 'photo' && files[0]) {
            setPhotoFile(files[0]);
            setPhotoPreview(URL.createObjectURL(files[0]));
        } else if (name === 'idFront' && files[0]) {
            setIdFrontFile(files[0]);
        } else if (name === 'idBack' && files[0]) {
            setIdBackFile(files[0]);
        }
    };

    const validateStep = (step) => {
        const errors = [];

        switch (step) {
            case 1:
                if (!formData.firstName) errors.push('First name is required');
                if (!formData.lastName) errors.push('Last name is required');
                if (!formData.birthDate) errors.push('Date of birth is required');
                if (!formData.nationalIDNumber) errors.push('National ID is required');
                if (!formData.country) errors.push('Country is required');
                if (!formData.gender) errors.push('Gender is required');
                if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                    errors.push('Email is invalid');
                }
                if (formData.phoneNumber && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(formData.phoneNumber)) {
                    errors.push('Phone number is invalid');
                }
                break;

            case 2:
                if (!formData.jobPositionId) errors.push('Job position is required');
                if (!formData.hireDate) errors.push('Hire date is required');
                break;
        }

        return errors;
    };

    const handleNext = () => {
        const errors = validateStep(currentStep);
        if (errors.length > 0) {
            showError(errors.join(', '));
            return;
        }

        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = () => {
        const errors = validateStep(currentStep);
        if (errors.length > 0) {
            showError(errors.join(', '));
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Create Employee',
            message: `Are you sure you want to create employee record for ${formData.firstName} ${formData.lastName}? This will complete the hiring process.`,
            onConfirm: submitEmployeeData
        });
    };

    const submitEmployeeData = async () => {
        try {
            setLoading(true);

            // Prepare final data according to AddEmployeeModal structure
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

            // Remove siteId as it's not in the DTO according to AddEmployeeModal
            const { siteId, ...dtoData } = finalData;

            // Add candidate ID if from candidate conversion
            if (isFromCandidate && candidateId) {
                dtoData.candidateId = candidateId;
            }

            // Call the onSave function with the same signature as AddEmployeeModal
            await saveEmployee(dtoData, photoFile, idFrontFile, idBackFile);

        } catch (error) {
            console.error('Error creating employee:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create employee';
            showError(errorMessage);
        } finally {
            setLoading(false);
            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
        }
    };

    const saveEmployee = async (employeeData, photoFile, idFrontFile, idBackFile) => {
        // Create FormData for multipart submission
        const formData = new FormData();

        // Add employee data as JSON string (this matches most Spring Boot controllers)
        formData.append('employeeData', JSON.stringify(employeeData));

        // Add files if they exist
        if (photoFile) {
            formData.append('photo', photoFile);
        }
        if (idFrontFile) {
            formData.append('idFront', idFrontFile);
        }
        if (idBackFile) {
            formData.append('idBack', idBackFile);
        }

        // Use the service but with explicit headers to ensure multipart is handled correctly
        try {
            const response = await hrEmployeeService.employee.create(formData);

            // Clear session storage
            sessionStorage.removeItem('prepopulatedEmployeeData');

            showSuccess('Employee created successfully! Welcome to the team!');
            navigate(`/hr/employee-details/${response.data.id}`);
        } catch (error) {
            // If multipart fails, try with just JSON data (without files)
            if (error.response?.status === 415) {
                console.warn('Multipart submission failed, trying JSON-only approach');

                try {
                    // Remove files and try JSON-only submission
                    const jsonResponse = await hrEmployeeService.employee.createJson(employeeData);

                    // If successful, show warning about files not uploaded
                    if (photoFile || idFrontFile || idBackFile) {
                        showWarning('Employee created successfully, but files could not be uploaded. Please upload them manually.');
                    } else {
                        showSuccess('Employee created successfully!');
                    }

                    sessionStorage.removeItem('prepopulatedEmployeeData');
                    navigate(`/hr/employee-details/${jsonResponse.data.id}`);
                } catch (jsonError) {
                    throw jsonError;
                }
            } else {
                throw error;
            }
        }
    };

    const handleCancel = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Cancel Onboarding',
            message: 'Are you sure you want to cancel the employee onboarding process? All entered data will be lost.',
            onConfirm: () => {
                sessionStorage.removeItem('prepopulatedEmployeeData');
                navigate('/hr/vacancies');
            }
        });
    };

    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="onboarding-step">
                        <h3>Personal Information</h3>
                        {isFromCandidate && (
                            <div className="candidate-info-banner">
                                <FaUser />
                                <span>This form is pre-filled with candidate information. Please complete the additional required fields to finalize the hiring process.</span>
                            </div>
                        )}

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="middleName">Middle Name</label>
                                <input
                                    type="text"
                                    id="middleName"
                                    name="middleName"
                                    value={formData.middleName}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="gender">Gender *</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="birthDate">Date of Birth *</label>
                                <input
                                    type="date"
                                    id="birthDate"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="nationalIDNumber">National ID Number *</label>
                                <input
                                    type="text"
                                    id="nationalIDNumber"
                                    name="nationalIDNumber"
                                    value={formData.nationalIDNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phoneNumber">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="country">Country *</label>
                                <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="maritalStatus">Marital Status</label>
                                <select
                                    id="maritalStatus"
                                    name="maritalStatus"
                                    value={formData.maritalStatus}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Status</option>
                                    <option value="SINGLE">Single</option>
                                    <option value="MARRIED">Married</option>
                                    <option value="DIVORCED">Divorced</option>
                                    <option value="WIDOWED">Widowed</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="militaryStatus">Military Status</label>
                                <select
                                    id="militaryStatus"
                                    name="militaryStatus"
                                    value={formData.militaryStatus}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Status</option>
                                    <option value="NONE">None</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="VETERAN">Veteran</option>
                                    <option value="RESERVE">Reserve</option>
                                    <option value="EXEMPT">Exempt</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="education">Education</label>
                                <select
                                    id="education"
                                    name="education"
                                    value={formData.education}
                                    onChange={handleInputChange}
                                >
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
                );

            case 2:
                return (
                    <div className="onboarding-step">
                        <h3>Employment Details</h3>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="jobPositionId">Job Position *</label>
                                <select
                                    id="jobPositionId"
                                    name="jobPositionId"
                                    value={formData.jobPositionId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Job Position</option>
                                    {jobPositions.map(pos => (
                                        <option key={pos.id} value={pos.id}>
                                            {pos.positionName} - {pos.department}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="hireDate">Hire Date *</label>
                                <input
                                    type="date"
                                    id="hireDate"
                                    name="hireDate"
                                    value={formData.hireDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">Employment Status</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="TERMINATED">Terminated</option>
                                </select>
                            </div>
                        </div>

                        {selectedJobPosition && (
                            <div className="job-details-section">
                                <h4>Position Details</h4>
                                <div className="job-details-grid">
                                    <div><strong>Position:</strong> {selectedJobPosition.positionName}</div>
                                    <div><strong>Department:</strong> {selectedJobPosition.department || 'N/A'}</div>
                                    <div><strong>Contract Type:</strong> {selectedJobPosition.contractType?.replace('_', ' ') || 'N/A'}</div>
                                    {selectedJobPosition.contractType === 'HOURLY' && (
                                        <>
                                            <div><strong>Working Days/Week:</strong> {selectedJobPosition.workingDaysPerWeek || 'N/A'}</div>
                                            <div><strong>Hours/Shift:</strong> {selectedJobPosition.hoursPerShift || 'N/A'}</div>
                                            <div><strong>Hourly Rate:</strong> ${selectedJobPosition.hourlyRate?.toFixed(2) || 'N/A'}</div>
                                        </>
                                    )}
                                    {selectedJobPosition.contractType === 'DAILY' && (
                                        <>
                                            <div><strong>Working Days/Month:</strong> {selectedJobPosition.workingDaysPerMonth || 'N/A'}</div>
                                            <div><strong>Daily Rate:</strong> ${selectedJobPosition.dailyRate?.toFixed(2) || 'N/A'}</div>
                                        </>
                                    )}
                                    {selectedJobPosition.contractType === 'MONTHLY' && (
                                        <>
                                            <div><strong>Monthly Base Salary:</strong> ${selectedJobPosition.monthlyBaseSalary?.toFixed(2) || 'N/A'}</div>
                                            <div><strong>Working Hours:</strong> {selectedJobPosition.workingHours || 'N/A'}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="compensation-section">
                            <h4>Compensation</h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="baseSalaryOverride">Base Salary Override</label>
                                    <input
                                        type="number"
                                        id="baseSalaryOverride"
                                        name="baseSalaryOverride"
                                        min="0"
                                        step="0.01"
                                        value={formData.baseSalaryOverride}
                                        onChange={handleNumberChange}
                                        placeholder={selectedJobPosition?.baseSalary || 'Enter amount'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="salaryMultiplier">Salary Multiplier</label>
                                    <input
                                        type="number"
                                        id="salaryMultiplier"
                                        name="salaryMultiplier"
                                        min="0.1"
                                        step="0.1"
                                        value={formData.salaryMultiplier}
                                        onChange={handleNumberChange}
                                    />
                                </div>
                            </div>

                            {selectedJobPosition && (
                                <div className="salary-info">
                                    <div className="salary-item">
                                        <strong>Base Salary:</strong>
                                        ${formData.baseSalaryOverride ?
                                        parseFloat(formData.baseSalaryOverride).toFixed(2) :
                                        (selectedJobPosition.baseSalary || 0).toFixed(2)}
                                    </div>
                                    <div className="salary-item">
                                        <strong>Monthly Salary:</strong>
                                        ${calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier).toFixed(2)}
                                    </div>
                                    <div className="salary-item">
                                        <strong>Annual Salary:</strong>
                                        ${(calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier) * 12).toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isFromCandidate && (
                            <div className="previous-employment-section">
                                <h4>Previous Employment</h4>
                                <div className="form-grid">
                                    <div><strong>Position:</strong> {formData.previousPosition || 'N/A'}</div>
                                    <div><strong>Company:</strong> {formData.previousCompany || 'N/A'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="onboarding-step">
                        <h3>Documents & Files</h3>

                        <div className="photo-section">
                            <h4>Employee Photo</h4>
                            <div className="photo-upload-container">
                                <div className="photo-preview">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Employee preview" />
                                    ) : (
                                        <div className="photo-placeholder">
                                            <FaUser size={48} />
                                            <span>No Photo</span>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="photo">Upload Photo</label>
                                    <input
                                        type="file"
                                        id="photo"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="documents-section">
                            <h4>Identity Documents</h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="idFront">ID Front</label>
                                    <input
                                        type="file"
                                        id="idFront"
                                        name="idFront"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="idBack">ID Back</label>
                                    <input
                                        type="file"
                                        id="idBack"
                                        name="idBack"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="onboarding-step">
                        <h3>Review & Confirm</h3>

                        <div className="review-sections">
                            <div className="review-section">
                                <h4>Personal Information</h4>
                                <div className="review-grid">
                                    <div><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</div>
                                    <div><strong>Gender:</strong> {formData.gender}</div>
                                    <div><strong>Date of Birth:</strong> {formData.birthDate}</div>
                                    <div><strong>National ID:</strong> {formData.nationalIDNumber}</div>
                                    <div><strong>Email:</strong> {formData.email || 'Not provided'}</div>
                                    <div><strong>Phone:</strong> {formData.phoneNumber || 'Not provided'}</div>
                                    <div><strong>Address:</strong> {formData.address || 'Not provided'}</div>
                                    <div><strong>City:</strong> {formData.city || 'Not provided'}</div>
                                    <div><strong>Country:</strong> {formData.country}</div>
                                </div>
                            </div>

                            <div className="review-section">
                                <h4>Employment Details</h4>
                                <div className="review-grid">
                                    <div><strong>Position:</strong> {selectedJobPosition?.positionName || 'Not selected'}</div>
                                    <div><strong>Department:</strong> {selectedJobPosition?.department || 'Not available'}</div>
                                    <div><strong>Contract Type:</strong> {selectedJobPosition?.contractType || 'Not available'}</div>
                                    <div><strong>Hire Date:</strong> {formData.hireDate}</div>
                                    <div><strong>Status:</strong> {formData.status}</div>
                                </div>
                            </div>

                            <div className="review-section">
                                <h4>Compensation</h4>
                                <div className="review-grid">
                                    <div><strong>Base Salary Override:</strong> {formData.baseSalaryOverride ? `${parseFloat(formData.baseSalaryOverride).toFixed(2)}` : 'Not set'}</div>
                                    <div><strong>Salary Multiplier:</strong> {formData.salaryMultiplier}</div>
                                    {selectedJobPosition && (
                                        <>
                                            <div><strong>Monthly Salary:</strong> ${calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier).toFixed(2)}</div>
                                            <div><strong>Annual Salary:</strong> ${(calculateMonthlySalary(selectedJobPosition, formData.baseSalaryOverride, formData.salaryMultiplier) * 12).toFixed(2)}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="review-section">
                                <h4>Documents</h4>
                                <div className="review-grid">
                                    <div><strong>Photo:</strong> {photoFile ? '✓ Uploaded' : 'Not uploaded'}</div>
                                    <div><strong>ID Front:</strong> {idFrontFile ? '✓ Uploaded' : 'Not uploaded'}</div>
                                    <div><strong>ID Back:</strong> {idBackFile ? '✓ Uploaded' : 'Not uploaded'}</div>
                                </div>
                            </div>

                            {isFromCandidate && (
                                <div className="review-section">
                                    <h4>Previous Employment</h4>
                                    <div className="review-grid">
                                        <div><strong>Previous Position:</strong> {formData.previousPosition || 'Not provided'}</div>
                                        <div><strong>Previous Company:</strong> {formData.previousCompany || 'Not provided'}</div>
                                        <div><strong>Candidate ID:</strong> {candidateId}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="employee-onboarding">
            <div className="onboarding-header">
                <button className="back-btn" onClick={() => navigate('/hr/vacancies')}>
                    <FaArrowLeft />
                    Back to Vacancies
                </button>
                <h1>Employee Onboarding</h1>
                <p>{isFromCandidate ? 'Complete the hiring process for selected candidate' : 'Create new employee record'}</p>
            </div>

            {/* Step Progress */}
            <div className="step-progress">
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className={`step ${currentStep === step.number ? 'active' : currentStep > step.number ? 'completed' : ''}`}
                    >
                        <div className="step-icon">
                            {currentStep > step.number ? <FaCheckCircle /> : step.icon}
                        </div>
                        <div className="step-info">
                            <div className="step-title">{step.title}</div>
                            <div className="step-description">{step.description}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="onboarding-content">
                {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="onboarding-navigation">
                <div className="nav-left">
                    {currentStep > 1 && (
                        <button
                            className="btn-secondary"
                            onClick={handlePrevious}
                            disabled={loading}
                        >
                            <FaArrowLeft />
                            Previous
                        </button>
                    )}
                </div>

                <div className="nav-center">
                    <button
                        className="btn-outline"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>

                <div className="nav-right">
                    {currentStep < steps.length ? (
                        <button
                            className="btn-primary"
                            onClick={handleNext}
                            disabled={loading}
                        >
                            Next
                            <FaArrowRight />
                        </button>
                    ) : (
                        <button
                            className="btn-success"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Creating Employee...' : isFromCandidate ? 'Complete Hiring Process' : 'Create Employee'}
                            <FaCheckCircle />
                        </button>
                    )}
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Yes, Proceed"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleDialogCancel}
                isLoading={loading}
                size="medium"
            />
        </div>
    );
};

export default EmployeeOnboarding;