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
        const expectedTotalCost = record.expectedCost || record.expectedTotalCost || record.totalExpectedCost || 0;
        const actualTotalCost = record.actualTotalCost || record.totalActualCost || 0;
        const costDifference = record.costDifference || (actualTotalCost - expectedTotalCost);

        if (status === 'COMPLETED') {
            // FINISHED: Show only Total Cost
            return (
                <div className="cost-details">
                    <div className="cost-row primary">
                        <span className="cost-type">Total Cost</span>
                        <span className="cost-amount">{formatCurrency(actualTotalCost)}</span>
                    </div>
                    {Math.abs(costDifference) > 0.01 && (
                        <div className={`cost-row difference ${costDifference > 0 ? 'over-budget' : 'under-budget'}`}>
                            <span className="cost-type">
                                {costDifference > 0 ? 'Over Budget' : 'Under Budget'}
                            </span>
                            <span className="cost-amount">
                                {costDifference > 0 ? '+' : ''}{formatCurrency(costDifference)}
                            </span>
                        </div>
                    )}
                </div>
            );
        } else if (status === 'ACTIVE' || status === 'IN_PROGRESS') {
            // ACTIVE: Show Expected Cost + Actual Cost So Far
            return (
                <div className="cost-details">
                    <div className="cost-row primary">
                        <span className="cost-type">Expected Cost</span>
                        <span className="cost-amount">{formatCurrency(expectedTotalCost)}</span>
                    </div>
                    <div className="cost-row secondary">
                        <span className="cost-type">Actual Cost So Far</span>
                        <span className="cost-amount">{formatCurrency(actualTotalCost)}</span>
                    </div>
                </div>
            );
        } else {
            // SCHEDULED, ON_HOLD, etc.: Show only Expected Cost
            return (
                <div className="cost-details">
                    <div className="cost-row primary">
                        <span className="cost-type">Expected Cost</span>
                        <span className="cost-amount">{formatCurrency(expectedTotalCost)}</span>
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