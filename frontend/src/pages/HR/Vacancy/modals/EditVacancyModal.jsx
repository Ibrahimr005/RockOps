import React, { useState, useEffect } from 'react';
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

    // Initialize form with vacancy data
    useEffect(() => {
        if (vacancy) {
            // Format dates from ISO string to YYYY-MM-DD for input fields
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
                jobPosition: vacancy.jobPosition || null
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
                jobPosition: null
            });
            return;
        }

        const selectedPosition = jobPositions.find(pos => pos.id === parseInt(positionId));
        setFormData({
            ...formData,
            jobPosition: selectedPosition
        });
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
    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            onSave({
                ...formData,
                id: vacancy.id // Ensure the vacancy ID is included
            });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="vacancy-modal">
                <div className="modal-header">
                    <h2>Edit Vacancy</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                                />
                                {errors.title && <span className="error-message">{errors.title}</span>}
                            </div>

                            <div className="form-group">
                                <label>Job Position</label>
                                <select
                                    onChange={handleJobPositionChange}
                                    value={formData.jobPosition ? formData.jobPosition.id : ''}
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
                                />
                                {errors.numberOfPositions && <span className="error-message">{errors.numberOfPositions}</span>}
                            </div>

                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
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
                                />
                                {errors.closingDate && <span className="error-message">{errors.closingDate}</span>}
                            </div>

                            <div className="form-group full-width">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    className={errors.description ? 'error' : ''}
                                    placeholder="Brief overview of the job opportunity"
                                ></textarea>
                                {errors.description && <span className="error-message">{errors.description}</span>}
                            </div>

                            <div className="form-group full-width">
                                <label>Requirements</label>
                                <textarea
                                    name="requirements"
                                    value={formData.requirements}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Qualifications, skills, experience needed"
                                ></textarea>
                            </div>

                            <div className="form-group full-width">
                                <label>Responsibilities</label>
                                <textarea
                                    name="responsibilities"
                                    value={formData.responsibilities}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Key duties and responsibilities of the position"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="save-btn">Update Vacancy</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditVacancyModal;