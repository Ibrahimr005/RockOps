import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaShoppingCart, FaUser, FaCalendarAlt, FaDollarSign, FaInfoCircle, FaEllipsisV, FaEdit, FaCheckCircle, FaTrash, FaClock, FaExclamationCircle, FaTools, FaClipboardList, FaHistory } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useNotification } from '../../../contexts/NotificationContext';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import EditDirectPurchaseStepModal from './EditDirectPurchaseStepModal';
import CompleteDirectPurchaseStepModal from './CompleteDirectPurchaseStepModal';
import DirectPurchaseWizardModal from './DirectPurchaseWizardModal';
import DirectPurchaseTimeline from './DirectPurchaseTimeline';
import DirectPurchaseSteps from './DirectPurchaseSteps';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import directPurchaseService from '../../../services/directPurchaseService';
import '../../../styles/status-badges.scss';
import './DirectPurchaseDetailView.scss';

const DirectPurchaseDetailView = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeStepMenu, setActiveStepMenu] = useState(null);
    const [editingStep, setEditingStep] = useState(null);
    const [completingStep, setCompletingStep] = useState(null);
    const [isEditStepModalOpen, setIsEditStepModalOpen] = useState(false);
    const [isCompleteStepModalOpen, setIsCompleteStepModalOpen] = useState(false);
    const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
    const [wizardInitialStep, setWizardInitialStep] = useState(1);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        title: '',
        message: '',
        onConfirm: null
    });

    const { showSuccess, showError } = useSnackbar();
    const { showSuccess: showToastSuccess, showError: showToastError } = useNotification();

    useEffect(() => {
        if (ticketId) {
            loadTicket();
        }
    }, [ticketId]);

    const handleOpenWizard = (stepNumber = null) => {
        if (stepNumber) {
            setWizardInitialStep(stepNumber);
        } else {
            // Determine which step to open based on current state
            const currentStepNumber = getCurrentStepNumber();
            setWizardInitialStep(currentStepNumber);
        }
        setIsWizardModalOpen(true);
    };

    const loadTicket = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await directPurchaseService.getTicketById(ticketId);
            setTicket(response.data);
        } catch (error) {
            console.error('Error loading direct purchase ticket:', error);
            setError('Failed to load ticket. Please try again.');
            showError('Failed to load ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentStepNumber = () => {
        if (!ticket) return 1;
        if (ticket.step4Completed) return 4;
        if (ticket.step3Completed) return 4;
        if (ticket.step2Completed) return 3;
        if (ticket.step1Completed) return 2;
        return 1;
    };

    const handleWizardComplete = () => {
        setIsWizardModalOpen(false);
        setWizardInitialStep(1);
        loadTicket(); // Reload to show completed state
    };

    const handleEditStep = (step) => {
        setEditingStep(step);
        setIsEditStepModalOpen(true);
        setActiveStepMenu(null);
    };

    const handleCompleteStep = (step) => {
        setCompletingStep(step);
        setIsCompleteStepModalOpen(true);
        setActiveStepMenu(null);
    };

    const handleDeleteStep = (step) => {
        setConfirmDialog({
            isVisible: true,
            title: 'Delete Step',
            message: `Are you sure you want to delete "${step.stepName}"? This action cannot be undone.`,
            onConfirm: () => deleteStep(step.id)
        });
        setActiveStepMenu(null);
    };

    const deleteStep = async (stepId) => {
        setConfirmDialog({ ...confirmDialog, isVisible: false });

        // Find the step name before deleting
        const stepToDelete = ticket.steps?.find(s => s.id === stepId);
        const stepName = stepToDelete?.stepName || 'Step';

        try {
            await directPurchaseService.deleteStep(ticketId, stepId);
            showToastSuccess('Step Deleted', `${stepName} has been deleted successfully`);
            showSuccess('Step deleted successfully');
            loadTicket();
        } catch (error) {
            console.error('Error deleting step:', error);
            showToastError('Delete Failed', error.response?.data?.message || 'Failed to delete step. Please try again.');
            showError('Failed to delete step. Please try again.');
        }
    };

    const handleEditStepSubmit = async (stepData) => {
        try {
            await directPurchaseService.updateStep(ticketId, editingStep.id, stepData);
            showToastSuccess('Step Updated', `${editingStep.stepName} has been updated successfully`);
            showSuccess('Step updated successfully');
            setIsEditStepModalOpen(false);
            setEditingStep(null);
            loadTicket();
        } catch (error) {
            console.error('Error updating step:', error);
            showToastError('Update Failed', 'Failed to update step. Please try again.');
            showError('Failed to update step. Please try again.');
        }
    };

    const handleCompleteStepSubmit = async (completionData) => {
        try {
            await directPurchaseService.completeStep(ticketId, completingStep.id, completionData);
            showToastSuccess(
                'Step Completed!',
                `${completingStep.stepName} has been marked as completed`,
                { duration: 6000 }
            );
            showSuccess('Step marked as completed successfully');
            setIsCompleteStepModalOpen(false);
            setCompletingStep(null);
            loadTicket();
        } catch (error) {
            console.error('Error completing step:', error);
            showToastError('Completion Failed', error.response?.data?.message || 'Failed to complete step. Please try again.');
            showError(error.response?.data?.message || 'Failed to complete step. Please try again.');
        }
    };

    const getStatusBadge = (status) => {
        const statusClass = status.toLowerCase().replace(/_/g, '-');
        return (
            <span className={`status-badge ${statusClass}`}>
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (error || !ticket) {
        return (
            <div className="direct-purchase-detail-view">
                <div className="error-container">
                    <FaExclamationCircle style={{ fontSize: '4rem', color: 'var(--color-error)', marginBottom: '1rem' }} />
                    <h2>Error Loading Ticket</h2>
                    <p>{error || 'Ticket not found'}</p>
                    <button className="btn-primary" onClick={() => navigate('/maintenance/records')}>
                        <FaArrowLeft /> Back to Records
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
            label: ticket.title || ticket.sparePart || 'Direct Purchase Details',
            icon: <FaShoppingCart />
        }
    ];

    const stats = [
        {
            label: 'Total Steps',
            value: ticket.totalSteps || 0
        },
        {
            label: 'Completed',
            value: ticket.completedSteps || 0
        },
        {
            label: 'Expected Cost',
            value: formatCurrency(ticket.totalExpectedCost)
        },
        {
            label: 'Actual Cost',
            value: formatCurrency(ticket.totalActualCost)
        }
    ];

    return (
        <div className="direct-purchase-detail-view">
            <IntroCard
                title={ticket.equipmentName || 'Direct Purchase Ticket'}
                label="DIRECT PURCHASE TRACKING"
                breadcrumbs={breadcrumbs}
                icon={<FaShoppingCart />}
                stats={stats}
                actionButtons={[
                    ...(!ticket.isLegacyTicket && ticket.status !== 'COMPLETED' ? [{
                        text: 'Continue Workflow',
                        icon: <FaEdit />,
                        onClick: () => handleOpenWizard(),
                        className: 'primary'
                    }] : []),
                    {
                        text: getStatusBadge(ticket.status),
                        className: 'secondary',
                        disabled: true
                    }
                ]}
            />

            {/* Main Content */}
            <div className="detail-content">
                {/* Timeline for New Workflow */}


                {/* Ticket Information Card */}
                <div className="info-card">
                    <h2>{!ticket.isLegacyTicket ? 'Ticket Details' : 'Spare Part Details'}</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Equipment</label>
                            <div className="info-value">
                                <strong>{ticket.equipmentName || 'Not assigned'}</strong>
                                {ticket.equipmentModel && ticket.equipmentModel !== 'N/A' && (
                                    <span className="subtitle">{ticket.equipmentModel} • {ticket.equipmentType || 'N/A'}</span>
                                )}
                            </div>
                        </div>

                        <div className="info-item">
                            <label>Site</label>
                            <div className="info-value">{ticket.site || 'Not assigned'}</div>
                        </div>

                        {/* Legacy: Show Spare Part */}
                        {ticket.isLegacyTicket && ticket.sparePart && (
                            <div className="info-item">
                                <label>Spare Part Name</label>
                                <div className="info-value"><strong>{ticket.sparePart}</strong></div>
                            </div>
                        )}

                        {/* New Workflow: Show Title */}
                        {!ticket.isLegacyTicket && ticket.title && (
                            <div className="info-item">
                                <label>Title</label>
                                <div className="info-value"><strong>{ticket.title}</strong></div>
                            </div>
                        )}

                        {ticket.merchantName && (
                            <div className="info-item">
                                <label>Merchant</label>
                                <div className="info-value">{ticket.merchantName}</div>
                            </div>
                        )}

                        {ticket.responsiblePersonName && (
                            <div className="info-item">
                                <label>Responsible Person</label>
                                <div className="info-value">
                                    <FaUser className="icon" /> {ticket.responsiblePersonName}
                                    {ticket.responsiblePersonPhone && (
                                        <span className="subtitle">{ticket.responsiblePersonPhone}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="info-item">
                            <label>Created</label>
                            <div className="info-value">
                                <FaCalendarAlt className="icon" /> {formatDateTime(ticket.createdAt)}
                            </div>
                        </div>

                        {ticket.description && (
                            <div className="info-item full-width">
                                <label>Description</label>
                                <div className="info-value">{ticket.description}</div>
                            </div>
                        )}
                    </div>
                </div>

                {ticket && !ticket.isLegacyTicket && (
                    <div className="info-card timeline-card">
                        <h2><FaHistory /> Workflow Progress</h2>
                        <DirectPurchaseTimeline ticket={ticket} />
                    </div>
                )}

                {/* Cost Summary Card - Only show for legacy or if has cost data */}
                {(ticket.isLegacyTicket || ticket.totalExpectedCost > 0 || ticket.totalActualCost > 0) && (
                    <div className="info-card cost-summary-card">
                        <h2>Cost Summary</h2>
                        <div className="cost-grid">
                            {ticket.isLegacyTicket && (
                                <>
                                    <div className="cost-item">
                                        <label>Expected Parts Cost</label>
                                        <div className="cost-value">{formatCurrency(ticket.expectedPartsCost)}</div>
                                    </div>
                                    <div className="cost-item">
                                        <label>Expected Transportation Cost</label>
                                        <div className="cost-value">{formatCurrency(ticket.expectedTransportationCost)}</div>
                                    </div>
                                </>
                            )}
                            <div className="cost-item total">
                                <label>Total Expected Cost</label>
                                <div className="cost-value expected">{formatCurrency(ticket.totalExpectedCost)}</div>
                            </div>
                            <div className="cost-item total">
                                <label>Total Actual Cost</label>
                                <div className="cost-value actual">{formatCurrency(ticket.totalActualCost)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Workflow Steps - Only show if user has created data */}
                {!ticket.isLegacyTicket && ticket.step1Completed && (
                    <div className="info-card steps-card">
                        <div className="steps-header">
                            <h2>Workflow Steps</h2>

                        </div>
                        <DirectPurchaseSteps ticket={ticket} onEditStep={handleOpenWizard} />
                    </div>
                )}

                {/* Legacy Workflow Steps - Only show for legacy tickets */}
                {ticket.isLegacyTicket && ticket.steps && ticket.steps.length > 0 && (
                    <div className="info-card steps-card">
                        <h2>Workflow Steps ({ticket.completedSteps}/{ticket.totalSteps} Completed)</h2>
                        <div className="steps-container">
                            {ticket.steps && ticket.steps.map((step, index) => (
                                <div key={step.id} className={`step-item ${step.status.toLowerCase()}`}>
                                    <div className="step-header">
                                        <div className="step-header-left">
                                            <div className="step-number">Step {step.stepNumber}</div>
                                            <h3>{step.stepName}</h3>
                                            {getStatusBadge(step.status)}
                                        </div>
                                        <div className="step-header-right">
                                            <button
                                                className="menu-trigger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveStepMenu(activeStepMenu === step.id ? null : step.id);
                                                }}
                                            >
                                                <FaEllipsisV />
                                            </button>
                                            {activeStepMenu === step.id && (
                                                <>
                                                    <div
                                                        className="menu-backdrop"
                                                        onClick={() => setActiveStepMenu(null)}
                                                    />
                                                    <div className="menu-dropdown">
                                                        <button
                                                            className="menu-item"
                                                            onClick={() => handleEditStep(step)}
                                                        >
                                                            <FaEdit /> Edit Step
                                                        </button>
                                                        {step.status !== 'COMPLETED' && (
                                                            <button
                                                                className="menu-item"
                                                                onClick={() => handleCompleteStep(step)}
                                                            >
                                                                <FaCheckCircle /> Complete Step
                                                            </button>
                                                        )}
                                                        {step.status !== 'COMPLETED' && (
                                                            <button
                                                                className="menu-item danger"
                                                                onClick={() => handleDeleteStep(step)}
                                                            >
                                                                <FaTrash /> Delete Step
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="step-body">
                                        <div className="step-info-grid">
                                            <div className="step-info-item">
                                                <label>Responsible Person</label>
                                                <div>{step.responsiblePerson || 'Not assigned'}</div>
                                            </div>
                                            <div className="step-info-item">
                                                <label>Phone Number</label>
                                                <div>{step.phoneNumber || 'N/A'}</div>
                                            </div>
                                            <div className="step-info-item">
                                                <label>Start Date</label>
                                                <div>{formatDate(step.startDate)}</div>
                                            </div>
                                            <div className="step-info-item">
                                                <label>Expected End Date</label>
                                                <div>{formatDate(step.expectedEndDate)}</div>
                                            </div>
                                            {step.actualEndDate && (
                                                <div className="step-info-item">
                                                    <label>Actual End Date</label>
                                                    <div>{formatDate(step.actualEndDate)}</div>
                                                </div>
                                            )}
                                            {step.lastChecked && (
                                                <div className="step-info-item">
                                                    <label>Last Checked</label>
                                                    <div>
                                                        <FaClock className="icon" /> {formatDateTime(step.lastChecked)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="step-costs">
                                            <div className="cost-row">
                                                <span>Expected Cost:</span>
                                                <strong>{formatCurrency(step.expectedCost)}</strong>
                                            </div>
                                            {step.actualCost !== null && (
                                                <>
                                                    <div className="cost-row">
                                                        <span>Actual Cost:</span>
                                                        <strong>{formatCurrency(step.actualCost)}</strong>
                                                    </div>
                                                    <div className="cost-row">
                                                        <span>Advanced Payment:</span>
                                                        <strong>{formatCurrency(step.advancedPayment)}</strong>
                                                    </div>
                                                    <div className="cost-row remaining">
                                                        <span>Remaining Cost:</span>
                                                        <strong>{formatCurrency(step.remainingCost)}</strong>
                                                    </div>
                                                </>
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
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* New Workflow Wizard Modal */}
            {isWizardModalOpen && !ticket?.isLegacyTicket && (
                <DirectPurchaseWizardModal
                    isOpen={isWizardModalOpen}
                    ticketId={ticketId}
                    initialStep={wizardInitialStep}
                    onClose={() => {
                        setIsWizardModalOpen(false);
                        setWizardInitialStep(1);
                    }}
                    onComplete={handleWizardComplete}
                />
            )}

            {/* Legacy Modals */}
            {isEditStepModalOpen && (
                <EditDirectPurchaseStepModal
                    isOpen={isEditStepModalOpen}
                    onClose={() => {
                        setIsEditStepModalOpen(false);
                        setEditingStep(null);
                    }}
                    onSubmit={handleEditStepSubmit}
                    step={editingStep}
                />
            )}

            {isCompleteStepModalOpen && (
                <CompleteDirectPurchaseStepModal
                    isOpen={isCompleteStepModalOpen}
                    onClose={() => {
                        setIsCompleteStepModalOpen(false);
                        setCompletingStep(null);
                    }}
                    onSubmit={handleCompleteStepSubmit}
                    step={completingStep}
                />
            )}

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type="danger"
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isVisible: false })}
            />
        </div>
    );
};

export default DirectPurchaseDetailView;
