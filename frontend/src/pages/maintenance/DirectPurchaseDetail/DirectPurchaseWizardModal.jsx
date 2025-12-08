import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheck, FaCircle, FaArrowLeft, FaArrowRight, FaExclamationTriangle } from 'react-icons/fa';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useNotification } from '../../../contexts/NotificationContext';
import directPurchaseService from '../../../services/directPurchaseService';
import Step1CreationForm from './Step1CreationForm';
import Step2PurchasingForm from './Step2PurchasingForm';
import Step3FinalizePurchasingForm from './Step3FinalizePurchasingForm';
import Step4TransportingForm from './Step4TransportingForm';
import './DirectPurchaseWizardModal.scss';

const DirectPurchaseWizardModal = ({ isOpen, ticketId, initialStep = 1, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCompletedStepWarning, setShowCompletedStepWarning] = useState(false);

    const { showSuccess, showError } = useSnackbar();
    const { showSuccess: showToastSuccess, showError: showToastError } = useNotification();

    useEffect(() => {
        if (isOpen) {
            if (ticketId) {
                loadTicket();
            }
            setCurrentStep(initialStep);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, ticketId, initialStep]);

    const loadTicket = async () => {
        try {
            setLoading(true);
            const response = await directPurchaseService.getTicketById(ticketId);
            setTicket(response.data);
        } catch (error) {
            console.error('Error loading ticket:', error);
            showError('Failed to load ticket data');
        } finally {
            setLoading(false);
        }
    };

    const getStepStatus = (stepNumber) => {
        if (!ticket) return 'pending';

        switch (stepNumber) {
            case 1:
                return ticket.step1Completed ? 'completed' : ticket.currentStep === 'CREATION' ? 'current' : 'pending';
            case 2:
                return ticket.step2Completed ? 'completed' : ticket.currentStep === 'PURCHASING' ? 'current' : 'pending';
            case 3:
                return ticket.step3Completed ? 'completed' : ticket.currentStep === 'FINALIZE_PURCHASING' ? 'current' : 'pending';
            case 4:
                return ticket.step4Completed ? 'completed' : ticket.currentStep === 'TRANSPORTING' ? 'current' : 'pending';
            default:
                return 'pending';
        }
    };

    const isStepCompleted = (stepNumber) => {
        if (!ticket) return false;
        switch (stepNumber) {
            case 1:
                return ticket.step1Completed;
            case 2:
                return ticket.step2Completed;
            case 3:
                return ticket.step3Completed;
            case 4:
                return ticket.step4Completed;
            default:
                return false;
        }
    };

    const canNavigateToStep = (stepNumber) => {
        if (!ticket) return stepNumber === 1;

        // Can always navigate backward or to current step
        if (stepNumber <= currentStep) return true;

        // Can only navigate forward if all previous steps are completed
        for (let i = 1; i < stepNumber; i++) {
            if (!isStepCompleted(i)) {
                return false;
            }
        }
        return true;
    };

    const handleStepClick = (stepNumber) => {
        if (!canNavigateToStep(stepNumber)) {
            showError('Please complete previous steps before proceeding');
            return;
        }

        if (isStepCompleted(stepNumber)) {
            setShowCompletedStepWarning(true);
            setTimeout(() => setShowCompletedStepWarning(false), 3000);
        }
        setCurrentStep(stepNumber);
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleNext = () => {
        if (currentStep < 4) {
            // Check if current step is completed before allowing forward navigation
            if (!isStepCompleted(currentStep)) {
                showError(`Please complete Step ${currentStep} before proceeding`);
                return;
            }
            setCurrentStep(currentStep + 1);
        }
    };

    // Step 1 handlers
    const handleStep1Save = async (formData) => {
        try {
            setLoading(true);
            if (ticketId) {
                // If editing, we would update here
                showSuccess('Step 1 saved');
                await loadTicket();
            } else {
                // Create new ticket
                const response = await directPurchaseService.createTicketStep1(formData);
                showToastSuccess('Ticket Created', 'Direct purchase ticket created successfully');
                showSuccess('Step 1 saved successfully');
                // Refresh with new ticket ID
                if (response.data && response.data.id) {
                    window.location.href = `/maintenance/direct-purchase/${response.data.id}`;
                }
            }
        } catch (error) {
            console.error('Error saving Step 1:', error);
            showToastError('Save Failed', error.response?.data?.message || 'Failed to save Step 1');
            showError('Failed to save Step 1');
        } finally {
            setLoading(false);
        }
    };

    const handleStep1Complete = async (formData) => {
        try {
            setLoading(true);
            if (!ticketId) {
                // Create and complete Step 1
                const createResponse = await directPurchaseService.createTicketStep1(formData);
                const newTicketId = createResponse.data.id;
                await directPurchaseService.completeStep1(newTicketId);
                showToastSuccess('Step 1 Completed', 'Now proceeding to Step 2: Purchasing');
                showSuccess('Step 1 completed successfully');
                window.location.href = `/maintenance/direct-purchase/${newTicketId}`;
            } else {
                // Complete existing Step 1
                await directPurchaseService.completeStep1(ticketId);
                showToastSuccess('Step 1 Completed', 'Now proceeding to Step 2: Purchasing');
                showSuccess('Step 1 completed successfully');
                await loadTicket();
                setCurrentStep(2);
            }
        } catch (error) {
            console.error('Error completing Step 1:', error);
            showToastError('Completion Failed', error.response?.data?.message || 'Failed to complete Step 1');
            showError(error.response?.data?.message || 'Failed to complete Step 1');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 handlers
    const handleStep2Save = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep2(ticketId, formData);
            showSuccess('Step 2 saved successfully');
            await loadTicket();
        } catch (error) {
            console.error('Error saving Step 2:', error);
            showToastError('Save Failed', error.response?.data?.message || 'Failed to save Step 2');
            showError('Failed to save Step 2');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Complete = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep2(ticketId, formData);
            await directPurchaseService.completeStep2(ticketId);
            showToastSuccess('Step 2 Completed', 'Now proceeding to Step 3: Finalize Purchasing');
            showSuccess('Step 2 completed successfully');
            await loadTicket();
            setCurrentStep(3);
        } catch (error) {
            console.error('Error completing Step 2:', error);
            showToastError('Completion Failed', error.response?.data?.message || 'Failed to complete Step 2');
            showError(error.response?.data?.message || 'Failed to complete Step 2');
        } finally {
            setLoading(false);
        }
    };

    // Step 3 handlers
    const handleStep3Save = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep3(ticketId, formData);
            showSuccess('Step 3 saved successfully');
            await loadTicket();
        } catch (error) {
            console.error('Error saving Step 3:', error);
            showToastError('Save Failed', error.response?.data?.message || 'Failed to save Step 3');
            showError('Failed to save Step 3');
        } finally {
            setLoading(false);
        }
    };

    const handleStep3Complete = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep3(ticketId, formData);
            await directPurchaseService.completeStep3(ticketId);
            showToastSuccess('Step 3 Completed', 'Now proceeding to Step 4: Transportation');
            showSuccess('Step 3 completed successfully');
            await loadTicket();
            setCurrentStep(4);
        } catch (error) {
            console.error('Error completing Step 3:', error);
            showToastError('Completion Failed', error.response?.data?.message || 'Failed to complete Step 3');
            showError(error.response?.data?.message || 'Failed to complete Step 3');
        } finally {
            setLoading(false);
        }
    };

    // Step 4 handlers
    const handleStep4Save = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep4(ticketId, formData);
            showSuccess('Step 4 saved successfully');
            await loadTicket();
        } catch (error) {
            console.error('Error saving Step 4:', error);
            showToastError('Save Failed', error.response?.data?.message || 'Failed to save Step 4');
            showError('Failed to save Step 4');
        } finally {
            setLoading(false);
        }
    };

    const handleStep4Complete = async (formData) => {
        try {
            setLoading(true);
            await directPurchaseService.updateStep4(ticketId, formData);
            await directPurchaseService.completeStep4(ticketId);
            showToastSuccess('Ticket Completed!', 'Direct purchase ticket has been completed successfully', { duration: 6000 });
            showSuccess('Ticket completed successfully!');
            // Call onComplete callback
            if (onComplete) {
                onComplete();
            }
            onClose();
        } catch (error) {
            console.error('Error completing Step 4:', error);
            showToastError('Completion Failed', error.response?.data?.message || 'Failed to complete ticket');
            showError(error.response?.data?.message || 'Failed to complete ticket');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const steps = [
        {
            number: 1,
            label: 'Creation',
            shortLabel: 'Create',
            title: 'Create Direct Purchase Ticket',
            description: 'Enter basic information and add items to purchase'
        },
        {
            number: 2,
            label: 'Purchasing',
            shortLabel: 'Purchase',
            title: 'Purchasing Details',
            description: 'Select merchant and set expected costs for items'
        },
        {
            number: 3,
            label: 'Finalize',
            shortLabel: 'Finalize',
            title: 'Finalize Purchasing',
            description: 'Enter actual costs and calculate remaining payment'
        },
        {
            number: 4,
            label: 'Transport',
            shortLabel: 'Transport',
            title: 'Transportation',
            description: 'Set transport details and assign responsible person'
        }
    ];

    const currentStepInfo = steps.find(s => s.number === currentStep) || steps[0];

    return (
        <div className="wizard-modal-overlay">
            <div className="wizard-modal">
                {/* Header */}
                <div className="wizard-modal-header">
                    <div className="header-content">
                        <h2>{currentStepInfo.title}</h2>
                        {/*<p className="header-description">{currentStepInfo.description}</p>*/}
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* Stepper */}
                <div className="stepper-container">
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.number);
                        const isCompleted = isStepCompleted(step.number);
                        const isCurrent = currentStep === step.number;
                        const canNavigate = canNavigateToStep(step.number);

                        return (
                            <React.Fragment key={step.number}>
                                <div
                                    className={`stepper-step ${status} ${isCurrent ? 'active' : ''} ${!canNavigate ? 'disabled' : ''}`}
                                    onClick={() => handleStepClick(step.number)}
                                    style={{ cursor: canNavigate ? 'pointer' : 'not-allowed' }}
                                >
                                    <div className="step-icon">
                                        {isCompleted ? <FaCheck /> : <FaCircle />}
                                    </div>
                                    <div className="step-label">
                                        <span className="step-number">Step {step.number}</span>
                                        <span className="step-name">{step.label}</span>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`stepper-line ${isCompleted ? 'completed' : ''}`}></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Completed Step Warning */}
                {showCompletedStepWarning && (
                    <div className="warning-banner">
                        <FaExclamationTriangle />
                        <span>This step is already completed. Changes may affect subsequent steps.</span>
                    </div>
                )}

                {/* Step Content */}
                <div className="wizard-content">
                    {currentStep === 1 && (
                        <Step1CreationForm
                            ticketData={ticket}
                            onSave={handleStep1Save}
                            onComplete={handleStep1Complete}
                            isLoading={loading}
                        />
                    )}
                    {currentStep === 2 && (
                        <Step2PurchasingForm
                            ticketId={ticketId}
                            ticketData={ticket}
                            onSave={handleStep2Save}
                            onComplete={handleStep2Complete}
                            isLoading={loading}
                        />
                    )}
                    {currentStep === 3 && (
                        <Step3FinalizePurchasingForm
                            ticketId={ticketId}
                            ticketData={ticket}
                            onSave={handleStep3Save}
                            onComplete={handleStep3Complete}
                            isLoading={loading}
                        />
                    )}
                    {currentStep === 4 && (
                        <Step4TransportingForm
                            ticketId={ticketId}
                            ticketData={ticket}
                            onSave={handleStep4Save}
                            onComplete={handleStep4Complete}
                            isLoading={loading}
                        />
                    )}
                </div>

                {/* Navigation Footer */}
                <div className="wizard-footer">
                    <button
                        className="btn-secondary"
                        onClick={handlePrevious}
                        disabled={currentStep === 1 || loading}
                    >
                        <FaArrowLeft /> Previous
                    </button>
                    <div className="step-indicator">
                        Step {currentStep} of 4
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={handleNext}
                        disabled={currentStep === 4 || loading}
                    >
                        Next <FaArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DirectPurchaseWizardModal;
