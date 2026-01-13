import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaCheck, FaClock, FaUser, FaMapMarkerAlt, FaDollarSign, FaStar, FaTools, FaTimes, FaEllipsisV, FaPlus, FaSearch, FaFilter, FaClipboardList, FaHourglassHalf } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import MaintenanceStepModal from './MaintenanceStepModal';
import CompleteStepModal from './CompleteStepModal';
import '../../../styles/status-badges.scss';
import './MaintenanceSteps.scss';
import maintenanceService from "../../../services/maintenanceService.js";

import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';

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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [maintenanceRecord, setMaintenanceRecord] = useState(null);
    const [restoredDataForModal, setRestoredDataForModal] = useState(null);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [stepToComplete, setStepToComplete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [stepToDelete, setStepToDelete] = useState(null);

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
                stepType: step.stepTypeName || step.stepType,
                stepTypeId: step.stepTypeId,
                description: step.description,
                responsiblePerson: step.responsiblePerson || 'Not assigned',
                responsiblePhone: step.personPhoneNumber || '',
                responsibleEmail: step.contactEmail || '',
                responsibleContactId: step.responsibleContactId,
                responsibleEmployeeId: step.responsibleEmployeeId,
                selectedMerchantId: step.selectedMerchantId,
                lastContactDate: step.lastContactDate,
                startDate: step.startDate,
                expectedEndDate: step.expectedEndDate,
                actualEndDate: step.actualEndDate,
                fromLocation: step.fromLocation,
                toLocation: step.toLocation,
                stepCost: step.stepCost || 0,
                downPayment: step.downPayment || 0,
                expectedCost: step.expectedCost || step.stepCost || 0,
                remaining: step.remaining || 0,
                remainingManuallySet: step.remainingManuallySet || false,
                actualCost: step.actualCost || step.stepCost || 0,
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
        setRestoredDataForModal(null);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleViewStep = (step) => {
        setSelectedStep(step);
        setViewModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDeleteStep = (step) => {
        setStepToDelete(step);
        setShowDeleteConfirm(true);
        setActiveMenuId(null);
    };

    const handleDeleteStep = async () => {
        if (!stepToDelete) return;

        try {
            setLoading(true);
            await maintenanceService.deleteStep(stepToDelete.id);
            showSuccess('Maintenance step deleted successfully');
            loadMaintenanceSteps();
            if (onStepUpdate) onStepUpdate();
        } catch (error) {
            console.error('Error deleting maintenance step:', error);
            let errorMessage = 'Failed to delete maintenance step. Please try again.';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            showError(errorMessage);
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
            setStepToDelete(null);
        }
    };

    // ... (rest of the file remains same, need to find the place where handleDeleteStep was originally called)
    // Wait, I need to replace the original handleDeleteStep and add the dialog render logic at the end.
    // I will use replace_file_content carefully.


    const handleCompleteStep = (step) => {
        setStepToComplete(step);
        setIsCompleteModalOpen(true);
        setActiveMenuId(null);
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
            setActiveMenuId(null);
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
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save maintenance step. Please try again.';
            showError(errorMessage);
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
        if (!stepType) {
            return <span className="step-type-badge">Unknown</span>;
        }
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
                <span className="status-badge in-progress">
                    <FaClock /> In Progress
                </span>
            );
        }
    };

    const shouldShowMarkAsFinal = (step) => {
        const isStepCompleted = step.isCompleted === true && step.actualEndDate != null;

        if (step.isFinalStep || !isStepCompleted) {
            return false;
        }

        const allStepsCompleted = maintenanceSteps.every(s => {
            return s.isCompleted === true && s.actualEndDate != null;
        });

        if (!allStepsCompleted) {
            return false;
        }

        const completedSteps = maintenanceSteps.filter(s => {
            return s.isCompleted === true && s.actualEndDate != null;
        });

        if (completedSteps.length === 0) return false;

        const sortedCompletedSteps = [...completedSteps].sort((a, b) => {
            const dateA = new Date(a.actualEndDate);
            const dateB = new Date(b.actualEndDate);
            return dateB - dateA;
        });

        return sortedCompletedSteps[0].id === step.id;
    };

    const filteredSteps = maintenanceSteps.filter(step => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            step.stepType?.toLowerCase().includes(search) ||
            step.description?.toLowerCase().includes(search) ||
            step.responsiblePerson?.toLowerCase().includes(search) ||
            step.fromLocation?.toLowerCase().includes(search) ||
            step.toLocation?.toLowerCase().includes(search)
        );
    });

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

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

    const breadcrumbs = [
        {
            label: 'Maintenance',
            icon: <FaTools />,
            onClick: () => navigate('/maintenance')
        },
        {
            label: 'Records',
            icon: <FaClipboardList />,
            onClick: () => navigate('/maintenance/records')
        },
        {
            label: maintenanceRecord ? maintenanceRecord.title || maintenanceRecord.equipmentName || 'Record' : 'Steps',
            icon: <FaClipboardList />
        }
    ];

    const stats = [
        {
            label: 'Total Steps',
            value: maintenanceSteps.length
        },
        {
            label: 'Completed',
            value: maintenanceSteps.filter(s => s.isCompleted).length
        },
        {
            label: 'Total Cost',
            value: formatCurrency(maintenanceSteps.reduce((total, step) => {
                const cost = step.isCompleted && step.actualCost ? step.actualCost : step.stepCost;
                return total + (cost || 0);
            }, 0))
        }
    ];

    return (
        <div className="maintenance-steps-view">
            <div className="intro-card-wrapper">
                {/* Using standard page header if IntroCard is not suitable or available context is limited */}
            </div>

            <div className="detail-content">
                <div className="info-card header-card">
                    <div className="header-content">
                        <div className="header-left">
                            <h1>Maintenance Steps</h1>
                            {maintenanceRecord && (
                                <p className="subtitle">
                                    {maintenanceRecord.equipmentInfo} - {maintenanceRecord.initialIssueDescription}
                                </p>
                            )}
                        </div>
                        <div className="header-right">
                            {(!maintenanceRecord?.status || maintenanceRecord.status !== 'COMPLETED') && (
                                <button
                                    className={`add-step-btn ${maintenanceRecord?.status === 'PENDING_MANAGER_APPROVAL' || maintenanceRecord?.status === 'PENDING_FINANCE_APPROVAL' || maintenanceRecord?.status === 'REJECTED' ? 'pending-state' : ''}`}
                                    onClick={() => handleOpenModal()}
                                    disabled={maintenanceRecord?.status === 'PENDING_MANAGER_APPROVAL' || maintenanceRecord?.status === 'PENDING_FINANCE_APPROVAL' || maintenanceRecord?.status === 'REJECTED'}
                                    title={maintenanceRecord?.status === 'PENDING_MANAGER_APPROVAL' || maintenanceRecord?.status === 'PENDING_FINANCE_APPROVAL'
                                        ? "Cannot add steps while pending approval"
                                        : (maintenanceRecord?.status === 'REJECTED' ? "Cannot add steps to rejected record. Please Resubmit." : "Add a new maintenance step")}
                                >
                                    {maintenanceRecord?.status === 'PENDING_MANAGER_APPROVAL' || maintenanceRecord?.status === 'PENDING_FINANCE_APPROVAL'
                                        ? <FaHourglassHalf />
                                        : <FaPlus />}
                                    {maintenanceRecord?.status === 'PENDING_MANAGER_APPROVAL' || maintenanceRecord?.status === 'PENDING_FINANCE_APPROVAL'
                                        ? " Pending Approval"
                                        : " New Step"}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="stats-row">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-item">
                                <label>{stat.label}</label>
                                <div className="stat-value">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="info-card steps-card">
                    <div className="card-header-row">
                        <h3>Workflow Steps</h3>
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search steps..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner">Loading steps...</div>
                        </div>
                    ) : filteredSteps.length === 0 ? (
                        <div className="empty-state">
                            <p>No maintenance steps found. Create your first step to get started.</p>
                        </div>
                    ) : (
                        <div className="steps-container">
                            {filteredSteps.map((step, index) => {
                                const isTransport = step.stepType?.toUpperCase() === 'TRANSPORT';

                                return (
                                    <div key={step.id} className={`step-item ${step.isCompleted ? 'completed' : 'in-progress'}`}>
                                        <div className="step-header">
                                            <div className="step-header-left">
                                                <div className="step-number">Step {index + 1}</div>
                                                <h3>{step.stepType?.replace('_', ' ')}</h3>
                                                {step.isFinalStep && (
                                                    <span className="final-badge" title="Final Step"><FaStar /> Final</span>
                                                )}
                                                {getStatusBadge(step)}
                                            </div>
                                            <div className="step-header-right">
                                                <div className="menu-container">
                                                    <button
                                                        className="menu-trigger"
                                                        onClick={() => setActiveMenuId(activeMenuId === step.id ? null : step.id)}
                                                    >
                                                        <FaEllipsisV />
                                                    </button>
                                                    {activeMenuId === step.id && (
                                                        <>
                                                            <div className="menu-backdrop" onClick={() => setActiveMenuId(null)} />
                                                            <div className="menu-dropdown">
                                                                <button
                                                                    className="menu-item"
                                                                    onClick={() => handleViewStep(step)}
                                                                >
                                                                    <FaEye /> View Details
                                                                </button>
                                                                {!step.isCompleted && (
                                                                    <>
                                                                        <button
                                                                            className="menu-item"
                                                                            onClick={() => handleOpenModal(step)}
                                                                        >
                                                                            <FaEdit /> Edit
                                                                        </button>
                                                                        <button
                                                                            className="menu-item complete"
                                                                            onClick={() => handleCompleteStep(step)}
                                                                        >
                                                                            <FaCheck /> Complete
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {shouldShowMarkAsFinal(step) && (
                                                                    <button
                                                                        className="menu-item warning"
                                                                        onClick={() => handleMarkAsFinal(step.id)}
                                                                    >
                                                                        <FaStar /> Mark as Final
                                                                    </button>
                                                                )}
                                                                {!step.isCompleted && (
                                                                    <button
                                                                        className="menu-item danger"
                                                                        onClick={() => confirmDeleteStep(step)}
                                                                    >
                                                                        <FaTrash /> Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="step-body">
                                            <div className="step-info-grid">
                                                <div className="step-info-item">
                                                    <label>Responsible Person</label>
                                                    <div>
                                                        <FaUser className="icon" /> {step.responsiblePerson}
                                                    </div>
                                                </div>

                                                <div className="step-info-item">
                                                    <label>Start Date</label>
                                                    <div><FaClock className="icon" /> {formatDate(step.startDate)}</div>
                                                </div>

                                                <div className="step-info-item">
                                                    <label>Expected End</label>
                                                    <div><FaClock className="icon" /> {formatDate(step.expectedEndDate)}</div>
                                                </div>

                                                {step.actualEndDate && (
                                                    <div className="step-info-item">
                                                        <label>Actual End</label>
                                                        <div><FaCheck className="icon" /> {formatDate(step.actualEndDate)}</div>
                                                    </div>
                                                )}

                                                {(isTransport || step.fromLocation) && (
                                                    <div className="step-info-item">
                                                        <label>{isTransport ? 'From Location' : 'Current Location'}</label>
                                                        <div><FaMapMarkerAlt className="icon" /> {step.fromLocation || 'Not set'}</div>
                                                    </div>
                                                )}

                                                {isTransport && (
                                                    <div className="step-info-item">
                                                        <label>To Location</label>
                                                        <div><FaMapMarkerAlt className="icon" /> {step.toLocation || 'Not set'}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="step-costs">
                                                <div className="cost-row">
                                                    <span>Expected Cost:</span>
                                                    <strong>{formatCurrency(step.expectedCost || step.stepCost)}</strong>
                                                </div>
                                                {step.downPayment > 0 && (
                                                    <div className="cost-row">
                                                        <span>Down Payment:</span>
                                                        <strong>{formatCurrency(step.downPayment)}</strong>
                                                    </div>
                                                )}
                                                <div className="cost-row remaining">
                                                    <span>Remaining:</span>
                                                    <strong>{formatCurrency(step.remaining)}</strong>
                                                </div>
                                                {step.isCompleted && step.actualCost && (
                                                    <div className="cost-row actual">
                                                        <span>Actual Cost:</span>
                                                        <strong>{formatCurrency(step.actualCost)}</strong>
                                                    </div>
                                                )}
                                            </div>

                                            {step.description && (
                                                <div className="step-description">
                                                    <label>Description</label>
                                                    <p>{step.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <MaintenanceStepModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingStep(null);
                        setRestoredDataForModal(null);
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

            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="delete"
                title="Delete Maintenance Step"
                message={`Are you sure you want to delete this ${stepToDelete?.stepType?.replace('_', ' ') || 'maintenance'} step? This action cannot be undone.`}
                confirmText="Delete Step"
                cancelText="Cancel"
                onConfirm={handleDeleteStep}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={loading}
            />

            {viewModalOpen && selectedStep && (
                <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Step Details: {selectedStep.stepType}</h2>
                            <button className="btn-close" onClick={() => setViewModalOpen(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Description</h3>
                                <p>{selectedStep.description}</p>
                            </div>

                            <div className="detail-section">
                                <h3>Cost Information</h3>
                                <div className="cost-grid">
                                    <div className="cost-item">
                                        <label>Expected Cost:</label>
                                        <span>{formatCurrency(selectedStep.expectedCost || selectedStep.stepCost || 0)}</span>
                                    </div>
                                    <div className="cost-item">
                                        <label>Down Payment:</label>
                                        <span>{formatCurrency(selectedStep.downPayment || 0)}</span>
                                    </div>
                                    <div className="cost-item">
                                        <label>Remaining:</label>
                                        <span>{formatCurrency(selectedStep.remaining || 0)}</span>
                                    </div>
                                    {selectedStep.actualCost && (
                                        <div className="cost-item">
                                            <label>Actual Cost:</label>
                                            <span>{formatCurrency(selectedStep.actualCost)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Schedule</h3>
                                <p><strong>Start:</strong> {formatDate(selectedStep.startDate)}</p>
                                <p><strong>Expected End:</strong> {formatDate(selectedStep.expectedEndDate)}</p>
                                {selectedStep.actualEndDate && (
                                    <p><strong>Completed:</strong> {formatDate(selectedStep.actualEndDate)}</p>
                                )}
                            </div>

                            {selectedStep.responsiblePerson && (
                                <div className="detail-section">
                                    <h3>Responsible Person</h3>
                                    <p><strong>Name:</strong> {selectedStep.responsiblePerson}</p>
                                    {selectedStep.responsiblePhone && <p><strong>Phone:</strong> {selectedStep.responsiblePhone}</p>}
                                    {selectedStep.responsibleEmail && <p><strong>Email:</strong> {selectedStep.responsibleEmail}</p>}
                                </div>
                            )}

                            {(selectedStep.fromLocation || selectedStep.toLocation) && (
                                <div className="detail-section">
                                    <h3>Location</h3>
                                    {selectedStep.fromLocation && <p><strong>From:</strong> {selectedStep.fromLocation}</p>}
                                    {selectedStep.toLocation && <p><strong>To:</strong> {selectedStep.toLocation}</p>}
                                </div>
                            )}

                            {selectedStep.notes && (
                                <div className="detail-section">
                                    <h3>Notes</h3>
                                    <p>{selectedStep.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setViewModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceSteps;