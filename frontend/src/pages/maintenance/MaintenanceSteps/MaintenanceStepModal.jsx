import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTools, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaPlus, FaEnvelope, FaPhone } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import contactService from '../../../services/contactService.js';
import stepTypeService from '../../../services/stepTypeService.js';
import { equipmentService } from '../../../services/equipmentService.js';
import { siteService } from '../../../services/siteService.js';

import apiClient from '../../../utils/apiClient.js';
import '../../../styles/modal-styles.scss';
import '../../../styles/cancel-modal-button.scss';
import './MaintenanceStepModal.scss';

const MaintenanceStepModal = ({ isOpen, onClose, onSubmit, editingStep, maintenanceRecord, restoredFormData }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showError } = useSnackbar();

    const [formData, setFormData] = useState({
        stepTypeId: '',
        description: '',
        responsibleContactId: '',
        responsibleEmployeeId: '',
        startDate: '',
        expectedEndDate: '',
        fromLocation: '',
        toLocation: '',
        stepCost: '',
        notes: ''
    });

    const [availableContacts, setAvailableContacts] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [stepTypes, setStepTypes] = useState([]);
    const [selectedStepType, setSelectedStepType] = useState(null);
    const [responsiblePersonType, setResponsiblePersonType] = useState('external'); // 'site' or 'external'
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [existingSteps, setExistingSteps] = useState([]);
    const [currentLocation, setCurrentLocation] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadAvailableContacts();
            loadStepTypes();
            loadExistingSteps(); // Load existing steps for validation and location tracking
            // Load employees if we have equipment info with site
            if (maintenanceRecord?.equipmentId) {
                loadEquipmentAndEmployees();
            }
        }
    }, [isOpen, maintenanceRecord]);

    useEffect(() => {
        // Handle state restoration from navigation first
        if (restoredFormData) {
            setFormData(restoredFormData);
        } else if (editingStep) {
            setFormData({
                stepTypeId: editingStep.stepTypeId || '',
                description: editingStep.description || '',
                responsibleContactId: editingStep.responsibleContactId || '',
                responsibleEmployeeId: editingStep.responsibleEmployeeId || '',
                startDate: editingStep.startDate ? 
                    editingStep.startDate.split('T')[0] : '',
                expectedEndDate: editingStep.expectedEndDate ? 
                    editingStep.expectedEndDate.split('T')[0] : '',
                fromLocation: editingStep.fromLocation || '',
                toLocation: editingStep.toLocation || '',
                stepCost: editingStep.stepCost || '',
                notes: editingStep.notes || ''
            });
            // Set selected step type for editing
            if (editingStep.stepTypeId && stepTypes.length > 0) {
                const stepType = stepTypes.find(st => st.id === editingStep.stepTypeId);
                setSelectedStepType(stepType);
            }
            // Set responsible person type based on which ID is present
            if (editingStep.responsibleEmployeeId) {
                setResponsiblePersonType('site');
            } else {
                setResponsiblePersonType('external');
            }
        } else {
            // Reset for a completely new step - auto-populate fromLocation with current location
            setFormData({
                stepTypeId: '',
                description: '',
                responsibleContactId: '',
                responsibleEmployeeId: '',
                startDate: new Date().toISOString().split('T')[0],
                expectedEndDate: '',
                fromLocation: currentLocation,
                toLocation: '',
                stepCost: '',
                notes: ''
            });
            setResponsiblePersonType('external');
        }
        setErrors({});
    }, [editingStep, isOpen, restoredFormData, stepTypes, currentLocation]);

    const loadStepTypes = async () => {
        try {
            const response = await stepTypeService.getAllStepTypes();
            console.log('Step types loaded:', response);
            // Format step type names to title case for display
            const formattedStepTypes = (response || []).map(st => ({
                ...st,
                name: st.name.charAt(0).toUpperCase() + st.name.slice(1).toLowerCase()
            }));
            setStepTypes(formattedStepTypes);
        } catch (error) {
            console.error('Error loading step types:', error);
        }
    };

    const loadExistingSteps = async () => {
        if (!maintenanceRecord?.id) return;
        
        try {
            const response = await apiClient.get(`/api/maintenance/records/${maintenanceRecord.id}/steps`);
            const steps = response.data || [];
            setExistingSteps(steps);
            
            // Calculate current location for new steps
            calculateCurrentLocation(steps);
        } catch (error) {
            console.error('Error loading existing steps:', error);
        }
    };

    const calculateCurrentLocation = (steps) => {
        if (!steps || steps.length === 0) {
            // No previous steps, use equipment's site location
            if (maintenanceRecord?.site) {
                setCurrentLocation(maintenanceRecord.site);
            }
            return;
        }

        // Get the last step
        const lastStep = steps[steps.length - 1];
        
        // If last step was TRANSPORT, current location is its toLocation
        if (lastStep.stepTypeName && lastStep.stepTypeName.toUpperCase() === 'TRANSPORT') {
            setCurrentLocation(lastStep.toLocation || '');
        } else {
            // Otherwise, inherit location from last step
            const location = lastStep.toLocation || lastStep.fromLocation || maintenanceRecord?.site || '';
            setCurrentLocation(location);
        }
    };

    const loadEquipmentAndEmployees = async () => {
        try {
            console.log('Loading equipment and employees for maintenance record:', maintenanceRecord);
            
            // Use equipmentService to get equipment
            const equipmentResponse = await equipmentService.getEquipmentById(maintenanceRecord.equipmentId);
            const equipment = equipmentResponse.data;
            console.log('Equipment loaded:', equipment);
            
            if (equipment.siteId) {
                // Load employees from that site
                console.log('Fetching employees for site:', equipment.siteId);
                const employeesResponse = await siteService.getSiteEmployees(equipment.siteId);
                console.log('Employees loaded:', employeesResponse.data);
                setAvailableEmployees(employeesResponse.data || []);
            } else {
                console.log('No site found on equipment, equipment object:', equipment);
            }
        } catch (error) {
            console.error('Error loading equipment and employees:', error);
            console.error('Error details:', error.response);
        }
    };

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

        // Update selected step type when step type changes
        if (name === 'stepTypeId') {
            const stepType = stepTypes.find(st => st.id === value);
            setSelectedStepType(stepType);
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleResponsibleTypeChange = (e) => {
        const type = e.target.value;
        setResponsiblePersonType(type);
        // Clear the opposite field
        if (type === 'site') {
            setFormData(prev => ({ ...prev, responsibleContactId: '' }));
        } else {
            setFormData(prev => ({ ...prev, responsibleEmployeeId: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // VALIDATION: Check if all previous steps are completed (only for new steps, not editing)
        if (!editingStep && existingSteps.length > 0) {
            const incompleteSteps = existingSteps.filter(step => !step.actualEndDate);
            if (incompleteSteps.length > 0) {
                const incompleteDescriptions = incompleteSteps.map(s => s.description).join(', ');
                showError(`Cannot add new step. Please complete all previous steps first. Incomplete steps: ${incompleteDescriptions}`);
                return false; // Return early, don't set errors object
            }
            
            // VALIDATION: Check if start date is >= latest step's completion date
            if (incompleteSteps.length === 0 && existingSteps.length > 0) {
                const latestStep = existingSteps[existingSteps.length - 1];
                if (latestStep.actualEndDate && formData.startDate) {
                    const startDate = new Date(formData.startDate);
                    const completionDate = new Date(latestStep.actualEndDate);
                    if (startDate < completionDate) {
                        const completionDateStr = completionDate.toLocaleDateString();
                        showError(`New step start date must be on or after ${completionDateStr}. The previous step was completed on ${completionDateStr}.`);
                        return false; // Return early
                    }
                }
            }
        }

        if (!formData.stepTypeId) {
            newErrors.stepTypeId = 'Step type is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        // Validate responsible person based on type
        if (responsiblePersonType === 'site') {
            if (!formData.responsibleEmployeeId) {
                newErrors.responsibleEmployeeId = 'Responsible employee is required';
            }
        } else {
            if (!formData.responsibleContactId) {
                newErrors.responsibleContactId = 'Responsible contact is required';
            }
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
            if (expectedEndDate < startDate) {
                newErrors.expectedEndDate = 'Expected end date cannot be before start date';
            }
        }

        // Only validate location fields if step type is TRANSPORT
        if (selectedStepType?.name?.toUpperCase() === 'TRANSPORT') {
            if (!formData.fromLocation.trim()) {
                newErrors.fromLocation = 'From location is required';
            }

            if (!formData.toLocation.trim()) {
                newErrors.toLocation = 'To location is required';
            }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            const submitData = {
                stepTypeId: formData.stepTypeId,
                description: formData.description,
                startDate: formData.startDate + 'T09:00:00',
                expectedEndDate: formData.expectedEndDate + 'T17:00:00',
                stepCost: formData.stepCost ? parseFloat(formData.stepCost) : 0,
                notes: formData.notes
            };

            // Add responsible person based on type
            if (responsiblePersonType === 'site') {
                submitData.responsibleEmployeeId = formData.responsibleEmployeeId;
            } else {
                submitData.responsibleContactId = formData.responsibleContactId;
            }

            // Only include location fields if step type is TRANSPORT
            if (selectedStepType?.name?.toUpperCase() === 'TRANSPORT') {
                submitData.fromLocation = formData.fromLocation;
                submitData.toLocation = formData.toLocation;
            } else {
                // For non-TRANSPORT steps, still include fromLocation (current location)
                submitData.fromLocation = formData.fromLocation || currentLocation;
                submitData.toLocation = formData.fromLocation || currentLocation;
            }
            
            console.log('Submitting maintenance step data:', submitData);
            try {
                await onSubmit(submitData);
            } catch (error) {
                // Handle backend validation errors - show in snackbar
                if (error.response && error.response.data) {
                    const errorMessage = error.response.data.message || error.response.data.error || 'Failed to save maintenance step';
                    showError(errorMessage);
                } else {
                    showError('Failed to save maintenance step. Please try again.');
                }
            }
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
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaTools />
                        {editingStep ? 'Edit Maintenance Step' : 'New Maintenance Step'}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                <form onSubmit={handleSubmit} className="maintenance-step-form" id="maintenance-step-form">
                    <div className="form-section">
                        <h3>Step Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="stepTypeId">
                                    Step Type <span className="required">*</span>
                                </label>
                                <select
                                    id="stepTypeId"
                                    name="stepTypeId"
                                    value={formData.stepTypeId}
                                    onChange={handleInputChange}
                                    className={errors.stepTypeId ? 'error' : ''}
                                >
                                    <option value="">Select Step Type</option>
                                    {stepTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.stepTypeId && <span className="error-message">{errors.stepTypeId}</span>}
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="description">
                                Description <span className="required">*</span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe the maintenance step in detail..."
                                rows={4}
                                className={errors.description ? 'error' : ''}
                            />
                            {errors.description && <span className="error-message">{errors.description}</span>}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Responsible Person Assignment</h3>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="responsiblePersonType"
                                    value="site"
                                    checked={responsiblePersonType === 'site'}
                                    onChange={handleResponsibleTypeChange}
                                />
                                From Equipment Site
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="responsiblePersonType"
                                    value="external"
                                    checked={responsiblePersonType === 'external'}
                                    onChange={handleResponsibleTypeChange}
                                />
                                External Contact
                            </label>
                        </div>

                        {responsiblePersonType === 'site' ? (
                            <div className="form-group">
                                <label htmlFor="responsibleEmployeeId">
                                    Responsible Employee <span className="required">*</span>
                                </label>
                                <select
                                    id="responsibleEmployeeId"
                                    name="responsibleEmployeeId"
                                    value={formData.responsibleEmployeeId}
                                    onChange={handleInputChange}
                                    className={errors.responsibleEmployeeId ? 'error' : ''}
                                >
                                    <option value="">Select Employee</option>
                                    {availableEmployees.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.fullName} {employee.jobPosition ? `- ${employee.jobPosition.positionName}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.responsibleEmployeeId && <span className="error-message">{errors.responsibleEmployeeId}</span>}
                                {availableEmployees.length === 0 && (
                                    <span className="info-text">No employees available from equipment site</span>
                                )}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="responsibleContactId">
                                    Responsible Contact <span className="required">*</span>
                                </label>
                                <div className="contact-field-wrapper">
                                    <div className="contact-dropdown">
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
                                        {errors.responsibleContactId && <span className="error-message">{errors.responsibleContactId}</span>}
                                        {loading && <span className="info-text">Loading contacts...</span>}
                                    </div>
                                    <button
                                        type="button"
                                        className="add-contact-btn"
                                        onClick={handleAddNewContact}
                                        title="Add New Contact"
                                    >
                                        <FaPlus /> Add Contact
                                    </button>
                                </div>

                                {formData.responsibleContactId && getSelectedContact() && (
                                    <div className="contact-details">
                                        <div className="contact-name">
                                            {getSelectedContact()?.firstName} {getSelectedContact()?.lastName}
                                        </div>
                                        <div className="contact-info">
                                            <FaEnvelope /> {getSelectedContact()?.email}
                                        </div>
                                        <div className="contact-info">
                                            <FaPhone /> {getSelectedContact()?.phoneNumber}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedStepType?.name?.toUpperCase() === 'TRANSPORT' && (
                        <div className="form-section">
                            <h3>Location & Movement</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="fromLocation">
                                        From Location (Current Location) <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="fromLocation"
                                        name="fromLocation"
                                        value={formData.fromLocation}
                                        readOnly
                                        placeholder="Current equipment location"
                                        className={`readonly-field ${errors.fromLocation ? 'error' : ''}`}
                                    />
                                    {errors.fromLocation && <span className="error-message">{errors.fromLocation}</span>}
                                    <span className="info-text">Equipment is currently at this location</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="toLocation">
                                        To Location (Destination) <span className="required">*</span>
                                    </label>
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
                                    <span className="info-text">Where equipment will be transported to</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-section">
                        <h3>Schedule & Cost</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startDate">
                                    Start Date <span className="required">*</span>
                                </label>
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
                                <label htmlFor="expectedEndDate">
                                    Expected End Date <span className="required">*</span>
                                </label>
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
                                    placeholder="0.00"  // Remove $ from here
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

                </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="maintenance-step-form">
                        <FaSave />
                        {editingStep ? 'Update Step' : 'Create Step'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceStepModal; 