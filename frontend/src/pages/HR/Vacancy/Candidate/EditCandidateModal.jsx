import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaGlobeAmericas, FaBriefcase, FaBuilding, FaCalendarAlt, FaStickyNote, FaFilePdf } from 'react-icons/fa';
import './EditCandidateModal.scss';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const EditCandidateModal = ({ candidate, onClose, onSave, isLoading }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        country: '',
        currentPosition: '',
        currentCompany: '',
        applicationDate: '',
        notes: ''
    });
    const [resumeFile, setResumeFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Initialize form data with candidate information
    useEffect(() => {
        if (candidate) {
            setFormData({
                firstName: candidate.firstName || '',
                lastName: candidate.lastName || '',
                email: candidate.email || '',
                phoneNumber: candidate.phoneNumber || '',
                country: candidate.country || '',
                currentPosition: candidate.currentPosition || '',
                currentCompany: candidate.currentCompany || '',
                applicationDate: candidate.applicationDate ?
                    new Date(candidate.applicationDate).toISOString().split('T')[0] : '',
                notes: candidate.notes || ''
            });
        }
    }, [candidate]);

    // Handle input changes
    const handleChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Handle file changes
    const handleFileChange = (e) => {
        setIsFormDirty(true);
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setErrors(prev => ({
                    ...prev,
                    resume: 'Please upload a PDF, DOC, or DOCX file'
                }));
                return;
            }

            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({
                    ...prev,
                    resume: 'File size must be less than 10MB'
                }));
                return;
            }

            setResumeFile(file);
            setErrors(prev => ({
                ...prev,
                resume: ''
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName?.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName?.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            // Create FormData object for multipart request
            const submitData = new FormData();

            // Add candidate data as JSON string
            const candidateData = {
                ...formData,
                vacancyId: candidate.vacancy?.id // Preserve vacancy association
            };

            submitData.append('candidateData', JSON.stringify(candidateData));

            // Add resume file if selected
            if (resumeFile) {
                submitData.append('resume', resumeFile);
            }

            await onSave(submitData);
        } catch (error) {
            console.error('Error in form submission:', error);
        }
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    return (
        <>
        <div className="modal-overlay edit-candidate-overlay">
            <div className="edit-candidate-modal">
                {/* Modal Header */}
                <div className="modal-header">
                    <h2>
                        <FaUser />
                        Edit Candidate
                    </h2>
                    <button className="btn-close" onClick={handleCloseAttempt} disabled={isLoading}>
                        <FaTimes />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    <form id="edit-candidate-form" onSubmit={handleSubmit} className="form-content">
                        {/* Personal Information Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaUser />
                                Personal Information
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={errors.firstName ? 'error' : ''}
                                        disabled={isLoading}
                                    />
                                    {errors.firstName && (
                                        <span className="error-message">{errors.firstName}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Last Name *</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={errors.lastName ? 'error' : ''}
                                        disabled={isLoading}
                                    />
                                    {errors.lastName && (
                                        <span className="error-message">{errors.lastName}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Information Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaEnvelope />
                                Contact Information
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={errors.email ? 'error' : ''}
                                        disabled={isLoading}
                                    />
                                    {errors.email && (
                                        <span className="error-message">{errors.email}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Information Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaBriefcase />
                                Professional Information
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Current Position</label>
                                    <input
                                        type="text"
                                        name="currentPosition"
                                        value={formData.currentPosition}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Current Company</label>
                                    <input
                                        type="text"
                                        name="currentCompany"
                                        value={formData.currentCompany}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Application Information Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaCalendarAlt />
                                Application Information
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Application Date</label>
                                    <input
                                        type="date"
                                        name="applicationDate"
                                        value={formData.applicationDate}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Resume Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaFilePdf />
                                Resume/CV
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Update Resume/CV</label>
                                    <input
                                        type="file"
                                        name="resume"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        className={errors.resume ? 'error' : ''}
                                        disabled={isLoading}
                                    />
                                    <small>Upload a new resume to replace the current one (PDF, DOC, DOCX - Max 10MB)</small>
                                    {errors.resume && (
                                        <span className="error-message">{errors.resume}</span>
                                    )}
                                    {candidate.resumeUrl && !resumeFile && (
                                        <div className="current-resume">
                                            <span>Current resume: </span>
                                            <button
                                                type="button"
                                                className="resume-link"
                                                onClick={() => window.open(candidate.resumeUrl, '_blank')}
                                            >
                                                <FaFilePdf />
                                                View Current Resume
                                            </button>
                                        </div>
                                    )}
                                    {resumeFile && (
                                        <div className="new-file-info">
                                            <span>New file: {resumeFile.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaStickyNote />
                                Additional Notes
                            </h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        name="notes"
                                        rows="4"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Additional information about the candidate..."
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer - Outside form but fixed at bottom */}
                <div className="modal-footer">
                    <div className="footer-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleCloseAttempt}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-candidate-form"
                            className="primary-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        </>
    );
};

export default EditCandidateModal;