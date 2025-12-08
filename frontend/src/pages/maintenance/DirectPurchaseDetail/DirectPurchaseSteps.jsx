import React from 'react';
import { FaCheck, FaClock, FaUser, FaShoppingCart, FaBoxOpen, FaTruck, FaCheckCircle, FaEdit } from 'react-icons/fa';
import './DirectPurchaseSteps.scss';

const DirectPurchaseSteps = ({ ticket, onEditStep }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
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

    const getStepIcon = (stepNumber) => {
        switch (stepNumber) {
            case 1: return <FaShoppingCart />;
            case 2: return <FaShoppingCart />;
            case 3: return <FaBoxOpen />;
            case 4: return <FaTruck />;
            default: return <FaCheck />;
        }
    };

    const getStepTitle = (stepNumber) => {
        switch (stepNumber) {
            case 1: return 'Creation';
            case 2: return 'Purchasing';
            case 3: return 'Finalize Purchasing';
            case 4: return 'Transportation';
            default: return 'Step ' + stepNumber;
        }
    };

    const getStepStatus = (stepNumber) => {
        const completed = ticket[`step${stepNumber}Completed`];
        const isCurrentStep = ticket.currentStep === getStepPhase(stepNumber);

        if (completed) {
            return { label: 'Completed', class: 'completed', icon: <FaCheck /> };
        } else if (isCurrentStep) {
            return { label: 'In Progress', class: 'in-progress', icon: <FaClock /> };
        } else {
            return { label: 'Pending', class: 'pending', icon: <FaClock /> };
        }
    };

    const getStepPhase = (stepNumber) => {
        switch (stepNumber) {
            case 1: return 'CREATION';
            case 2: return 'PURCHASING';
            case 3: return 'FINALIZE_PURCHASING';
            case 4: return 'TRANSPORTING';
            default: return '';
        }
    };

    const getStepData = (stepNumber) => {
        switch (stepNumber) {
            case 1:
                return {
                    description: ticket.description,
                    items: ticket.items || [],
                    equipment: ticket.equipmentName,
                    responsible: ticket.responsiblePersonName
                };
            case 2:
                return {
                    merchant: ticket.merchantName,
                    downPayment: ticket.downPayment,
                    items: ticket.items || [],
                    expectedCost: ticket.totalExpectedCost
                };
            case 3:
                return {
                    items: ticket.items || [],
                    actualCost: ticket.totalActualCost,
                    remainingPayment: (ticket.totalActualCost || 0) - (ticket.downPayment || 0)
                };
            case 4:
                return {
                    fromLocation: ticket.transportFromLocation,
                    toSite: ticket.site,
                    actualTransportCost: ticket.actualTransportationCost,
                    responsible: ticket.responsiblePersonName
                };
            default:
                return {};
        }
    };

    const renderStepContent = (stepNumber) => {
        const data = getStepData(stepNumber);

        switch (stepNumber) {
            case 1:
                return (
                    <div className="step-content">
                        {data.equipment && (
                            <div className="step-info-row">
                                <div className="info-label">Equipment</div>
                                <div className="info-value">{data.equipment}</div>
                            </div>
                        )}
                        {data.responsible && (
                            <div className="step-info-row">
                                <FaUser className="info-icon" />
                                <div className="info-content">
                                    <div className="info-label">Responsible Person</div>
                                    <div className="info-value">{data.responsible}</div>
                                </div>
                            </div>
                        )}
                        {data.items && data.items.length > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Items ({data.items.length})</div>
                                <div className="items-list-compact">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="item-compact">
                                            {item.itemName} (x{item.quantity})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {data.description && (
                            <div className="step-info-row description-row">
                                <div className="info-label">Description</div>
                                <div className="info-value description">{data.description}</div>
                            </div>
                        )}
                    </div>
                );

            case 2:
                return (
                    <div className="step-content">
                        {data.merchant && (
                            <div className="step-info-row">
                                <div className="info-label">Merchant</div>
                                <div className="info-value">{data.merchant}</div>
                            </div>
                        )}
                        {data.downPayment > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Down Payment</div>
                                <div className="info-value">{formatCurrency(data.downPayment)}</div>
                            </div>
                        )}
                        {data.items && data.items.length > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Items with Expected Costs</div>
                                <div className="items-cost-list">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="item-cost-row">
                                            <span>{item.itemName} (x{item.quantity})</span>
                                            <span className="cost-value">
                                                {formatCurrency((item.expectedCostPerUnit || 0) * item.quantity)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="step-info-row highlight">
                            <div className="info-label">Total Expected Cost</div>
                            <div className="info-value cost">{formatCurrency(data.expectedCost)}</div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="step-content">
                        {data.items && data.items.length > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Items with Actual Costs</div>
                                <div className="items-cost-list">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="item-cost-row">
                                            <span>{item.itemName} (x{item.quantity})</span>
                                            <span className="cost-value">
                                                {formatCurrency((item.actualCostPerUnit || 0) * item.quantity)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="step-info-row highlight">
                            <div className="info-label">Total Actual Cost</div>
                            <div className="info-value cost">{formatCurrency(data.actualCost)}</div>
                        </div>
                        {data.remainingPayment > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Remaining Payment</div>
                                <div className="info-value">{formatCurrency(data.remainingPayment)}</div>
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="step-content">
                        {data.fromLocation && (
                            <div className="step-info-row">
                                <div className="info-label">From Location</div>
                                <div className="info-value">{data.fromLocation}</div>
                            </div>
                        )}
                        {data.toSite && (
                            <div className="step-info-row">
                                <div className="info-label">To Site</div>
                                <div className="info-value">{data.toSite}</div>
                            </div>
                        )}
                        {data.actualTransportCost > 0 && (
                            <div className="step-info-row">
                                <div className="info-label">Transportation Cost</div>
                                <div className="info-value">{formatCurrency(data.actualTransportCost)}</div>
                            </div>
                        )}
                        {data.responsible && (
                            <div className="step-info-row">
                                <FaUser className="info-icon" />
                                <div className="info-content">
                                    <div className="info-label">Responsible Person</div>
                                    <div className="info-value">{data.responsible}</div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Only show completed or in-progress steps (not pending/future steps)
    const allSteps = [1, 2, 3, 4];
    const steps = allSteps.filter(stepNumber => {
        const isCompleted = ticket[`step${stepNumber}Completed`];
        const isCurrentStep = ticket.currentStep === getStepPhase(stepNumber);
        return isCompleted || isCurrentStep;
    });

    return (
        <div className="direct-purchase-steps">
            <div className="steps-container">
                {steps.map((stepNumber) => {
                    const status = getStepStatus(stepNumber);
                    const isCompleted = ticket[`step${stepNumber}Completed`];
                    const canEdit = !ticket.isLegacyTicket && stepNumber <= 4;

                    return (
                        <div
                            key={stepNumber}
                            className={`step-card ${status.class} ${canEdit ? 'clickable' : ''}`}
                            onClick={() => canEdit && onEditStep && onEditStep(stepNumber)}
                            style={{ cursor: canEdit ? 'pointer' : 'default' }}
                        >
                            {/* Card Header */}
                            <div className="step-card-header">
                                <div className="step-header-left">
                                    <div className="step-icon-wrapper">
                                        {getStepIcon(stepNumber)}
                                    </div>
                                    <div className="step-title-wrapper">
                                        <div className="step-number">Step {stepNumber}</div>
                                        <div className="step-title">{getStepTitle(stepNumber)}</div>
                                    </div>
                                </div>
                                <div className="step-header-right">
                                    <span className={`status-badge ${status.class}`}>
                                        {status.icon} {status.label}
                                    </span>

                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="step-card-body">
                                {renderStepContent(stepNumber)}
                            </div>

                            {/* Completed Date */}
                            {isCompleted && ticket[`step${stepNumber}CompletedAt`] && (
                                <div className="step-card-footer">
                                    <FaCheckCircle className="check-icon" />
                                    <span className="completed-text">
                                        Completed on {formatDate(ticket[`step${stepNumber}CompletedAt`])}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DirectPurchaseSteps;
