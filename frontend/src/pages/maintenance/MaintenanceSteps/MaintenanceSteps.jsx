import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaClock, FaUser, FaMapMarkerAlt, FaDollarSign, FaStar } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import MaintenanceStepModal from './MaintenanceStepModal';
import './MaintenanceSteps.scss';
import maintenanceService from "../../../services/maintenanceService.js";

const MaintenanceSteps = ({ recordId, onStepUpdate }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Check for the signal to open the modal from navigation state
    const shouldOpenModalInitially = location.state?.openStepModal || false;
    
    const [maintenanceSteps, setMaintenanceSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(shouldOpenModalInitially);
    const [editingStep, setEditingStep] = useState(null);
    const [selectedStep, setSelectedStep] = useState(null);
    const [maintenanceRecord, setMaintenanceRecord] = useState(null);
    const [restoredDataForModal, setRestoredDataForModal] = useState(null);

    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();
    const { currentUser } = useAuth();

    useEffect(() => {
        if (recordId) {
            loadMaintenanceSteps();
            loadMaintenanceRecord();
        }
    }, [recordId]);

    // One-time effect to process navigation state
    useEffect(() => {
        if (location.state?.openStepModal) {
            if (location.state.restoredFormData) {
                setRestoredDataForModal(location.state.restoredFormData);
            }
            setIsModalOpen(true);
            
            if (location.state.showRestoredMessage) {
                showSuccess("New contact created. Returning to your step.");
            }
            
            // Clean up navigation state immediately
            const { state } = location;
            delete state.openStepModal;
            delete state.restoredFormData;
            delete state.showRestoredMessage;
            navigate(location.pathname + location.search, { replace: true, state });
        }
    }, [location.state, navigate, location.pathname, location.search, showSuccess]);

    const loadMaintenanceSteps = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await maintenanceService.getStepsByRecord(recordId);
            const steps = response.data || [];
            
            // Transform data for display
            const transformedSteps = steps.map(step => ({
                id: step.id,
                stepType: step.stepType,
                description: step.description,
                responsiblePerson: step.responsiblePerson || step.responsibleContact?.firstName + ' ' + step.responsibleContact?.lastName || 'Not assigned',
                responsiblePhone: step.personPhoneNumber || step.responsibleContact?.phoneNumber || '',
                responsibleEmail: step.responsibleContact?.email || '',
                lastContactDate: step.lastContactDate,
                startDate: step.startDate,
                expectedEndDate: step.expectedEndDate,
                actualEndDate: step.actualEndDate,
                fromLocation: step.fromLocation,
                toLocation: step.toLocation,
                stepCost: step.stepCost || 0,
                notes: step.notes,
                isCompleted: step.isCompleted,
                isOverdue: step.isOverdue,
                durationInHours: step.durationInHours,
                needsFollowUp: step.needsFollowUp,
                createdAt: step.createdAt,
                updatedAt: step.updatedAt,
                isFinalStep: step.isFinalStep
            }));
            
            setMaintenanceSteps(transformedSteps);
        } catch (error) {
            console.error('Error loading maintenance steps:', error);
            setError('Failed to load maintenance steps. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadMaintenanceRecord = async () => {
        try {
            const response = await maintenanceService.getRecordById(recordId);
            setMaintenanceRecord(response.data);
        } catch (error) {
            console.error('Error loading maintenance record:', error);
        }
    };

    const handleOpenModal = (step = null) => {
        setEditingStep(step);
        setRestoredDataForModal(null); // Clear any restored data when manually opening
        setIsModalOpen(true);
    };

    const handleViewStep = (step) => {
        setSelectedStep(step);
        showInfo(`Viewing maintenance step: ${step.stepType}`);
    };

    const handleDeleteStep = async (id) => {
        try {
            setLoading(true);
            await maintenanceService.deleteStep(id);
            showSuccess('Maintenance step deleted successfully');
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error deleting maintenance step:', error);
            let errorMessage = 'Failed to delete maintenance step. Please try again.';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteStep = async (id) => {
        try {
            setLoading(true);
            await maintenanceService.completeStep(id);
            showSuccess('Maintenance step completed successfully');
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error completing maintenance step:', error);
            showError('Failed to complete maintenance step. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsFinal = async (id) => {
        try {
            setLoading(true);
            await maintenanceService.markStepAsFinal(id);
            showSuccess('Step marked as final successfully');
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error marking step as final:', error);
            showError('Failed to mark step as final. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (formData) => {
        try {
            setLoading(true);
            
            if (editingStep) {
                await maintenanceService.updateStep(editingStep.id, formData);
                showSuccess('Maintenance step updated successfully');
            } else {
                await maintenanceService.createStep(recordId, formData);
                showSuccess('Maintenance step created successfully');
            }
            
            setEditingStep(null);
            setIsModalOpen(false);
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error saving maintenance step:', error);
            showError('Failed to save maintenance step. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStepTypeColor = (stepType) => {
        switch (stepType) {
            case 'TRANSPORT': return 'var(--color-info)';
            case 'INSPECTION': return 'var(--color-warning)';
            case 'REPAIR': return 'var(--color-primary)';
            case 'TESTING': return 'var(--color-success)';
            case 'DIAGNOSIS': return 'var(--color-secondary)';
            case 'ESCALATION': return 'var(--color-danger)';
            case 'RETURN_TO_SERVICE': return 'var(--color-success)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getStepTypeBadge = (stepType) => {
        const color = getStepTypeColor(stepType);
        return (
            <span 
                className="step-type-badge"
                style={{ 
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}`
                }}
            >
                {stepType.replace('_', ' ')}
            </span>
        );
    };

    const getStatusBadge = (step) => {
        if (step.isCompleted) {
            return (
                <span className="status-badge completed">
                    <FaCheck /> Completed
                </span>
            );
        } else if (step.isOverdue) {
            return (
                <span className="status-badge overdue">
                    <FaClock /> Overdue
                </span>
            );
        } else {
            return (
                <span className="status-badge active">
                    <FaClock /> Active
                </span>
            );
        }
    };

    const columns = [
        {
            header: 'Step Type',
            accessor: 'stepType',
            sortable: true,
            render: (row) => (
                <div className="step-type-cell">
                    {row.isFinalStep && <FaStar className="final-star-icon" title="Final Step" />}
                    {getStepTypeBadge(row.stepType)}
                </div>
            )
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row) => (
                <div className="step-description">
                    {row.description.length > 60 
                        ? `${row.description.substring(0, 60)}...`
                        : row.description
                    }
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'isCompleted',
            sortable: true,
            render: (row) => getStatusBadge(row)
        },
        {
            header: 'Responsible Person',
            accessor: 'responsiblePerson',
            sortable: true,
            render: (row) => (
                <div className="responsible-person">
                    <div className="person-name">
                        <FaUser /> {row.responsiblePerson}
                    </div>
                    <div className="person-contact">
                        {row.responsiblePhone && <span>{row.responsiblePhone}</span>}
                        {row.responsibleEmail && <span>{row.responsibleEmail}</span>}
                    </div>
                </div>
            )
        },
        {
            header: 'Location',
            accessor: 'fromLocation',
            sortable: true,
            render: (row) => (
                <div className="location-info">
                    <div className="from-location">
                        <FaMapMarkerAlt /> From: {row.fromLocation}
                    </div>
                    <div className="to-location">
                        To: {row.toLocation}
                    </div>
                </div>
            )
        },
        {
            header: 'Cost',
            accessor: 'stepCost',
            sortable: true,
            render: (row) => (
                <div className="cost-info">
                    <FaDollarSign /> {row.stepCost?.toFixed(2) || '0.00'}
                </div>
            )
        },
        {
            header: 'Dates',
            accessor: 'startDate',
            sortable: true,
            render: (row) => (
                <div className="date-info">
                    <div className="start-date">
                        Start: {new Date(row.startDate).toLocaleDateString()}
                    </div>
                    <div className="end-date">
                        {row.actualEndDate 
                            ? `Completed: ${new Date(row.actualEndDate).toLocaleDateString()}`
                            : `Expected: ${new Date(row.expectedEndDate).toLocaleDateString()}`
                        }
                    </div>
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: <FaEye />,
            onClick: (row) => handleViewStep(row),
            className: 'primary'
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary',
            show: (row) => !row.isCompleted
        },
        {
            label: 'Mark as Final',
            icon: <FaStar />,
            onClick: (row) => handleMarkAsFinal(row.id),
            className: 'warning',
            show: (row) => !row.isCompleted && !row.isFinalStep
        },
        {
            label: 'Complete',
            icon: <FaCheck />,
            onClick: (row) => handleCompleteStep(row.id),
            className: 'success',
            show: (row) => !row.isCompleted
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => {
                if (window.confirm(`Are you sure you want to delete this maintenance step?`)) {
                    handleDeleteStep(row.id);
                }
            },
            className: 'danger',
            show: (row) => !row.isCompleted
        }
    ];

    const filterableColumns = [
        { header: 'Step Type', accessor: 'stepType' },
        { header: 'Responsible Person', accessor: 'responsiblePerson' },
        { header: 'From Location', accessor: 'fromLocation' },
        { header: 'To Location', accessor: 'toLocation' }
    ];

    if (error) {
        return (
            <div className="maintenance-steps-error">
                <div className="error-message">
                    <h3>Error Loading Maintenance Steps</h3>
                    <p>{error}</p>
                    <button onClick={loadMaintenanceSteps} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-steps">
            <div className="maintenance-steps-header">
                <div className="header-left">
                    <h2>Maintenance Steps</h2>
                    {maintenanceRecord && (
                        <p>Equipment: {maintenanceRecord.equipmentInfo} - {maintenanceRecord.initialIssueDescription}</p>
                    )}
                </div>
                <div className="header-right">
                    <button 
                        className="btn btn-primary"
                        onClick={() => handleOpenModal()}
                        disabled={maintenanceRecord?.status === 'COMPLETED'}
                    >
                        <FaPlus /> New Step
                    </button>
                </div>
            </div>

            <DataTable
                data={maintenanceSteps}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Maintenance Steps"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No maintenance steps found. Create your first step to get started."
            />

            <div className="maintenance-steps-footer">
                <div className="total-cost">
                    <h3>Total Record Cost:</h3>
                    <span>${maintenanceRecord?.totalCost?.toFixed(2) || '0.00'}</span>
                </div>
            </div>

            {isModalOpen && (
                <MaintenanceStepModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingStep(null);
                        setRestoredDataForModal(null); // Clean up on close
                    }}
                    onSubmit={handleSubmit}
                    editingStep={editingStep}
                    maintenanceRecord={maintenanceRecord}
                    restoredFormData={restoredDataForModal}
                />
            )}
        </div>
    );
};

export default MaintenanceSteps; 