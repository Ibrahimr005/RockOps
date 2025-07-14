import React, { useState } from 'react';
import './VacancyModals.scss';

const AddVacancyModal = ({ onClose, onSave, jobPositions }) => {
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        responsibilities: '',
        postingDate: today,
        closingDate: '',
        status: 'OPEN',
        numberOfPositions: 1,
        priority: 'MEDIUM',
        jobPosition: null
    });

    const [errors, setErrors] = useState({});

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

        // Find the selected position without parseInt since UUID is a string
        const selectedPosition = jobPositions.find(pos => pos.id === positionId);

        if (selectedPosition) {
            // Either send just the ID or the whole object depending on your backend
            setFormData({
                ...formData,
                jobPosition: {
                    id: selectedPosition.id
                }
            });
        }
    }

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.title) newErrors.title = 'Title is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.closingDate) newErrors.closingDate = 'Closing date is required';

        // Validate dates
        const postingDate = new Date(formData.postingDate);
        const closingDate = new Date(formData.closingDate);
        const today = new Date();

        if (closingDate < postingDate) {
            newErrors.closingDate = 'Closing date cannot be before posting date';
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
            onSave(formData);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="vacancy-modal">
                <div className="modal-header">
                    <h2>Post New Vacancy</h2>
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
                                    defaultValue=""
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
                        <button type="submit" className="save-btn">Post Vacancy</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVacancyModal;