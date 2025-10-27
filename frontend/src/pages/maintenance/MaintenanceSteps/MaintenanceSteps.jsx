import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaCheck, FaClock, FaUser, FaMapMarkerAlt, FaDollarSign, FaStar } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import MaintenanceStepModal from './MaintenanceStepModal';
import CompleteStepModal from './CompleteStepModal';
import '../../../styles/status-badges.scss';
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
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [stepToComplete, setStepToComplete] = useState(null);

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
                stepType: step.stepTypeName || step.stepType, // Use stepTypeName from new structure
                stepTypeId: step.stepTypeId,
                description: step.description,
                responsiblePerson: step.responsiblePerson || 'Not assigned',
                responsiblePhone: step.personPhoneNumber || '',
                responsibleEmail: step.contactEmail || '',
                responsibleContactId: step.responsibleContactId,
                responsibleEmployeeId: step.responsibleEmployeeId,
                lastContactDate: step.lastContactDate,
                startDate: step.startDate,
                expectedEndDate: step.expectedEndDate,
                actualEndDate: step.actualEndDate,
                fromLocation: step.fromLocation,
                toLocation: step.toLocation,
                stepCost: step.stepCost || 0,
                actualCost: step.actualCost || step.stepCost || 0, // Use actual cost if available, fallback to estimated
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

    const handleCompleteStep = (step) => {
        // Open the complete modal instead of completing directly
        setStepToComplete(step);
        setIsCompleteModalOpen(true);
    };

    const handleConfirmComplete = async (completionData) => {
        try {
            setLoading(true);
            await maintenanceService.completeStep(stepToComplete.id, completionData);
            showSuccess('Step completed successfully');
            setIsCompleteModalOpen(false);
            setStepToComplete(null);
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error completing step:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to complete step. Please try again.';
            showError(errorMessage);
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
            // Extract error message from backend response
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save maintenance step. Please try again.';
            showError(errorMessage);
            // Re-throw error so modal can handle it
            throw error;
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
            render: (row) => {
                // Determine what location to show based on step type and completion status
                const isTransport = row.stepType?.toUpperCase() === 'TRANSPORT';
                const isCompleted = row.isCompleted;
                
                let displayLocation = '';
                let locationLabel = '';
                
                if (isTransport) {
                    if (isCompleted) {
                        // Transport step that is completed - show destination
                        displayLocation = row.toLocation;
                        locationLabel = 'Destination';
                    } else {
                        // Transport step that is not completed - show origin
                        displayLocation = row.fromLocation;
                        locationLabel = 'From';
                    }
                } else {
                    // Non-transport step - show current location (fromLocation)
                    displayLocation = row.fromLocation;
                    locationLabel = 'Current Location';
                }
                
                return (
                    <div className="location-info">
                        <div className="current-location">
                            <FaMapMarkerAlt /> {locationLabel}: {displayLocation}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Cost',
            accessor: 'stepCost',
            sortable: true,
            render: (row) => (
                <div className="cost-info">
                    <div className="estimated-cost">
                        Est: {row.stepCost?.toFixed(2) || '0.00'}
                    </div>
                    {row.isCompleted && row.actualCost && (
                        <div className="actual-cost">
                            Act: {row.actualCost.toFixed(2)}
                        </div>
                    )}
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
            show: (row) => {
                // Only show for the latest completed step that is not already final
                if (row.isFinalStep || !row.isCompleted) return false;
                
                // Find all completed steps
                const completedSteps = maintenanceSteps.filter(s => s.isCompleted);
                if (completedSteps.length === 0) return false;
                
                // Sort by actual end date (most recent first)
                const sortedCompletedSteps = [...completedSteps].sort((a, b) => {
                    const dateA = new Date(a.actualEndDate);
                    const dateB = new Date(b.actualEndDate);
                    return dateB - dateA;
                });
                
                // Only show for the latest completed step
                return sortedCompletedSteps[0].id === row.id;
            }
        },
        {
            label: 'Complete',
            icon: <FaCheck />,
            onClick: (row) => handleCompleteStep(row),
            className: 'success',
            show: (row) => {
                // Only show for incomplete steps
                return !row.isCompleted;
            }
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
            </div>

            <DataTable
                data={maintenanceSteps}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No maintenance steps found. Create your first step to get started."
                showAddButton={true}
                addButtonText="New Step"
                onAddClick={() => handleOpenModal()}
                addButtonProps={{
                    disabled: maintenanceRecord?.status === 'COMPLETED'
                }}
            />

            <div className="maintenance-steps-footer">
                <div className="total-cost">
                    <h3>Total Record Cost:</h3>
                    <span>{maintenanceSteps.reduce((total, step) => {
                        // Use actual cost if step is completed and has actual cost, otherwise use estimated cost
                        const cost = step.isCompleted && step.actualCost ? step.actualCost : step.stepCost;
                        return total + (cost || 0);
                    }, 0).toFixed(2)}</span>
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

            {isCompleteModalOpen && (
                <CompleteStepModal
                    isOpen={isCompleteModalOpen}
                    onClose={() => {
                        setIsCompleteModalOpen(false);
                        setStepToComplete(null);
                    }}
                    onConfirm={handleConfirmComplete}
                    step={stepToComplete}
                />
            )}
        </div>
    );
};

export default MaintenanceSteps;