import React, { useState } from 'react';
import './CandidateModals.scss';

const AddCandidateModal = ({ onClose, onSave, vacancyId }) => {
    // State for tracking the current step
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    // State for form data - ensure all values are strings to prevent controlled/uncontrolled issues
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        country: '',
        currentPosition: '',
        currentCompany: '',
        notes: '',
        applicationDate: new Date().toISOString().split('T')[0],
        vacancyId: vacancyId || ''
    });

    // State for file uploads
    const [resumeFile, setResumeFile] = useState(null);

    // State for validation errors - use empty string instead of null
    const [errors, setErrors] = useState({});

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value || '' // Ensure value is always a string
        });

        // Clear error for this field - use empty string instead of null
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: '' // Use empty string instead of null
            });
        }
    };

    // Handle file input changes
    const handleFileChange = (e) => {
        if (e.target.name === 'resume' && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
        }
    };

    // Validate the current step
    const validateStep = () => {
        const newErrors = {};

        switch (currentStep) {
            case 1: // Personal Information
                if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
                if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
                if (!formData.email.trim()) newErrors.email = 'Email is required';
                if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                    newErrors.email = 'Email is invalid';
                }
                break;

            case 2: // Professional Information
                // These fields are not strictly required but can be validated if needed
                break;

            case 3: // Additional Information & Documents
                // Resume is not required but can be validated if needed
                break;

            default:
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Go to next step
    const nextStep = (e) => {
        // Prevent any default behavior
        e.preventDefault();
        e.stopPropagation();

        if (validateStep()) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Go to previous step
    const prevStep = (e) => {
        // Prevent any default behavior
        e.preventDefault();
        e.stopPropagation();

        setCurrentStep(currentStep - 1);
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Only allow form submission on the final step
        if (currentStep !== totalSteps) {
            // If not on final step, prevent submission and move to next step
            nextStep(e);
            return;
        }

        if (validateStep()) {
            // Create FormData object for file upload
            const formDataToSend = new FormData();

            // Add candidate data as JSON string
            formDataToSend.append('candidateData', JSON.stringify(formData));

            // Add resume file if it exists
            if (resumeFile) {
                formDataToSend.append('resume', resumeFile);
            }

            onSave(formDataToSend);
        }
    };

    // Render step 1 - Personal Information
    const renderStep1 = () => (
        <div className="form-step">
            <h3>Personal Information</h3>

            <div className="form-group">
                <label>First Name *</label>
                <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={errors.firstName ? 'error' : ''}
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
                <label>Last Name *</label>
                <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={errors.lastName ? 'error' : ''}
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>

            <div className="form-group">
                <label>Email *</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
                <label>Phone Number</label>
                <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Country</label>
                <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                />
            </div>
        </div>
    );

    // Render step 2 - Professional Information
    const renderStep2 = () => (
        <div className="form-step">
            <h3>Professional Information</h3>

            <div className="form-group">
                <label>Current Position</label>
                <input
                    type="text"
                    name="currentPosition"
                    value={formData.currentPosition}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Current Company</label>
                <input
                    type="text"
                    name="currentCompany"
                    value={formData.currentCompany}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Application Date</label>
                <input
                    type="date"
                    name="applicationDate"
                    value={formData.applicationDate}
                    onChange={handleChange}
                />
            </div>
        </div>
    );

    // Render step 3 - Additional Information & Documents
    const renderStep3 = () => (
        <div className="form-step">
            <h3>Additional Information</h3>

            <div className="form-group">
                <label>Resume/CV</label>
                <input
                    type="file"
                    name="resume"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                />
                <small>Upload candidate's resume or CV (PDF, DOC, DOCX)</small>
            </div>

            <div className="form-group">
                <label>Notes</label>
                <textarea
                    name="notes"
                    rows="4"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional information about the candidate..."
                ></textarea>
            </div>
        </div>
    );

    // Render the current step
    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="candidate-modal">
                <div className="modal-header">
                    <h2>Add New Candidate</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Progress indicator */}
                        <div className="step-indicator">
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div
                                    key={i}
                                    className={`step ${i + 1 === currentStep ? 'active' : i + 1 < currentStep ? 'completed' : ''}`}
                                >
                                    <div className="step-number">{i + 1}</div>
                                    <div className="step-label">
                                        {i === 0 ? 'Personal' : i === 1 ? 'Professional' : 'Additional'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Form Steps */}
                        {renderCurrentStep()}
                    </div>

                    <div className="modal-footer">
                        {currentStep > 1 && (
                            <button type="button" className="back-btn" onClick={prevStep}>
                                Back
                            </button>
                        )}

                        {currentStep < totalSteps ? (
                            <button type="button" className="next-btn" onClick={nextStep}>
                                Next
                            </button>
                        ) : (
                            <button type="submit" className="save-btn">
                                Submit Application
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCandidateModal;