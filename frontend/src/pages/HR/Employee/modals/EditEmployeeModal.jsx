import React, { useState, useEffect } from 'react';
import './EmployeeModals.scss';

const calculateMonthlySalary = (jobPosition, baseSalaryOverride, salaryMultiplier) => {
    const baseSalary = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.baseSalary || 0);
    const multiplier = salaryMultiplier ? parseFloat(salaryMultiplier) : 1.0;

    switch (jobPosition.contractType) {
        case 'HOURLY':
            return baseSalary * multiplier * (jobPosition.workingDaysPerWeek * 4) * jobPosition.hoursPerShift;
        case 'DAILY':
            return baseSalary * multiplier * jobPosition.workingDaysPerMonth;
        case 'MONTHLY':
            return baseSalary * multiplier;
        default:
            return baseSalary * multiplier;
    }
};

const EditEmployeeModal = ({ employee, onClose, onSave, jobPositions, sites }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phoneNumber: '',
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
        // Financial details
        bonus: '',
        commission: '',
        baseSalaryOverride: '',
        salaryMultiplier: 1.0,
        // Relationships
        jobPositionId: '',
        siteId: ''
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [idFrontFile, setIdFrontFile] = useState(null);
    const [idBackFile, setIdBackFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [errors, setErrors] = useState({});

    // Initialize form with employee data
    useEffect(() => {
        if (employee) {
            // Convert dates from ISO string to YYYY-MM-DD format for input fields
            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };

            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                middleName: employee.middleName || '',
                email: employee.email || '',
                phoneNumber: employee.phoneNumber || '',
                address: employee.address || '',
                city: employee.city || '',
                country: employee.country || '',
                birthDate: formatDate(employee.birthDate),
                hireDate: formatDate(employee.hireDate),
                maritalStatus: employee.maritalStatus || '',
                militaryStatus: employee.militaryStatus || '',
                nationalIDNumber: employee.nationalIDNumber || '',
                gender: employee.gender || '',
                status: 'ACTIVE',
                education: employee.education || '',
                bonus: employee.bonus || '',
                commission: employee.commission || '',
                baseSalaryOverride: employee.baseSalaryOverride || '',
                salaryMultiplier: employee.salaryMultiplier || 1.0,
                jobPositionId: employee.jobPositionId ? employee.jobPositionId.toString() : '',
                siteId: employee.siteId || ''
            });

            // Set photo preview if available
            if (employee.photoUrl) {
                setPhotoPreview(employee.photoUrl);
            }
        }
    }, [employee]);

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

    // Handle file input changes
    const handleFileChange = (e) => {
        const { name, files } = e.target;

        // Handle different file types
        if (name === 'photo') {
            if (files[0]) {
                setPhotoFile(files[0]);
                // Create preview URL for photo
                const previewUrl = URL.createObjectURL(files[0]);
                setPhotoPreview(previewUrl);
            }
        } else if (name === 'idFront') {
            if (files[0]) setIdFrontFile(files[0]);
        } else if (name === 'idBack') {
            if (files[0]) setIdBackFile(files[0]);
        }
    };

    // Add handleNumberChange for number fields
    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        if (value === '' || !isNaN(parseFloat(value))) {
            setFormData({
                ...formData,
                [name]: value
            });
        }
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
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
        if (formData.phoneNumber && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Phone number is invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            // Convert jobPositionId to number if it's not empty
            const modifiedFormData = {
                ...formData,
                status: 'ACTIVE', // Always set status to ACTIVE
                jobPositionId: formData.jobPositionId ? parseInt(formData.jobPositionId) : null,
                // Convert empty date strings to null to prevent backend parsing errors
                birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : null,
                hireDate: formData.hireDate && formData.hireDate.trim() !== '' ? formData.hireDate : null
            };

            onSave(modifiedFormData, photoFile, idFrontFile, idBackFile);
        }
    };

    // Get selected job position details
    const getSelectedJobPosition = () => {
        if (!formData.jobPositionId) return null;
        return jobPositions.find(pos => pos.id === parseInt(formData.jobPositionId));
    };

    const selectedJobPosition = getSelectedJobPosition();

    return (
        <div className="r4m-modal-overlay">
            <div className="r4m-employee-modal">
                <div className="r4m-modal-header">
                    <h2>Edit Employee: {employee.fullName}</h2>
                    <button className="r4m-close-button" onClick={onClose}>×</button>
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
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>ID Front</label>
                                            <input
                                                type="file"
                                                name="idFront"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>ID Back</label>
                                            <input
                                                type="file"
                                                name="idBack"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="r4m-form-group">
                                    <label>First Name *</label>
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
                                    <label>Last Name *</label>
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
                                    <label>Gender *</label>
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
                                    <label>Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        className={errors.birthDate ? 'error' : ''}
                                    />
                                    {errors.birthDate && <span className="r4m-error-message">{errors.birthDate}</span>}
                                </div>
                                <div className="r4m-form-group">
                                    <label>National ID Number *</label>
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
                                    <label>Email *</label>
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
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className={errors.phoneNumber ? 'error' : ''}
                                    />
                                    {errors.phoneNumber && <span className="r4m-error-message">{errors.phoneNumber}</span>}
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
                                    <label>Country *</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className={errors.country ? 'error' : ''}
                                    />
                                    {errors.country && <span className="r4m-error-message">{errors.country}</span>}
                                </div>
                            </div>
                            {/* Employment Information Column */}
                            <div className="r4m-form-column">
                                <h3>Employment Information</h3>
                                <div className="r4m-form-group">
                                    <label>Job Position *</label>
                                    <select
                                        name="jobPositionId"
                                        value={formData.jobPositionId}
                                        onChange={handleChange}
                                        className={errors.jobPositionId ? 'error' : ''}
                                    >
                                        <option value="">Select Job Position</option>
                                        {jobPositions.map(pos => (
                                            <option key={pos.id} value={pos.id}>
                                                {pos.positionName} - {pos.department?.name || pos.department || 'N/A'}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.jobPositionId && <span className="r4m-error-message">{errors.jobPositionId}</span>}
                                </div>
                                {selectedJobPosition && (
                                    <div className="r4m-job-details">
                                        <h4>Position Details</h4>
                                        <p><strong>Position:</strong> {selectedJobPosition.positionName}</p>
                                        <p><strong>Department:</strong> {selectedJobPosition.department?.name || selectedJobPosition.department || 'N/A'}</p>
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
                                    <label>Hire Date *</label>
                                    <input
                                        type="date"
                                        name="hireDate"
                                        value={formData.hireDate}
                                        onChange={handleChange}
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