import React, { useState, useEffect } from 'react';
import './EmployeeModals.scss';
import {useSnackbar} from "../../../../contexts/SnackbarContext.jsx";

// Country data with codes and flags
const COUNTRIES = [
    { code: '+1', name: 'United States', flag: '🇺🇸', iso: 'US' },
    { code: '+1', name: 'Canada', flag: '🇨🇦', iso: 'CA' },
    { code: '+20', name: 'Egypt', flag: '🇪🇬', iso: 'EG' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧', iso: 'GB' },
    { code: '+49', name: 'Germany', flag: '🇩🇪', iso: 'DE' },
    { code: '+33', name: 'France', flag: '🇫🇷', iso: 'FR' },
    { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', iso: 'AE' },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', iso: 'SA' },
    { code: '+91', name: 'India', flag: '🇮🇳', iso: 'IN' },
    { code: '+86', name: 'China', flag: '🇨🇳', iso: 'CN' },
    { code: '+81', name: 'Japan', flag: '🇯🇵', iso: 'JP' },
    { code: '+82', name: 'South Korea', flag: '🇰🇷', iso: 'KR' },
    { code: '+61', name: 'Australia', flag: '🇦🇺', iso: 'AU' },
    { code: '+55', name: 'Brazil', flag: '🇧🇷', iso: 'BR' },
    { code: '+52', name: 'Mexico', flag: '🇲🇽', iso: 'MX' },
    { code: '+7', name: 'Russia', flag: '🇷🇺', iso: 'RU' },
    { code: '+27', name: 'South Africa', flag: '🇿🇦', iso: 'ZA' },
    { code: '+234', name: 'Nigeria', flag: '🇳🇬', iso: 'NG' },
    { code: '+90', name: 'Turkey', flag: '🇹🇷', iso: 'TR' },
    { code: '+34', name: 'Spain', flag: '🇪🇸', iso: 'ES' },
];

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

const EditEmployeeModal = ({ employee, onClose, onSave, jobPositions, sites }) => {
    const { showSuccess, showError } = useSnackbar();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phoneNumber: '',
        countryCode: '+20',
        address: '',
        city: '',
        country: '',
        birthDate: '',
        hireDate: '',
        maritalStatus: '',
        militaryStatus: '',
        nationalIDNumber: '',
        gender: '',
        status: 'ACTIVE',
        education: '',
        baseSalaryOverride: '',
        salaryMultiplier: 1.0,
        jobPositionId: '',
        departmentId: '',
        siteId: ''
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [idFrontFile, setIdFrontFile] = useState(null);
    const [idBackFile, setIdBackFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [departments, setDepartments] = useState([]);
    const [filteredPositions, setFilteredPositions] = useState([]);

    // Extract phone number and country code
    const extractPhoneData = (fullPhone) => {
        if (!fullPhone) return { code: '+20', number: '' };

        // Try to extract country code (assumes format: "+XX XXXXXXXXXX")
        const match = fullPhone.match(/^(\+\d+)\s*(.+)$/);
        if (match) {
            return { code: match[1], number: match[2] };
        }

        // If no country code found, assume it's just the number
        return { code: '+20', number: fullPhone };
    };

    // Initialize form data with employee information
    useEffect(() => {
        if (employee) {
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };

            // Extract phone number and country code
            const phoneData = extractPhoneData(employee.phoneNumber);

            // Find the department from the job position
            const employeePosition = jobPositions.find(pos => pos.id === employee.jobPositionId);
            const employeeDepartment = employeePosition ? employeePosition.department : '';

            console.log('Employee data received in EditEmployeeModal:', employee);

            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                middleName: employee.middleName || '',
                email: employee.email || '',
                phoneNumber: phoneData.number,
                countryCode: phoneData.code,
                address: employee.address || '',
                city: employee.city || '',
                country: employee.country || '',
                birthDate: formatDateForInput(employee.birthDate),
                hireDate: formatDateForInput(employee.hireDate),
                maritalStatus: employee.maritalStatus || '',
                militaryStatus: employee.militaryStatus || '',
                nationalIDNumber: employee.nationalIDNumber || '',
                gender: employee.gender || '',
                status: employee.status || 'ACTIVE',
                education: employee.education || '',
                baseSalaryOverride: employee.baseSalaryOverride || '',
                salaryMultiplier: employee.salaryMultiplier || 1.0,
                jobPositionId: employee.jobPositionId || '',
                departmentId: employeeDepartment,
                siteId: employee.siteId || ''
            });

            // Set photo preview if employee has existing photo
            if (employee.photoUrl) {
                setPhotoPreview(employee.photoUrl);
            }
        }
    }, [employee, jobPositions]);

    // Extract unique departments from job positions
    useEffect(() => {
        if (jobPositions && jobPositions.length > 0) {
            const uniqueDepartments = [...new Set(jobPositions.map(pos => pos.department))].filter(Boolean);
            setDepartments(uniqueDepartments.sort());
        }
    }, [jobPositions]);

    // Filter positions based on selected department
    useEffect(() => {
        if (formData.departmentId) {
            const filtered = jobPositions.filter(pos => pos.department === formData.departmentId);
            setFilteredPositions(filtered);

            // Reset job position if the current selection doesn't match the new department
            if (formData.jobPositionId) {
                const currentPosition = jobPositions.find(pos => pos.id === formData.jobPositionId);
                if (currentPosition && currentPosition.department !== formData.departmentId) {
                    setFormData(prev => ({ ...prev, jobPositionId: '' }));
                }
            }
        } else {
            setFilteredPositions([]);
        }
    }, [formData.departmentId, jobPositions]);

    const selectedJobPosition = formData.jobPositionId ?
        jobPositions.find(pos => String(pos.id).trim() === String(formData.jobPositionId).trim()) : null;

    // Calculate minimum birth date (16 years ago)
    const getMinimumBirthDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 16);
        return today.toISOString().split('T')[0];
    };

    // Calculate maximum birth date (100 years ago, reasonable upper limit)
    const getMaximumBirthDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 100);
        return today.toISOString().split('T')[0];
    };

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Clear error for this field
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    // Handle country code change and auto-fill country name
    const handleCountryCodeChange = (e) => {
        const selectedCode = e.target.value;
        const selectedCountry = COUNTRIES.find(c => c.code === selectedCode);

        setFormData({
            ...formData,
            countryCode: selectedCode,
            country: selectedCountry ? selectedCountry.name : formData.country
        });

        if (errors.countryCode || errors.country) {
            setErrors({
                ...errors,
                countryCode: null,
                country: null
            });
        }
    };

    // Handle phone number input - only allow numbers, spaces, hyphens, and parentheses
    const handlePhoneNumberChange = (e) => {
        const value = e.target.value;
        const sanitized = value.replace(/[^\d\s\-()]/g, '');

        setFormData({
            ...formData,
            phoneNumber: sanitized
        });

        if (errors.phoneNumber) {
            setErrors({
                ...errors,
                phoneNumber: null
            });
        }
    };

    // Handle file input changes
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

    // Handle number input changes (for financial fields)
    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        if (value === '' || !isNaN(parseFloat(value))) {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.departmentId) newErrors.departmentId = 'Department is required';
        if (!formData.jobPositionId) newErrors.jobPositionId = 'Job position is required';
        if (!formData.birthDate) newErrors.birthDate = 'Date of Birth is required';
        if (!formData.nationalIDNumber) newErrors.nationalIDNumber = 'National ID is required';
        if (!formData.country) newErrors.country = 'Country is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';

        // Email validation
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        // Phone validation
        if (formData.phoneNumber) {
            const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
            if (digitsOnly.length < 7) {
                newErrors.phoneNumber = 'Phone number must contain at least 7 digits';
            } else if (digitsOnly.length > 15) {
                newErrors.phoneNumber = 'Phone number is too long';
            }
        }

        // Birth date validation - must be at least 16 years old
        if (formData.birthDate) {
            const birthDateObj = new Date(formData.birthDate);
            const today = new Date();
            const minDate = new Date();
            minDate.setFullYear(today.getFullYear() - 16);

            today.setHours(0, 0, 0, 0);
            birthDateObj.setHours(0, 0, 0, 0);
            minDate.setHours(0, 0, 0, 0);

            if (birthDateObj > today) {
                newErrors.birthDate = 'Birth date cannot be in the future';
            } else if (birthDateObj > minDate) {
                newErrors.birthDate = 'Employee must be at least 16 years old';
            }
        }

        // Hire date validation
        if (formData.hireDate) {
            const hireDateObj = new Date(formData.hireDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            hireDateObj.setHours(0, 0, 0, 0);

            if (hireDateObj > today) {
                newErrors.hireDate = 'Hire date cannot be in the future';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            // Prepare final data according to DTO structure
            const finalData = {
                ...formData,
                id: employee.id,
                // Combine country code with phone number
                phoneNumber: formData.phoneNumber ? `${formData.countryCode} ${formData.phoneNumber}` : '',
                jobPositionId: formData.jobPositionId ? formData.jobPositionId : null,
                bonus: formData.bonus ? parseFloat(formData.bonus) : null,
                commission: formData.commission ? parseFloat(formData.commission) : null,
                baseSalaryOverride: formData.baseSalaryOverride ? parseFloat(formData.baseSalaryOverride) : null,
                salaryMultiplier: formData.salaryMultiplier ? parseFloat(formData.salaryMultiplier) : 1.0,
                birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : null,
                hireDate: formData.hireDate && formData.hireDate.trim() !== '' ? formData.hireDate : null,
                // Preserve existing image URLs if no new files are provided
                photoUrl: photoFile ? null : employee.photoUrl,
                idFrontImage: idFrontFile ? null : employee.idFrontImage,
                idBackImage: idBackFile ? null : employee.idBackImage
            };

            // Remove siteId, departmentId, and countryCode as they're not in the DTO
            const { siteId, departmentId, countryCode, ...dtoData } = finalData;

            onSave(dtoData, photoFile, idFrontFile, idBackFile);
        }
        else {
            showError('Please fix the form errors before submitting.');

        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="r4m-modal-overlay" onClick={handleOverlayClick}>
            <div className="r4m-employee-modal">
                <div className="r4m-modal-header">
                    <h2>Edit Employee</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="r4m-modal-body">
                        <div className="r4m-form-columns">
                            {/* Personal Information Column */}
                            <div className="r4m-form-column">
                                <h3>Personal Information</h3>

                                <div className="r4m-photo-section">
                                    <div className="r4m-photo-preview">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Employee preview" />
                                        ) : (
                                            <div className="r4m-photo-placeholder">
                                                <span>Photo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="r4m-file-inputs">
                                        <div className="r4m-form-group">
                                            <label>Photo</label>
                                            <input
                                                type="file"
                                                name="photo"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <small className="r4m-file-note">Leave empty to keep current photo</small>
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>ID Front</label>
                                            <input
                                                type="file"
                                                name="idFront"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <small className="r4m-file-note">Leave empty to keep current ID front</small>
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>ID Back</label>
                                            <input
                                                type="file"
                                                name="idBack"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <small className="r4m-file-note">Leave empty to keep current ID back</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={errors.firstName ? 'error' : ''}
                                    />
                                    {errors.firstName && <span className="r4m-error-message">{errors.firstName}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label>Middle Name</label>
                                    <input
                                        type="text"
                                        name="middleName"
                                        value={formData.middleName}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={errors.lastName ? 'error' : ''}
                                    />
                                    {errors.lastName && <span className="r4m-error-message">{errors.lastName}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className={errors.gender ? 'error' : ''}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                    {errors.gender && <span className="r4m-error-message">{errors.gender}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Date of Birth (Must be 16+)</label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        max={getMinimumBirthDate()}
                                        min={getMaximumBirthDate()}
                                        className={errors.birthDate ? 'error' : ''}
                                    />
                                    {errors.birthDate && <span className="r4m-error-message">{errors.birthDate}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">National ID Number</label>
                                    <input
                                        type="text"
                                        name="nationalIDNumber"
                                        value={formData.nationalIDNumber}
                                        onChange={handleChange}
                                        className={errors.nationalIDNumber ? 'error' : ''}
                                    />
                                    {errors.nationalIDNumber && <span className="r4m-error-message">{errors.nationalIDNumber}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label>Marital Status</label>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                                        <option value="">Select Status</option>
                                        <option value="SINGLE">Single</option>
                                        <option value="MARRIED">Married</option>
                                        <option value="DIVORCED">Divorced</option>
                                        <option value="WIDOWED">Widowed</option>
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Military Status</label>
                                    <select name="militaryStatus" value={formData.militaryStatus} onChange={handleChange}>
                                        <option value="">Select Status</option>
                                        <option value="NONE">None</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="VETERAN">Veteran</option>
                                        <option value="RESERVE">Reserve</option>
                                        <option value="EXEMPT">Exempt</option>
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Education</label>
                                    <select name="education" value={formData.education} onChange={handleChange}>
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

                            {/* Contact Information Column */}
                            <div className="r4m-form-column">
                                <h3>Contact Information</h3>

                                <div className="r4m-form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={errors.email ? 'error' : ''}
                                    />
                                    {errors.email && <span className="r4m-error-message">{errors.email}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Country Code</label>
                                    <select
                                        name="countryCode"
                                        value={formData.countryCode}
                                        onChange={handleCountryCodeChange}
                                        className={errors.countryCode ? 'error' : ''}
                                    >
                                        {COUNTRIES.map((country) => (
                                            <option key={`${country.iso}-${country.code}`} value={country.code}>
                                                {country.flag} {country.name} ({country.code})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.countryCode && <span className="r4m-error-message">{errors.countryCode}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label>Phone Number</label>
                                    <div className="r4m-phone-input">
                                        <span className="r4m-country-code">{formData.countryCode}</span>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handlePhoneNumberChange}
                                            placeholder="123 456 7890"
                                            className={errors.phoneNumber ? 'error' : ''}
                                        />
                                    </div>
                                    {errors.phoneNumber && <span className="r4m-error-message">{errors.phoneNumber}</span>}
                                    <small className="r4m-field-hint">Enter numbers only (7-15 digits)</small>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="r4m-form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className={errors.country ? 'error' : ''}
                                        readOnly
                                    />
                                    {errors.country && <span className="r4m-error-message">{errors.country}</span>}
                                    <small className="r4m-field-hint">Auto-filled from country code selection</small>
                                </div>
                            </div>

                            {/* Employment Information Column */}
                            <div className="r4m-form-column">
                                <h3>Employment Information</h3>

                                <div className="r4m-form-group">
                                    <label>Employee Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="ON_LEAVE">On Leave</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="TERMINATED">Terminated</option>
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Department</label>
                                    <select
                                        name="departmentId"
                                        value={formData.departmentId}
                                        onChange={handleChange}
                                        className={errors.departmentId ? 'error' : ''}
                                    >
                                        <option value="">Select Department First</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.departmentId && <span className="r4m-error-message">{errors.departmentId}</span>}
                                </div>

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Job Position</label>
                                    <select
                                        name="jobPositionId"
                                        value={formData.jobPositionId}
                                        onChange={handleChange}
                                        className={errors.jobPositionId ? 'error' : ''}
                                        disabled={!formData.departmentId}
                                    >
                                        <option value="">
                                            {formData.departmentId ? 'Select Job Position' : 'Select Department First'}
                                        </option>
                                        {filteredPositions.map(pos => (
                                            <option key={pos.id} value={pos.id}>
                                                {pos.positionName}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.jobPositionId && <span className="r4m-error-message">{errors.jobPositionId}</span>}
                                </div>

                                {selectedJobPosition && (
                                    <div className="r4m-job-details">
                                        <h4>Position Details</h4>
                                        <p><strong>Position:</strong> {selectedJobPosition.positionName}</p>
                                        <p><strong>Department:</strong> {selectedJobPosition.department || 'N/A'}</p>
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

                                <div className="r4m-form-group">
                                    <label className="r4m-required-field">Hire Date</label>
                                    <input
                                        type="date"
                                        name="hireDate"
                                        value={formData.hireDate}
                                        onChange={handleChange}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={errors.hireDate ? 'error' : ''}
                                    />
                                    {errors.hireDate && <span className="r4m-error-message">{errors.hireDate}</span>}
                                </div>

                                <h4>Compensation</h4>

                                <div className="r4m-form-group">
                                    <label>Base Salary Override</label>
                                    <input
                                        type="number"
                                        name="baseSalaryOverride"
                                        min="0"
                                        step="0.01"
                                        value={formData.baseSalaryOverride}
                                        onChange={handleNumberChange}
                                        placeholder={selectedJobPosition?.baseSalary || 'Enter amount'}
                                    />
                                </div>

                                <div className="r4m-form-group">
                                    <label>Salary Multiplier</label>
                                    <input
                                        type="number"
                                        name="salaryMultiplier"
                                        min="0.1"
                                        step="0.1"
                                        value={formData.salaryMultiplier}
                                        onChange={handleNumberChange}
                                    />
                                </div>

                                {selectedJobPosition && (
                                    <div className="r4m-salary-info">
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
                        </div>
                    </div>

                    <div className="r4m-modal-footer">
                        <button type="button" className="r4m-cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="r4m-save-btn">Update Employee</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;