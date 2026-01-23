import React from 'react';
import { FaEllipsisV, FaExclamationCircle, FaUser, FaMapMarkerAlt, FaDollarSign, FaClock, FaEye, FaList, FaPlus, FaEdit, FaTrash, FaTools, FaShoppingCart, FaCheckCircle, FaUserCheck } from 'react-icons/fa';
import './MaintenanceCard.scss';

const MaintenanceCard = ({
    record,
    onViewRecord,
    onViewSteps,
    onAddStep,
    onEdit,
    onDelete,
    onDelegate,
    activeMenuId,
    setActiveMenuId,
    canEdit,
    canDelete,
    canDelegate,
    formatCurrency,
    formatDate,
    getStatusBadge
}) => {
    // Determine cost display based on status
    const getCostDisplay = () => {
        // Handle field naming differences between MaintenanceRecord and DirectPurchaseTicket
        const status = record.status;
        const expectedCost = record.expectedCost || record.estimatedCost || 0;
        const approvedBudget = record.approvedBudget;
        const consumedBudget = record.consumedBudget || 0;
        const remainingBudget = record.remainingBudget;
        const isOverBudget = record.isOverBudget;
        const totalCost = record.totalCost || record.actualTotalCost || 0;

        if (status === 'COMPLETED') {
            // FINISHED: Show Total Cost and Budget comparison
            return (
                <div className="cost-details">
                    {approvedBudget && (
                        <div className="cost-row secondary">
                            <span className="cost-type">Approved Budget</span>
                            <span className="cost-amount">{formatCurrency(approvedBudget)}</span>
                        </div>
                    )}
                    <div className="cost-row primary">
                        <span className="cost-type">Total Cost</span>
                        <span className="cost-amount">{formatCurrency(totalCost)}</span>
                    </div>
                    {approvedBudget && (
                        <div className={`cost-row difference ${isOverBudget ? 'over-budget' : 'under-budget'}`}>
                            <span className="cost-type">
                                {isOverBudget ? 'Over Budget' : 'Under Budget'}
                            </span>
                            <span className="cost-amount">
                                {formatCurrency(Math.abs(approvedBudget - totalCost))}
                            </span>
                        </div>
                    )}
                </div>
            );
        } else if (status === 'ACTIVE' || status === 'IN_PROGRESS' || status === 'APPROVED_BY_FINANCE') {
            // ACTIVE: Show Budget, Consumed, and Remaining
            return (
                <div className="cost-details">
                    {approvedBudget ? (
                        <>
                            <div className="cost-row primary">
                                <span className="cost-type">Budget</span>
                                <span className="cost-amount">{formatCurrency(approvedBudget)}</span>
                            </div>
                            <div className="cost-row secondary">
                                <span className="cost-type">Consumed</span>
                                <span className="cost-amount">{formatCurrency(consumedBudget)}</span>
                            </div>
                            <div className={`cost-row ${isOverBudget ? 'over-budget' : remainingBudget < approvedBudget * 0.2 ? 'warning' : ''}`}>
                                <span className="cost-type">Remaining</span>
                                <span className="cost-amount">{formatCurrency(remainingBudget)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="cost-row primary">
                            <span className="cost-type">Expected Cost</span>
                            <span className="cost-amount">{formatCurrency(expectedCost)}</span>
                        </div>
                    )}
                </div>
            );
        } else if (status === 'PENDING_FINANCE_APPROVAL' || status === 'PENDING_MANAGER_APPROVAL') {
            // Pending approval: Show Expected Cost as budget request
            return (
                <div className="cost-details">
                    <div className="cost-row primary">
                        <span className="cost-type">Budget Request</span>
                        <span className="cost-amount">{formatCurrency(expectedCost)}</span>
                    </div>
                </div>
            );
        } else {
            // DRAFT, SCHEDULED, ON_HOLD, etc.: Show only Expected Cost
            return (
                <div className="cost-details">
                    <div className="cost-row primary">
                        <span className="cost-type">Expected Cost</span>
                        <span className="cost-amount">{formatCurrency(expectedCost)}</span>
                    </div>
                </div>
            );
        }
    };

    // Determine current step display - SAME FOR BOTH MAINTENANCE AND DIRECT PURCHASE
    const getCurrentStepDisplay = () => {
        const { status, currentStep, totalSteps } = record;

        if (status === 'ACTIVE') {
            if (totalSteps === 0) {
                return (
                    <div className="current-step-info no-steps">
                        <span className="no-steps-message">No steps added yet</span>
                    </div>
                );
            } else if (currentStep) {
                return (
                    <div className="current-step-info">
                        <span className="current-step-badge">Current Step</span>
                        <span className="current-step-description">{currentStep.description}</span>
                    </div>
                );
            } else {
                return (
                    <div className="current-step-info all-complete">
                        <FaCheckCircle className="complete-icon" />
                        <span className="all-complete-message">All steps completed</span>
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <div
            className={`maintenance-card ${record.status.toLowerCase()}`}
            onClick={() => onViewSteps(record)}
        >
            {/* Card Header */}
            <div className="maintenance-card-header">
                <div className="header-content">
                    <h3 className="equipment-name">{record.equipmentName}</h3>
                    <div className="badges-container">
                        {record.ticketType === 'DIRECT_PURCHASE' ? (
                            <span className="ticket-type-badge direct-purchase-badge">
                                <FaShoppingCart /> Direct Purchase
                            </span>
                        ) : (
                            <span className="ticket-type-badge maintenance-badge">
                                <FaTools /> Maintenance
                            </span>
                        )}
                        {getStatusBadge(record.status)}
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="menu-trigger"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === record.id ? null : record.id);
                        }}
                    >
                        <FaEllipsisV />
                    </button>
                    {activeMenuId === record.id && (
                        <>
                            <div
                                className="menu-backdrop"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                }}
                            />
                            <div className="menu-dropdown">
                                <button
                                    className="menu-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        onViewRecord(record);
                                    }}
                                >
                                    <FaEye /> Quick View
                                </button>
                                {record.ticketType !== 'DIRECT_PURCHASE' && (
                                    <button
                                        className="menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onViewSteps(record);
                                        }}
                                    >
                                        <FaList /> View Steps
                                    </button>
                                )}
                                {record.status !== 'COMPLETED' && record.ticketType !== 'DIRECT_PURCHASE' && (
                                    <button
                                        className="menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onAddStep(record);
                                        }}
                                    >
                                        <FaPlus /> Add Step
                                    </button>
                                )}
                                {canEdit && record.ticketType !== 'DIRECT_PURCHASE' && (
                                    <button
                                        className="menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onEdit(record);
                                        }}
                                    >
                                        <FaEdit /> Edit
                                    </button>
                                )}
                                {canDelegate && (
                                    <button
                                        className="menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onDelegate(record);
                                        }}
                                    >
                                        <FaUserCheck /> Delegate
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        className="menu-item danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onDelete(record);
                                        }}
                                    >
                                        <FaTrash /> Delete
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="maintenance-card-body">
                {/* Issue/Description - Different terminology for Direct Purchase tickets */}
                <div className="info-item">
                    <div className="info-icon-wrapper">
                        <FaExclamationCircle className="info-icon" />
                    </div>
                    <div className="info-details">
                        <div className="info-label">
                            {record.ticketType === 'DIRECT_PURCHASE' ? 'Description' : 'Issue'}
                        </div>
                        <div className="info-value">
                            {record.initialIssueDescription || record.description}
                        </div>
                    </div>
                </div>

                {/* Current Step Display - SAME FOR BOTH TYPES */}
                {getCurrentStepDisplay()}

                {/* Two Column Layout for Compact Display */}
                <div className="info-grid">
                    {/* Responsible Person */}
                    <div className="info-item">
                        <div className="info-icon-wrapper">
                            <FaUser className="info-icon" />
                        </div>
                        <div className="info-details">
                            <div className="info-label">Responsible</div>
                            <div className="info-value">
                                {record.currentResponsiblePerson || record.responsiblePersonName || 'Not assigned'}
                            </div>
                        </div>
                    </div>

                    {/* Site - Always display, show "Not assigned" if no site */}
                    <div className="info-item">
                        <div className="info-icon-wrapper">
                            <FaMapMarkerAlt className="info-icon" />
                        </div>
                        <div className="info-details">
                            <div className="info-label">Site</div>
                            <div className="info-value">
                                {record.site && record.site !== 'N/A' ? record.site : 'Not assigned'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cost Information */}
                <div className="info-item cost-item">
                    <div className="info-icon-wrapper">
                        <FaDollarSign className="info-icon" />
                    </div>
                    <div className="info-details">
                        <div className="info-label">Cost</div>
                        {getCostDisplay()}
                    </div>
                </div>

                <div className="info-item timeline-item">
                    <div className="info-icon-wrapper">
                        <FaClock className="info-icon" />
                    </div>
                    <div className="info-details">
                        <div className="info-label">Timeline</div>
                        <div className="timeline-info">
                            {record.issueDate && (
                                <div className="date-item">
                                    Issue Date: {formatDate(record.issueDate)}
                                </div>
                            )}
                            <div className="date-item">
                                Creation Date: {formatDate(record.creationDate || record.createdAt)}
                            </div>
                            <div className="date-item">
                                {/* Handle completion/expected dates for both types */}
                                {(record.actualCompletionDate || record.completedAt)
                                    ? `Completed At: ${formatDate(record.actualCompletionDate || record.completedAt)}`
                                    : `Expected Completion Date:  ${formatDate(record.expectedCompletionDate || record.expectedEndDate)}`
                                }
                            </div>
                            {record.totalSteps > 0 && (
                                <div className="progress-indicator">
                                    {record.completedSteps}/{record.totalSteps} steps
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceCard;