import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { workTypeService } from '../../../services/workTypeService';
import { equipmentService } from '../../../services/equipmentService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import './EquipmentTypeManagement.scss';
import '../../../styles/form-validation.scss';

const WorkTypeManagement = () => {
    const [workTypes, setWorkTypes] = useState([]);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingWorkType, setEditingWorkType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        active: true
    });
    const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState([]);
    const [deletingWorkType, setDeletingWorkType] = useState(null);

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar ,showConfirmation } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // Create error handlers for this component
    const errorHandlers = createErrorHandlers(showError, 'work type');

    // Fetch all work types
    const fetchWorkTypes = async () => {
        try {
            setLoading(true);
            const response = await workTypeService.getAllForManagement();
            if (response.data) {
                // Filter to only show active work types
                const activeWorkTypes = response.data.filter(workType => workType.active);
                
                // For each work type, get the equipment types that support it
                const workTypesWithEquipmentTypes = await Promise.all(
                    activeWorkTypes.map(async (workType) => {
                        try {
                            // Get all equipment types and filter those that support this work type
                            const allEquipmentTypesResponse = await equipmentService.getAllEquipmentTypes();
                            const supportingEquipmentTypes = allEquipmentTypesResponse.data.filter(equipmentType => 
                                equipmentType.supportedWorkTypes && 
                                equipmentType.supportedWorkTypes.some(wt => wt.id === workType.id)
                            );
                            return {
                                ...workType,
                                supportingEquipmentTypes
                            };
                        } catch (error) {
                            console.error(`Error fetching equipment types for work type ${workType.id}:`, error);
                            return {
                                ...workType,
                                supportingEquipmentTypes: []
                            };
                        }
                    })
                );
                
                setWorkTypes(workTypesWithEquipmentTypes);
                
                if (workTypesWithEquipmentTypes.length === 0) {
                    showInfo('No active work types found. Add your first work type!');
                }
            } else {
                // Initialize with empty array if no data
                setWorkTypes([]);
                showInfo('No work types found. Add your first work type!');
            }
            setLoading(false);
        } catch (err) {
            errorHandlers.handleFetchError(err);
            setError('Failed to load work types');
            setLoading(false);
        }
    };

    // Fetch all equipment types
    const fetchEquipmentTypes = async () => {
        try {
            const response = await equipmentService.getAllEquipmentTypes();
            setEquipmentTypes(response.data);
        } catch (err) {
            console.error('Error fetching equipment types:', err);
            showError('Failed to load equipment types.');
        }
    };

    useEffect(() => {
        fetchWorkTypes();
        fetchEquipmentTypes();
    }, []);

    const handleOpenModal = async (workType = null) => {
        if (workType) {
            setEditingWorkType(workType);
            setFormData({
                name: workType.name,
                description: workType.description || '',
                active: workType.active
            });
            
            // Get equipment types that currently support this work type
            const supportingEquipmentTypeIds = workType.supportingEquipmentTypes 
                ? workType.supportingEquipmentTypes.map(et => et.id) 
                : [];
            setSelectedEquipmentTypes(supportingEquipmentTypeIds);
        } else {
            setEditingWorkType(null);
            setFormData({
                name: '',
                description: '',
                active: true
            });
            setSelectedEquipmentTypes([]);
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEquipmentTypeChange = (equipmentTypeId) => {
        setSelectedEquipmentTypes(prev => {
            if (prev.includes(equipmentTypeId)) {
                return prev.filter(id => id !== equipmentTypeId);
            } else {
                return [...prev, equipmentTypeId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            let workTypeId;
            
            if (editingWorkType) {
                await workTypeService.update(editingWorkType.id, formData);
                workTypeId = editingWorkType.id;
                showSuccess(`Work type "${formData.name}" has been updated successfully`);
            } else {
                const response = await workTypeService.create(formData);
                workTypeId = response.data.id;
                showSuccess(`Work type "${formData.name}" has been added successfully`);
            }

            // Update equipment type assignments if we have a work type ID
            if (workTypeId) {
                try {
                    // For each equipment type, update their supported work types
                    const allEquipmentTypes = await equipmentService.getAllEquipmentTypes();
                    
                    for (const equipmentType of allEquipmentTypes.data) {
                        const currentWorkTypeIds = equipmentType.supportedWorkTypes 
                            ? equipmentType.supportedWorkTypes.map(wt => wt.id) 
                            : [];
                        
                        if (selectedEquipmentTypes.includes(equipmentType.id)) {
                            // Add this work type if not already present
                            if (!currentWorkTypeIds.includes(workTypeId)) {
                                const updatedWorkTypeIds = [...currentWorkTypeIds, workTypeId];
                                await equipmentService.setSupportedWorkTypesForEquipmentType(equipmentType.id, updatedWorkTypeIds);
                            }
                        } else {
                            // Remove this work type if present
                            if (currentWorkTypeIds.includes(workTypeId)) {
                                const updatedWorkTypeIds = currentWorkTypeIds.filter(id => id !== workTypeId);
                                await equipmentService.setSupportedWorkTypesForEquipmentType(equipmentType.id, updatedWorkTypeIds);
                            }
                        }
                    }
                } catch (equipmentTypeError) {
                    console.error('Error updating equipment type assignments:', equipmentTypeError);
                    showError('Work type saved, but failed to update equipment type assignments');
                }
            }

            setShowModal(false);
            fetchWorkTypes(); // Refresh the list
        } catch (err) {
            console.error('Error saving work type:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (err.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = err.response.data;
                    if (isInactive) {
                        // Show confirmation dialog to reactivate inactive work type
                        showConfirmation(
                            `Work type "${resourceName}" already exists but was previously deactivated. Would you like to reactivate it instead of creating a new one?`,
                            () => handleReactivateWorkType(resourceName),
                            () => showError(`To create a new work type, please choose a different name than "${resourceName}".`)
                        );
                    } else {
                        showError(`Work type "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (err.response.data?.message?.includes('inactive') || err.response.data?.message?.includes('deleted')) {
                        showError(`Work type "${formData.name}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Work type "${formData.name}" already exists. Please choose a different name.`);
                    }
                }
            } else if (err.response?.status === 400) {
                // Validation errors
                const message = err.response.data?.message || 'Please check your input and try again';
                if (message.includes('name') || message.includes('Name')) {
                    showError(`Work type name is invalid: ${message}`);
                } else {
                    showError(`Please check your input: ${message}`);
                }
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to save work types. Please contact your administrator.');
            } else if (err.response?.status === 500) {
                showError('Server error occurred. Please try again later or contact support.');
            } else {
                // Fallback to enhanced error handlers for other cases
                if (editingWorkType) {
                    errorHandlers.handleUpdateError(err);
                } else {
                    errorHandlers.handleCreateError(err);
                }
            }
        }
    };

    const handleReactivateWorkType = async (workTypeName) => {
        try {
            // Call backend to reactivate the work type with current form data
            const workTypeResponse = await workTypeService.reactivateByName(workTypeName, formData);
            const workTypeId = workTypeResponse.data.id;
            
            // Update equipment type assignments if we have a work type ID
            if (workTypeId) {
                try {
                    // For each equipment type, update their supported work types
                    const allEquipmentTypes = await equipmentService.getAllEquipmentTypes();
                    
                    for (const equipmentType of allEquipmentTypes.data) {
                        const currentWorkTypeIds = equipmentType.supportedWorkTypes 
                            ? equipmentType.supportedWorkTypes.map(wt => wt.id) 
                            : [];
                        
                        if (selectedEquipmentTypes.includes(equipmentType.id)) {
                            // Add this work type if not already present
                            if (!currentWorkTypeIds.includes(workTypeId)) {
                                const updatedWorkTypeIds = [...currentWorkTypeIds, workTypeId];
                                await equipmentService.setSupportedWorkTypesForEquipmentType(equipmentType.id, updatedWorkTypeIds);
                            }
                        } else {
                            // Remove this work type if present
                            if (currentWorkTypeIds.includes(workTypeId)) {
                                const updatedWorkTypeIds = currentWorkTypeIds.filter(id => id !== workTypeId);
                                await equipmentService.setSupportedWorkTypesForEquipmentType(equipmentType.id, updatedWorkTypeIds);
                            }
                        }
                    }
                } catch (equipmentTypeError) {
                    console.error('Error updating equipment type assignments:', equipmentTypeError);
                    showError('Work type reactivated, but failed to update equipment type assignments');
                }
            }
            
            // Close modal and refresh data
            setShowModal(false);
            setFormData({ name: '', description: '', active: true });
            setSelectedEquipmentTypes([]);
            
            showSuccess(`Work type "${workTypeName}" has been reactivated successfully with updated details.`);
            fetchWorkTypes(); // Refresh the list
        } catch (error) {
            console.error('Error reactivating work type:', error);
            showError(`Failed to reactivate work type "${workTypeName}". Please try again or contact your administrator.`);
        }
    };

    const confirmDelete = (workTypeId, workTypeName) => {
        showConfirmation(
            `Are you sure you want to delete "${workTypeName}"?`,
            () => performDelete(workTypeId, workTypeName),
            () => setDeletingWorkType(null)
        );
    };

    const performDelete = async (workTypeId, workTypeName) => {
        try {
            await workTypeService.delete(workTypeId);
            showSuccess(`Work type "${workTypeName}" has been deleted successfully`);
            fetchWorkTypes(); // Refresh the list
        } catch (err) {
            console.error('Error deleting work type:', err);
            showError(`Failed to delete work type: ${err.response?.data?.message || err.message}`);
        } finally {
            setDeletingWorkType(null);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true,
            filterType: 'text'
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            filterType: 'text',
            width: '250px',
            maxWidth: '250px',
            render: (row) => {
                const description = row.description || 'N/A';
                const maxLength = 80; // Character limit before truncation
                
                if (description === 'N/A' || description.length <= maxLength) {
                    return <span className="description-text">{description}</span>;
                }
                
                const truncated = description.substring(0, maxLength) + '...';
                return (
                    <span 
                        className="description-text truncated" 
                        title={description}
                        style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '230px'
                        }}
                    >
                        {truncated}
                    </span>
                );
            },
            exportFormatter: (value) => {
                // For Excel export, return the full description without truncation
                // Excel will handle text wrapping automatically
                return value || '';
            }
        },
        {
            header: 'Supporting Equipment Types',
            accessor: 'supportingEquipmentTypes',
            sortable: false,
            excludeFromSearch: true,
            render: (row) => {
                if (!row.supportingEquipmentTypes || row.supportingEquipmentTypes.length === 0) {
                    return 'None';
                }
                const equipmentTypeNames = row.supportingEquipmentTypes.map(et => et.name).join(', ');
                return (
                    <span className="equipment-types-list">
                        {equipmentTypeNames.length > 60 ? equipmentTypeNames.substring(0, 60) + '...' : equipmentTypeNames}
                    </span>
                );
            },
            exportFormatter: (value) => {
                // For Excel export, convert object array to readable text
                if (!value || value.length === 0) {
                    return 'None';
                }
                return value.map(et => et.name).join(', ');
            }
        }
    ];

    const actions = permissions.canEdit || permissions.canDelete ? [
        ...(permissions.canEdit ? [{
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary'
        }] : []),
        ...(permissions.canDelete ? [{
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => confirmDelete(row.id, row.name),
            className: 'danger'
        }] : [])
    ] : [];

    if (error) {
        return <div className="equipment-types-error">{error}</div>;
    }

    return (
        <div className="equipment-types-container">
            <PageHeader
                title="Work Types"
                subtitle="Manage different types of work activities and operations"
            />

            <DataTable
                data={workTypes}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.filterType)}
                showAddButton={permissions.canCreate}
                addButtonText="Add Work Type"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
                showExportButton={true}
                exportButtonText="Export Work Types"
                exportFileName="work_types"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'name': 'Work Type Name',
                    'description': 'Description',
                    'active': 'Active Status',
                    'supportedEquipmentTypes': 'Supported Equipment Types'
                }}
                // Enforce consistent column width limits and text wrapping
                exportColumnWidths={{
                    'name': 25,
                    'description': 50,
                    'active': 15,
                    'supportedEquipmentTypes': 40
                }}
                enableTextWrapping={true}
                onExportStart={() => showSuccess("Exporting work types...")}
                onExportComplete={(result) => showSuccess(`Exported ${result.rowCount} work types to Excel`)}
                onExportError={(error) => showError("Failed to export work types")}
            />

            {/* Modal for adding/editing work types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content work-type-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingWorkType ? 'Edit Work Type' : 'Add Work Type'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Name <span className="required-field">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter work type name (e.g., Excavation, Transportation, Maintenance)"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    maxLength="1000"
                                    placeholder="Enter a description of this work type... (Max 1000 characters)"
                                />
                                <div className="character-counter">
                                    {formData.description.length}/1000 characters
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            active: e.target.checked
                                        }))}
                                    />
                                    <span className="checkbox-text">Active</span>
                                </label>
                                <small className="form-help-text">
                                    Inactive work types will not be available for selection when creating Sarky entries
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Equipment Types that can perform this work type</label>
                                <div className="work-types-grid">
                                    {equipmentTypes.map(equipmentType => (
                                        <div key={equipmentType.id} className="work-type-item">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEquipmentTypes.includes(equipmentType.id)}
                                                    onChange={() => handleEquipmentTypeChange(equipmentType.id)}
                                                />
                                                <span className="checkmark"></span>
                                                <span className="work-type-name">{equipmentType.name}</span>
                                                {equipmentType.description && (
                                                    <span className="work-type-description">{equipmentType.description}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {equipmentTypes.length === 0 && (
                                    <p className="no-work-types">No equipment types available. Please create equipment types first.</p>
                                )}
                                <small className="form-help-text">
                                    Select which equipment types can perform this type of work. This determines which work types are available when logging Sarky entries for specific equipment.
                                </small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingWorkType ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkTypeManagement; 