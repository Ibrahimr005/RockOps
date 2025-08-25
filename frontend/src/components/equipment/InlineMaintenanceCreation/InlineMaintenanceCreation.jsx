import React, { useState, useEffect } from 'react';
import { employeeService } from '../../../services/hr/employeeService.js';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './InlineMaintenanceCreation.scss';

const InlineMaintenanceCreation = ({
    equipmentId,
    onMaintenanceCreated,
    onCancel,
    initialData = {}
}) => {
    const [formData, setFormData] = useState({
        technicianId: initialData.technicianId || '',
        maintenanceDate: initialData.maintenanceDate || new Date().toISOString().split('T')[0],
        maintenanceTypeId: initialData.maintenanceTypeId || '',
        description: initialData.description || '',
        status: initialData.status || 'IN_PROGRESS'
    });
    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    
    // Maintenance type creation modal state
    const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
    const [newMaintenanceTypeData, setNewMaintenanceTypeData] = useState({ name: '', description: '', active: true });
    const [creatingMaintenanceType, setCreatingMaintenanceType] = useState(false);

    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [technicianResponse, maintenanceTypeResponse] = await Promise.all([
                employeeService.getTechnicians(),
                maintenanceTypeService.getAllMaintenanceTypes()
            ]);
            setTechnicians(technicianResponse.data || []);
            setMaintenanceTypes(maintenanceTypeResponse.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setError('Failed to load form data. Please try again.');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.technicianId) {
            errors.technicianId = 'Technician is required';
        }
        
        if (!formData.maintenanceDate) {
            errors.maintenanceDate = 'Maintenance date is required';
        }
        
        if (!formData.maintenanceTypeId) {
            errors.maintenanceTypeId = 'Maintenance type is required';
        }
        
        if (!formData.description?.trim()) {
            errors.description = 'Description is required';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            // Convert date to ISO format for backend
            const maintenanceData = {
                ...formData,
                maintenanceDate: new Date(formData.maintenanceDate).toISOString()
            };
            
            onMaintenanceCreated(maintenanceData);
        } catch (error) {
            console.error('Error creating maintenance:', error);
            setError('Failed to create maintenance record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getTechnicianName = (technicianId) => {
        const technician = technicians.find(t => t.id === technicianId);
        return technician ? technician.fullName : '';
    };

    const getMaintenanceTypeName = (maintenanceTypeId) => {
        const maintenanceType = maintenanceTypes.find(mt => mt.id === maintenanceTypeId);
        return maintenanceType ? maintenanceType.name : '';
    };

    // Maintenance type creation functions
    const handleMaintenanceTypeChange = (e) => {
        const { value } = e.target;
        if (value === 'add_new') {
            setShowMaintenanceTypeModal(true);
        } else {
            handleInputChange('maintenanceTypeId', value);
        }
    };

    const handleNewMaintenanceTypeInputChange = (e) => {
        const { name, value } = e.target;
        setNewMaintenanceTypeData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateMaintenanceType = async (e) => {
        e.preventDefault();
        if (!newMaintenanceTypeData.name.trim()) {
            showError('Maintenance type name is required');
            return;
        }

        setCreatingMaintenanceType(true);
        try {
            const response = await maintenanceTypeService.create(newMaintenanceTypeData);
            const newMaintenanceType = response.data;

            // Add the new maintenance type to the list
            setMaintenanceTypes(prev => [...prev, newMaintenanceType]);

            // Automatically select the newly created maintenance type
            setFormData(prev => ({
                ...prev,
                maintenanceTypeId: newMaintenanceType.id
            }));

            // Close the modal and reset form
            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });
            showSuccess(`Maintenance type "${newMaintenanceType.name}" created successfully and selected`);
        } catch (error) {
            console.error('Error creating maintenance type:', error);
            showError(`Failed to create maintenance type: ${error.response?.data?.message || error.message}`);
        } finally {
            setCreatingMaintenanceType(false);
        }
    };

    const handleCancelMaintenanceTypeCreation = () => {
        setShowMaintenanceTypeModal(false);
        setNewMaintenanceTypeData({ name: '', description: '', active: true });
    };

    return (
        <div className="inline-maintenance-creation">
            <div className="inline-maintenance-header">
                <h3>Create New Maintenance Record</h3>
                <p>This maintenance record will be automatically linked to the transaction</p>
            </div>

            {error && (
                <div className="error-message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="maintenance-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="technicianId">
                            Technician <span className="required">*</span>
                        </label>
                        <select
                            id="technicianId"
                            value={formData.technicianId}
                            onChange={(e) => handleInputChange('technicianId', e.target.value)}
                            className={validationErrors.technicianId ? 'error' : ''}
                            disabled={loading}
                        >
                            <option value="">Select Technician</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>
                                    {tech.fullName}
                                </option>
                            ))}
                        </select>
                        {validationErrors.technicianId && (
                            <span className="field-error">{validationErrors.technicianId}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="maintenanceDate">
                            Maintenance Date <span className="required">*</span>
                        </label>
                        <input
                            type="date"
                            id="maintenanceDate"
                            value={formData.maintenanceDate}
                            onChange={(e) => handleInputChange('maintenanceDate', e.target.value)}
                            className={validationErrors.maintenanceDate ? 'error' : ''}
                            disabled={loading}
                        />
                        {validationErrors.maintenanceDate && (
                            <span className="field-error">{validationErrors.maintenanceDate}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="maintenanceTypeId">
                            Maintenance Type <span className="required">*</span>
                        </label>
                        <select
                            id="maintenanceTypeId"
                            value={formData.maintenanceTypeId}
                            onChange={handleMaintenanceTypeChange}
                            className={validationErrors.maintenanceTypeId ? 'error' : ''}
                            disabled={loading}
                        >
                            <option value="">Select Maintenance Type</option>
                            {maintenanceTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                            <option value="add_new" className="add-new-option">
                                + Add New Maintenance Type
                            </option>
                        </select>
                        {validationErrors.maintenanceTypeId && (
                            <span className="field-error">{validationErrors.maintenanceTypeId}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            disabled={loading}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                </div>

                <div className="form-group full-width">
                    <label htmlFor="description">
                        Description <span className="required">*</span>
                    </label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe the maintenance work being performed..."
                        rows="3"
                        className={validationErrors.description ? 'error' : ''}
                        disabled={loading}
                    />
                    {validationErrors.description && (
                        <span className="field-error">{validationErrors.description}</span>
                    )}
                </div>

                <div className="form-preview">
                    <h4>Preview</h4>
                    <div className="preview-content">
                        <div className="preview-item">
                            <span className="label">Technician:</span>
                            <span className="value">{getTechnicianName(formData.technicianId) || 'Not selected'}</span>
                        </div>
                        <div className="preview-item">
                            <span className="label">Date:</span>
                            <span className="value">
                                {formData.maintenanceDate ? 
                                    new Date(formData.maintenanceDate).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    }) : 'Not selected'}
                            </span>
                        </div>
                        <div className="preview-item">
                            <span className="label">Type:</span>
                            <span className="value">{getMaintenanceTypeName(formData.maintenanceTypeId) || 'Not selected'}</span>
                        </div>
                        <div className="preview-item">
                            <span className="label">Status:</span>
                            <span className="value">{formData.status}</span>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="create-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                                Create & Link Maintenance
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Maintenance Type Creation Modal */}
            {showMaintenanceTypeModal && (
                <div className="modal-overlay" onClick={handleCancelMaintenanceTypeCreation}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Maintenance Type</h2>
                            <button
                                className="modal-close"
                                onClick={handleCancelMaintenanceTypeCreation}
                                disabled={creatingMaintenanceType}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleCreateMaintenanceType}>
                            <div className="form-group">
                                <label htmlFor="maintenanceTypeName">Name *</label>
                                <input
                                    type="text"
                                    id="maintenanceTypeName"
                                    name="name"
                                    value={newMaintenanceTypeData.name}
                                    onChange={handleNewMaintenanceTypeInputChange}
                                    placeholder="e.g., Oil Change, Repair, Inspection"
                                    required
                                    disabled={creatingMaintenanceType}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="maintenanceTypeDescription">Description</label>
                                <textarea
                                    id="maintenanceTypeDescription"
                                    name="description"
                                    value={newMaintenanceTypeData.description}
                                    onChange={handleNewMaintenanceTypeInputChange}
                                    placeholder="Describe this maintenance type..."
                                    rows="3"
                                    disabled={creatingMaintenanceType}
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={newMaintenanceTypeData.active !== false}
                                        onChange={(e) => setNewMaintenanceTypeData(prev => ({
                                            ...prev,
                                            active: e.target.checked
                                        }))}
                                        disabled={creatingMaintenanceType}
                                    />
                                    <span className="checkbox-text">Active</span>
                                </label>
                                <small className="form-help-text">
                                    Inactive maintenance types will not be available for selection
                                </small>
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={handleCancelMaintenanceTypeCreation}
                                    disabled={creatingMaintenanceType}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={creatingMaintenanceType || !newMaintenanceTypeData.name.trim()}
                                >
                                    {creatingMaintenanceType ? 'Creating...' : 'Create Maintenance Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineMaintenanceCreation; 