import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Package, Wrench } from 'lucide-react';
import './TransactionProcessor.scss';
import MaintenanceRecordSelector from './MaintenanceRecordSelector';
import TransactionDiscrepancyResolver from './TransactionDiscrepancyResolver';
import { equipmentService } from '../../../services/equipmentService';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { transactionService } from '../../../services/transaction/transactionService';

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
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [comments, setComments] = useState('');

    // Initialize received quantities
    useEffect(() => {
        if (transaction?.items) {
            const initialQuantities = {};
            const initialNotReceived = {};
            
            transaction.items.forEach(item => {
                initialQuantities[item.id] = item.quantity;
                initialNotReceived[item.id] = false;
            });
            
            setReceivedQuantities(initialQuantities);
            setItemsNotReceived(initialNotReceived);
        }
    }, [transaction]);

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
            title: "Assign Purpose",
            description: "Specify transaction purpose and maintenance linking",
            component: renderPurposeStep,
            canProceed: () => selectedPurpose && (selectedPurpose === 'CONSUMABLE' || validateMaintenanceSelection()),
            showIf: () => !transaction.purpose || transaction.purpose === 'GENERAL'
        },
        {
            id: 3,
            title: "Verify Quantities",
            description: "Confirm received quantities for each item",
            component: renderQuantityStep,
            canProceed: () => true
        },
        {
            id: 4,
            title: "Resolve Discrepancies",
            description: "Handle any quantity discrepancies",
            component: renderDiscrepancyStep,
            canProceed: () => true,
            showIf: () => hasDiscrepancies
        },
        {
            id: 5,
            title: "Final Review",
            description: "Review all changes before completion",
            component: renderFinalStep,
            canProceed: () => true
        }
    ];

    const visibleSteps = steps.filter(step => !step.showIf || step.showIf());
    const currentStepData = visibleSteps.find(step => step.id === currentStep);

    const validateMaintenanceSelection = () => {
        if (selectedPurpose !== 'MAINTENANCE') return true;
        return maintenanceOption === 'none' || 
               maintenanceOption === 'existing' && selectedMaintenanceId ||
               maintenanceOption === 'create' && newMaintenanceData;
    };

    const handleNext = () => {
        if (currentStepData && currentStepData.canProceed()) {
            const nextStep = visibleSteps.find(step => step.id > currentStep);
            if (nextStep) {
                setCurrentStep(nextStep.id);
            } else {
                handleComplete();
            }
        }
    };

    const handlePrevious = () => {
        const prevStep = visibleSteps.find(step => step.id < currentStep);
        if (prevStep) {
            setCurrentStep(prevStep.id);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        setError('');
        
        try {
            // Convert to the backend DTO structure
            const receivedItems = transaction.items.map(item => ({
                transactionItemId: item.id,
                receivedQuantity: receivedQuantities[item.id] || 0,
                itemNotReceived: itemsNotReceived[item.id] || false
            }));

            const acceptanceData = {
                username: 'current-user', // TODO: Get from auth context
                acceptanceComment: comments || '',
                receivedItems: receivedItems
            };

            // Use the standard transaction service API
            const response = await transactionService.accept(transaction.id, acceptanceData);

            setProcessingComplete(true);
            
            // Brief delay before completing to show success state
            setTimeout(() => {
                onComplete(response);
            }, 1500);
            
        } catch (error) {
            console.error('Failed to process transaction:', error);
            setError(error.response?.data?.message || 'Failed to process transaction');
        } finally {
            setLoading(false);
        }
    };

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
                                        {item.itemType?.name || 'Unknown Item'}
                                    </span>
                                    <span className="transaction-processor-item-category">
                                        {item.itemType?.category?.name || 'No Category'}
                                    </span>
                                </div>
                                <div className="transaction-processor-item-quantity">
                                    <span className="transaction-processor-quantity-value">
                                        {item.quantity}
                                    </span>
                                    <span className="transaction-processor-quantity-unit">
                                        {item.itemType?.unit || 'units'}
                                    </span>
                                </div>
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

    function renderPurposeStep() {
        return (
            <div className="transaction-processor-step-content">
                <div className="transaction-processor-purpose-selection">
                    <h3>Transaction Purpose</h3>
                    <p>How will these items be used?</p>
                    
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
                                    <h4>{item.itemType?.name || 'Unknown Item'}</h4>
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
                                            value={receivedQuantities[item.id] || ''}
                                            disabled={itemsNotReceived[item.id]}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                setReceivedQuantities(prev => ({
                                                    ...prev,
                                                    [item.id]: value
                                                }));
                                            }}
                                            className="transaction-processor-quantity-input"
                                        />
                                        <span className="transaction-processor-quantity-unit">
                                            {item.itemType?.unit || 'units'}
                                        </span>
                                    </div>
                                </div>
                                
                                {(receivedQuantities[item.id] && receivedQuantities[item.id] !== item.quantity) && (
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

    function renderDiscrepancyStep() {
        return (
            <div className="transaction-processor-step-content">
                <TransactionDiscrepancyResolver
                    transaction={transaction}
                    receivedQuantities={receivedQuantities}
                    itemsNotReceived={itemsNotReceived}
                    onResolve={(resolutionData) => {
                        // Handle discrepancy resolution
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
                        
                        {hasDiscrepancies && (
                            <div className="transaction-processor-final-section">
                                <h4>Quantity Adjustments</h4>
                                <div className="transaction-processor-final-discrepancies">
                                    {transaction.items?.map(item => {
                                        const receivedQty = receivedQuantities[item.id] || 0;
                                        const notReceived = itemsNotReceived[item.id] || false;
                                        const hasDiscrepancy = receivedQty !== item.quantity || notReceived;
                                        
                                        if (!hasDiscrepancy) return null;
                                        
                                        return (
                                            <div key={item.id} className="transaction-processor-final-discrepancy">
                                                <span>{item.itemType?.name}</span>
                                                <span>
                                                    Expected: {item.quantity} → Received: {notReceived ? 0 : receivedQty}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
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

    if (processingComplete) {
        return (
            <div className="transaction-processor-overlay">
                <div className="transaction-processor-modal">
                    <div className="transaction-processor-success">
                        <CheckCircle className="transaction-processor-success-icon" />
                        <h2>Transaction Processed Successfully!</h2>
                        <p>The transaction has been completed and all records have been updated.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-processor-overlay">
            <div className="transaction-processor-modal">
                <div className="transaction-processor-header">
                    <div className="transaction-processor-title">
                        <h2>Process Transaction</h2>
                        <p>Batch #{transaction.batchNumber}</p>
                    </div>
                    <button 
                        className="transaction-processor-close"
                        onClick={onCancel}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="transaction-processor-progress">
                    <div className="transaction-processor-steps">
                        {visibleSteps.map((step, index) => (
                            <div 
                                key={step.id}
                                className={`transaction-processor-step ${
                                    step.id === currentStep ? 'active' : 
                                    step.id < currentStep ? 'completed' : 'pending'
                                }`}
                            >
                                <div className="transaction-processor-step-indicator">
                                    {step.id < currentStep ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <span>{step.id}</span>
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
                        <button 
                            className="transaction-processor-btn secondary"
                            onClick={handlePrevious}
                            disabled={currentStep === visibleSteps[0].id}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        
                        <button 
                            className="transaction-processor-btn primary"
                            onClick={handleNext}
                            disabled={loading || (currentStepData && !currentStepData.canProceed())}
                        >
                            {currentStep === visibleSteps[visibleSteps.length - 1].id ? 'Complete Transaction' : 'Next'}
                            {currentStep !== visibleSteps[visibleSteps.length - 1].id && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedTransactionProcessor; 