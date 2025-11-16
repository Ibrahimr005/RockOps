import React, { useState, useEffect } from "react";
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import "./ProcessDeliveryModal.scss";

const ProcessDeliveryModal = ({ purchaseOrder, isOpen, onClose, onSubmit }) => {
    const [itemStatuses, setItemStatuses] = useState({});
    const [generalNotes, setGeneralNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedItems, setSelectedItems] = useState({});
    const [aggregatedItems, setAggregatedItems] = useState([]);
    const [isLoadingIssues, setIsLoadingIssues] = useState(false);
    const [issuesDetails, setIssuesDetails] = useState({}); // Store detailed issues per item

    /**
     * Fetch issues for the PO and calculate remaining quantities
     */
    const fetchIssuesAndInitialize = async (aggregated) => {
        setIsLoadingIssues(true);
        try {
            // Fetch issues for this PO
            const data = await purchaseOrderService.getIssues(purchaseOrder.id);

            const issues = data.issues || [];

            console.log('Fetched issues for modal:', issues);

            // Group issues by purchaseOrderItemId
            const issuesByItemId = {};
            issues.forEach(issue => {
                if (!issuesByItemId[issue.purchaseOrderItemId]) {
                    issuesByItemId[issue.purchaseOrderItemId] = [];
                }
                issuesByItemId[issue.purchaseOrderItemId].push(issue);
            });

            // Initialize item statuses with issue-aware remaining calculation
            const initialStatuses = {};
            const initialExpanded = {};
            const initialSelected = {};
            const detailedIssues = {};

            aggregated.forEach(aggItem => {
                const alreadyReceived = aggItem.receivedQuantity;
                const ordered = aggItem.quantity;

                // Calculate total issues for this aggregated group and store details
                let totalIssueQuantity = 0;
                const itemIssuesList = [];

                aggItem.originalItems.forEach(originalItem => {
                    const itemIssues = issuesByItemId[originalItem.id] || [];
                    itemIssues.forEach(issue => {
                        if (issue.affectedQuantity) {
                            totalIssueQuantity += issue.affectedQuantity;
                            itemIssuesList.push(issue);
                        }
                    });
                });

                // Store detailed issues for this aggregated item
                detailedIssues[aggItem.aggregationKey] = itemIssuesList;

                // CORRECT CALCULATION: remaining = ordered - received - issues
                const remaining = ordered - alreadyReceived - totalIssueQuantity;

                console.log(`Item: ${aggItem.itemType?.name || 'Unknown'}`);
                console.log(`  Ordered: ${ordered}`);
                console.log(`  Received Good: ${alreadyReceived}`);
                console.log(`  Total Issues: ${totalIssueQuantity}`);
                console.log(`  Remaining: ${remaining}`);

                initialStatuses[aggItem.aggregationKey] = {
                    ordered: ordered,
                    alreadyReceived: alreadyReceived,
                    totalIssues: totalIssueQuantity,
                    remaining: Math.max(0, remaining),
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: remaining <= 0, // If nothing remaining, it's already valid
                    issueNotes: "",
                    hasIssues: false,
                    isOverDelivery: false,
                    overDeliveryAmount: 0,
                    isFullyAccounted: remaining <= 0
                };

                initialExpanded[aggItem.aggregationKey] = false;
                initialSelected[aggItem.aggregationKey] = false;
            });

            setIssuesDetails(detailedIssues);
            setItemStatuses(initialStatuses);
            setExpandedItems(initialExpanded);
            setSelectedItems(initialSelected);

        } catch (error) {
            console.error('Error fetching issues:', error);

            // Fallback: Initialize without issues data
            const initialStatuses = {};
            const initialExpanded = {};
            const initialSelected = {};

            aggregated.forEach(aggItem => {
                const alreadyReceived = aggItem.receivedQuantity;
                const ordered = aggItem.quantity;
                const remaining = ordered - alreadyReceived;

                initialStatuses[aggItem.aggregationKey] = {
                    ordered: ordered,
                    alreadyReceived: alreadyReceived,
                    totalIssues: 0,
                    remaining: remaining,
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: remaining <= 0,
                    issueNotes: "",
                    hasIssues: false,
                    isOverDelivery: false,
                    overDeliveryAmount: 0,
                    isFullyAccounted: remaining <= 0
                };

                initialExpanded[aggItem.aggregationKey] = false;
                initialSelected[aggItem.aggregationKey] = false;
            });

            setIssuesDetails({});
            setItemStatuses(initialStatuses);
            setExpandedItems(initialExpanded);
            setSelectedItems(initialSelected);
        } finally {
            setIsLoadingIssues(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");

            console.log('=== PURCHASE ORDER FULL STRUCTURE ===');
            console.log('Purchase Order:', purchaseOrder);
            console.log('Purchase Order Items:', purchaseOrder?.purchaseOrderItems);
            console.log('======================================');

            // Aggregate items by itemType and merchant
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
                        existing.receivedQuantity += (item.receivedQuantity || 0);
                    } else {
                        aggregationMap.set(key, {
                            aggregationKey: key,
                            itemType: item.itemType || item.offerItem?.requestOrderItem?.itemType,
                            itemTypeName: item.itemTypeName,
                            merchant: item.merchant,
                            quantity: item.quantity,
                            receivedQuantity: item.receivedQuantity || 0,
                            originalItems: [item],
                            itemCategory: item.itemType?.itemCategory?.name ||
                                item.itemType?.category?.name ||
                                item.offerItem?.requestOrderItem?.itemType?.category?.name ||
                                item.itemCategory
                        });
                    }
                });

                const aggregated = Array.from(aggregationMap.values());
                setAggregatedItems(aggregated);

                // Fetch issues and initialize with correct remaining quantities
                fetchIssuesAndInitialize(aggregated);
            }
            setGeneralNotes("");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen, purchaseOrder]);

    if (!isOpen || !purchaseOrder) return null;

    // Helper functions
    const getItemName = (aggItem) => {
        return aggItem.itemType?.name ||
            aggItem.itemTypeName ||
            "Unknown Item";
    };

    const getItemCategory = (aggItem) => {
        return aggItem.itemCategory;
    };

    const formatQuantity = (quantity, aggItem) => {
        const unit = aggItem.itemType?.measuringUnit || 'units';
        return `${quantity} ${unit}`;
    };

    const getUnit = (aggItem) => {
        return aggItem.itemType?.measuringUnit || 'units';
    };

    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Get issue type display
    const getIssueTypeDisplay = (issueType) => {
        const typeMap = {
            'DAMAGED': 'Damaged',
            'NEVER_ARRIVED': 'Never Arrived',
            'WRONG_ITEM': 'Wrong Item',
            'OTHER': 'Other Issue'
        };
        return typeMap[issueType] || issueType;
    };

    // Handle quantity change for any field
    const handleQuantityChange = (aggregationKey, field, value) => {
        const numValue = parseInt(value) || 0;

        setItemStatuses(prev => {
            const current = prev[aggregationKey];
            const newStatus = {
                ...current,
                [field]: Math.max(0, numValue)
            };

            // Calculate total accounted for
            newStatus.totalAccountedFor =
                newStatus.receivedGood +
                newStatus.damaged +
                newStatus.neverArrived +
                newStatus.wrongItem +
                newStatus.other;

            // Allow over-delivery for receivedGood field
            if (field === 'receivedGood' && newStatus.receivedGood > current.remaining) {
                newStatus.isValid = true;
                newStatus.isOverDelivery = true;
                newStatus.overDeliveryAmount = newStatus.receivedGood - current.remaining;
            } else {
                newStatus.isValid = newStatus.totalAccountedFor > 0 && newStatus.totalAccountedFor <= current.remaining;
                newStatus.isOverDelivery = false;
                newStatus.overDeliveryAmount = 0;
            }

            // Check if there are any issues
            newStatus.hasIssues =
                newStatus.damaged > 0 ||
                newStatus.neverArrived > 0 ||
                newStatus.wrongItem > 0 ||
                newStatus.other > 0;

            return {
                ...prev,
                [aggregationKey]: newStatus
            };
        });
    };

    // Handle issue notes change
    const handleIssueNotesChange = (aggregationKey, notes) => {
        setItemStatuses(prev => ({
            ...prev,
            [aggregationKey]: {
                ...prev[aggregationKey],
                issueNotes: notes
            }
        }));
    };

    // Quick action: Mark all as received good
    const handleMarkAllGood = (aggregationKey) => {
        const status = itemStatuses[aggregationKey];

        if (status.receivedGood === status.remaining && !status.hasIssues) {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: status.isFullyAccounted,
                    hasIssues: false,
                    issueNotes: ""
                }
            }));
        } else {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: status.remaining,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: status.remaining,
                    isValid: true,
                    hasIssues: false,
                    issueNotes: ""
                }
            }));
        }
    };

    // Quick action: Mark all as damaged
    const handleMarkAllDamaged = (aggregationKey) => {
        const status = itemStatuses[aggregationKey];

        if (status.damaged === status.remaining && status.damaged > 0) {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: status.isFullyAccounted,
                    hasIssues: false,
                    issueNotes: ""
                }
            }));
        } else {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: status.remaining,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: status.remaining,
                    isValid: true,
                    hasIssues: true
                }
            }));
        }
    };

    // Quick action: Mark all as never arrived
    const handleMarkAllMissing = (aggregationKey) => {
        const status = itemStatuses[aggregationKey];

        if (status.neverArrived === status.remaining && status.neverArrived > 0) {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: status.isFullyAccounted,
                    hasIssues: false,
                    issueNotes: ""
                }
            }));
        } else {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: status.remaining,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: status.remaining,
                    isValid: true,
                    hasIssues: true
                }
            }));
        }
    };

    // Quick action: Mark all as wrong item
    const handleMarkAllWrongItem = (aggregationKey) => {
        const status = itemStatuses[aggregationKey];

        if (status.wrongItem === status.remaining && status.wrongItem > 0) {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: 0,
                    other: 0,
                    totalAccountedFor: 0,
                    isValid: status.isFullyAccounted,
                    hasIssues: false,
                    issueNotes: ""
                }
            }));
        } else {
            setItemStatuses(prev => ({
                ...prev,
                [aggregationKey]: {
                    ...prev[aggregationKey],
                    receivedGood: 0,
                    damaged: 0,
                    neverArrived: 0,
                    wrongItem: status.remaining,
                    other: 0,
                    totalAccountedFor: status.remaining,
                    isValid: true,
                    hasIssues: true
                }
            }));
        }
    };

    // Toggle item selection
    const toggleItemSelection = (aggregationKey) => {
        const status = itemStatuses[aggregationKey];

        // Don't allow selection if fully accounted
        if (status.isFullyAccounted) {
            return;
        }

        setSelectedItems(prev => ({
            ...prev,
            [aggregationKey]: !prev[aggregationKey]
        }));
    };

    // Toggle expanded state for issue details
    const toggleExpanded = (aggregationKey) => {
        setExpandedItems(prev => ({
            ...prev,
            [aggregationKey]: !prev[aggregationKey]
        }));
    };

    // Check if can submit
    const canSubmit = () => {
        const selectedItemEntries = Object.entries(itemStatuses).filter(
            ([aggregationKey, _]) => selectedItems[aggregationKey]
        );

        if (selectedItemEntries.length === 0) {
            return false;
        }

        const allSelectedValid = selectedItemEntries.every(([_, status]) => status.isValid);

        const allSelectedIssuesHaveNotes = selectedItemEntries.every(([_, status]) => {
            if (status.hasIssues) {
                return status.issueNotes.trim().length > 0;
            }
            return true;
        });

        return allSelectedValid && allSelectedIssuesHaveNotes;
    };

    // Get validation summary
    const getValidationSummary = () => {
        const selectedItemEntries = Object.entries(itemStatuses).filter(
            ([aggregationKey, _]) => selectedItems[aggregationKey]
        );

        const invalidItems = selectedItemEntries.filter(([_, status]) => !status.isValid);
        const itemsWithIssues = selectedItemEntries.filter(([_, status]) => status.hasIssues);
        const itemsWithIssuesButNoNotes = itemsWithIssues.filter(
            ([_, status]) => !status.issueNotes.trim()
        );

        return {
            selectedCount: selectedItemEntries.length,
            invalidItems,
            itemsWithIssues,
            itemsWithIssuesButNoNotes,
            isValid: selectedItemEntries.length > 0 && invalidItems.length === 0 && itemsWithIssuesButNoNotes.length === 0
        };
    };

    // Get card class based on status
    const getCardClass = (aggregationKey, status) => {
        const isSelected = selectedItems[aggregationKey];

        let baseClass = '';

        if (status.isFullyAccounted) {
            baseClass = 'fully-accounted';
        } else if (!status.isValid) {
            baseClass = 'invalid';
        } else if (status.isOverDelivery) {
            baseClass = 'over-delivery';
        } else if (status.receivedGood === status.remaining && !status.hasIssues) {
            baseClass = 'all-good';
        } else if (status.damaged === status.remaining && status.damaged > 0) {
            baseClass = 'all-damaged';
        } else if (status.neverArrived === status.remaining && status.neverArrived > 0) {
            baseClass = 'all-missing';
        } else if (status.wrongItem === status.remaining && status.wrongItem > 0) {
            baseClass = 'all-wrong-item';
        } else if (status.hasIssues) {
            baseClass = 'has-issues';
        } else {
            baseClass = 'valid';
        }

        return `${baseClass} ${isSelected ? 'selected' : 'not-selected'}`;
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (isSubmitting || !canSubmit()) return;

        setIsSubmitting(true);
        try {
            const items = [];

            Object.entries(itemStatuses)
                .filter(([aggregationKey, _]) => selectedItems[aggregationKey])
                .forEach(([aggregationKey, status]) => {
                    const aggItem = aggregatedItems.find(item => item.aggregationKey === aggregationKey);

                    if (!aggItem) return;

                    const totalOriginalQuantity = aggItem.quantity;

                    aggItem.originalItems.forEach(originalItem => {
                        const proportion = originalItem.quantity / totalOriginalQuantity;
                        const receivedGood = Math.round(status.receivedGood * proportion);

                        items.push({
                            purchaseOrderItemId: originalItem.id,
                            receivedGood: receivedGood,
                            issues: []
                        });
                    });

                    // Create ONE issue per type for the FIRST item in the aggregated group
                    if (aggItem.originalItems.length > 0 && status.hasIssues) {
                        const firstItem = aggItem.originalItems[0];
                        const itemEntry = items.find(i => i.purchaseOrderItemId === firstItem.id);

                        if (itemEntry) {
                            itemEntry.issues = [
                                status.damaged > 0 && {
                                    type: 'DAMAGED',
                                    quantity: status.damaged,
                                    notes: status.issueNotes
                                },
                                status.neverArrived > 0 && {
                                    type: 'NEVER_ARRIVED',
                                    quantity: status.neverArrived,
                                    notes: status.issueNotes
                                },
                                status.wrongItem > 0 && {
                                    type: 'WRONG_ITEM',
                                    quantity: status.wrongItem,
                                    notes: status.issueNotes
                                },
                                status.other > 0 && {
                                    type: 'OTHER',
                                    quantity: status.other,
                                    notes: status.issueNotes
                                }
                            ].filter(Boolean);
                        }
                    }
                });

            const submissionData = {
                purchaseOrderId: purchaseOrder.id,
                items: items,
                generalNotes: generalNotes,
                receivedAt: new Date().toISOString()
            };

            console.log('Submitting delivery processing:', submissionData);

            if (onSubmit) {
                await onSubmit(submissionData);
            }

            onClose();
        } catch (error) {
            console.error('Error processing delivery:', error);
            alert('Failed to process delivery. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const validation = getValidationSummary();
    const totalItems = aggregatedItems.length;
    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    const validItems = Object.values(itemStatuses).filter(s => s.isValid).length;
    const itemsWithIssues = Object.values(itemStatuses).filter(s => s.hasIssues).length;
    const fullyAccountedCount = Object.values(itemStatuses).filter(s => s.isFullyAccounted).length;
    const hasItemsToProcess = Object.values(itemStatuses).some(s => !s.isFullyAccounted);

    return (
        <div className="process-delivery-modal-overlay" onClick={onClose}>
            <div className="process-delivery-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="process-delivery-modal-header">
                    <div className="process-delivery-modal-header-content">
                        <div className="process-delivery-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 3h5v5"/>
                                <path d="M8 3H3v5"/>
                                <path d="M12 22v-8"/>
                                <path d="M16 18l-4 4-4-4"/>
                                <path d="M3 8l9-5 9 5"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="process-delivery-modal-title">Process Delivery</h2>
                            <div className="process-delivery-modal-po-number">
                                PO #{purchaseOrder.poNumber}
                            </div>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="process-delivery-modal-content">
                    {/* Instructions Banner */}
                    <div className="process-delivery-instructions">
                        <div className="instruction-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div className="instruction-text">
                            <p>
                                <strong>Partial delivery?</strong> No problem! Select only the items that arrived,
                                account for their quantities, and submit. You can process remaining items later.
                                Items with the same type and merchant are grouped together.
                            </p>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoadingIssues && (
                        <div className="process-delivery-loading">
                            <div className="spinner"></div>
                            <p>Loading previous delivery data...</p>
                        </div>
                    )}

                    {/* Summary Section */}
                    {!isLoadingIssues && (
                        <div className="process-delivery-summary">
                            <div className="summary-item">
                                <span className="summary-label">Total Items:</span>
                                <span className="summary-value">{totalItems}</span>
                            </div>
                            {fullyAccountedCount > 0 && (
                                <div className="summary-item success">
                                    <span className="summary-label">Fully Accounted:</span>
                                    <span className="summary-value">{fullyAccountedCount} / {totalItems}</span>
                                </div>
                            )}
                            {hasItemsToProcess && (
                                <>
                                    <div className="summary-item highlight">
                                        <span className="summary-label">Selected:</span>
                                        <span className="summary-value">{selectedCount} / {totalItems - fullyAccountedCount}</span>
                                    </div>
                                    {itemsWithIssues > 0 && (
                                        <div className="summary-item highlight">
                                            <span className="summary-label">Items with Issues:</span>
                                            <span className="summary-value">{itemsWithIssues}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* All Items Fully Accounted Message */}
                    {!isLoadingIssues && !hasItemsToProcess && (
                        <div className="all-items-complete">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <h3>All Items Fully Accounted!</h3>
                            <p>All items in this purchase order have been received or have reported issues.</p>
                            <p className="subtitle">You can view the complete delivery history below.</p>
                        </div>
                    )}

                    {/* Items Section */}
                    {!isLoadingIssues && (
                        <div className="process-delivery-items-section">
                            <h3 className="section-title">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                </svg>
                                Purchase Order Items
                            </h3>

                            {aggregatedItems && aggregatedItems.length > 0 ? (
                                <div className="process-delivery-items-list">
                                    {aggregatedItems.map((aggItem, index) => {
                                        const status = itemStatuses[aggItem.aggregationKey] || {
                                            ordered: aggItem.quantity,
                                            alreadyReceived: 0,
                                            totalIssues: 0,
                                            remaining: aggItem.quantity,
                                            receivedGood: 0,
                                            damaged: 0,
                                            neverArrived: 0,
                                            wrongItem: 0,
                                            other: 0,
                                            totalAccountedFor: 0,
                                            isValid: false,
                                            issueNotes: "",
                                            hasIssues: false,
                                            isOverDelivery: false,
                                            overDeliveryAmount: 0,
                                            isFullyAccounted: false
                                        };

                                        const isExpanded = expandedItems[aggItem.aggregationKey];
                                        const isSelected = selectedItems[aggItem.aggregationKey];
                                        const unit = getUnit(aggItem);
                                        const cardClass = getCardClass(aggItem.aggregationKey, status);
                                        const category = getItemCategory(aggItem);
                                        const merchant = aggItem.merchant?.name;
                                        const itemIssues = issuesDetails[aggItem.aggregationKey] || [];

                                        return (
                                            <div
                                                key={aggItem.aggregationKey}
                                                className={`process-delivery-item-card ${cardClass}`}
                                            >
                                                {/* Item Header with Custom Checkbox */}
                                                <div className="item-card-header">
                                                    <div className="item-selection">
                                                        <label className={`custom-checkbox ${status.isFullyAccounted ? 'disabled' : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleItemSelection(aggItem.aggregationKey)}
                                                                disabled={status.isFullyAccounted}
                                                            />
                                                            <span className="checkbox-custom">
                                                                {status.isFullyAccounted ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                        <path d="M20 6L9 17l-5-5" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                    </svg>
                                                                )}
                                                            </span>
                                                        </label>

                                                        <div className="item-info">
                                                            <div className="item-icon-container">
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                                </svg>
                                                            </div>
                                                            <div className="item-details">
                                                                <div className="item-name">{getItemName(aggItem)}</div>

                                                                {/* Professional metadata layout */}
                                                                <div className="item-metadata-container">
                                                                    {/* Primary Info Row - Quantities */}
                                                                    <div className="metadata-row primary">
                                                                        <div className="metadata-group">
                                                                            <span className="metadata-text">
                                                                                <span className="metadata-key">Ordered:</span>
                                                                                <span className="metadata-value">{formatQuantity(status.ordered, aggItem)}</span>
                                                                            </span>

                                                                            {status.alreadyReceived > 0 && (
                                                                                <>
                                                                                    <span className="metadata-separator">·</span>
                                                                                    <span className="metadata-text">
                                                                                        <span className="metadata-key">Received:</span>
                                                                                        <span className="metadata-value received">{formatQuantity(status.alreadyReceived, aggItem)}</span>
                                                                                    </span>
                                                                                </>
                                                                            )}

                                                                            {status.totalIssues > 0 && (
                                                                                <>
                                                                                    <span className="metadata-separator">·</span>
                                                                                    <span className="metadata-text issues">
                                                                                        <span className="metadata-key">Issues:</span>
                                                                                        <span className="metadata-value">{formatQuantity(status.totalIssues, aggItem)}</span>
                                                                                    </span>
                                                                                </>
                                                                            )}

                                                                            <span className="metadata-separator">·</span>
                                                                            <span className={`metadata-text remaining ${status.isFullyAccounted ? 'complete' : ''}`}>
                                                                                <span className="metadata-key">Remaining:</span>
                                                                                <span className="metadata-value">{formatQuantity(status.remaining, aggItem)}</span>
                                                                            </span>

                                                                            {status.isOverDelivery && (
                                                                                <>
                                                                                    <span className="metadata-separator">·</span>
                                                                                    <span className="metadata-text over-delivery">
                                                                                        <span className="metadata-key">Extra:</span>
                                                                                        <span className="metadata-value">+{status.overDeliveryAmount} {unit}</span>
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Secondary Info Row - Category & Merchant */}
                                                                    {(category || merchant || aggItem.originalItems.length > 1) && (
                                                                        <div className="metadata-row secondary">
                                                                            <div className="metadata-group">
                                                                                {category && (
                                                                                    <span className="metadata-text muted">
                                                                                        <span className="metadata-key">Category:</span>
                                                                                        <span className="metadata-value">{category}</span>
                                                                                    </span>
                                                                                )}

                                                                                {merchant && (
                                                                                    <>
                                                                                        {category && <span className="metadata-separator">·</span>}
                                                                                        <span className="metadata-text muted">
                                                                                            <span className="metadata-key">Merchant:</span>
                                                                                            <span className="metadata-value">{merchant}</span>
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="item-validation">
                                                        {status.isFullyAccounted ? (
                                                            <span className="validation-badge complete">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M20 6L9 17l-5-5" />
                                                                </svg>
                                                                Fully Accounted
                                                            </span>
                                                        ) : status.isValid ? (
                                                            <span className="validation-badge valid">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M20 6L9 17l-5-5" />
                                                                </svg>
                                                                Complete
                                                            </span>
                                                        ) : (
                                                            <span className="validation-badge invalid">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="10"/>
                                                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                                                </svg>
                                                                {status.totalAccountedFor} / {status.remaining}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Previous Deliveries Summary - Show if there's any history */}
                                                {(status.alreadyReceived > 0 || status.totalIssues > 0) && (
                                                    <div className="previous-deliveries-summary">
                                                        <div className="summary-header">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                            </svg>
                                                            <h4>Previously Processed</h4>
                                                        </div>

                                                        {status.alreadyReceived > 0 && (
                                                            <div className="previous-item success">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M20 6L9 17l-5-5" />
                                                                </svg>
                                                                <span>Received Good: <strong>{status.alreadyReceived} {unit}</strong></span>
                                                            </div>
                                                        )}

                                                        {itemIssues.length > 0 && (
                                                            <div className="previous-issues-list">
                                                                {itemIssues.map((issue, idx) => (
                                                                    <div key={idx} className="previous-item warning">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                                                            <line x1="12" y1="9" x2="12" y2="13"/>
                                                                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                                                                        </svg>
                                                                        <div className="issue-details">
                                                                            <span className="issue-type">{getIssueTypeDisplay(issue.issueType)}: <strong>{issue.affectedQuantity} {unit}</strong></span>
                                                                            {issue.issueDescription && (
                                                                                <span className="issue-description">"{issue.issueDescription}"</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {status.isFullyAccounted && (
                                                            <div className="fully-accounted-notice">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M20 6L9 17l-5-5" />
                                                                </svg>
                                                                <span>All {status.ordered} {unit} accounted for</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Quick Actions - Only show if item is selected AND has remaining */}
                                                {isSelected && !status.isFullyAccounted && (
                                                    <div className="quick-actions">
                                                        <button
                                                            type="button"
                                                            className="quick-action-btn success"
                                                            onClick={() => handleMarkAllGood(aggItem.aggregationKey)}
                                                            title="Mark all as received in good condition"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                            All Good
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="quick-action-btn warning"
                                                            onClick={() => handleMarkAllDamaged(aggItem.aggregationKey)}
                                                            title="Mark all as damaged"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                                                <line x1="12" y1="9" x2="12" y2="13"/>
                                                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                                                            </svg>
                                                            All Damaged
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="quick-action-btn danger"
                                                            onClick={() => handleMarkAllMissing(aggItem.aggregationKey)}
                                                            title="Mark all as never arrived"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <line x1="18" y1="6" x2="6" y2="18"/>
                                                                <line x1="6" y1="6" x2="18" y2="18"/>
                                                            </svg>
                                                            Never Arrived
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="quick-action-btn wrong-item"
                                                            onClick={() => handleMarkAllWrongItem(aggItem.aggregationKey)}
                                                            title="Mark all as wrong item received"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10"/>
                                                                <line x1="15" y1="9" x2="9" y2="15"/>
                                                                <line x1="9" y1="9" x2="15" y2="15"/>
                                                            </svg>
                                                            All Wrong Item
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`quick-action-btn expand ${isExpanded ? 'active' : ''}`}
                                                            onClick={() => toggleExpanded(aggItem.aggregationKey)}
                                                            title="Show detailed options"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d={isExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
                                                            </svg>
                                                            {isExpanded ? 'Less' : 'More'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Fully Accounted Message - Show when item is done */}
                                                {status.isFullyAccounted && isSelected && (
                                                    <div className="fully-accounted-message">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M20 6L9 17l-5-5" />
                                                        </svg>
                                                        <p>This item has been fully accounted for. No further processing needed.</p>
                                                    </div>
                                                )}

                                                {/* Detailed Quantity Inputs - Only show if item is selected AND has remaining */}
                                                {isSelected && !status.isFullyAccounted && (
                                                    <div className={`item-quantities ${isExpanded ? 'expanded' : ''}`}>
                                                        <div className="quantity-divider"></div>

                                                        <div className="quantity-grid">
                                                            {/* Received Good */}
                                                            <div className="quantity-field success-field">
                                                                <label className="quantity-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M20 6L9 17l-5-5" />
                                                                    </svg>
                                                                    Received Good:
                                                                </label>
                                                                <div className="quantity-input-group">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={status.receivedGood || ''}
                                                                        onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'receivedGood', e.target.value)}
                                                                        className="quantity-input"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="quantity-unit">{unit}</span>
                                                                </div>
                                                            </div>

                                                            {/* Damaged */}
                                                            <div className="quantity-field warning-field">
                                                                <label className="quantity-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                                                        <line x1="12" y1="9" x2="12" y2="13"/>
                                                                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                                                                    </svg>
                                                                    Damaged:
                                                                </label>
                                                                <div className="quantity-input-group">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={status.remaining}
                                                                        value={status.damaged || ''}
                                                                        onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'damaged', e.target.value)}
                                                                        className="quantity-input"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="quantity-unit">{unit}</span>
                                                                </div>
                                                            </div>

                                                            {/* Never Arrived */}
                                                            <div className="quantity-field danger-field">
                                                                <label className="quantity-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                                                    </svg>
                                                                    Never Arrived:
                                                                </label>
                                                                <div className="quantity-input-group">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={status.remaining}
                                                                        value={status.neverArrived || ''}
                                                                        onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'neverArrived', e.target.value)}
                                                                        className="quantity-input"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="quantity-unit">{unit}</span>
                                                                </div>
                                                            </div>

                                                            {/* Wrong Item */}
                                                            <div className="quantity-field">
                                                                <label className="quantity-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10"/>
                                                                        <line x1="15" y1="9" x2="9" y2="15"/>
                                                                        <line x1="9" y1="9" x2="15" y2="15"/>
                                                                    </svg>
                                                                    Wrong Item:
                                                                </label>
                                                                <div className="quantity-input-group">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={status.remaining}
                                                                        value={status.wrongItem || ''}
                                                                        onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'wrongItem', e.target.value)}
                                                                        className="quantity-input"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="quantity-unit">{unit}</span>
                                                                </div>
                                                            </div>

                                                            {/* Other Issues */}
                                                            <div className="quantity-field">
                                                                <label className="quantity-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10"/>
                                                                        <line x1="12" y1="16" x2="12" y2="12"/>
                                                                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                                                                    </svg>
                                                                    Other Issues:
                                                                </label>
                                                                <div className="quantity-input-group">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={status.remaining}
                                                                        value={status.other || ''}
                                                                        onChange={(e) => handleQuantityChange(aggItem.aggregationKey, 'other', e.target.value)}
                                                                        className="quantity-input"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="quantity-unit">{unit}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Issue Notes - Only show if there are issues */}
                                                        {status.hasIssues && (
                                                            <div className="issue-notes-section">
                                                                <label className="issue-notes-label">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                                    </svg>
                                                                    Issue Details <span className="required">*</span>
                                                                </label>
                                                                <textarea
                                                                    className="issue-notes-textarea"
                                                                    placeholder="Describe the issue(s) in detail..."
                                                                    value={status.issueNotes}
                                                                    onChange={(e) => handleIssueNotesChange(aggItem.aggregationKey, e.target.value)}
                                                                    rows={3}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Total Accounted Display */}
                                                        <div className={`total-accounted ${status.isValid ? 'valid' : 'invalid'} ${status.isOverDelivery ? 'over-delivery' : ''}`}>
                                                            <span className="total-label">
                                                                {status.isOverDelivery ? 'Total Received:' : 'Total Accounted:'}
                                                            </span>
                                                            <span className="total-value">
                                                                {status.isOverDelivery
                                                                    ? `${status.receivedGood} ${unit}`
                                                                    : `${status.totalAccountedFor} / ${status.remaining} ${unit}`}
                                                            </span>
                                                            {status.isOverDelivery && (
                                                                <span className="total-hint over-delivery-hint">
                                                                    +{status.overDeliveryAmount} {unit} more than ordered
                                                                </span>
                                                            )}
                                                            {!status.isValid && !status.isOverDelivery && status.totalAccountedFor > 0 && (
                                                                <span className="total-hint">
                                                                    {status.totalAccountedFor < status.remaining
                                                                        ? `${status.remaining - status.totalAccountedFor} ${unit} still unaccounted`
                                                                        : `${status.totalAccountedFor - status.remaining} ${unit} over limit`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="no-items">
                                    <p>No items found in this purchase order.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* General Notes Section */}
                    {hasItemsToProcess && (
                        <div className="general-notes-section">
                            <label className="general-notes-label">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <path d="M14 2v6h6"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <path d="M10 9H8"/>
                                </svg>
                                General Delivery Notes (Optional)
                            </label>
                            <textarea
                                className="general-notes-textarea"
                                placeholder="Add any general notes about this delivery (e.g., driver name, delivery time, packaging condition...)"
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="process-delivery-modal-footer">
                    <div className="footer-info">
                        {!hasItemsToProcess ? (
                            <span className="footer-status success">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                All items have been fully accounted for
                            </span>
                        ) : validation.selectedCount === 0 ? (
                            <span className="footer-status warning">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                Select at least one item to process
                            </span>
                        ) : validation.isValid ? (
                            <span className="footer-status ready">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Ready to complete - {validation.selectedCount} item{validation.selectedCount !== 1 ? 's' : ''} selected and accounted for
                            </span>
                        ) : (
                            <span className="footer-status warning">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {validation.invalidItems.length > 0
                                    ? `${validation.invalidItems.length} selected item(s) not fully accounted for`
                                    : `${validation.itemsWithIssuesButNoNotes.length} selected item(s) with issues need details`}
                            </span>
                        )}
                    </div>
                    <div className="footer-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {hasItemsToProcess ? 'Cancel' : 'Close'}
                        </button>
                        {hasItemsToProcess && (
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !canSubmit() || isLoadingIssues}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="process-delivery-spinner"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        Complete Delivery Processing ({validation.selectedCount})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcessDeliveryModal;