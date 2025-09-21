import React, {useState} from 'react';
import {FaBriefcase, FaTimes} from 'react-icons/fa';
import './VacancyModals.scss'

const AddVacancyModal = ({onClose, onSave, jobPositions}) => {
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle form input changes
    const handleChange = (e) => {
        const {name, value} = e.target;
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

        // Find the selected position without parseInt since UUID is a string
        const selectedPosition = jobPositions.find(pos => pos.id === positionId);

        if (selectedPosition) {
            // Either send just the ID or the whole object depending on your backend
            setFormData({
                ...formData,
                jobPositionId:  selectedPosition.id

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
    // const handleJobPositionChange = (e) => {
    //     const positionId = e.target.value;
    //     console.log('Selected position ID:', positionId);
    //     console.log('Available job positions:', jobPositions);
    //
    //     if (positionId === '') {
    //         console.log('Setting jobPosition to null');
    //         setFormData({
    //             ...formData,
    //             jobPosition: null
    //         });
    //         return;
    //     }
    //
    //     // Find the selected position without parseInt since UUID is a string
    //     const selectedPosition = jobPositions.find(pos => pos.id === positionId);
    //     console.log('Found selected position:', selectedPosition);
    //
    //     if (selectedPosition) {
    //         const jobPositionData = {
    //             id: selectedPosition.id
    //         };
    //         console.log('Setting jobPosition to:', jobPositionData);
    //
    //         setFormData({
    //             ...formData,
    //             jobPosition: jobPositionData
    //         });
    //     } else {
    //         console.log('No position found for ID:', positionId);
    //     }
    // }

// Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submission started');
        console.log('Current formData:', formData);

        if (validateForm()) {
            setIsSubmitting(true);
            console.log('Form validation passed, preparing request data...');

            // Log the exact data being sent
            const requestData = { ...formData };
            console.log('Request data being sent:', JSON.stringify(requestData, null, 2));

            try {
                console.log('Calling onSave with data:', requestData);
                const response = await onSave(requestData);
                console.log('Response received:', response);
            } catch (error) {
                console.error('Error saving vacancy:', error);
                console.error('Error details:', error.response?.data || error.message);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            console.log('Form validation failed. Errors:', errors);
        }
    };

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="add-vacancy-modal">
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-lg">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <FaBriefcase />
                            Post New Vacancy
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
                                        <label>Job Title <span className="required-asterisk">*</span></label>
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
                                            onChange={handleJobPositionChange}
                                            defaultValue=""
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
                                        <label>Closing Date <span className="required-asterisk">*</span></label>
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
                                    <label>Description <span className="required-asterisk">*</span></label>
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
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <FaBriefcase/>
                                    Post Vacancy
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddVacancyModal;