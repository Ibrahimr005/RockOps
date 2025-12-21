import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTools, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaPlus, FaEnvelope, FaPhone } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import contactService from '../../../services/contactService.js';
import stepTypeService from '../../../services/stepTypeService.js';
import { equipmentService } from '../../../services/equipmentService.js';
import { siteService } from '../../../services/siteService.js';
import contactTypeService from '../../../services/contactTypeService.js';
import maintenanceService from '../../../services/maintenanceService.js';

import apiClient from '../../../utils/apiClient.js';
import '../../../styles/modal-styles.scss';
import '../../../styles/cancel-modal-button.scss';
import './MaintenanceStepModal.scss';
import { merchantService } from "../../../services/merchant/merchantService.js";

const MaintenanceStepModal = ({ isOpen, onClose, onSubmit, editingStep, maintenanceRecord, restoredFormData }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showError } = useSnackbar();

    const [formData, setFormData] = useState({
        stepTypeId: '',
        description: '',
        responsibleContactId: '',
        responsibleEmployeeId: '',
        selectedMerchantId: '',
        startDate: '',
        expectedEndDate: '',
        fromLocation: '',
        toLocation: '',
        downPayment: '',
        expectedCost: '',
        remaining: '',
        remainingManuallySet: false,
        actualCost: '',
        stepCost: '', // Keep for backward compatibility
        notes: ''
    });

    const [remainingManuallyChanged, setRemainingManuallyChanged] = useState(false);

    const [availableContacts, setAvailableContacts] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [stepTypes, setStepTypes] = useState([]);
    const [selectedStepType, setSelectedStepType] = useState(null);
    const [responsiblePersonType, setResponsiblePersonType] = useState('external'); // 'site', 'external', or 'merchant'
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [existingSteps, setExistingSteps] = useState([]);
    const [currentLocation, setCurrentLocation] = useState('');
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [newContactData, setNewContactData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        contactTypeId: '',
        company: '',
        specialization: ''
    });
    const [contactTypes, setContactTypes] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [merchantContacts, setMerchantContacts] = useState([]);
    const [merchantItems, setMerchantItems] = useState([{ description: '', cost: '' }]);

    useEffect(() => {
        if (isOpen) {
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';

            loadAvailableContacts();
            loadStepTypes();
            loadContactTypes();
            loadMerchants();
            loadExistingSteps(); // Load existing steps for validation and location tracking
            // Load employees if we have equipment info with site
            if (maintenanceRecord?.equipmentId) {
                loadEquipmentAndEmployees();
            }
        } else {
            // Restore scroll when modal is closed
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
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
                selectedMerchantId: editingStep.selectedMerchantId || '',
                startDate: editingStep.startDate ?
                    editingStep.startDate.split('T')[0] : '',
                expectedEndDate: editingStep.expectedEndDate ?
                    editingStep.expectedEndDate.split('T')[0] : '',
                fromLocation: editingStep.fromLocation || '',
                toLocation: editingStep.toLocation || '',
                downPayment: editingStep.downPayment || '',
                expectedCost: editingStep.expectedCost || editingStep.stepCost || '',
                remaining: editingStep.remaining || '',
                remainingManuallySet: editingStep.remainingManuallySet || false,
                actualCost: editingStep.actualCost || '',
                stepCost: editingStep.stepCost || '',
                notes: editingStep.notes || ''
            });
            setRemainingManuallyChanged(editingStep.remainingManuallySet || false);
            // Set selected step type for editing
            if (editingStep.stepTypeId && stepTypes.length > 0) {
                const stepType = stepTypes.find(st => st.id === editingStep.stepTypeId);
                setSelectedStepType(stepType);
            }
            // Set responsible person type based on which ID is present
            if (editingStep.responsibleEmployeeId) {
                setResponsiblePersonType('site');
            } else if (editingStep.selectedMerchantId) {
                setResponsiblePersonType('merchant');
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
                selectedMerchantId: '',
                startDate: new Date().toISOString().split('T')[0],
                expectedEndDate: '',
                fromLocation: currentLocation,
                toLocation: '',
                downPayment: '',
                expectedCost: '',
                remaining: '',
                remainingManuallySet: false,
                actualCost: '',
                stepCost: '',
                notes: ''
            });
            setResponsiblePersonType('external');
            setRemainingManuallyChanged(false);
        }
        setErrors({});
    }, [editingStep, isOpen, restoredFormData, stepTypes, currentLocation]);

    // Sync selectedStepType with formData.stepTypeId
    useEffect(() => {
        if (formData.stepTypeId && stepTypes.length > 0) {
            // Use loose equality to handle string/number mismatches
            const stepType = stepTypes.find(st => st.id == formData.stepTypeId);
            setSelectedStepType(stepType || null);
        } else {
            setSelectedStepType(null);
        }
    }, [formData.stepTypeId, stepTypes]);

    // Sync fromLocation with currentLocation for new steps
    useEffect(() => {
        if (!editingStep && currentLocation && !formData.fromLocation) {
            setFormData(prev => ({ ...prev, fromLocation: currentLocation }));
        }
    }, [currentLocation, editingStep, formData.fromLocation]);

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

            if (equipment?.siteId) {
                // Load employees from that site
                console.log('Fetching employees for site:', equipment.siteId);
                const employeesResponse = await siteService.getSiteEmployees(equipment.siteId);
                console.log('Employees loaded:', employeesResponse.data);

                // Robustly handle response data
                let employees = [];
                if (employeesResponse.data && Array.isArray(employeesResponse.data)) {
                    employees = employeesResponse.data;
                } else if (employeesResponse.data && Array.isArray(employeesResponse.data.content)) {
                    employees = employeesResponse.data.content;
                } else if (Array.isArray(employeesResponse.data)) {
                    employees = employeesResponse.data;
                } else {
                    console.warn('Unexpected employees response format:', employeesResponse);
                }

                setAvailableEmployees(employees);
            } else {
                console.log('No site found on equipment, equipment object:', equipment);
                setAvailableEmployees([]);
            }
        } catch (error) {
            console.error('Error loading equipment and employees:', error);
            console.error('Error details:', error.response);
            setAvailableEmployees([]); // Ensure it's always an array on error
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

    const loadContactTypes = async () => {
        try {
            const response = await contactTypeService.getAllContactTypes();
            setContactTypes(response.data || []);
        } catch (error) {
            console.error('Error loading contact types:', error);
        }
    };

    const loadMerchants = async () => {
        try {
            const response = await merchantService.getAllMerchants();
            console.log('Merchants loaded:', response.data);
            setMerchants(response.data || []);
        } catch (error) {
            console.error('Error loading merchants:', error);
        }
    };

    const loadMerchantContacts = async (merchantId) => {
        if (!merchantId) {
            setMerchantContacts([]);
            return;
        }
        try {
            console.log('Loading contacts for merchant:', merchantId);
            const response = await maintenanceService.getContactsByMerchant(merchantId);
            console.log('Merchant contacts loaded:', response.data);
            setMerchantContacts(response.data || []);
        } catch (error) {
            console.error('Error loading merchant contacts:', error);
            setMerchantContacts([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Special handling for remaining field - user manual override
        if (name === 'remaining') {
            if (!remainingManuallyChanged) {
                setRemainingManuallyChanged(true);
                showError('You are manually overriding the calculated remaining amount. This will be saved as-is.');
            }
            setFormData(prev => ({
                ...prev,
                [name]: value,
                remainingManuallySet: true
            }));
        } else {
            setFormData(prev => {
                const newData = {
                    ...prev,
                    [name]: value
                };

                // Auto-calculate remaining when expectedCost or downPayment changes
                // Only if remaining wasn't manually changed
                if ((name === 'expectedCost' || name === 'downPayment') && !remainingManuallyChanged) {
                    const expectedCost = name === 'expectedCost' ? parseFloat(value) || 0 : parseFloat(prev.expectedCost) || 0;
                    const downPayment = name === 'downPayment' ? parseFloat(value) || 0 : parseFloat(prev.downPayment) || 0;
                    newData.remaining = (expectedCost - downPayment).toFixed(2);
                    newData.remainingManuallySet = false;
                }

                return newData;
            });
        }

        // Update selected step type when step type changes - handled by useEffect now
        // if (name === 'stepTypeId') {
        //     const stepType = stepTypes.find(st => st.id === value);
        //     setSelectedStepType(stepType);
        // }

        // Load merchant contacts when merchant is selected
        if (name === 'selectedMerchantId') {
            loadMerchantContacts(value);
            // Clear contact selection when merchant changes
            setFormData(prev => ({ ...prev, responsibleContactId: '' }));
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
        // Clear other fields
        if (type === 'site') {
            setFormData(prev => ({ ...prev, responsibleContactId: '', selectedMerchantId: '' }));
        } else if (type === 'external') {
            setFormData(prev => ({ ...prev, responsibleEmployeeId: '', selectedMerchantId: '' }));
        } else if (type === 'merchant') {
            setFormData(prev => ({ ...prev, responsibleEmployeeId: '', responsibleContactId: '' }));
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
        } else if (responsiblePersonType === 'external') {
            if (!formData.responsibleContactId) {
                newErrors.responsibleContactId = 'Responsible contact is required';
            }
        } else if (responsiblePersonType === 'merchant') {
            if (!formData.selectedMerchantId) {
                newErrors.selectedMerchantId = 'Please select a merchant';
            }

            // Validate merchant items
            if (merchantItems.length === 0) {
                showError('Please add at least one item');
                return false;
            }

            for (const item of merchantItems) {
                if (!item.description || !item.cost) {
                    showError('All merchant items must have description and cost');
                    return false;
                }
            }
        }

        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }

        // Expected end date is now optional
        // if (!formData.expectedEndDate) {
        //     newErrors.expectedEndDate = 'Expected end date is required';
        // }

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

        // Validate cost fields
        if (formData.downPayment && isNaN(formData.downPayment)) {
            newErrors.downPayment = 'Down payment must be a valid number';
        }

        if (formData.downPayment && parseFloat(formData.downPayment) < 0) {
            newErrors.downPayment = 'Down payment must be non-negative';
        }

        if (formData.expectedCost && isNaN(formData.expectedCost)) {
            newErrors.expectedCost = 'Expected cost must be a valid number';
        }

        if (formData.expectedCost && parseFloat(formData.expectedCost) < 0) {
            newErrors.expectedCost = 'Expected cost must be non-negative';
        }

        if (formData.actualCost && isNaN(formData.actualCost)) {
            newErrors.actualCost = 'Actual cost must be a valid number';
        }

        if (formData.actualCost && parseFloat(formData.actualCost) < 0) {
            newErrors.actualCost = 'Actual cost must be non-negative';
        }

        // Validate that down payment doesn't exceed expected cost
        if (formData.downPayment && formData.expectedCost) {
            if (parseFloat(formData.downPayment) > parseFloat(formData.expectedCost)) {
                newErrors.downPayment = 'Down payment cannot exceed expected cost';
            }
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
                expectedEndDate: formData.expectedEndDate ? formData.expectedEndDate + 'T17:00:00' : null,
                downPayment: formData.downPayment ? parseFloat(formData.downPayment) : 0,
                expectedCost: formData.expectedCost ? parseFloat(formData.expectedCost) : 0,
                remaining: formData.remaining ? parseFloat(formData.remaining) : 0,
                remainingManuallySet: formData.remainingManuallySet || false,
                actualCost: formData.actualCost ? parseFloat(formData.actualCost) : null,
                stepCost: formData.expectedCost ? parseFloat(formData.expectedCost) : 0, // For backward compatibility
                notes: formData.notes || ''
            };

            // Add responsible person based on type
            if (responsiblePersonType === 'site') {
                submitData.responsibleEmployeeId = formData.responsibleEmployeeId;
            } else if (responsiblePersonType === 'external') {
                submitData.responsibleContactId = formData.responsibleContactId;
            } else if (responsiblePersonType === 'merchant') {
                submitData.selectedMerchantId = formData.selectedMerchantId;
                submitData.merchantItems = merchantItems.map(item => ({
                    description: item.description,
                    cost: parseFloat(item.cost)
                }));
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

    const handleAddNewContact = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowAddContactModal(true);
    };

    const handleCreateContact = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!newContactData.firstName || !newContactData.lastName || !newContactData.email || !newContactData.phoneNumber || !newContactData.contactTypeId) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await contactService.createContact({
                ...newContactData,
                isActive: true,
                emergencyContact: false,
                preferredContactMethod: 'PHONE'
            });

            const createdContact = response.data;

            // Update the responsible contact dropdown with new contact
            setFormData(prev => ({
                ...prev,
                responsibleContactId: createdContact.id
            }));

            // Refresh contacts list
            await loadAvailableContacts();

            // Close modal and reset form
            setShowAddContactModal(false);
            setNewContactData({
                firstName: '',
                lastName: '',
                email: '',
                phoneNumber: '',
                contactTypeId: '',
                company: '',
                specialization: ''
            });

            showError('Contact created successfully!'); // Using showError as notification
        } catch (error) {
            console.error('Error creating contact:', error);
            showError(error.response?.data?.message || 'Failed to create contact');
        }
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
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="responsiblePersonType"
                                        value="site"
                                        checked={responsiblePersonType === 'site'}
                                        onChange={handleResponsibleTypeChange}
                                    />
                                    <span>From Equipment Site</span>
                                </label>
                                {/*<label className="radio-option">*/}
                                {/*    <input*/}
                                {/*        type="radio"*/}
                                {/*        name="responsiblePersonType"*/}
                                {/*        value="external"*/}
                                {/*        checked={responsiblePersonType === 'external'}*/}
                                {/*        onChange={handleResponsibleTypeChange}*/}
                                {/*    />*/}
                                {/*    <span>External Contact</span>*/}
                                {/*</label>*/}
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="responsiblePersonType"
                                        value="merchant"
                                        checked={responsiblePersonType === 'merchant'}
                                        onChange={handleResponsibleTypeChange}
                                    />
                                    <span>Merchant</span>
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
                                        {Array.isArray(availableEmployees) && availableEmployees.map(employee => (
                                            <option key={employee?.id || Math.random()} value={employee?.id}>
                                                {employee?.fullName || 'Unknown Name'} {employee?.jobPosition?.positionName ? `- ${employee.jobPosition.positionName}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.responsibleEmployeeId && <span className="error-message">{errors.responsibleEmployeeId}</span>}
                                    {(!Array.isArray(availableEmployees) || availableEmployees.length === 0) && (
                                        <span className="info-text">No employees available from equipment site</span>
                                    )}
                                </div>
                            ) : responsiblePersonType === 'external' ? (
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
                            ) : responsiblePersonType === 'merchant' ? (
                                <div className="merchant-section">
                                    <div className="form-group">
                                        <label htmlFor="selectedMerchantId">
                                            Select Merchant <span className="required">*</span>
                                        </label>
                                        <select
                                            id="selectedMerchantId"
                                            name="selectedMerchantId"
                                            value={formData.selectedMerchantId || ''}
                                            onChange={handleInputChange}
                                            required
                                            className={errors.selectedMerchantId ? 'error' : ''}
                                        >
                                            <option value="">Select a merchant...</option>

                                            {Array.isArray(merchants) && merchants.filter(m => m.merchantType === 'SERVICE_PROVIDER').length > 0 && (
                                                <optgroup label="Service Providers">
                                                    {merchants
                                                        .filter(m => m.merchantType === 'SERVICE_PROVIDER')
                                                        .map(merchant => (
                                                            <option key={merchant.id} value={merchant.id}>
                                                                {merchant.name}
                                                            </option>
                                                        ))
                                                    }
                                                </optgroup>
                                            )}

                                            {Array.isArray(merchants) && merchants.filter(m => m.merchantType === 'SUPPLIER').length > 0 && (
                                                <optgroup label="Suppliers">
                                                    {merchants
                                                        .filter(m => m.merchantType === 'SUPPLIER')
                                                        .map(merchant => (
                                                            <option key={merchant.id} value={merchant.id}>
                                                                {merchant.name}
                                                            </option>
                                                        ))
                                                    }
                                                </optgroup>
                                            )}

                                            {Array.isArray(merchants) && merchants.filter(m => !m.merchantType || (m.merchantType !== 'SERVICE_PROVIDER' && m.merchantType !== 'SUPPLIER')).length > 0 && (
                                                <optgroup label="Other">
                                                    {merchants
                                                        .filter(m => !m.merchantType || (m.merchantType !== 'SERVICE_PROVIDER' && m.merchantType !== 'SUPPLIER'))
                                                        .map(merchant => (
                                                            <option key={merchant.id} value={merchant.id}>
                                                                {merchant.name}
                                                            </option>
                                                        ))
                                                    }
                                                </optgroup>
                                            )}
                                        </select>
                                        {errors.selectedMerchantId && <span className="error-message">{errors.selectedMerchantId}</span>}
                                    </div>

                                    {/* Merchant Contact Dropdown (Cascading) */}
                                    {formData.selectedMerchantId && (
                                        <div className="form-group">
                                            <label htmlFor="merchantContactId">
                                                Select Contact from Merchant
                                            </label>
                                            <select
                                                id="merchantContactId"
                                                name="responsibleContactId"
                                                value={formData.responsibleContactId || ''}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Select a contact (optional)...</option>
                                                {merchantContacts.map(contact => (
                                                    <option key={contact.id} value={contact.id}>
                                                        {contact.firstName} {contact.lastName} - {contact.position || contact.email}
                                                    </option>
                                                ))}
                                            </select>
                                            {merchantContacts.length === 0 && (
                                                <span className="info-text">No contacts available for this merchant</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Merchant Items */}
                                    {formData.selectedMerchantId && (
                                        <div className="merchant-items-section">
                                            <h4>Items / Services</h4>
                                            <p className="section-description">
                                                Add description and cost for each item or service provided by the merchant
                                            </p>

                                            {merchantItems.map((item, index) => (
                                                <div key={index} className="merchant-item-row">
                                                    <div className="form-group flex-grow">
                                                        <input
                                                            type="text"
                                                            placeholder="Item description"
                                                            value={item.description}
                                                            onChange={(e) => {
                                                                const updated = [...merchantItems];
                                                                updated[index].description = e.target.value;
                                                                setMerchantItems(updated);
                                                            }}
                                                            required
                                                        />
                                                    </div>

                                                    <div className="form-group cost-input">
                                                        <input
                                                            type="number"
                                                            placeholder="Cost"
                                                            value={item.cost}
                                                            onChange={(e) => {
                                                                const updated = [...merchantItems];
                                                                updated[index].cost = e.target.value;
                                                                setMerchantItems(updated);
                                                            }}
                                                            min="0"
                                                            step="0.01"
                                                            required
                                                        />
                                                    </div>

                                                    {merchantItems.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="remove-item-button"
                                                            onClick={() => {
                                                                setMerchantItems(merchantItems.filter((_, i) => i !== index));
                                                            }}
                                                            title="Remove item"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                className="add-item-button"
                                                onClick={() => {
                                                    setMerchantItems([...merchantItems, { description: '', cost: '' }]);
                                                }}
                                            >
                                                + Add Item
                                            </button>

                                            {merchantItems.length > 0 && (
                                                <div className="merchant-total">
                                                    <strong>Total:</strong> $
                                                    {merchantItems
                                                        .reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0)
                                                        .toFixed(2)
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}
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
                                        Expected End Date
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
                            </div>

                            <div className="form-row two-columns">
                                <div className="form-group">
                                    <label htmlFor="expectedCost">
                                        Expected Cost
                                    </label>
                                    <input
                                        type="number"
                                        id="expectedCost"
                                        name="expectedCost"
                                        value={formData.expectedCost}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={errors.expectedCost ? 'error' : ''}
                                    />
                                    {errors.expectedCost && <span className="error-message">{errors.expectedCost}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="downPayment">Down Payment</label>
                                    <input
                                        type="number"
                                        id="downPayment"
                                        name="downPayment"
                                        value={formData.downPayment}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={errors.downPayment ? 'error' : ''}
                                    />
                                    {errors.downPayment && <span className="error-message">{errors.downPayment}</span>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="remaining">
                                    Remaining {remainingManuallyChanged && <span className="manual-override-indicator">(Manual Override)</span>}
                                </label>
                                <input
                                    type="number"
                                    id="remaining"
                                    name="remaining"
                                    value={formData.remaining}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    placeholder="Auto-calculated"
                                    className={errors.remaining ? 'error' : ''}
                                />
                                {errors.remaining && <span className="error-message">{errors.remaining}</span>}
                                <small className="field-hint">
                                    {remainingManuallyChanged
                                        ? 'Manual override active - value will be saved as entered'
                                        : 'Auto-calculated as: Expected Cost - Down Payment'
                                    }
                                </small>
                            </div>

                            {(editingStep?.actualEndDate || formData.actualEndDate) && (
                                <div className="form-group">
                                    <label htmlFor="actualCost">Actual Cost</label>
                                    <input
                                        type="number"
                                        id="actualCost"
                                        name="actualCost"
                                        value={formData.actualCost}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        disabled={!editingStep?.actualEndDate}
                                        className={errors.actualCost ? 'error' : ''}
                                    />
                                    {formData.expectedCost && (
                                        <small className="field-hint">
                                            Expected: ${parseFloat(formData.expectedCost).toFixed(2)}
                                        </small>
                                    )}
                                    {errors.actualCost && <span className="error-message">{errors.actualCost}</span>}
                                </div>
                            )}
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

            {/* Inline Add Contact Modal */}
            {showAddContactModal && (
                <div className="modal-backdrop nested-modal" onClick={(e) => {
                    e.stopPropagation();
                    setShowAddContactModal(false);
                }}>
                    <div className="modal-container modal-md" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <FaUser />
                                Add New Contact
                            </div>
                            <button className="btn-close" onClick={() => setShowAddContactModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleCreateContact} id="add-contact-form">
                                <div className="form-section">
                                    <h3>Basic Information</h3>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="firstName">
                                                First Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                name="firstName"
                                                value={newContactData.firstName}
                                                onChange={(e) => setNewContactData({ ...newContactData, firstName: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="lastName">
                                                Last Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                name="lastName"
                                                value={newContactData.lastName}
                                                onChange={(e) => setNewContactData({ ...newContactData, lastName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="email">
                                                Email <span className="required">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={newContactData.email}
                                                onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="phoneNumber">
                                                Phone Number <span className="required">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                id="phoneNumber"
                                                name="phoneNumber"
                                                value={newContactData.phoneNumber}
                                                onChange={(e) => setNewContactData({ ...newContactData, phoneNumber: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="contactTypeId">
                                                Contact Type <span className="required">*</span>
                                            </label>
                                            <select
                                                id="contactTypeId"
                                                name="contactTypeId"
                                                value={newContactData.contactTypeId}
                                                onChange={(e) => setNewContactData({ ...newContactData, contactTypeId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Contact Type</option>
                                                {contactTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="company">Company</label>
                                            <input
                                                type="text"
                                                id="company"
                                                name="company"
                                                value={newContactData.company}
                                                onChange={(e) => setNewContactData({ ...newContactData, company: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="specialization">Specialization</label>
                                        <input
                                            type="text"
                                            id="specialization"
                                            name="specialization"
                                            value={newContactData.specialization}
                                            onChange={(e) => setNewContactData({ ...newContactData, specialization: e.target.value })}
                                            placeholder="e.g., Hydraulic Systems, Electrical Repairs, etc."
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-cancel" onClick={() => setShowAddContactModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" form="add-contact-form">
                                <FaSave />
                                Create Contact
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceStepModal; 