import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Info } from 'lucide-react';

const TransactionDiscrepancyResolver = ({
    transaction,
    receivedQuantities = {},
    itemsNotReceived = {},
    onResolve
}) => {
    const [resolutionActions, setResolutionActions] = useState({});
    const [comments, setComments] = useState({});
    
    // Calculate discrepancies
    const discrepancies = React.useMemo(() => {
        if (!transaction?.items) return [];
        
        return transaction.items
            .map(item => {
                const expectedQty = item.quantity;
                const receivedQty = itemsNotReceived[item.id] ? 0 : (receivedQuantities[item.id] || 0);
                const difference = receivedQty - expectedQty;
                
                if (difference === 0) return null;
                
                return {
                    item,
                    expectedQty,
                    receivedQty,
                    difference,
                    type: difference > 0 ? 'over' : 'under',
                    severity: Math.abs(difference) / expectedQty > 0.1 ? 'high' : 'low'
                };
            })
            .filter(Boolean);
    }, [transaction?.items, receivedQuantities, itemsNotReceived]);

    useEffect(() => {
        // Initialize resolution actions for each discrepancy
        const initialActions = {};
        const initialComments = {};
        
        discrepancies.forEach(disc => {
            if (!resolutionActions[disc.item.id]) {
                initialActions[disc.item.id] = disc.type === 'over' ? 'accept_excess' : 'record_shortage';
                initialComments[disc.item.id] = '';
            }
        });
        
        setResolutionActions(prev => ({ ...prev, ...initialActions }));
        setComments(prev => ({ ...prev, ...initialComments }));
    }, [discrepancies]);

    const handleResolutionChange = (itemId, action) => {
        setResolutionActions(prev => ({
            ...prev,
            [itemId]: action
        }));
    };

    const handleCommentChange = (itemId, comment) => {
        setComments(prev => ({
            ...prev,
            [itemId]: comment
        }));
    };

    const handleResolveAll = () => {
        const resolutionData = {
            discrepancies: discrepancies.map(disc => ({
                itemId: disc.item.id,
                itemName: disc.item.itemType?.name,
                expectedQty: disc.expectedQty,
                receivedQty: disc.receivedQty,
                difference: disc.difference,
                action: resolutionActions[disc.item.id],
                comment: comments[disc.item.id]
            })),
            resolutionSummary: {
                totalDiscrepancies: discrepancies.length,
                overReceived: discrepancies.filter(d => d.type === 'over').length,
                underReceived: discrepancies.filter(d => d.type === 'under').length
            }
        };
        
        onResolve(resolutionData);
    };

    const getResolutionOptions = (discrepancy) => {
        if (discrepancy.type === 'over') {
            return [
                { value: 'accept_excess', label: 'Accept Excess', description: 'Add extra items to inventory' },
                { value: 'return_excess', label: 'Return Excess', description: 'Return extra items to sender' },
                { value: 'investigate_excess', label: 'Investigate', description: 'Mark for investigation' }
            ];
        } else {
            return [
                { value: 'record_shortage', label: 'Record Shortage', description: 'Accept partial quantity and record shortage' },
                { value: 'request_remaining', label: 'Request Remaining', description: 'Request remaining items from sender' },
                { value: 'cancel_shortage', label: 'Cancel Transaction', description: 'Cancel transaction due to shortage' }
            ];
        }
    };

    const getDiscrepancyIcon = (discrepancy) => {
        if (discrepancy.type === 'over') {
            return <TrendingUp className="discrepancy-resolver-icon over" />;
        } else {
            return <TrendingDown className="discrepancy-resolver-icon under" />;
        }
    };

    const getSeverityClass = (severity) => {
        return `discrepancy-resolver-severity-${severity}`;
    };

    if (discrepancies.length === 0) {
        return (
            <div className="discrepancy-resolver-no-issues">
                <CheckCircle className="discrepancy-resolver-success-icon" />
                <h3>No Quantity Discrepancies</h3>
                <p>All items have been received as expected. No action required.</p>
            </div>
        );
    }

    return (
        <div className="discrepancy-resolver-container">
            <div className="discrepancy-resolver-header">
                <AlertTriangle className="discrepancy-resolver-header-icon" />
                <div className="discrepancy-resolver-header-info">
                    <h3>Quantity Discrepancies Detected</h3>
                    <p>
                        {discrepancies.length} item{discrepancies.length > 1 ? 's have' : ' has'} quantity discrepancies 
                        that need to be resolved before completing the transaction.
                    </p>
                </div>
            </div>

            <div className="discrepancy-resolver-summary">
                <div className="discrepancy-resolver-summary-stats">
                    <div className="discrepancy-resolver-stat over">
                        <TrendingUp size={16} />
                        <span>{discrepancies.filter(d => d.type === 'over').length} Over-received</span>
                    </div>
                    <div className="discrepancy-resolver-stat under">
                        <TrendingDown size={16} />
                        <span>{discrepancies.filter(d => d.type === 'under').length} Under-received</span>
                    </div>
                </div>
            </div>

            <div className="discrepancy-resolver-list">
                {discrepancies.map((discrepancy, index) => (
                    <div 
                        key={discrepancy.item.id} 
                        className={`discrepancy-resolver-item ${discrepancy.type} ${getSeverityClass(discrepancy.severity)}`}
                    >
                        <div className="discrepancy-resolver-item-header">
                            {getDiscrepancyIcon(discrepancy)}
                            <div className="discrepancy-resolver-item-info">
                                <h4>{discrepancy.item.itemType?.name || 'Unknown Item'}</h4>
                                <div className="discrepancy-resolver-item-quantities">
                                    <span className="discrepancy-resolver-expected">
                                        Expected: {discrepancy.expectedQty} {discrepancy.item.itemType?.unit || 'units'}
                                    </span>
                                    <span className="discrepancy-resolver-received">
                                        Received: {discrepancy.receivedQty} {discrepancy.item.itemType?.unit || 'units'}
                                    </span>
                                    <span className={`discrepancy-resolver-difference ${discrepancy.type}`}>
                                        {discrepancy.difference > 0 ? '+' : ''}{discrepancy.difference} 
                                        {discrepancy.item.itemType?.unit || 'units'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="discrepancy-resolver-item-actions">
                            <div className="discrepancy-resolver-resolution">
                                <label>Resolution Action:</label>
                                <select
                                    value={resolutionActions[discrepancy.item.id] || ''}
                                    onChange={(e) => handleResolutionChange(discrepancy.item.id, e.target.value)}
                                    className="discrepancy-resolver-select"
                                >
                                    {getResolutionOptions(discrepancy).map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="discrepancy-resolver-comment">
                                <label>Additional Notes:</label>
                                <textarea
                                    value={comments[discrepancy.item.id] || ''}
                                    onChange={(e) => handleCommentChange(discrepancy.item.id, e.target.value)}
                                    placeholder="Add any additional notes about this discrepancy..."
                                    className="discrepancy-resolver-textarea"
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Resolution Action Description */}
                        <div className="discrepancy-resolver-action-description">
                            <Info size={14} />
                            <span>
                                {getResolutionOptions(discrepancy)
                                    .find(opt => opt.value === resolutionActions[discrepancy.item.id])?.description}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="discrepancy-resolver-footer">
                <div className="discrepancy-resolver-footer-info">
                    <Info className="discrepancy-resolver-info-icon" />
                    <p>
                        Resolving discrepancies will create audit records and may trigger follow-up actions 
                        depending on your selections.
                    </p>
                </div>
                
                <button
                    className="discrepancy-resolver-resolve-btn"
                    onClick={handleResolveAll}
                    disabled={discrepancies.some(d => !resolutionActions[d.item.id])}
                >
                    <CheckCircle size={16} />
                    Resolve All Discrepancies
                </button>
            </div>
        </div>
    );
};

export default TransactionDiscrepancyResolver; 