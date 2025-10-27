import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import stepTypeService from '../../../services/stepTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import '../../../styles/modal-styles.scss';
import '../../../styles/form-validation.scss';
import './StepTypeManagement.scss';

const StepTypeManagement = () => {
    const [stepTypes, setStepTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingStepType, setEditingStepType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        active: true
    });

    const { showSuccess, showError, showInfo, showConfirmation } = useSnackbar();
    const { currentUser } = useAuth();

    // Create error handlers for this component
    const errorHandlers = createErrorHandlers(showError, 'step type');

    // Check permissions (maintenance managers and admins)
    const hasManagementAccess = currentUser?.roles?.some(role => 
        ['ADMIN', 'MAINTENANCE_MANAGER'].includes(role)
    );

    // Fetch all step types
    const fetchStepTypes = async () => {
        try {
            setLoading(true);
            const response = await stepTypeService.getAllStepTypesForManagement();
            const activeStepTypes = response.filter(stepType => stepType.active);
            setStepTypes(activeStepTypes);
            
            if (activeStepTypes.length === 0) {
                showInfo('No active step types found. Add your first step type!');
            }
            setLoading(false);
        } catch (err) {
            errorHandlers.handleFetchError(err);
            setError('Failed to load step types');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStepTypes();
    }, []);

    const handleOpenModal = (stepType = null) => {
        if (stepType) {
            setEditingStepType(stepType);
            setFormData({
                name: stepType.name,
                description: stepType.description || '',
                active: stepType.active
            });
        } else {
            setEditingStepType(null);
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
            if (editingStepType) {
                await stepTypeService.updateStepType(editingStepType.id, formData);
                showSuccess(`Step type "${formData.name}" has been updated successfully`);
            } else {
                await stepTypeService.createStepType(formData);
                showSuccess(`Step type "${formData.name}" has been added successfully`);
            }

            setShowModal(false);
            fetchStepTypes(); // Refresh the list
        } catch (err) {
            console.error('Error saving step type:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                showError(`Step type "${formData.name}" already exists. Please choose a different name.`);
            } else if (err.response?.status === 400) {
                const message = err.response.data?.message || 'Please check your input and try again';
                showError(`Please check your input: ${message}`);
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to save step types. Please contact your administrator.');
            } else if (err.response?.status === 500) {
                showError('Server error occurred. Please try again later or contact support.');
            } else {
                if (editingStepType) {
                    errorHandlers.handleUpdateError(err);
                } else {
                    errorHandlers.handleCreateError(err);
                }
            }
        }
    };

    const confirmDelete = (stepTypeId, stepTypeName) => {
        showConfirmation(
            `Are you sure you want to delete "${stepTypeName}"?`,
            () => performDelete(stepTypeId, stepTypeName),
            () => {}
        );
    };

    const performDelete = async (stepTypeId, stepTypeName) => {
        try {
            await stepTypeService.deleteStepType(stepTypeId);
            showSuccess(`Step type "${stepTypeName}" has been deleted successfully`);
            fetchStepTypes(); // Refresh the list
        } catch (err) {
            console.error('Error deleting step type:', err);
            showError(`Failed to delete step type: ${err.response?.data?.message || err.message}`);
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
            width: '400px',
            maxWidth: '400px',
            render: (row) => {
                const description = row.description || 'N/A';
                const maxLength = 100;
                
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
                            maxWidth: '380px'
                        }}
                    >
                        {truncated}
                    </span>
                );
            }
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary',
            show: () => hasManagementAccess
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => confirmDelete(row.id, row.name),
            className: 'danger',
            show: (row) => hasManagementAccess && row.name !== 'TRANSPORT' // Prevent deleting the default TRANSPORT type
        }
    ];

    if (error) {
        return <div className="step-types-error">{error}</div>;
    }

    return (
        <div className="step-types-container">
            <PageHeader
                title="Step Types"
                subtitle="Manage different types of maintenance steps"
            />

            <DataTable
                data={stepTypes}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.filterType)}
                showAddButton={hasManagementAccess}
                addButtonText="Add Step Type"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
                emptyStateMessage="No step types found. Add your first step type to get started."
                showExportButton={true}
                exportButtonText="Export Step Types"
                exportFileName="step_types"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'name': 'Step Type Name',
                    'description': 'Description',
                    'active': 'Active Status'
                }}
                exportColumnWidths={{
                    'name': 25,
                    'description': 60,
                    'active': 15
                }}
                enableTextWrapping={true}
                onExportStart={() => showSuccess("Exporting step types...")}
                onExportComplete={(result) => showSuccess(`Exported ${result.rowCount} step types to Excel`)}
                onExportError={(error) => showError("Failed to export step types")}
            />

            {/* Modal for adding/editing step types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content step-type-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingStepType ? 'Edit Step Type' : 'Add Step Type'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">
                                    Name <span className="required-field">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter step type name (e.g., Inspection, Diagnosis)"
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
                                    placeholder="Enter a description of this step type... (Max 1000 characters)"
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
                                    Inactive step types will not be available for selection when creating maintenance steps
                                </small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingStepType ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepTypeManagement;

