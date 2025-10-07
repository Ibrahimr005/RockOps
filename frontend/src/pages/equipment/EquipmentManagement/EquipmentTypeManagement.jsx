import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import './EquipmentTypeManagement.scss';
import '../../../styles/form-validation.scss';

const EquipmentTypeManagement = () => {
    const [types, setTypes] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        drivable: true
    });
    const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
    const [deletingType, setDeletingType] = useState(null);

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar, showConfirmation } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // Fetch all equipment types
    const fetchTypes = async () => {
        try {
            setLoading(true);
            const response = await equipmentService.getAllEquipmentTypes();
            // Transform data to include display values for filtering
            const typesWithDisplayValues = response.data.map(type => {
                // Create a flat list of supported work type names for filtering
                const supportedWorkTypeNames = type.supportedWorkTypes && type.supportedWorkTypes.length > 0 ? 
                    type.supportedWorkTypes.map(wt => wt.name) : [];
                    
                return {
                    ...type,
                    drivableText: type.drivable ? 'Yes' : 'No',
                    supportedWorkTypeNames: supportedWorkTypeNames
                };
            });
            setTypes(typesWithDisplayValues);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching equipment types:', err);
            setError('Failed to load equipment types');
            showError('Failed to load equipment types. Please try again later.');
            setLoading(false);
        }
    };

    // Fetch all work types
    const fetchWorkTypes = async () => {
        try {
            const response = await workTypeService.getAll();
            setWorkTypes(response.data);
        } catch (err) {
            console.error('Error fetching work types:', err);
            showError('Failed to load work types.');
        }
    };

    useEffect(() => {
        fetchTypes();
        fetchWorkTypes();
    }, []);

    const handleOpenModal = async (type = null) => {
        if (type) {
            setEditingType(type);
            setFormData({
                name: type.name,
                description: type.description || '',
                drivable: type.drivable !== undefined ? type.drivable : true
            });
            
            // Get work types that this equipment type currently supports
            const supportedWorkTypeIds = type.supportedWorkTypes ? 
                type.supportedWorkTypes.map(wt => wt.id) : [];
            setSelectedWorkTypes(supportedWorkTypeIds);
        } else {
            setEditingType(null);
            setFormData({
                name: '',
                description: '',
                drivable: true
            });
            setSelectedWorkTypes([]);
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleWorkTypeChange = (workTypeId) => {
        setSelectedWorkTypes(prev => {
            if (prev.includes(workTypeId)) {
                return prev.filter(id => id !== workTypeId);
            } else {
                return [...prev, workTypeId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingType) {
                await equipmentService.updateEquipmentType(editingType.id, formData);
                
                // Update supported work types
                await equipmentService.setSupportedWorkTypesForEquipmentType(editingType.id, selectedWorkTypes);
                
                showSuccess(`Equipment type "${formData.name}" has been updated successfully`);
            } else {
                const response = await equipmentService.createEquipmentType(formData);
                
                // Set supported work types for new equipment type
                if (selectedWorkTypes.length > 0) {
                    await equipmentService.setSupportedWorkTypesForEquipmentType(response.data.id, selectedWorkTypes);
                }
                
                showSuccess(`Equipment type "${formData.name}" has been added successfully`);
            }

            setShowModal(false);
            fetchTypes(); // Refresh the list with display values
        } catch (err) {
            console.error('Error saving equipment type:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (err.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = err.response.data;
                    if (isInactive) {
                        showError(`Equipment type "${resourceName}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment type "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (err.response.data?.message?.includes('inactive') || err.response.data?.message?.includes('deleted')) {
                        showError(`Equipment type "${formData.name}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment type "${formData.name}" already exists. Please choose a different name.`);
                    }
                }
            } else if (err.response?.status === 400) {
                // Validation errors
                const message = err.response.data?.message || 'Please check your input and try again';
                if (message.includes('name') || message.includes('Name')) {
                    showError(`Equipment type name is invalid: ${message}`);
                } else {
                    showError(`Please check your input: ${message}`);
                }
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to save equipment types. Please contact your administrator.');
            } else if (err.response?.status === 500) {
                showError('Server error occurred. Please try again later or contact support.');
            } else {
                showError(`Failed to ${editingType ? 'update' : 'add'} equipment type: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const confirmDelete = (typeId, typeName) => {
        showConfirmation(
            `Are you sure you want to delete "${typeName}"?`,
            () => performDelete(typeId, typeName),
            () => setDeletingType(null)
        );
    };

    const performDelete = async (typeId, typeName) => {
        try {
            await equipmentService.deleteEquipmentType(typeId);
            showSuccess(`Equipment type "${typeName}" has been deleted successfully`);
            fetchTypes(); // Refresh the list with display values
        } catch (err) {
            console.error('Error deleting equipment type:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                // Check if it's a resource in use error
                if (err.response.data?.resourceType && err.response.data?.usageCount) {
                    const { resourceName, usageCount, dependentType } = err.response.data;
                    showError(`Cannot delete equipment type "${resourceName}" because it is currently used by ${usageCount} ${dependentType}${usageCount !== 1 ? 's' : ''}. Please reassign or remove the equipment first.`);
                } else {
                    // Fallback for other conflict errors
                    showError(`Cannot delete equipment type "${typeName}": ${err.response.data?.message || 'Resource is in use'}`);
                }
            } else if (err.response?.status === 404) {
                showError(`Equipment type "${typeName}" not found. It may have been already deleted.`);
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to delete equipment types. Please contact your administrator.');
            } else {
                showError(`Failed to delete equipment type: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setDeletingType(null);
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
                return value || '';
            }
        },
        {
            header: 'Drivable',
            accessor: 'drivableText',
            sortable: true,
            filterType: 'select',
            filterAllText: 'All',
            render: (row) => (
                <span className={`status-badge ${row.drivable ? 'drivable' : 'non-drivable'}`}>
                    {row.drivable ? 'Yes' : 'No'}
                </span>
            )
        },
        {
            header: 'Supported Work Types',
            accessor: 'supportedWorkTypes',
            sortable: false,
            filterType: 'select',
            filterAllText: 'All',
            customFilterAccessor: 'supportedWorkTypeNames',
            render: (row) => {
                if (!row.supportedWorkTypes || row.supportedWorkTypes.length === 0) {
                    return 'None';
                }
                const workTypeNames = row.supportedWorkTypes.map(wt => wt.name).join(', ');
                return (
                    <span className="work-types-list">
                        {workTypeNames.length > 50 ? workTypeNames.substring(0, 50) + '...' : workTypeNames}
                    </span>
                );
            },
            exportFormatter: (value) => {
                // For Excel export, convert object array to readable text
                if (!value || value.length === 0) {
                    return 'None';
                }
                return value.map(wt => wt.name).join(', ');
            }
        }
    ];

    // Only show edit/delete actions if user has permissions
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
                title="Equipment Types"
                subtitle="Define and manage different types of equipment and their capabilities"
            />

            <DataTable
                data={types}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.filterType)}
                showAddButton={permissions.canCreate}
                addButtonText="Add Equipment Type"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
                showExportButton={true}
                exportButtonText="Export Equipment Types"
                exportFileName="equipment_types"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'name': 'Equipment Type Name',
                    'description': 'Description',
                    'drivable': 'Requires Driver',
                    'supportedWorkTypes': 'Supported Work Types'
                }}
                // Enforce consistent column width limits and text wrapping
                exportColumnWidths={{
                    'name': 25,
                    'description': 50,
                    'drivable': 15,
                    'supportedWorkTypes': 40
                }}
                enableTextWrapping={true}
                onExportStart={() => showSuccess("Exporting equipment types...")}
                onExportComplete={(result) => showSuccess(`Exported ${result.rowCount} equipment types to Excel`)}
                onExportError={(error) => showError("Failed to export equipment types")}
            />

            {/* Modal for adding/editing equipment types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content work-type-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingType ? 'Edit Equipment Type' : 'Add Equipment Type'}</h2>
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
                                    placeholder="Enter equipment type name (e.g., Excavator, Bulldozer, Truck)"
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
                                    placeholder="Enter a description of this equipment type... (Max 1000 characters)"
                                />
                                <div className="character-counter">
                                    {formData.description.length}/1000 characters
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        id="drivable"
                                        name="drivable"
                                        checked={formData.drivable}
                                        onChange={handleChange}
                                    />
                                    <span className="checkbox-text">Requires Driver</span>
                                </label>
                                <small className="form-help-text">
                                    Check this if equipment of this type requires a driver to operate (e.g., bulldozers, trucks). 
                                    Uncheck for stationary equipment like generators or compressors.
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Supported Work Types</label>
                                <div className="work-types-grid">
                                    {workTypes.map(workType => (
                                        <div key={workType.id} className="work-type-item">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWorkTypes.includes(workType.id)}
                                                    onChange={() => handleWorkTypeChange(workType.id)}
                                                />
                                                <span className="checkmark"></span>
                                                <span className="work-type-name">{workType.name}</span>
                                                {workType.description && (
                                                    <span className="work-type-description">{workType.description}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {workTypes.length === 0 && (
                                    <p className="no-work-types">No work types available. Please create work types first.</p>
                                )}
                                <small className="form-help-text">
                                    Select which work types this equipment type can perform. This determines which work types are available when logging Sarky entries for equipment of this type.
                                </small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingType ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentTypeManagement;