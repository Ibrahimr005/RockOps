import React, { useState, useEffect } from 'react';
import { FaBriefcase, FaTimes } from 'react-icons/fa';
import './VacancyModals.scss';

const EditVacancyModal = ({ vacancy, onClose, onSave, jobPositions }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        responsibilities: '',
        postingDate: '',
        closingDate: '',
        status: 'OPEN',
        numberOfPositions: 1,
        priority: 'MEDIUM',
        jobPosition: null
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form with vacancy data
    useEffect(() => {
        if (vacancy) {
            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };

            setFormData({
                title: vacancy.title || '',
                description: vacancy.description || '',
                requirements: vacancy.requirements || '',
                responsibilities: vacancy.responsibilities || '',
                postingDate: formatDate(vacancy.postingDate),
                closingDate: formatDate(vacancy.closingDate),
                status: vacancy.status || 'OPEN',
                numberOfPositions: vacancy.numberOfPositions || 1,
                priority: vacancy.priority || 'MEDIUM',
                jobPositionId: vacancy.jobPosition?.id || null
            });
        }
    }, [vacancy]);

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

    // Handle job position selection
    const handleJobPositionChange = (e) => {
        const positionId = e.target.value;
        if (positionId === '') {
            setFormData({
                ...formData,
                jobPositionId: null
            });
            return;
        }

        const selectedPosition = jobPositions.find(pos => pos.id === positionId);

        if (selectedPosition) {
            setFormData({
                ...formData,
                jobPositionId: selectedPosition.id
            });
        }
    };


    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.title) newErrors.title = 'Title is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.closingDate) newErrors.closingDate = 'Closing date is required';

        // Validate dates
        if (formData.closingDate && formData.postingDate) {
            const postingDate = new Date(formData.postingDate);
            const closingDate = new Date(formData.closingDate);

            if (closingDate < postingDate) {
                newErrors.closingDate = 'Closing date cannot be before posting date';
            }
        }

        // Validate number of positions
        if (formData.numberOfPositions < 1) {
            newErrors.numberOfPositions = 'Number of positions must be at least 1';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                await onSave({
                    ...formData,
                    id: vacancy.id // Ensure the vacancy ID is included
                });
            } catch (error) {
                console.error('Error updating vacancy:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="add-vacancy-modal">
            <div className="modal-backdrop">
                <div className="modal-container modal-lg">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <FaBriefcase />
                            Edit Vacancy
                        </h2>

                        <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
                            <FaTimes/>
                        </button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="modal-section">
                                <h3 className="modal-section-title">Basic Information</h3>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label>Job Title *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            className={errors.title ? 'error' : ''}
                                            placeholder="e.g. Senior Software Engineer"
                                            disabled={isSubmitting}
                                        />
                                        {errors.title && <span className="error-message">{errors.title}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Job Position</label>
                                        <select
                                            value={formData.jobPositionId || ''}
                                            onChange={handleJobPositionChange}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Select a position</option>
                                            {jobPositions.map(position => (
                                                <option key={position.id} value={position.id}>
                                                    {position.positionName} - {position.department}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                        >
                                            <option value="OPEN">Open</option>
                                            <option value="CLOSED">Closed</option>
                                            <option value="FILLED">Filled</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Number of Positions</label>
                                        <input
                                            type="number"
                                            name="numberOfPositions"
                                            value={formData.numberOfPositions}
                                            onChange={handleChange}
                                            min="1"
                                            className={errors.numberOfPositions ? 'error' : ''}
                                            disabled={isSubmitting}
                                        />
                                        {errors.numberOfPositions &&
                                            <span className="error-message">{errors.numberOfPositions}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Priority</label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                        >
                                            <option value="HIGH">High</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="LOW">Low</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Posting Date</label>
                                        <input
                                            type="date"
                                            name="postingDate"
                                            value={formData.postingDate}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Closing Date *</label>
                                        <input
                                            type="date"
                                            name="closingDate"
                                            value={formData.closingDate}
                                            onChange={handleChange}
                                            className={errors.closingDate ? 'error' : ''}
                                            min={formData.postingDate}
                                            disabled={isSubmitting}
                                        />
                                        {errors.closingDate &&
                                            <span className="error-message">{errors.closingDate}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-section">
                                <h3 className="modal-section-title">Job Details</h3>
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="4"
                                        className={errors.description ? 'error' : ''}
                                        placeholder="Brief overview of the job opportunity, company culture, and what makes this role exciting..."
                                        disabled={isSubmitting}
                                    ></textarea>
                                    {errors.description && <span className="error-message">{errors.description}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Requirements</label>
                                    <textarea
                                        name="requirements"
                                        value={formData.requirements}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="• Bachelor's degree in relevant field&#10;• 3+ years of experience&#10;• Strong communication skills&#10;• Proficiency in required technologies"
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>

                                <div className="form-group">
                                    <label>Responsibilities</label>
                                    <textarea
                                        name="responsibilities"
                                        value={formData.responsibilities}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="• Lead development of new features&#10;• Collaborate with cross-functional teams&#10;• Mentor junior team members&#10;• Participate in code reviews"
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="modal-btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="spinner"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <FaBriefcase/>
                                    Update Vacancy
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditVacancyModal;