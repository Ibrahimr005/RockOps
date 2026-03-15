import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Package, Wrench, Info } from 'lucide-react';
import './TransactionProcessor.scss';
import MaintenanceRecordSelector from './MaintenanceRecordSelector';
import TransactionDiscrepancyResolver from './TransactionDiscrepancyResolver';
import { equipmentService } from '../../../services/equipmentService';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { Button, CloseButton } from '../../../components/common/Button';

const UnifiedTransactionProcessor = ({
    equipmentId,
    transaction,
    onComplete,
    onCancel
}) => {
    // Step management
    const [currentStep, setCurrentStep] = useState(1);
    const [processingComplete, setProcessingComplete] = useState(false);

    // Transaction processing states
    const [selectedPurpose, setSelectedPurpose] = useState(transaction.purpose || 'CONSUMABLE');
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [itemsNotReceived, setItemsNotReceived] = useState({});
    const [hasDiscrepancies, setHasDiscrepancies] = useState(false);

    // Maintenance integration states
    const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
    const [maintenanceOption, setMaintenanceOption] = useState('none');
    const [newMaintenanceData, setNewMaintenanceData] = useState(null);
    const [activeMaintenanceCount, setActiveMaintenanceCount] = useState(0);

    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [comments, setComments] = useState('');
    const [showCreateMaintenancePrompt, setShowCreateMaintenancePrompt] = useState(false);

    const isPending = transaction.status === 'PENDING';
    const isRejected = transaction.status === 'REJECTED';

    // Initialize received quantities
    useEffect(() => {
        if (transaction?.items) {
            const initialQuantities = {};
            const initialNotReceived = {};

            transaction.items.forEach(item => {
                initialQuantities[item.id] = '';
                initialNotReceived[item.id] = false;
            });

            setReceivedQuantities(initialQuantities);
            setItemsNotReceived(initialNotReceived);
        }
    }, [transaction]);

    // Fetch active maintenance count for the passive suggestion banner
    useEffect(() => {
        if (isPending && equipmentId) {
            fetchActiveMaintenanceCount();
        }
    }, [equipmentId, isPending]);

    const fetchActiveMaintenanceCount = async () => {
        try {
            const response = await inSiteMaintenanceService.getByEquipmentId(equipmentId);
            const records = response.data || [];
            const activeCount = records.filter(r =>
                r.status === 'IN_PROGRESS' || r.status === 'PENDING'
            ).length;
            setActiveMaintenanceCount(activeCount);
        } catch (error) {
            console.error('Failed to fetch maintenance count:', error);
        }
    };

    // Check for discrepancies when quantities change
    useEffect(() => {
        if (transaction?.items) {
            const discrepancies = transaction.items.some(item => {
                const receivedQty = receivedQuantities[item.id] || 0;
                const notReceived = itemsNotReceived[item.id] || false;
                return receivedQty !== item.quantity || notReceived;
            });
            setHasDiscrepancies(discrepancies);
        }
    }, [receivedQuantities, itemsNotReceived, transaction]);

    // New step order: Review → Verify Quantities → Assign Purpose → Final Review
    const steps = [
        {
            id: 1,
            title: "Review Transaction",
            description: "Verify transaction details and items",
            component: renderReviewStep,
            canProceed: () => true
        },
        {
            id: 2,
            title: "Verify Quantities",
            description: "Confirm received quantities for each item",
            component: renderQuantityStep,
            canProceed: () => {
                // Ensure all items have a quantity entered
                return transaction.items?.every(item => {
                    const qty = receivedQuantities[item.id];
                    const notReceived = itemsNotReceived[item.id];
                    return notReceived || (qty !== '' && qty !== undefined && qty >= 0);
                });
            },
            showIf: () => isPending
        },
        {
            id: 3,
            title: "Assign Purpose",
            description: "Categorize items and link to maintenance",
            component: renderPurposeStep,
            canProceed: () => selectedPurpose && (selectedPurpose === 'CONSUMABLE' || validateMaintenanceSelection()),
            showIf: () => isPending
        },
        {
            id: 4,
            title: "Resolve Discrepancies",
            description: "Handle any quantity discrepancies",
            component: renderDiscrepancyStep,
            canProceed: () => true,
            showIf: () => isRejected
        },
        {
            id: 5,
            title: "Final Review",
            description: "Review all changes before completion",
            component: renderFinalStep,
            canProceed: () => true,
            showIf: () => isPending
        }
    ];

    const visibleSteps = steps.filter(step => !step.showIf || step.showIf());
    const currentStepData = visibleSteps.find(step => step.id === currentStep);
    const currentStepIndex = visibleSteps.findIndex(step => step.id === currentStep);

    const validateMaintenanceSelection = () => {
        if (selectedPurpose !== 'MAINTENANCE') return true;
        return maintenanceOption === 'none' ||
               (maintenanceOption === 'existing' && selectedMaintenanceId) ||
               (maintenanceOption === 'create' && newMaintenanceData);
    };

    const handleNext = () => {
        if (currentStepData && currentStepData.canProceed()) {
            const currentIdx = visibleSteps.findIndex(s => s.id === currentStep);
            if (currentIdx < visibleSteps.length - 1) {
                setCurrentStep(visibleSteps[currentIdx + 1].id);
            } else {
                handleComplete();
            }
        }
    };

    const handlePrevious = () => {
        const currentIdx = visibleSteps.findIndex(s => s.id === currentStep);
        if (currentIdx > 0) {
            setCurrentStep(visibleSteps[currentIdx - 1].id);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        setError('');

        try {
            const receivedQtyMap = {};
            const notReceivedMap = {};
            transaction.items.forEach(item => {
                receivedQtyMap[item.id] = receivedQuantities[item.id] || 0;
                notReceivedMap[item.id] = itemsNotReceived[item.id] || false;
            });

            let response;

            if (selectedPurpose === 'MAINTENANCE' && maintenanceOption !== 'none') {
                const maintenanceLinkingRequest = buildMaintenanceLinkingRequest();

                const acceptanceData = {
                    receivedQuantities: receivedQtyMap,
                    itemsNotReceived: notReceivedMap,
                    acceptanceComment: comments || '',
                    purpose: selectedPurpose,
                    maintenanceLinkingRequest
                };

                response = await equipmentService.acceptTransactionWithMaintenance(
                    equipmentId, transaction.id, acceptanceData
                );
            } else {
                const acceptanceData = {
                    receivedQuantities: receivedQtyMap,
                    itemsNotReceived: notReceivedMap,
                    comment: comments || '',
                    purpose: selectedPurpose
                };

                response = await equipmentService.acceptEquipmentTransaction(
                    equipmentId, transaction.id, acceptanceData
                );
            }

            setProcessingComplete(true);

            // Show create maintenance prompt if they chose MAINTENANCE without linking
            if (selectedPurpose === 'MAINTENANCE' && maintenanceOption === 'none') {
                setShowCreateMaintenancePrompt(true);
            } else {
                setTimeout(() => {
                    onComplete(response);
                }, 1500);
            }

        } catch (error) {
            console.error('Failed to process transaction:', error);
            setError(error.response?.data?.message || error.response?.data?.error || 'Failed to process transaction');
        } finally {
            setLoading(false);
        }
    };

    const buildMaintenanceLinkingRequest = () => {
        if (maintenanceOption === 'existing' && selectedMaintenanceId) {
            return {
                action: 'LINK_EXISTING',
                existingMaintenanceId: selectedMaintenanceId
            };
        }
        if (maintenanceOption === 'create' && newMaintenanceData) {
            return {
                action: 'CREATE_NEW',
                newMaintenanceRequest: {
                    technicianId: newMaintenanceData.technicianId,
                    maintenanceDate: newMaintenanceData.maintenanceDate ? `${newMaintenanceData.maintenanceDate}T00:00:00` : null,
                    maintenanceTypeId: newMaintenanceData.maintenanceTypeId,
                    description: newMaintenanceData.description,
                    status: newMaintenanceData.status || 'IN_PROGRESS'
                }
            };
        }
        return { action: 'SKIP_MAINTENANCE' };
    };

    // ─── Step Renderers ─────────────────────

    function renderReviewStep() {
        return (
            <div className="transaction-processor-step-content">
                <div className="transaction-processor-review-header">
                    <h3>Transaction Details</h3>
                    <div className="transaction-processor-review-meta">
                        <span className="transaction-processor-batch">
                            Batch #{transaction.batchNumber}
                        </span>
                        <span className={`transaction-processor-purpose ${transaction.purpose?.toLowerCase()}`}>
                            {transaction.purpose || 'Not Specified'}
                        </span>
                        <span className="transaction-processor-date">
                            {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                        </span>
                    </div>
                </div>

                <div className="transaction-processor-parties">
                    <div className="transaction-processor-party">
                        <h4>From:</h4>
                        <p>{transaction.senderName}</p>
                    </div>
                    <div className="transaction-processor-party">
                        <h4>To:</h4>
                        <p>{transaction.receiverName}</p>
                    </div>
                </div>

                <div className="transaction-processor-items">
                    <h4>Items ({transaction.items?.length || 0})</h4>
                    <div className="transaction-processor-items-list">
                        {transaction.items?.map((item, index) => (
                            <div key={item.id || index} className="transaction-processor-item-row">
                                <div className="transaction-processor-item-info">
                                    <span className="transaction-processor-item-name">
                                        {item.itemTypeName || 'Unknown Item'}
                                    </span>
                                    <span className="transaction-processor-item-category">
                                        {item.itemCategory || 'No Category'}
                                    </span>
                                </div>
                                {!isPending && (
                                    <div className="transaction-processor-item-quantity">
                                        {isRejected ? (
                                            <>
                                                <span className="transaction-processor-quantity-claim warehouse">
                                                    Warehouse: {item.quantity} {item.itemUnit || 'units'}
                                                </span>
                                                <span className="transaction-processor-quantity-claim equipment">
                                                    Equipment: {item.equipmentReceivedQuantity ?? '—'} {item.itemUnit || 'units'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="transaction-processor-quantity-value">
                                                {item.quantity} {item.itemUnit || 'units'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {transaction.description && (
                    <div className="transaction-processor-description">
                        <h4>Description:</h4>
                        <p>{transaction.description}</p>
                    </div>
                )}
            </div>
        );
    }

    function renderQuantityStep() {
        return (
            <div className="transaction-processor-step-content">
                <div className="transaction-processor-quantity-verification">
                    <h3>Verify Received Quantities</h3>
                    <p>Confirm the actual quantities received for each item</p>

                    <div className="transaction-processor-quantity-list">
                        {transaction.items?.map((item, index) => (
                            <div key={item.id || index} className="transaction-processor-quantity-item">
                                <div className="transaction-processor-quantity-item-info">
                                    <h4>{item.itemTypeName || 'Unknown Item'}</h4>
                                    <p>Enter the actual quantity you received:</p>
                                </div>

                                <div className="transaction-processor-quantity-controls">
                                    <label className="transaction-processor-quantity-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={itemsNotReceived[item.id] || false}
                                            onChange={(e) => {
                                                setItemsNotReceived(prev => ({
                                                    ...prev,
                                                    [item.id]: e.target.checked
                                                }));
                                                if (e.target.checked) {
                                                    setReceivedQuantities(prev => ({
                                                        ...prev,
                                                        [item.id]: 0
                                                    }));
                                                }
                                            }}
                                        />
                                        Not received
                                    </label>

                                    <div className="transaction-processor-quantity-input-group">
                                        <label>Received:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={receivedQuantities[item.id] === '' ? '' : receivedQuantities[item.id]}
                                            disabled={itemsNotReceived[item.id]}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                                setReceivedQuantities(prev => ({
                                                    ...prev,
                                                    [item.id]: value
                                                }));
                                            }}
                                            className="transaction-processor-quantity-input"
                                        />
                                        <span className="transaction-processor-quantity-unit">
                                            {item.itemUnit || 'units'}
                                        </span>
                                    </div>
                                </div>

                                {(receivedQuantities[item.id] !== '' && receivedQuantities[item.id] !== item.quantity) && (
                                    <div className="transaction-processor-quantity-discrepancy">
                                        <AlertTriangle size={16} />
                                        {receivedQuantities[item.id] > item.quantity
                                            ? `Over-received: +${receivedQuantities[item.id] - item.quantity}`
                                            : `Under-received: -${item.quantity - receivedQuantities[item.id]}`
                                        }
                                    </div>
                                )}
                                {itemsNotReceived[item.id] && (
                                    <div className="transaction-processor-quantity-discrepancy">
                                        <AlertTriangle size={16} />
                                        Item marked as not received
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    function renderPurposeStep() {
        return (
            <div className="transaction-processor-step-content">
                <div className="transaction-processor-purpose-selection">
                    <h3>Transaction Purpose</h3>
                    <p>How will these items be used?</p>

                    {/* Passive suggestion banner — only when active maintenance exists */}
                    {activeMaintenanceCount > 0 && (
                        <div className="transaction-processor-maintenance-hint">
                            <Wrench size={16} />
                            <span>
                                This equipment has {activeMaintenanceCount} active maintenance record{activeMaintenanceCount > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    <div className="transaction-processor-purpose-options">
                        <label className={`transaction-processor-purpose-option ${selectedPurpose === 'CONSUMABLE' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                value="CONSUMABLE"
                                checked={selectedPurpose === 'CONSUMABLE'}
                                onChange={(e) => setSelectedPurpose(e.target.value)}
                            />
                            <div className="transaction-processor-purpose-card">
                                <Package className="transaction-processor-purpose-icon" />
                                <div className="transaction-processor-purpose-info">
                                    <h4>Consumables</h4>
                                    <p>Items for general equipment operation and consumption</p>
                                </div>
                            </div>
                        </label>

                        <label className={`transaction-processor-purpose-option ${selectedPurpose === 'MAINTENANCE' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                value="MAINTENANCE"
                                checked={selectedPurpose === 'MAINTENANCE'}
                                onChange={(e) => setSelectedPurpose(e.target.value)}
                            />
                            <div className="transaction-processor-purpose-card">
                                <Wrench className="transaction-processor-purpose-icon" />
                                <div className="transaction-processor-purpose-info">
                                    <h4>Maintenance</h4>
                                    <p>Items for equipment maintenance and repair activities</p>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {selectedPurpose === 'MAINTENANCE' && (
                    <MaintenanceRecordSelector
                        equipmentId={equipmentId}
                        transactionItems={transaction.items}
                        selectedMaintenanceId={selectedMaintenanceId}
                        onMaintenanceSelect={setSelectedMaintenanceId}
                        maintenanceOption={maintenanceOption}
                        onMaintenanceOptionChange={setMaintenanceOption}
                        newMaintenanceData={newMaintenanceData}
                        onNewMaintenanceDataChange={setNewMaintenanceData}
                    />
                )}
            </div>
        );
    }

    function renderDiscrepancyStep() {
        return (
            <div className="transaction-processor-step-content">
                <TransactionDiscrepancyResolver
                    transaction={transaction}
                    receivedQuantities={receivedQuantities}
                    itemsNotReceived={itemsNotReceived}
                    onResolve={(resolutionData) => {
                        console.log('Discrepancy resolved:', resolutionData);
                    }}
                />
            </div>
        );
    }

    function renderFinalStep() {
        return (
            <div className="transaction-processor-step-content">
                <div className="transaction-processor-final-review">
                    <h3>Final Review</h3>
                    <p>Please review all changes before completing the transaction</p>

                    <div className="transaction-processor-final-summary">
                        <div className="transaction-processor-final-section">
                            <h4>Transaction Purpose</h4>
                            <p className={`transaction-processor-final-purpose ${selectedPurpose.toLowerCase()}`}>
                                {selectedPurpose}
                            </p>
                        </div>

                        {selectedPurpose === 'MAINTENANCE' && selectedMaintenanceId && (
                            <div className="transaction-processor-final-section">
                                <h4>Linked Maintenance Record</h4>
                                <p>Maintenance ID: {selectedMaintenanceId}</p>
                            </div>
                        )}

                        <div className="transaction-processor-final-section">
                            <h4>Received Quantities</h4>
                            <div className="transaction-processor-final-discrepancies">
                                {transaction.items?.map(item => {
                                    const receivedQty = receivedQuantities[item.id] || 0;
                                    const notReceived = itemsNotReceived[item.id] || false;

                                    return (
                                        <div key={item.id} className="transaction-processor-final-discrepancy">
                                            <span>{item.itemTypeName || 'Unknown Item'}</span>
                                            <span>
                                                Received: {notReceived ? 0 : receivedQty} {item.itemUnit || 'units'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="transaction-processor-final-section">
                            <h4>Comments</h4>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any additional comments about this transaction..."
                                className="transaction-processor-final-comments"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Success State ──────────────────────

    if (processingComplete) {
        return (
            <div className="transaction-processor-overlay">
                <div className="transaction-processor-modal">
                    <div className="transaction-processor-success">
                        <CheckCircle className="transaction-processor-success-icon" />
                        <h2>Transaction Processed Successfully!</h2>
                        <p>The transaction has been completed and all records have been updated.</p>

                        <div className="transaction-processor-success-actions">
                            <Button
                                variant="primary"
                                onClick={() => onComplete()}
                            >
                                Done
                            </Button>
                            {/* Soft suggestion: create maintenance record if they chose MAINTENANCE without linking */}
                            {showCreateMaintenancePrompt && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        onComplete();
                                        // Navigate to maintenance tab — parent handles this
                                    }}
                                >
                                    Create Maintenance Record
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main Render ────────────────────────

    return (
        <div className="transaction-processor-overlay">
            <div className="transaction-processor-modal">
                <div className="transaction-processor-header">
                    <div className="transaction-processor-title">
                        <h2>Process Transaction</h2>
                        <p>Batch #{transaction.batchNumber}</p>
                    </div>
                    <CloseButton onClick={onCancel} />
                </div>

                <div className="transaction-processor-progress">
                    <div className="transaction-processor-steps">
                        {visibleSteps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`transaction-processor-step ${
                                    index === currentStepIndex ? 'active' :
                                    index < currentStepIndex ? 'completed' : 'pending'
                                }`}
                            >
                                <div className="transaction-processor-step-indicator">
                                    {index < currentStepIndex ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <div className="transaction-processor-step-info">
                                    <h4>{step.title}</h4>
                                    <p>{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="transaction-processor-content">
                    {currentStepData && currentStepData.component()}
                </div>

                {error && (
                    <div className="transaction-processor-error">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div className="transaction-processor-footer">
                    <div className="transaction-processor-nav">
                        <Button
                            variant="ghost"
                            onClick={handlePrevious}
                            disabled={currentStepIndex === 0}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={loading || (currentStepData && !currentStepData.canProceed())}
                            loading={loading}
                            loadingText="Processing..."
                        >
                            {currentStepIndex === visibleSteps.length - 1 ? 'Complete Transaction' : 'Next'}
                            {currentStepIndex !== visibleSteps.length - 1 && <ChevronRight size={16} />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedTransactionProcessor;
