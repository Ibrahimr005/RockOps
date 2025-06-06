import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import './EquipmentTypeManagement.scss';

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
            setTypes(response.data);
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
            fetchTypes(); // Refresh the list
        } catch (err) {
            console.error('Error saving equipment type:', err);
            showError(`Failed to ${editingType ? 'update' : 'add'} equipment type: ${err.response?.data?.message || err.message}`);
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
            fetchTypes(); // Refresh the list
        } catch (err) {
            console.error('Error deleting equipment type:', err);
            showError(`Failed to delete equipment type: ${err.response?.data?.message || err.message}`);
        } finally {
            setDeletingType(null);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row) => row.description || 'N/A'
        },
        {
            header: 'Drivable',
            accessor: 'drivable',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.drivable ? 'drivable' : 'non-drivable'}`}>
                    {row.drivable ? ' Yes' : 'No'}
                </span>
            )
        },
        {
            header: 'Supported Work Types',
            accessor: 'supportedWorkTypes',
            sortable: false,
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
            <div className="equipment-types-header">
                <h1>Equipment Types</h1>
                {permissions.canCreate && (
                    <button
                        className="equipment-types-add-button"
                        onClick={() => handleOpenModal()}
                    >
                        <FaPlus /> Add Equipment Type
                    </button>
                )}
            </div>

            <DataTable
                data={types}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Equipment Types List"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
            />

            {/* Modal for adding/editing equipment types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content work-type-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingType ? 'Edit Equipment Type' : 'Add Equipment Type'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
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
                                    placeholder="Enter a description of this equipment type..."
                                />
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
                                <button type="submit" className="save-button">
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