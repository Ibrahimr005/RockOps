import React, { useState, useEffect } from "react";
import { FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp, FiPackage, FiTruck, FiClock, FiUser } from 'react-icons/fi';
import { purchaseOrderService } from '../../../../../services/procurement/purchaseOrderService';
import "./ReceivingTab.scss";

const ReceivingTab = ({ purchaseOrder, onSuccess, onError }) => {
    const [itemStatuses, setItemStatuses] = useState({});
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedMerchants, setSelectedMerchants] = useState({});
    const [merchantGroups, setMerchantGroups] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [deliveryHistoryByItem, setDeliveryHistoryByItem] = useState({});
    const [recentlyProcessed, setRecentlyProcessed] = useState(null);
    const [pendingRedeliveryItems, setPendingRedeliveryItems] = useState([]);
    const [isRedeliveryMode, setIsRedeliveryMode] = useState(false);
    const [selectedRedeliveryIssues, setSelectedRedeliveryIssues] = useState([]);

    // Fetch all data: aggregate items, calculate remaining, load delivery history
    const initializeData = async (aggregatedItems) => {
        setIsLoadingData(true);
        try {
            const deliveryHistoryMap = {};
            const initialStatuses = {};
            const initialExpanded = {};

            // Fetch delivery history for each aggregated item
            for (const aggItem of aggregatedItems) {
                // Fetch deliveries for first original item (they're aggregated anyway)
                const firstItemId = aggItem.originalItems[0]?.id;
                if (firstItemId) {
                    try {
                        const response = await purchaseOrderService.getDeliveryHistory(firstItemId);
                        deliveryHistoryMap[aggItem.aggregationKey] = response.deliveries || [];
                    } catch (error) {
                        console.error(`Error fetching delivery history for item ${firstItemId}:`, error);
                        deliveryHistoryMap[aggItem.aggregationKey] = [];
                    }
                }
            }

            setDeliveryHistoryByItem(deliveryHistoryMap);

            // Calculate statuses based on delivery history
            aggregatedItems.forEach(aggItem => {
                const ordered = aggItem.quantity;
                const deliveries = deliveryHistoryMap[aggItem.aggregationKey] || [];

                // Sum up all received good quantities
                let totalReceived = 0;
                let totalIssues = 0;

                deliveries.forEach(delivery => {
                    totalReceived += delivery.receivedGoodQuantity || 0;
                    delivery.issues?.forEach(issue => {
                        totalIssues += issue.affectedQuantity || 0;
                    });
                });

                const remaining = Math.max(0, ordered - totalReceived - totalIssues);
                const isFullyAccounted = remaining <= 0;

                initialStatuses[aggItem.aggregationKey] = {
                    ordered,
                    totalReceived,
                    totalIssues,
                    remaining,
                    receivedGood: 0,
                    damaged: 0,
                    notArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: false,
                    issueNotes: "",
                    hasIssues: false,
                    isFullyAccounted,
                    useQuickAction: true,
                    quickActionType: null
                };

                // Expand items that need processing
                initialExpanded[aggItem.aggregationKey] = !isFullyAccounted;
                initialExpanded[`${aggItem.aggregationKey}_history`] = false;
            });

            setItemStatuses(initialStatuses);
            setExpandedItems(initialExpanded);

            // Group items by merchant
            const groups = {};
            aggregatedItems.forEach(aggItem => {
                const merchantId = aggItem.merchant?.id || 'no-merchant';
                if (!groups[merchantId]) {
                    groups[merchantId] = {
                        merchantId,
                        merchantName: aggItem.merchant?.name || 'No Merchant',
                        items: []
                    };
                }
                groups[merchantId].items.push(aggItem);
            });
            setMerchantGroups(groups);

        } catch (error) {
            console.error('Error initializing data:', error);
            if (onError) {
                onError('Failed to load delivery data');
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    const checkForPendingRedeliveries = async () => {
        if (purchaseOrder?.id) {
            try {
                const pendingItems = await purchaseOrderService.getItemsPendingRedelivery(purchaseOrder.id);
                setPendingRedeliveryItems(pendingItems);

                if (pendingItems.length > 0) {
                    console.log(`Found ${pendingItems.length} items pending redelivery`);
                }
            } catch (error) {
                console.error('Error checking for pending redeliveries:', error);
            }
        }
    };

    // Initialize on mount
    useEffect(() => {
        if (purchaseOrder?.purchaseOrderItems) {
            const aggregationMap = new Map();

            purchaseOrder.purchaseOrderItems.forEach(item => {
                const itemTypeId = item.itemType?.id ||
                    item.offerItem?.requestOrderItem?.itemType?.id ||
                    item.itemTypeName;
                const merchantId = item.merchant?.id || 'no-merchant';
                const key = `${itemTypeId}-${merchantId}`;

                if (aggregationMap.has(key)) {
                    const existing = aggregationMap.get(key);
                    existing.originalItems.push(item);
                    existing.quantity += item.quantity;
                } else {
                    aggregationMap.set(key, {
                        aggregationKey: key,
                        itemType: item.itemType || item.offerItem?.requestOrderItem?.itemType,
                        itemTypeName: item.itemTypeName,
                        merchant: item.merchant,
                        quantity: item.quantity,
                        originalItems: [item],
                        itemCategory: item.itemType?.itemCategory?.name ||
                            item.itemType?.category?.name ||
                            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
                            item.itemCategory
                    });
                }
            });

            const aggregated = Array.from(aggregationMap.values());
            initializeData(aggregated);
        }
    }, [purchaseOrder]);

    // Check for pending redeliveries when purchase order changes
    useEffect(() => {
        if (purchaseOrder?.id) {
            checkForPendingRedeliveries();
        }
    }, [purchaseOrder?.id]);

    // Helper functions
    const getItemName = (aggItem) => {
        return aggItem.itemType?.name || aggItem.itemTypeName || "Unknown Item";
    };

    const getUnit = (aggItem) => {
        return aggItem.itemType?.measuringUnit || 'units';
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getIssueTypeDisplay = (issueType) => {
        const map = {
            'DAMAGED': 'Damaged',
            'NOT_ARRIVED': 'Never Arrived',
            'WRONG_ITEM': 'Wrong Item',
            'WRONG_QUANTITY': 'Wrong Quantity',
            'QUALITY_ISSUE': 'Quality Issue',
            'OTHER': 'Other Issue'
        };
        return map[issueType] || issueType;
    };

    const getResolutionDisplay = (resolutionType) => {
        const map = {
            'REDELIVERY': { text: 'Redelivery Arranged', color: '#f59e0b' },
            'REFUND': { text: 'Refund Issued', color: '#10b981' },
            'ACCEPT_SHORTAGE': { text: 'Shortage Accepted', color: '#6366f1' },
            'REPLACEMENT_PO': { text: 'Replacement PO', color: '#8b5cf6' }
        };
        return map[resolutionType] || { text: resolutionType, color: '#6b7280' };
    };

    const toggleMerchantSelection = (merchantId) => {
        const merchant = merchantGroups[merchantId];
        if (!merchant) return;

        const allFullyAccounted = merchant.items.every(item =>
            itemStatuses[item.aggregationKey]?.isFullyAccounted
        );

        if (allFullyAccounted) return;

        setSelectedMerchants(prev => {
            const isCurrentlySelected = prev[merchantId];
            const newSelectedState = !isCurrentlySelected;

            if (isCurrentlySelected) {
                setExpandedItems(prevExpanded => {
                    const newExpanded = { ...prevExpanded };
                    merchant.items.forEach(item => {
                        newExpanded[item.aggregationKey] = false;
                        newExpanded[`${item.aggregationKey}_history`] = false;
                    });
                    return newExpanded;
                });
            }

            return {
                ...prev,
                [merchantId]: newSelectedState
            };
        });
    };

    const toggleExpanded = (aggregationKey) => {
        setExpandedItems(prev => {
            const newExpanded = !prev[aggregationKey];
            return {
                ...prev,
                [aggregationKey]: newExpanded,
                [`${aggregationKey}_history`]: newExpanded ? prev[`${aggregationKey}_history`] : false
            };
        });
    };

    const toggleHistoryExpanded = (aggregationKey) => {
        setExpandedItems(prev => ({
            ...prev,
            [`${aggregationKey}_history`]: !prev[`${aggregationKey}_history`]
        }));
    };

    const handleQuickAction = (aggregationKey, actionType) => {
        const status = itemStatuses[aggregationKey];
        if (!status) return;

        const newStatus = {
            ...status,
            useQuickAction: true,
            quickActionType: actionType,
            receivedGood: 0,
            damaged: 0,
            notArrived: 0,
            wrongItem: 0,
            other: 0,
            issueNotes: "",
            hasIssues: false,
            isValid: false,
            totalAccountedFor: 0
        };

        switch (actionType) {
            case 'ALL_GOOD':
                newStatus.receivedGood = status.remaining;
                newStatus.totalAccountedFor = status.remaining;
                newStatus.isValid = true;
                newStatus.hasIssues = false;
                break;
            case 'ALL_DAMAGED':
                newStatus.damaged = status.remaining;
                newStatus.totalAccountedFor = status.remaining;
                newStatus.hasIssues = true;
                newStatus.isValid = false;
                break;
            case 'NEVER_ARRIVED':
                newStatus.notArrived = status.remaining;
                newStatus.totalAccountedFor = status.remaining;
                newStatus.hasIssues = true;
                newStatus.isValid = false;
                break;
            case 'WRONG_ITEM':
                newStatus.wrongItem = status.remaining;
                newStatus.totalAccountedFor = status.remaining;
                newStatus.hasIssues = true;
                newStatus.isValid = false;
                break;
            default:
                break;
        }

        setItemStatuses(prev => ({
            ...prev,
            [aggregationKey]: newStatus
        }));
    };

    const handleSwitchToMore = (aggregationKey) => {
        setItemStatuses(prev => ({
            ...prev,
            [aggregationKey]: {
                ...prev[aggregationKey],
                useQuickAction: false,
                quickActionType: null,
                receivedGood: 0,
                damaged: 0,
                notArrived: 0,
                wrongItem: 0,
                other: 0,
                totalAccountedFor: 0,
                isValid: false,
                issueNotes: "",
                hasIssues: false
            }
        }));
    };

    const handleQuantityChange = (aggregationKey, field, value) => {
        const numValue = parseFloat(value) || 0;

        setItemStatuses(prev => {
            const current = prev[aggregationKey];
            const newStatus = {
                ...current,
                [field]: Math.max(0, numValue)
            };

            newStatus.totalAccountedFor =
                newStatus.receivedGood +
                newStatus.damaged +
                newStatus.notArrived +
                newStatus.wrongItem +
                newStatus.other;

            newStatus.isValid = newStatus.totalAccountedFor === current.remaining;
            newStatus.hasIssues =
                newStatus.damaged > 0 ||
                newStatus.notArrived > 0 ||
                newStatus.wrongItem > 0 ||
                newStatus.other > 0;

            return {
                ...prev,
                [aggregationKey]: newStatus
            };
        });
    };

    const handleIssueNotesChange = (aggregationKey, notes) => {
        setItemStatuses(prev => {
            const current = prev[aggregationKey];
            const newStatus = {
                ...current,
                issueNotes: notes,
                isValid: current.hasIssues ?
                    (notes.trim().length > 0 && current.totalAccountedFor === current.remaining) :
                    current.totalAccountedFor === current.remaining
            };

            return {
                ...prev,
                [aggregationKey]: newStatus
            };
        });
    };

    const canSubmit = () => {
        const selectedMerchantIds = Object.entries(selectedMerchants)
            .filter(([_, isSelected]) => isSelected)
            .map(([merchantId]) => merchantId);

        if (selectedMerchantIds.length === 0) return false;

        for (const merchantId of selectedMerchantIds) {
            const merchant = merchantGroups[merchantId];
            if (!merchant) continue;

            const incompleteItems = merchant.items.filter(item =>
                !itemStatuses[item.aggregationKey]?.isFullyAccounted
            );

            const allValid = incompleteItems.every(item => {
                const status = itemStatuses[item.aggregationKey];
                if (!status.isValid) return false;
                if (status.hasIssues && !status.issueNotes.trim()) return false;
                return true;
            });

            if (!allValid) return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (isSubmitting || !canSubmit()) return;

        setIsSubmitting(true);
        try {
            let response;
            const items = [];
            const processedSummary = {};

            const selectedMerchantIds = Object.entries(selectedMerchants)
                .filter(([_, isSelected]) => isSelected)
                .map(([merchantId]) => merchantId);

            // Build items array (same logic as before)
            selectedMerchantIds.forEach(merchantId => {
                const merchant = merchantGroups[merchantId];
                if (!merchant) return;

                processedSummary[merchantId] = {
                    merchantName: merchant.merchantName,
                    items: []
                };

                merchant.items.forEach(aggItem => {
                    const status = itemStatuses[aggItem.aggregationKey];
                    if (status.isFullyAccounted) return;

                    const totalOriginalQuantity = aggItem.quantity;

                    processedSummary[merchantId].items.push({
                        itemName: getItemName(aggItem),
                        unit: getUnit(aggItem),
                        receivedGood: status.receivedGood,
                        damaged: status.damaged,
                        notArrived: status.notArrived,
                        wrongItem: status.wrongItem,
                        other: status.other,
                        issueNotes: status.issueNotes,
                        hasIssues: status.hasIssues
                    });

                    aggItem.originalItems.forEach((originalItem) => {
                        const proportion = originalItem.quantity / totalOriginalQuantity;
                        const receivedGood = Math.round(status.receivedGood * proportion * 100) / 100;

                        const itemIssues = [];

                        if (status.hasIssues) {
                            if (status.damaged > 0) {
                                itemIssues.push({
                                    type: 'DAMAGED',
                                    quantity: Math.round(status.damaged * proportion * 100) / 100,
                                    notes: status.issueNotes
                                });
                            }
                            if (status.notArrived > 0) {
                                itemIssues.push({
                                    type: 'NOT_ARRIVED',
                                    quantity: Math.round(status.notArrived * proportion * 100) / 100,
                                    notes: status.issueNotes
                                });
                            }
                            if (status.wrongItem > 0) {
                                itemIssues.push({
                                    type: 'WRONG_ITEM',
                                    quantity: Math.round(status.wrongItem * proportion * 100) / 100,
                                    notes: status.issueNotes
                                });
                            }
                            if (status.other > 0) {
                                itemIssues.push({
                                    type: 'OTHER',
                                    quantity: Math.round(status.other * proportion * 100) / 100,
                                    notes: status.issueNotes
                                });
                            }
                        }

                        items.push({
                            purchaseOrderItemId: originalItem.id,
                            receivedGood: receivedGood,
                            issues: itemIssues
                        });
                    });
                });
            });

            const submissionData = {
                items: items,
                generalNotes: "",
                receivedAt: new Date().toISOString()
            };

            // Check if processing redelivery or normal delivery
            if (isRedeliveryMode && selectedRedeliveryIssues.length > 0) {
                console.log("Processing as REDELIVERY with issues:", selectedRedeliveryIssues);
                response = await purchaseOrderService.processRedelivery(
                    purchaseOrder.id,
                    selectedRedeliveryIssues,
                    submissionData
                );

                // Clear redelivery mode after success
                setIsRedeliveryMode(false);
                setSelectedRedeliveryIssues([]);
                setPendingRedeliveryItems([]);
            } else {
                console.log("Processing as NORMAL delivery");
                response = await purchaseOrderService.processDelivery(purchaseOrder.id, submissionData);
            }

            console.log("✓ Delivery processed successfully");

            // Show success summary
            setRecentlyProcessed(processedSummary);

            // Deselect merchants
            setSelectedMerchants(prev => {
                const newSelected = { ...prev };
                selectedMerchantIds.forEach(id => {
                    newSelected[id] = false;
                });
                return newSelected;
            });

            // Refresh pending redeliveries
            await checkForPendingRedeliveries();

            if (onSuccess) {
                onSuccess();
            }

        } catch (error) {
            console.error('Error processing delivery:', error);
            if (onError) {
                onError('Failed to process delivery. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedMerchantCount = Object.values(selectedMerchants).filter(Boolean).length;
    const hasItemsToProcess = Object.values(itemStatuses).some(s => !s.isFullyAccounted);
    const fullyAccountedCount = Object.values(itemStatuses).filter(s => s.isFullyAccounted).length;
    const totalItems = Object.keys(itemStatuses).length;

    if (isLoadingData) {
        return (
            <div className="receiving-tab">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading delivery data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="receiving-tab">
            {/* Instructions */}
            <div className="info-banner">
                <FiPackage className="banner-icon" />
                <p>Select merchants to process their deliveries. Items already fully received are marked as completed.</p>
            </div>

            {/* Progress */}
            {fullyAccountedCount > 0 && (
                <div className="progress-banner success">
                    <FiCheckCircle />
                    <span>{fullyAccountedCount} of {totalItems} items completed</span>
                </div>
            )}

            {/* Recently Processed */}
            {recentlyProcessed && Object.keys(recentlyProcessed).length > 0 && (
                <div className="recently-processed">
                    <div className="section-header">
                        <FiCheckCircle className="header-icon" />
                        <h3>Recently Processed Deliveries</h3>
                    </div>
                    {Object.entries(recentlyProcessed).map(([merchantId, data]) => (
                        <div key={merchantId} className="processed-merchant-card">
                            <div className="merchant-header">
                                <FiTruck />
                                <span className="merchant-name">{data.merchantName}</span>
                                <span className="item-count">{data.items.length} {data.items.length === 1 ? 'item' : 'items'}</span>
                            </div>
                            <div className="processed-items-list">
                                {data.items.map((item, idx) => (
                                    <div key={idx} className="processed-item-row">
                                        <span className="item-name">{item.itemName}</span>
                                        <div className="item-badges">
                                            {item.receivedGood > 0 && (
                                                <span className="badge success">
                                                    {item.receivedGood} {item.unit} Good
                                                </span>
                                            )}
                                            {item.damaged > 0 && (
                                                <span className="badge warning">
                                                    {item.damaged} {item.unit} Damaged
                                                </span>
                                            )}
                                            {item.notArrived > 0 && (
                                                <span className="badge danger">
                                                    {item.notArrived} {item.unit} Not Arrived
                                                </span>
                                            )}
                                            {item.wrongItem > 0 && (
                                                <span className="badge info">
                                                    {item.wrongItem} {item.unit} Wrong Item
                                                </span>
                                            )}
                                        </div>
                                        {item.hasIssues && item.issueNotes && (
                                            <div className="item-notes">
                                                <span className="notes-label">Notes:</span>
                                                <span className="notes-text">{item.issueNotes}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending Redeliveries Banner */}
            {pendingRedeliveryItems.length > 0 && (
                <div className="redelivery-banner warning">
                    <div className="banner-header">
                        <FiAlertCircle className="banner-icon" />
                        <h3>Pending Redeliveries</h3>
                    </div>
                    <p className="banner-text">
                        There are items awaiting redelivery from previously reported issues. Select the issues you're processing:
                    </p>
                    <div className="redelivery-items">
                        {pendingRedeliveryItems.map(item => (
                            <div key={item.id} className="redelivery-item-card">
                                <div className="item-header">
                                    <h4>{item.itemType?.name || item.itemTypeName}</h4>
                                    <span className="merchant-badge">
                            {item.merchant?.name || 'No Merchant'}
                        </span>
                                </div>
                                {item.issues?.map(issue => (
                                    <div key={issue.id} className="issue-selection">
                                        <label className="checkbox-wrapper">
                                            <input
                                                type="checkbox"
                                                checked={selectedRedeliveryIssues.includes(issue.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRedeliveryIssues(prev => [...prev, issue.id]);
                                                        setIsRedeliveryMode(true);
                                                    } else {
                                                        setSelectedRedeliveryIssues(prev =>
                                                            prev.filter(id => id !== issue.id)
                                                        );
                                                        if (selectedRedeliveryIssues.length === 1) {
                                                            setIsRedeliveryMode(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <span className="checkmark">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </span>
                                        </label>
                                        <div className="issue-details">
                                            <span className="issue-type">{getIssueTypeDisplay(issue.issueType)}</span>
                                            <span className="issue-quantity">
                                    {issue.affectedQuantity} {item.itemType?.measuringUnit || 'units'}
                                </span>
                                            {issue.resolutionNotes && (
                                                <span className="resolution-notes">Note: {issue.resolutionNotes}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    {isRedeliveryMode && (
                        <div className="redelivery-mode-indicator">
                            <FiPackage />
                            <span>Processing {selectedRedeliveryIssues.length} redelivery issue(s)</span>
                            <button
                                type="button"
                                className="btn-link"
                                onClick={() => {
                                    setIsRedeliveryMode(false);
                                    setSelectedRedeliveryIssues([]);
                                }}
                            >
                                Cancel Redelivery Mode
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Merchant Groups */}
            {Object.entries(merchantGroups).map(([merchantId, merchant]) => {
                const isMerchantSelected = selectedMerchants[merchantId];
                const allItemsComplete = merchant.items.every(item =>
                    itemStatuses[item.aggregationKey]?.isFullyAccounted
                );

                return (
                    <div key={merchantId} className={`merchant-card ${allItemsComplete ? 'completed' : ''}`}>
                        <div
                            className={`merchant-header ${isMerchantSelected ? 'selected' : ''}`}
                            onClick={() => !allItemsComplete && toggleMerchantSelection(merchantId)}
                        >
                            <label className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={isMerchantSelected || false}
                                    onChange={() => toggleMerchantSelection(merchantId)}
                                    disabled={allItemsComplete}
                                />
                                <span className="checkmark">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </span>
                            </label>

                            <FiTruck className="merchant-icon" />
                            <h3 className="merchant-name">{merchant.merchantName}</h3>
                            <span className="item-count">{merchant.items.length} {merchant.items.length === 1 ? 'item' : 'items'}</span>

                            {allItemsComplete && (
                                <span className="badge success">
                                    <FiCheckCircle />
                                    Completed
                                </span>
                            )}
                        </div>

                        <div className="merchant-items">
                            {merchant.items.map((aggItem) => {
                                const status = itemStatuses[aggItem.aggregationKey];
                                if (!status) return null;

                                const isExpanded = expandedItems[aggItem.aggregationKey];
                                const isHistoryExpanded = expandedItems[`${aggItem.aggregationKey}_history`];
                                const unit = getUnit(aggItem);
                                const deliveries = deliveryHistoryByItem[aggItem.aggregationKey] || [];
                                const hasHistory = deliveries.length > 0;

                                return (
                                    <div
                                        key={aggItem.aggregationKey}
                                        className={`item-card ${status.isFullyAccounted ? 'completed' : ''} ${!isMerchantSelected && !status.isFullyAccounted ? 'disabled' : ''}`}
                                    >
                                        <div className="item-header" onClick={() => toggleExpanded(aggItem.aggregationKey)}>
                                            <div className="item-info">
                                                <h4 className="item-name">{getItemName(aggItem)}</h4>
                                                <div className="item-meta">
                                                    <span className="meta-item">
                                                        <span className="meta-label">Ordered:</span>
                                                        <span className="meta-value">{status.ordered} {unit}</span>
                                                    </span>
                                                    <span className="meta-sep">·</span>
                                                    <span className="meta-item">
                                                        <span className="meta-label">Remaining:</span>
                                                        <span className="meta-value">{status.remaining} {unit}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="item-actions">
                                                {status.isFullyAccounted ? (
                                                    <span className="badge success">
                                                        <FiCheckCircle />
                                                        Completed
                                                    </span>
                                                ) : status.isValid ? (
                                                    <span className="badge info">Ready</span>
                                                ) : status.totalAccountedFor > 0 ? (
                                                    <span className="badge warning">{status.totalAccountedFor}/{status.remaining}</span>
                                                ) : null}

                                                <button className="expand-btn" type="button">
                                                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="item-content">
                                                {/* Delivery History Timeline */}
                                                {hasHistory && (
                                                    <div className="delivery-history">
                                                        <div
                                                            className="history-header"
                                                            onClick={() => toggleHistoryExpanded(aggItem.aggregationKey)}
                                                        >
                                                            <h5 className="history-title">Delivery History</h5>
                                                            <button className="toggle-btn" type="button">
                                                                {isHistoryExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                            </button>
                                                        </div>

                                                        {isHistoryExpanded && (
                                                            <div className="delivery-timeline">
                                                                {deliveries.map((delivery, index) => (
                                                                    <div key={delivery.id} className="timeline-item">
                                                                        <div className="timeline-marker">
                                                                            <div className="marker-dot"></div>
                                                                            {index < deliveries.length - 1 && <div className="marker-line"></div>}
                                                                        </div>

                                                                        <div className="timeline-content">
                                                                            <div className="delivery-card">
                                                                                <div className="delivery-header">
                                                                                    <div className="delivery-icon">
                                                                                        <FiPackage />
                                                                                    </div>
                                                                                    <div className="delivery-info">
                                                                                        <div className="delivery-title">
                                                                                            Delivery #{deliveries.length - index}
                                                                                            {delivery.isRedelivery && <span className="redelivery-badge">Redelivery</span>}
                                                                                        </div>
                                                                                        <div className="delivery-meta">
                                                                                            <span className="meta-item">
                                                                                                <FiClock />
                                                                                                {formatDateTime(delivery.deliveredAt)}
                                                                                            </span>
                                                                                            <span className="meta-item">
                                                                                                <FiUser />
                                                                                                {delivery.processedBy}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="delivery-breakdown">
                                                                                    {delivery.receivedGoodQuantity > 0 && (
                                                                                        <div className="breakdown-row success">
                                                                                            <FiCheckCircle className="row-icon" />
                                                                                            <span className="row-label">Received Good</span>
                                                                                            <span className="row-value">{delivery.receivedGoodQuantity} {unit}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {delivery.issues?.map((issue) => {
                                                                                        const isResolved = issue.issueStatus === 'RESOLVED';
                                                                                        const resolution = isResolved ? getResolutionDisplay(issue.resolutionType) : null;

                                                                                        return (
                                                                                            <div key={issue.id} className={`breakdown-row ${isResolved ? 'resolved' : 'issue'}`}>
                                                                                                <FiAlertCircle className="row-icon" />
                                                                                                <div className="row-details">
                                                                                                    <div className="detail-header">
                                                                                                        <span className="detail-label">{getIssueTypeDisplay(issue.issueType)}</span>
                                                                                                        <span className="detail-value">{issue.affectedQuantity} {unit}</span>
                                                                                                    </div>
                                                                                                    {issue.issueDescription && (
                                                                                                        <div className="detail-description">"{issue.issueDescription}"</div>
                                                                                                    )}
                                                                                                    {isResolved && resolution && (
                                                                                                        <div className="detail-resolution" style={{ color: resolution.color }}>
                                                                                                            <span className="resolution-badge">{resolution.text}</span>
                                                                                                            {issue.resolutionNotes && (
                                                                                                                <span className="resolution-notes"> - {issue.resolutionNotes}</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {/* Total Summary */}
                                                                <div className="timeline-summary">
                                                                    <div className="summary-row">
                                                                        <span className="summary-label">Total Accounted:</span>
                                                                        <span className="summary-value">
                                                                            {status.totalReceived + status.totalIssues} / {status.ordered} {unit}
                                                                        </span>
                                                                    </div>
                                                                    <div className="summary-breakdown">
                                                                        <span className="breakdown-item success">{status.totalReceived} Good</span>
                                                                        {status.totalIssues > 0 && (
                                                                            <span className="breakdown-item warning">{status.totalIssues} Issues</span>
                                                                        )}
                                                                        {status.remaining > 0 && (
                                                                            <span className="breakdown-item neutral">{status.remaining} Remaining</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Current Delivery Processing */}
                                                {!status.isFullyAccounted && isMerchantSelected && (
                                                    <div className="process-delivery">
                                                        <h5 className="section-title">Process Current Delivery</h5>

                                                        {status.useQuickAction ? (
                                                            <>
                                                                <div className="quick-actions">
                                                                    <button
                                                                        type="button"
                                                                        className={`quick-btn success ${status.quickActionType === 'ALL_GOOD' ? 'active' : ''}`}
                                                                        onClick={() => handleQuickAction(aggItem.aggregationKey, 'ALL_GOOD')}
                                                                    >
                                                                        <FiCheckCircle />
                                                                        All Good
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className={`quick-btn warning ${status.quickActionType === 'ALL_DAMAGED' ? 'active' : ''}`}
                                                                        onClick={() => handleQuickAction(aggItem.aggregationKey, 'ALL_DAMAGED')}
                                                                    >
                                                                        <FiAlertCircle />
                                                                        All Damaged
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className={`quick-btn danger ${status.quickActionType === 'NEVER_ARRIVED' ? 'active' : ''}`}
                                                                        onClick={() => handleQuickAction(aggItem.aggregationKey, 'NEVER_ARRIVED')}
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                                        </svg>
                                                                        Never Arrived
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className={`quick-btn info ${status.quickActionType === 'WRONG_ITEM' ? 'active' : ''}`}
                                                                        onClick={() => handleQuickAction(aggItem.aggregationKey, 'WRONG_ITEM')}
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <circle cx="12" cy="12" r="10" />
                                                                            <line x1="15" y1="9" x2="9" y2="15" />
                                                                            <line x1="9" y1="9" x2="15" y2="15" />
                                                                        </svg>
                                                                        Wrong Item
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="switch-mode-btn"
                                                                    onClick={() => handleSwitchToMore(aggItem.aggregationKey)}
                                                                >
                                                                    Use Detailed Breakdown
                                                                </button>

                                                                {status.hasIssues && (
                                                                    <div className="issue-notes">
                                                                        <label>
                                                                            Issue Details <span className="required">*</span>
                                                                        </label>
                                                                        <textarea
                                                                            value={status.issueNotes}
                                                                            onChange={(e) => handleIssueNotesChange(aggItem.aggregationKey, e.target.value)}
                                                                            placeholder="Describe the issue in detail..."
                                                                            rows={3}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="detailed-breakdown">
                                                                    <div className="breakdown-grid">
                                                                        <div className="input-group success">
                                                                            <label>
                                                                                <FiCheckCircle />
                                                                                Received Good
                                                                            </label>
                                                                            <div className="input-wrapper">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={status.receivedGood || ''}
                                                                                    onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'receivedGood', e.target.value)}
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="unit">{unit}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="input-group warning">
                                                                            <label>
                                                                                <FiAlertCircle />
                                                                                Damaged
                                                                            </label>
                                                                            <div className="input-wrapper">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={status.damaged || ''}
                                                                                    onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'damaged', e.target.value)}
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="unit">{unit}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="input-group danger">
                                                                            <label>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                                                </svg>
                                                                                Never Arrived
                                                                            </label>
                                                                            <div className="input-wrapper">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={status.notArrived || ''}
                                                                                    onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'notArrived', e.target.value)}
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="unit">{unit}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="input-group info">
                                                                            <label>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <circle cx="12" cy="12" r="10" />
                                                                                    <line x1="15" y1="9" x2="9" y2="15" />
                                                                                    <line x1="9" y1="9" x2="15" y2="15" />
                                                                                </svg>
                                                                                Wrong Item
                                                                            </label>
                                                                            <div className="input-wrapper">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={status.wrongItem || ''}
                                                                                    onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'wrongItem', e.target.value)}
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="unit">{unit}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="input-group neutral">
                                                                            <label>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <circle cx="12" cy="12" r="10" />
                                                                                    <line x1="12" y1="16" x2="12" y2="12" />
                                                                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                                                                </svg>
                                                                                Other
                                                                            </label>
                                                                            <div className="input-wrapper">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={status.other || ''}
                                                                                    onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'other', e.target.value)}
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="unit">{unit}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        className="switch-mode-btn"
                                                                        onClick={() => {
                                                                            setItemStatuses(prev => ({
                                                                                ...prev,
                                                                                [aggItem.aggregationKey]: {
                                                                                    ...prev[aggItem.aggregationKey],
                                                                                    useQuickAction: true,
                                                                                    quickActionType: null,
                                                                                    receivedGood: 0,
                                                                                    damaged: 0,
                                                                                    notArrived: 0,
                                                                                    wrongItem: 0,
                                                                                    other: 0,
                                                                                    totalAccountedFor: 0,
                                                                                    isValid: false,
                                                                                    issueNotes: "",
                                                                                    hasIssues: false
                                                                                }
                                                                            }));
                                                                        }}
                                                                    >
                                                                        ← Back to Quick Actions
                                                                    </button>
                                                                </div>

                                                                {status.hasIssues && (
                                                                    <div className="issue-notes">
                                                                        <label>
                                                                            Issue Details <span className="required">*</span>
                                                                        </label>
                                                                        <textarea
                                                                            value={status.issueNotes}
                                                                            onChange={(e) => handleIssueNotesChange(aggItem.aggregationKey, e.target.value)}
                                                                            placeholder="Describe the issue(s) in detail..."
                                                                            rows={3}
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className={`validation-summary ${status.isValid ? 'valid' : status.totalAccountedFor > 0 ? 'partial' : ''}`}>
                                                                    <span className="summary-label">Total Accounted:</span>
                                                                    <span className="summary-value">
                                                                        {status.totalAccountedFor} / {status.remaining} {unit}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Footer */}
            {hasItemsToProcess && (
                <div className="action-footer">
                    <div className="footer-status">
                        {selectedMerchantCount === 0 ? (
                            <span className="status-message warning">
                                <FiAlertCircle />
                                Select a merchant to process their delivery
                            </span>
                        ) : canSubmit() ? (
                            <span className="status-message success">
                                <FiCheckCircle />
                                Ready to submit - {selectedMerchantCount} merchant{selectedMerchantCount !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className="status-message warning">
                                <FiAlertCircle />
                                Complete all items from selected merchants
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canSubmit()}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="spinner-small"></div>
                                Processing...
                            </>
                        ) : isRedeliveryMode ? (
                            <>
                                <FiCheckCircle />
                                Complete Redelivery ({selectedRedeliveryIssues.length} issues)
                            </>
                        ) : (
                            <>
                                <FiCheckCircle />
                                Complete Delivery
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReceivingTab;