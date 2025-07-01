import React, { useState, useEffect } from 'react';
import './EmployeeModals.scss';

const calculateMonthlySalary = (jobPosition, baseSalaryOverride, salaryMultiplier) => {
    const multiplier = salaryMultiplier ? parseFloat(salaryMultiplier) : 1.0;

    if (!jobPosition) {
        return 0;
    }

    switch (jobPosition.contractType) {
        case 'HOURLY':
            // For hourly contracts: hourly rate * hours per shift * working days per week * 4 weeks
            if (jobPosition.hourlyRate && jobPosition.hoursPerShift && jobPosition.workingDaysPerWeek) {
                const baseCalculation = jobPosition.hourlyRate * jobPosition.hoursPerShift * jobPosition.workingDaysPerWeek * 4;
                return baseSalaryOverride ? parseFloat(baseSalaryOverride) * multiplier : baseCalculation * multiplier;
            }
            return baseSalaryOverride ? parseFloat(baseSalaryOverride) * multiplier : 0;
        case 'DAILY':
            // For daily contracts: daily rate * working days per month
            if (jobPosition.dailyRate && jobPosition.workingDaysPerMonth) {
                const baseCalculation = jobPosition.dailyRate * jobPosition.workingDaysPerMonth;
                return baseSalaryOverride ? parseFloat(baseSalaryOverride) * multiplier : baseCalculation * multiplier;
            }
            return baseSalaryOverride ? parseFloat(baseSalaryOverride) * multiplier : 0;
        case 'MONTHLY':
            // For monthly contracts: use monthly base salary
            const baseSalary = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.monthlyBaseSalary || jobPosition.baseSalary || 0);
            return baseSalary * multiplier;
        default:
            // Fallback to base salary
            const fallbackSalary = baseSalaryOverride ? parseFloat(baseSalaryOverride) : (jobPosition.baseSalary || 0);
            return fallbackSalary * multiplier;
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
                                            <label>Update Photo</label>
                                            <input
                                                type="file"
                                                name="photo"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>Update ID Front</label>
                                            <input
                                                type="file"
                                                name="idFront"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        <div className="r4m-form-group">
                                            <label>Update ID Back</label>
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
                                    <label>Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange}>
                                        <option value="">Select Gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Date of Birth</label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="r4m-form-group">
                                    <label>National ID Number</label>
                                    <input
                                        type="text"
                                        name="nationalIDNumber"
                                        value={formData.nationalIDNumber}
                                        onChange={handleChange}
                                    />
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
                                    <label>Site</label>
                                    <select
                                        name="siteId"
                                        value={formData.siteId}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Site</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Job Position</label>
                                    <select
                                        name="jobPositionId"
                                        value={formData.jobPositionId}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Job Position</option>
                                        {jobPositions.map(pos => (
                                            <option key={pos.id} value={pos.id}>
                                                {pos.positionName} - {pos.department}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Contract Type</label>
                                    <select name="contractType" value={formData.contractType} onChange={handleChange}>
                                        <option value="FULL_TIME">Full Time</option>
                                        <option value="PART_TIME">Part Time</option>
                                        <option value="CONTRACT">Contract</option>
                                        <option value="TEMPORARY">Temporary</option>
                                        <option value="INTERNSHIP">Internship</option>
                                    </select>
                                </div>

                                <div className="r4m-form-group">
                                    <label>Hire Date</label>
                                    <input
                                        type="date"
                                        name="hireDate"
                                        value={formData.hireDate}
                                        onChange={handleChange}
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
                                        onChange={handleChange}
                                    />
                                </div>

                                {selectedJobPosition && (
                                    <div className="r4m-job-details">
                                        <h4>Position Details</h4>
                                        <p><strong>Position:</strong> {selectedJobPosition.positionName}</p>
                                        <p><strong>Department:</strong> {selectedJobPosition.department?.name || 'N/A'}</p>
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