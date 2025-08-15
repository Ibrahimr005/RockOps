import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTools, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaPlus } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import contactService from '../../../services/contactService.js';
import './MaintenanceStepModal.scss';

const MaintenanceStepModal = ({ isOpen, onClose, onSubmit, editingStep, maintenanceRecord, restoredFormData }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        stepType: '',
        description: '',
        responsibleContactId: '',
        startDate: '',
        expectedEndDate: '',
        fromLocation: '',
        toLocation: '',
        stepCost: '',
        notes: ''
    });

    const [availableContacts, setAvailableContacts] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const stepTypes = [
        { value: 'TRANSPORT', label: 'Transport' },
        { value: 'INSPECTION', label: 'Inspection' },
        { value: 'REPAIR', label: 'Repair' },
        { value: 'TESTING', label: 'Testing' },
        { value: 'DIAGNOSIS', label: 'Diagnosis' },
        { value: 'ESCALATION', label: 'Escalation' },
        { value: 'RETURN_TO_SERVICE', label: 'Return to Service' }
    ];

    useEffect(() => {
        if (isOpen) {
            loadAvailableContacts();
        }
    }, [isOpen]);

    useEffect(() => {
        // Handle state restoration from navigation first
        if (restoredFormData) {
            setFormData(restoredFormData);
        } else if (editingStep) {
            setFormData({
                stepType: editingStep.stepType || '',
                description: editingStep.description || '',
                responsibleContactId: editingStep.responsibleContactId || '',
                startDate: editingStep.startDate ? 
                    editingStep.startDate.split('T')[0] : '',
                expectedEndDate: editingStep.expectedEndDate ? 
                    editingStep.expectedEndDate.split('T')[0] : '',
                fromLocation: editingStep.fromLocation || '',
                toLocation: editingStep.toLocation || '',
                stepCost: editingStep.stepCost || '',
                notes: editingStep.notes || ''
            });
        } else {
            // Reset for a completely new step
            setFormData({
                stepType: '',
                description: '',
                responsibleContactId: '',
                startDate: new Date().toISOString().split('T')[0],
                expectedEndDate: '',
                fromLocation: '',
                toLocation: '',
                stepCost: '',
                notes: ''
            });
        }
        setErrors({});
    }, [editingStep, isOpen, restoredFormData]);

    const loadAvailableContacts = async () => {
        try {
            setLoading(true);
            const response = await contactService.getAvailableContacts();
            setAvailableContacts(response.data || []);
        } catch (error) {
            console.error('Error loading available contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
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

    const validateForm = () => {
        const newErrors = {};

        if (!formData.stepType) {
            newErrors.stepType = 'Step type is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        if (!formData.responsibleContactId) {
            newErrors.responsibleContactId = 'Responsible contact is required';
        }

        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }

        if (!formData.expectedEndDate) {
            newErrors.expectedEndDate = 'Expected end date is required';
        }

        if (formData.startDate && formData.expectedEndDate) {
            const startDate = new Date(formData.startDate);
            const expectedEndDate = new Date(formData.expectedEndDate);
            if (expectedEndDate <= startDate) {
                newErrors.expectedEndDate = 'Expected end date must be after start date';
            }
        }

        if (!formData.fromLocation.trim()) {
            newErrors.fromLocation = 'From location is required';
        }

        if (!formData.toLocation.trim()) {
            newErrors.toLocation = 'To location is required';
        }

        if (formData.stepCost && isNaN(formData.stepCost)) {
            newErrors.stepCost = 'Cost must be a valid number';
        }

        if (formData.stepCost && parseFloat(formData.stepCost) < 0) {
            newErrors.stepCost = 'Cost must be non-negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            const submitData = {
                ...formData,
                startDate: formData.startDate + 'T09:00:00',
                expectedEndDate: formData.expectedEndDate + 'T17:00:00',
                stepCost: formData.stepCost ? parseFloat(formData.stepCost) : 0
            };
            
            onSubmit(submitData);
        }
    };

    const handleAddNewContact = () => {
        // Preserve the full path including query params
        const returnPath = location.pathname + location.search;
        navigate('/maintenance/contacts', {
            state: {
                action: 'add-and-return',
                returnPath: returnPath,
                formDataToRestore: formData
            }
        });
    };

    const getSelectedContact = () => {
        return availableContacts.find(contact => contact.id === formData.responsibleContactId);
    };

    if (!isOpen) return null;

    return (
        <div className="maintenance-step-modal-overlay" onClick={onClose}>
            <div className="maintenance-step-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FaTools />
                        {editingStep ? 'Edit Maintenance Step' : 'New Maintenance Step'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="maintenance-step-form">
                    <div className="form-section">
                        <h3>Step Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="stepType">Step Type *</label>
                                <select
                                    id="stepType"
                                    name="stepType"
                                    value={formData.stepType}
                                    onChange={handleInputChange}
                                    className={errors.stepType ? 'error' : ''}
                                >
                                    <option value="">Select Step Type</option>
                                    {stepTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.stepType && <span className="error-message">{errors.stepType}</span>}
                            </div>

                            <div className="form-group responsible-contact-group">
                                <label htmlFor="responsibleContactId">Responsible Contact *</label>
                                <div className="contact-input-wrapper">
                                    <select
                                        id="responsibleContactId"
                                        name="responsibleContactId"
                                        value={formData.responsibleContactId}
                                        onChange={handleInputChange}
                                        className={errors.responsibleContactId ? 'error' : ''}
                                        disabled={loading}
                                    >
                                        <option value="">Select Contact</option>
                                        {availableContacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.firstName} {contact.lastName} - {contact.contactType}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-add-contact"
                                        onClick={handleAddNewContact}
                                        title="Add New Contact"
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                                {errors.responsibleContactId && <span className="error-message">{errors.responsibleContactId}</span>}
                                {loading && <span className="loading-message">Loading contacts...</span>}
                            </div>
                        </div>

                        {formData.responsibleContactId && (
                            <div className="contact-details">
                                <div className="contact-info">
                                    <strong>Selected Contact:</strong>
                                    <div>{getSelectedContact()?.firstName} {getSelectedContact()?.lastName}</div>
                                    <div className="contact-subtitle">
                                        {getSelectedContact()?.email} • {getSelectedContact()?.phoneNumber}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h3>Step Details</h3>
                        <div className="form-group">
                            <label htmlFor="description">Description *</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe what will happen in this step..."
                                rows={4}
                                className={errors.description ? 'error' : ''}
                            />
                            {errors.description && <span className="error-message">{errors.description}</span>}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Location & Movement</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="fromLocation">From Location *</label>
                                <input
                                    type="text"
                                    id="fromLocation"
                                    name="fromLocation"
                                    value={formData.fromLocation}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Site A, Workshop, etc."
                                    className={errors.fromLocation ? 'error' : ''}
                                />
                                {errors.fromLocation && <span className="error-message">{errors.fromLocation}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="toLocation">To Location *</label>
                                <input
                                    type="text"
                                    id="toLocation"
                                    name="toLocation"
                                    value={formData.toLocation}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Site B, Repair Facility, etc."
                                    className={errors.toLocation ? 'error' : ''}
                                />
                                {errors.toLocation && <span className="error-message">{errors.toLocation}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Schedule & Cost</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startDate">Start Date *</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    className={errors.startDate ? 'error' : ''}
                                />
                                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="expectedEndDate">Expected End Date *</label>
                                <input
                                    type="date"
                                    id="expectedEndDate"
                                    name="expectedEndDate"
                                    value={formData.expectedEndDate}
                                    onChange={handleInputChange}
                                    className={errors.expectedEndDate ? 'error' : ''}
                                />
                                {errors.expectedEndDate && <span className="error-message">{errors.expectedEndDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="stepCost">Step Cost</label>
                                <input
                                    type="number"
                                    id="stepCost"
                                    name="stepCost"
                                    value={formData.stepCost}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className={errors.stepCost ? 'error' : ''}
                                />
                                {errors.stepCost && <span className="error-message">{errors.stepCost}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Additional Information</h3>
                        <div className="form-group">
                            <label htmlFor="notes">Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Additional notes, observations, or special instructions..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <FaSave />
                            {editingStep ? 'Update Step' : 'Create Step'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaintenanceStepModal; 