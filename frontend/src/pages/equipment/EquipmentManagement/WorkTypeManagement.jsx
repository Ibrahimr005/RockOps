import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import DataTable from '../../../components/common/DataTable/DataTable';
import './EquipmentTypeManagement.scss';

const WorkTypeManagement = () => {
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingWorkType, setEditingWorkType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        active: true
    });
    const [deletingWorkType, setDeletingWorkType] = useState(null);

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar } = useSnackbar();

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
                setWorkTypes(activeWorkTypes);
                
                if (activeWorkTypes.length === 0) {
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

    useEffect(() => {
        fetchWorkTypes();
    }, []);

    const handleOpenModal = (workType = null) => {
        if (workType) {
            setEditingWorkType(workType);
            setFormData({
                name: workType.name,
                description: workType.description || '',
                active: workType.active
            });
        } else {
            setEditingWorkType(null);
            setFormData({
                name: '',
                description: '',
                active: true
            });
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingWorkType) {
                await workTypeService.update(editingWorkType.id, formData);
                showSuccess(`Work type "${formData.name}" has been updated successfully`);
            } else {
                await workTypeService.create(formData);
                showSuccess(`Work type "${formData.name}" has been added successfully`);
            }

            setShowModal(false);
            fetchWorkTypes(); // Refresh the list
        } catch (err) {
            if (editingWorkType) {
                errorHandlers.handleUpdateError(err);
            } else {
                errorHandlers.handleCreateError(err);
            }
        }
    };

    const confirmDelete = (workTypeId, workTypeName) => {
        // Store the work type to be deleted
        setDeletingWorkType({ id: workTypeId, name: workTypeName });

        // Custom message with buttons
        const message = `Are you sure you want to delete "${workTypeName}"?`;

        // Show persistent confirmation warning that won't auto-hide
        showWarning(message, 0, true);

        // Create action buttons in the DOM
        setTimeout(() => {
            const snackbar = document.querySelector('.global-notification');
            if (snackbar) {
                // Create and append action buttons container
                const actionContainer = document.createElement('div');
                actionContainer.className = 'snackbar-actions';

                // Yes button
                const yesButton = document.createElement('button');
                yesButton.innerText = 'YES';
                yesButton.className = 'snackbar-action-button confirm';
                yesButton.onclick = () => {
                    performDelete(workTypeId, workTypeName);
                    hideSnackbar();
                };

                // No button
                const noButton = document.createElement('button');
                noButton.innerText = 'NO';
                noButton.className = 'snackbar-action-button cancel';
                noButton.onclick = () => {
                    setDeletingWorkType(null);
                    hideSnackbar();
                };

                actionContainer.appendChild(yesButton);
                actionContainer.appendChild(noButton);
                snackbar.appendChild(actionContainer);
            }
        }, 100);
    };

    const performDelete = async (workTypeId, workTypeName) => {
        try {
            await workTypeService.delete(workTypeId);
            showSuccess(`Work type "${workTypeName}" has been deleted successfully`);
            fetchWorkTypes(); // Refresh the list
        } catch (err) {
            errorHandlers.handleDeleteError(err);
        } finally {
            setDeletingWorkType(null);
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
            sortable: true
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => confirmDelete(row.id, row.name),
            className: 'danger'
        }
    ];

    if (error) {
        return <div className="equipment-types-error">{error}</div>;
    }

    return (
        <div className="equipment-types-container">
            <div className="equipment-types-header">
                <h1>Work Types</h1>
                <button
                    className="equipment-types-add-button"
                    onClick={() => handleOpenModal()}
                >
                    <FaPlus /> Add Work Type
                </button>
            </div>

            <DataTable
                data={workTypes}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Work Types List"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
            />

            {/* Modal for adding/editing work types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingWorkType ? 'Edit Work Type' : 'Add Work Type'}</h2>
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
                                    placeholder="Enter a description of this work type..."
                                />
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
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="submit-button">
                                    {editingWorkType ? 'Update' : 'Add'} Work Type
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