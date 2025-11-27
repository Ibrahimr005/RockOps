import React, { useState, useMemo } from 'react';
import { FiPackage, FiTruck, FiAlertCircle, FiChevronDown, FiChevronUp, FiCheck, FiClock, FiCheckCircle, FiBox, FiPhone, FiMail, FiMapPin,FiFilter } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderService } from '../../../../../services/procurement/purchaseOrderService';
import './ReceivingTab2.scss';

const ReceivingTab = ({ purchaseOrder, onSuccess, onError }) => {
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [itemData, setItemData] = useState({});
    const [expandedItems, setExpandedItems] = useState({});
    const [expandedHistory, setExpandedHistory] = useState({});
    const navigate = useNavigate();
    const [showFiltersToProcess, setShowFiltersToProcess] = useState(false);
    const [showFiltersProcessed, setShowFiltersProcessed] = useState(false);
    const [filters, setFilters] = useState({
        itemName: '',
        category: '',
        status: '',
        minOrdered: '',
        minReceived: '',
        minRemaining: ''
    });

    // Group items by merchant
    const itemsByMerchant = useMemo(() => {
        if (!purchaseOrder?.purchaseOrderItems) return {};

        const grouped = {};
        purchaseOrder.purchaseOrderItems.forEach(item => {
            const merchantId = item.merchant?.id || 'unknown';
            const merchantName = item.merchant?.name || 'Unknown Merchant';

            if (!grouped[merchantId]) {
                let contactPhone = item.merchant?.contactPhone;
                let contactEmail = item.merchant?.contactEmail;
                let address = item.merchant?.address;
                let photoUrl = item.merchant?.photoUrl;

                if (!contactPhone || !contactEmail || !address) {
                    const firstIssue = item.itemReceipts?.[0]?.issues?.[0];
                    if (firstIssue) {
                        contactPhone = contactPhone || firstIssue.merchantContactPhone;
                        contactEmail = contactEmail || firstIssue.merchantContactEmail;
                        address = address || firstIssue.merchantAddress;
                    }
                }

                grouped[merchantId] = {
                    merchantId,
                    merchantName,
                    contactPhone,
                    contactEmail,
                    address,
                    photoUrl,
                    items: []
                };
            }
            grouped[merchantId].items.push(item);
        });

        return grouped;
    }, [purchaseOrder]);



    const calculateTotalProcessed = (item) => {
        if (!item.itemReceipts || item.itemReceipts.length === 0) return 0;
        return item.itemReceipts.reduce((sum, receipt) => {
            const goodQty = receipt.goodQuantity || 0;
            // Only count issues that are NOT resolved as REDELIVERY
            const closedIssuesQty = receipt.issues ? receipt.issues.reduce((issueSum, issue) => {
                // If resolved with REDELIVERY, don't count it (it's coming back)
                if (issue.issueStatus === 'RESOLVED' && issue.resolutionType === 'REDELIVERY') {
                    return issueSum;
                }
                return issueSum + (issue.affectedQuantity || 0);
            }, 0) : 0;
            return sum + goodQty + closedIssuesQty;
        }, 0);
    };

    const calculateTotalReceived = (item) => {
        if (!item.itemReceipts || item.itemReceipts.length === 0) return 0;
        return item.itemReceipts.reduce((sum, receipt) => sum + (receipt.goodQuantity || 0), 0);
    };

    const itemNeedsProcessing = (item) => {
        const totalProcessed = calculateTotalProcessed(item);
        const remaining = item.quantity - totalProcessed;
        return remaining > 0;
    };


    const filteredItems = useMemo(() => {
        if (!selectedMerchant) return [];
        const merchant = itemsByMerchant[selectedMerchant];
        if (!merchant) return [];

        return merchant.items.filter(item => {
            // FIRST: Only include items that need processing
            if (!itemNeedsProcessing(item)) return false; // ADD THIS LINE

            const totalReceived = calculateTotalReceived(item);
            const totalProcessed = calculateTotalProcessed(item);
            const remaining = item.quantity - totalProcessed;

            if (filters.itemName && item.itemType?.name !== filters.itemName) return false;
            if (filters.category && item.itemType?.itemCategoryName !== filters.category) return false;
            if (filters.status && item.status !== filters.status) return false;
            if (filters.minOrdered && item.quantity < parseFloat(filters.minOrdered)) return false;
            if (filters.minReceived && totalReceived < parseFloat(filters.minReceived)) return false;
            if (filters.minRemaining && remaining < parseFloat(filters.minRemaining)) return false;
            return true;
        });
    }, [selectedMerchant, itemsByMerchant, filters, calculateTotalReceived, calculateTotalProcessed]);

    const getMerchantTotals = (merchant) => {
        const itemsNeedingProcessing = merchant.items.filter(item => itemNeedsProcessing(item));
        const completedItems = merchant.items.filter(item => !itemNeedsProcessing(item));

        const totalOrdered = merchant.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalReceived = merchant.items.reduce((sum, item) => {
            const received = calculateTotalReceived(item);
            return sum + received;
        }, 0);

        return {
            totalItems: merchant.items.length,
            pendingItems: itemsNeedingProcessing.length,
            completedItems: completedItems.length,
            totalOrdered,
            totalReceived,
            isFullyProcessed: itemsNeedingProcessing.length === 0
        };
    };

    const handleMerchantSelect = (merchantId) => {
        setSelectedMerchant(merchantId);
        setDeliveryNotes('');
        setExpandedItems({});

        const merchant = itemsByMerchant[merchantId];
        const initialData = {};

        merchant.items.forEach(item => {
            initialData[item.id] = {
                goodQuantity: '',
                issues: []
            };
        });

        setItemData(initialData);
    };
    const toggleItemExpansion = (itemId) => {
        setExpandedItems(prev => {
            const newExpanded = !prev[itemId];

            // If collapsing, also collapse all deliveries for this item
            if (!newExpanded) {
                setExpandedHistory(prevHistory => {
                    const newHistory = { ...prevHistory };
                    // Remove all delivery expansions for this item
                    Object.keys(newHistory).forEach(key => {
                        if (key.startsWith(itemId)) {
                            delete newHistory[key];
                        }
                    });
                    return newHistory;
                });
            }

            return {
                ...prev,
                [itemId]: newExpanded
            };
        });
    };

    const handleAddIssue = (itemId) => {
        setItemData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                issues: [
                    ...prev[itemId].issues,
                    { issueType: 'DAMAGED', affectedQuantity: '', issueDescription: '' }
                ]
            }
        }));
    };

    const handleUpdateIssue = (itemId, issueIndex, field, value) => {
        setItemData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                issues: prev[itemId].issues.map((issue, idx) =>
                    idx === issueIndex ? { ...issue, [field]: value } : issue
                )
            }
        }));
    };

    const handleRemoveIssue = (itemId, issueIndex) => {
        setItemData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                issues: prev[itemId].issues.filter((_, idx) => idx !== issueIndex)
            }
        }));
    };

    const handleGoodQuantityChange = (itemId, value) => {
        setItemData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                goodQuantity: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!selectedMerchant) return;

        const merchant = itemsByMerchant[selectedMerchant];

        try {
            const itemsToProcess = merchant.items.filter(item => itemNeedsProcessing(item));

            if (itemsToProcess.length === 0) {
                onError('All items are already fully processed');
                return;
            }

            const itemReceipts = itemsToProcess.map(item => {
                const data = itemData[item.id];
                const goodQty = parseFloat(data.goodQuantity) || 0;

                const validIssues = data.issues.filter(issue =>
                    issue.affectedQuantity && parseFloat(issue.affectedQuantity) > 0
                );

                if (goodQty === 0 && validIssues.length === 0) {
                    throw new Error(`Please enter quantities for ${item.itemType?.name}`);
                }

                // Check if this item has any pending redeliveries
                const hasPendingRedelivery = item.itemReceipts?.some(receipt =>
                    receipt.issues?.some(issue =>
                        issue.issueStatus === 'RESOLVED' && issue.resolutionType === 'REDELIVERY'
                    )
                ) || false;

                return {
                    purchaseOrderItemId: item.id,
                    goodQuantity: goodQty,
                    isRedelivery: hasPendingRedelivery,
                    issues: validIssues.map(issue => ({
                        issueType: issue.issueType,
                        affectedQuantity: parseFloat(issue.affectedQuantity),
                        issueDescription: issue.issueDescription
                    }))
                };
            });

            const deliveryData = {
                purchaseOrderId: purchaseOrder.id,
                merchantId: merchant.merchantId,
                processedBy: '', // or remove this line entirely - backend overrides it anyway
                deliveryNotes,
                itemReceipts
            };

            setProcessing(true);
            await purchaseOrderService.processDelivery(purchaseOrder.id, deliveryData);
            onSuccess();
            setSelectedMerchant(null);
            setItemData({});
            setDeliveryNotes('');
        } catch (err) {
            console.error('Error processing delivery:', err);
            onError(err.message || 'Failed to process delivery');
        } finally {
            setProcessing(false);
        }
    };

    const toggleHistory = (itemId) => {
        setExpandedHistory(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getIssueTypeLabel = (type) => {
        const labels = {
            'DAMAGED': 'Damaged',
            'NOT_ARRIVED': 'Never Arrived',
            'WRONG_ITEM': 'Wrong Item',
            'QUALITY_ISSUE': 'Quality Issue',
            'OTHER': 'Other'
        };
        return labels[type] || type;
    };

    // Merchant Selection View
    if (!selectedMerchant) {
        return (
            <div className="receiving-tab">
                <div className="receiving-section">
                    <h3 className="section-title">
                        <FiTruck />
                        Select Merchant to Process Delivery
                    </h3>
                    <p className="section-description">Process all items from one merchant at a time</p>

                    <div className="merchant-list">
                        {Object.values(itemsByMerchant).map(merchant => {
                            const totals = getMerchantTotals(merchant);

                            return (
                                <div
                                    key={merchant.merchantId}
                                    className={`merchant-card ${totals.isFullyProcessed ? 'completed' : ''}`}
                                    onClick={() => handleMerchantSelect(merchant.merchantId)}
                                >
                                    <div className="merchant-card-icon">
                                        {merchant.photoUrl ? (
                                            <img src={merchant.photoUrl} alt={merchant.merchantName} />
                                        ) : (
                                            <FiPackage />
                                        )}
                                    </div>
                                    <div className="merchant-card-content">
                                        <h4>{merchant.merchantName}</h4>
                                        <div className="merchant-card-stats">
                                            {totals.isFullyProcessed ? (
                                                <span className="stat-badge completed">
                                                    <FiCheckCircle />
                                                    Fully Processed
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="stat-badge">
                                                        {totals.totalItems} {totals.totalItems === 1 ? 'item' : 'items'}
                                                    </span>
                                                    <span className="stat-badge pending">
                                                        {totals.pendingItems} pending
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="merchant-card-arrow">→</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Processing View
    const currentMerchant = itemsByMerchant[selectedMerchant];
    const merchantTotals = getMerchantTotals(currentMerchant);

    return (
        <div className="receiving-tab">
            {/* Merchant Info Section */}
            <div className="receiving-section">
                <div className="section-header-with-action">
                    <h3 className="section-title">
                        <FiTruck />
                        Merchant Information
                    </h3>
                    <button className="btn-back" onClick={() => setSelectedMerchant(null)}>
                        ← Back to Merchants
                    </button>
                </div>

                <div className="merchant-info-card">
                    <div className="merchant-info-header">
                        <div className="merchant-left">
                            {currentMerchant.photoUrl ? (
                                <img src={currentMerchant.photoUrl} alt={currentMerchant.merchantName} className="merchant-photo" />
                            ) : (
                                <div className="merchant-icon">
                                    <FiTruck />
                                </div>
                            )}
                            <div className="merchant-details">
                                <h4
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/merchants/${currentMerchant.merchantId}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {currentMerchant.merchantName}
                                </h4>
                                <div className="merchant-contact">
                                    {currentMerchant.contactPhone && (
                                        <a href={`tel:${currentMerchant.contactPhone}`} className="contact-item">
                                            <FiPhone />
                                            {currentMerchant.contactPhone}
                                        </a>
                                    )}
                                    {currentMerchant.contactEmail && (
                                        <a href={`mailto:${currentMerchant.contactEmail}`} className="contact-item">
                                            <FiMail />
                                            {currentMerchant.contactEmail}
                                        </a>
                                    )}
                                    {currentMerchant.address && (
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentMerchant.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-item"
                                        >
                                            <FiMapPin />
                                            {currentMerchant.address}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="merchant-stats">
                            <div className="stat-item">
                                <FiBox />
                                <span><strong>{merchantTotals.totalItems}</strong> Items</span>
                            </div>
                            {merchantTotals.isFullyProcessed ? (
                                <div className="stat-item success">
                                    <FiCheckCircle />
                                    <span>Fully Processed</span>
                                </div>
                            ) : (
                                <div className="stat-item pending">
                                    <FiClock />
                                    <span><strong>{merchantTotals.pendingItems}</strong> Pending</span>
                                </div>
                            )}
                            <div className="stat-item">
                                <FiPackage />
                                <span><strong>{merchantTotals.totalReceived}</strong> / {merchantTotals.totalOrdered} Received</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Processed Items Section */}
            {(() => {
                const processedItems = currentMerchant.items.filter(item => !itemNeedsProcessing(item));
                const filteredProcessedItems = processedItems.filter(item => {
                    const totalReceived = calculateTotalReceived(item);
                    const totalProcessed = calculateTotalProcessed(item);
                    const remaining = item.quantity - totalProcessed;

                    if (filters.itemName && item.itemType?.name !== filters.itemName) return false;
                    if (filters.category && item.itemType?.itemCategoryName !== filters.category) return false;
                    if (filters.status && item.status !== filters.status) return false;
                    if (filters.minOrdered && item.quantity < parseFloat(filters.minOrdered)) return false;
                    if (filters.minReceived && totalReceived < parseFloat(filters.minReceived)) return false;
                    if (filters.minRemaining && remaining < parseFloat(filters.minRemaining)) return false;
                    return true;
                });

                if (processedItems.length === 0) return null;

                return (
                    <div className="receiving-section">
                        <div className="section-header-with-action">
                            <h3 className="section-title">
                                <FiCheckCircle />
                                Processed Items ({processedItems.length})
                            </h3>
                            {processedItems.length > 0 && (
                                <button
                                    className={`filter-btn ${Object.values(filters).some(f => f) ? 'active' : ''}`}
                                    onClick={() => setShowFiltersProcessed(!showFiltersProcessed)}
                                >
                                    <FiFilter />
                                    Filter
                                    {Object.values(filters).filter(f => f).length > 0 && (
                                        <span className="filter-count">{Object.values(filters).filter(f => f).length}</span>
                                    )}
                                </button>
                            )}
                        </div>

                        {processedItems.length > 0 && (
                            <div className={`filter-panel ${showFiltersProcessed ? 'open' : 'closed'}`}>
                                <div className="filter-grid">
                                    <div className="filter-item">
                                        <label>Item Name</label>
                                        <select
                                            value={filters.itemName}
                                            onChange={(e) => setFilters(prev => ({ ...prev, itemName: e.target.value }))}
                                        >
                                            <option value="">All Items</option>
                                            {[...new Set(currentMerchant.items.map(i => i.itemType?.name).filter(Boolean))].map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-item">
                                        <label>Category</label>
                                        <select
                                            value={filters.category}
                                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                        >
                                            <option value="">All Categories</option>
                                            {[...new Set(currentMerchant.items.map(i => i.itemType?.itemCategoryName).filter(Boolean))].map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-item">
                                        <label>Status</label>
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                        >
                                            <option value="">All Statuses</option>
                                            {[...new Set(currentMerchant.items.map(i => i.status).filter(Boolean))].map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-item">
                                        <label>Min Ordered</label>
                                        <input
                                            type="number"
                                            placeholder="Min qty"
                                            value={filters.minOrdered}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minOrdered: e.target.value }))}
                                        />
                                    </div>
                                    <div className="filter-item">
                                        <label>Min Received</label>
                                        <input
                                            type="number"
                                            placeholder="Min qty"
                                            value={filters.minReceived}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minReceived: e.target.value }))}
                                        />
                                    </div>
                                    <div className="filter-item">
                                        <label>Min Remaining</label>
                                        <input
                                            type="number"
                                            placeholder="Min qty"
                                            value={filters.minRemaining}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minRemaining: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="filter-actions">
                        <span className="filter-stats">
                            Showing {filteredProcessedItems.length} of {processedItems.length} items
                        </span>
                                    <button
                                        className="clear-filters-btn"
                                        onClick={() => setFilters({ itemName: '', category: '', status: '', minOrdered: '', minReceived: '', minRemaining: '' })}
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredProcessedItems.length === 0 ? (
                            <div className="no-items-container">
                                <FiFilter size={48} />
                                <h3>No Items Match Filters</h3>
                                <p>Try adjusting your filter criteria.</p>
                            </div>
                        ) : (
                            <div className="items-list">
                                {filteredProcessedItems.map(item => {
                                    const isExpanded = expandedItems[item.id];
                                    const totalReceived = calculateTotalReceived(item);
                                    const totalProcessed = calculateTotalProcessed(item);
                                    const remaining = item.quantity - totalProcessed;
                                    const hasHistory = item.itemReceipts && item.itemReceipts.length > 0;

                                    return (
                                        <div key={item.id} className={`item-card completed ${isExpanded ? 'expanded' : ''}`}>
                                            <div className="item-header" onClick={() => toggleItemExpansion(item.id)}>
                                                <div
                                                    className="status-tag"
                                                    style={{
                                                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                                        color: '#22c55e',
                                                        borderColor: 'rgba(34, 197, 94, 0.4)'
                                                    }}
                                                >
                                                    COMPLETED
                                                </div>
                                                <button className="expand-btn">
                                                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                </button>
                                                <div className="item-icon completed">
                                                    <FiCheckCircle />
                                                </div>
                                                <div className="item-info">
                                                    <h4>{item.itemType?.name}</h4>
                                                    {item.itemType?.itemCategoryName && (
                                                        <span className="item-category-po">{item.itemType.itemCategoryName}</span>
                                                    )}
                                                </div>
                                                <div className="item-stats">
                                                    <div className="stat">
                                                        <span className="stat-label">Ordered</span>
                                                        <span className="stat-value">{item.quantity}</span>
                                                    </div>
                                                    <div className="stat">
                                                        <span className="stat-label">Received</span>
                                                        <span className="stat-value success">{totalReceived}</span>
                                                    </div>
                                                    <div className="stat">
                                                        <span className="stat-label">Remaining</span>
                                                        <span className="stat-value success">0</span>
                                                    </div>
                                                    <span className="unit">{item.itemType?.measuringUnit}</span>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="item-content">
                                                    {hasHistory && (
                                                        <div className="history-section">
                                                            <div className="history-header">
                                                                <h5>DELIVERY HISTORY</h5>
                                                                <span className="history-count">{item.itemReceipts.length} {item.itemReceipts.length === 1 ? 'delivery' : 'deliveries'}</span>
                                                            </div>
                                                            <div className="history-body">
                                                                {item.itemReceipts.map((receipt, index) => {
                                                                    const deliveryId = `${item.id}-${receipt.id}`;
                                                                    const isDeliveryExpanded = expandedHistory[deliveryId] === true;

                                                                    return (
                                                                        <div key={receipt.id} className={`delivery-item ${isDeliveryExpanded ? 'expanded' : 'collapsed'}`}>
                                                                            <div
                                                                                className="delivery-item-header"
                                                                                onClick={() => setExpandedHistory(prev => ({
                                                                                    ...prev,
                                                                                    [deliveryId]: !isDeliveryExpanded
                                                                                }))}
                                                                            >
                                                                                <div className="delivery-header-left">
                                                                                    <span className="delivery-number">Delivery #{index + 1}</span>
                                                                                </div>
                                                                                <div className="delivery-header-right">
                                                                        <span className="delivery-summary">
                                                                            {receipt.goodQuantity + (receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0)} {receipt.measuringUnit}
                                                                        </span>
                                                                                    <button className="expand-toggle">
                                                                                        {isDeliveryExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {isDeliveryExpanded && (
                                                                                <div className="delivery-item-content">
                                                                                    <div className="delivery-info-list">
                                                                                        <div className="info-row">
                                                                                            <span className="info-label">TOTAL PROCESSED</span>
                                                                                            <span className="info-value">
                                                                                    {receipt.goodQuantity + (receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0)} {receipt.measuringUnit}
                                                                                </span>
                                                                                        </div>
                                                                                        <div className="info-row">
                                                                                            <span className="info-label">GOOD RECEIVED</span>
                                                                                            <span className="info-value good">{receipt.goodQuantity} {receipt.measuringUnit}</span>
                                                                                        </div>
                                                                                        <div className="info-row">
                                                                                            <span className="info-label">TOTAL ISSUES</span>
                                                                                            <span className="info-value issue">
                                                                                    {receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0} {receipt.measuringUnit}
                                                                                </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {receipt.issues && receipt.issues.length > 0 && (
                                                                                        <div className="delivery-issues">
                                                                                            <div className="issues-title">ISSUES BREAKDOWN</div>
                                                                                            <div className="issues-table">
                                                                                                <div className="issues-table-header">
                                                                                                    <span>Type</span>
                                                                                                    <span>Quantity</span>
                                                                                                    <span>Reported By</span>
                                                                                                    <span>Reported At</span>
                                                                                                    <span>Status</span>
                                                                                                </div>
                                                                                                {receipt.issues.map(issue => {
                                                                                                    const issueExpandKey = `${deliveryId}-${issue.id}`;
                                                                                                    const isIssueExpanded = expandedHistory[issueExpandKey];

                                                                                                    return (
                                                                                                        <React.Fragment key={issue.id}>
                                                                                                            <div
                                                                                                                className={`issues-table-row ${issue.issueStatus === 'RESOLVED' ? 'clickable' : ''}`}
                                                                                                                onClick={() => {
                                                                                                                    if (issue.issueStatus === 'RESOLVED') {
                                                                                                                        setExpandedHistory(prev => ({
                                                                                                                            ...prev,
                                                                                                                            [issueExpandKey]: !isIssueExpanded
                                                                                                                        }));
                                                                                                                    }
                                                                                                                }}
                                                                                                            >
                                                                                                                <span className="issue-type">{issue.issueType.replace('_', ' ')}</span>
                                                                                                                <span className="issue-qty">{issue.affectedQuantity} {receipt.measuringUnit}</span>
                                                                                                                <span className="issue-reporter">{issue.reportedBy}</span>
                                                                                                                <span className="issue-date">{new Date(issue.reportedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                                                                                <span className={`issue-status ${issue.issueStatus.toLowerCase()}`}>
                                                                                                        {issue.issueStatus}
                                                                                                                    {issue.issueStatus === 'RESOLVED' && (
                                                                                                                        <span className="expand-icon">{isIssueExpanded ? '▲' : '▼'}</span>
                                                                                                                    )}
                                                                                                    </span>
                                                                                                            </div>
                                                                                                            {isIssueExpanded && issue.issueStatus === 'RESOLVED' && (
                                                                                                                <div className="resolution-details">
                                                                                                                    <div className="resolution-row">
                                                                                                                        <span className="resolution-label">Resolution Type</span>
                                                                                                                        <span className="resolution-value">{issue.resolutionType.replace('_', ' ')}</span>
                                                                                                                    </div>
                                                                                                                    <div className="resolution-row">
                                                                                                                        <span className="resolution-label">Resolved By</span>
                                                                                                                        <span className="resolution-value">{issue.resolvedBy}</span>
                                                                                                                    </div>
                                                                                                                    <div className="resolution-row">
                                                                                                                        <span className="resolution-label">Resolved At</span>
                                                                                                                        <span className="resolution-value">{new Date(issue.resolvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                                    </div>
                                                                                                                    <div className="resolution-row">
                                                                                                                        <span className="resolution-label">Notes</span>
                                                                                                                        <span className="resolution-value notes">{issue.resolutionNotes}</span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </React.Fragment>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Items Section */}
            {/* Items Section */}
            <div className="receiving-section">
                <div className="section-header-with-action">
                    <h3 className="section-title">
                        <FiPackage />
                        Items to Process ({filteredItems.length})
                    </h3>
                    {currentMerchant.items.filter(item => itemNeedsProcessing(item)).length > 0 && (
                        <button
                            className={`filter-btn ${Object.values(filters).some(f => f) ? 'active' : ''}`}
                            onClick={() => setShowFiltersToProcess(!showFiltersToProcess)}
                        >
                            <FiFilter />
                            Filter
                            {Object.values(filters).filter(f => f).length > 0 && (
                                <span className="filter-count">{Object.values(filters).filter(f => f).length}</span>
                            )}
                        </button>
                    )}
                </div>

                <div className={`filter-panel ${showFiltersToProcess ? 'open' : 'closed'}`}>
                    <div className="filter-grid">
                        <div className="filter-item">
                            <label>Item Name</label>
                            <select
                                value={filters.itemName}
                                onChange={(e) => setFilters(prev => ({ ...prev, itemName: e.target.value }))}
                            >
                                <option value="">All Items</option>
                                {[...new Set(currentMerchant.items.map(i => i.itemType?.name).filter(Boolean))].map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            >
                                <option value="">All Categories</option>
                                {[...new Set(currentMerchant.items.map(i => i.itemType?.itemCategoryName).filter(Boolean))].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">All Statuses</option>
                                {[...new Set(currentMerchant.items.map(i => i.status).filter(Boolean))].map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Min Ordered</label>
                            <input
                                type="number"
                                placeholder="Min qty"
                                value={filters.minOrdered}
                                onChange={(e) => setFilters(prev => ({ ...prev, minOrdered: e.target.value }))}
                            />
                        </div>
                        <div className="filter-item">
                            <label>Min Received</label>
                            <input
                                type="number"
                                placeholder="Min qty"
                                value={filters.minReceived}
                                onChange={(e) => setFilters(prev => ({ ...prev, minReceived: e.target.value }))}
                            />
                        </div>
                        <div className="filter-item">
                            <label>Min Remaining</label>
                            <input
                                type="number"
                                placeholder="Min qty"
                                value={filters.minRemaining}
                                onChange={(e) => setFilters(prev => ({ ...prev, minRemaining: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="filter-actions">
            <span className="filter-stats">
                Showing {filteredItems.length} of {currentMerchant.items.length} items
            </span>
                        <button
                            className="clear-filters-btn"
                            onClick={() => setFilters({ itemName: '', category: '', status: '', minOrdered: '', minReceived: '', minRemaining: '' })}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="no-items-container">
                        <FiCheckCircle size={48} />
                        <h3>No Items to Process</h3>
                        <p>All items from this merchant have been fully processed.</p>
                    </div>
                ) : (
                    <div className="items-list">
                        {filteredItems.map(item => {
                            const isExpanded = expandedItems[item.id];
                            const data = itemData[item.id] || { goodQuantity: '', issues: [] };
                            const totalReceived = calculateTotalReceived(item);
                            const totalProcessed = calculateTotalProcessed(item);
                            const remaining = item.quantity - totalProcessed;
                            const hasHistory = item.itemReceipts && item.itemReceipts.length > 0;
                            const needsProcessing = remaining > 0;

                            return (
                                <div key={item.id} className={`item-card ${isExpanded ? 'expanded' : ''}`}>
                                    <div className="item-header" onClick={() => toggleItemExpansion(item.id)}>
                                        <div
                                            className="status-tag"
                                            style={{
                                                backgroundColor: item.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' :
                                                    item.status === 'DISPUTED' ? 'rgba(239, 68, 68, 0.15)' :
                                                        'rgba(245, 158, 11, 0.15)',
                                                color: item.status === 'COMPLETED' ? '#22c55e' :
                                                    item.status === 'DISPUTED' ? '#ef4444' :
                                                        '#f59e0b',
                                                borderColor: item.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.4)' :
                                                    item.status === 'DISPUTED' ? 'rgba(239, 68, 68, 0.4)' :
                                                        'rgba(245, 158, 11, 0.4)'
                                            }}
                                        >
                                            {item.status}
                                        </div>
                                        <button className="expand-btn">
                                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                        </button>
                                        <div className="item-icon">
                                            <FiPackage />
                                        </div>
                                        <div className="item-info">
                                            <h4>{item.itemType?.name}</h4>
                                            {item.itemType?.itemCategoryName && (
                                                <span className="item-category-po">{item.itemType.itemCategoryName}</span>
                                            )}
                                        </div>
                                        <div className="item-stats">
                                            <div className="stat">
                                                <span className="stat-label">Ordered</span>
                                                <span className="stat-value">{item.quantity}</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Received</span>
                                                <span className={`stat-value ${totalReceived > 0 ? 'success' : ''}`}>{totalReceived}</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Remaining</span>
                                                <span className={`stat-value ${remaining > 0 ? 'warning' : 'success'}`}>{remaining}</span>
                                            </div>
                                            <span className="unit">{item.itemType?.measuringUnit}</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="item-content">
                                            {needsProcessing && (
                                                <div className="quantity-form">
                                                    <div className="form-section-header">
                                                        <h5>DELIVERY QUANTITIES</h5>
                                                        <div className="quantity-counter">
                                                            {(() => {
                                                                const good = parseFloat(data.goodQuantity) || 0;
                                                                const issuesTotal = data.issues.reduce((sum, issue) => sum + (parseFloat(issue.affectedQuantity) || 0), 0);
                                                                const total = good + issuesTotal;
                                                                const isComplete = total === remaining;
                                                                const isOver = total > remaining;
                                                                return (
                                                                    <span className={isComplete ? 'complete' : isOver ? 'over' : 'pending'}>
                                                        {total}/{remaining} {item.itemType?.measuringUnit}
                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    <div className="form-section-body">
                                                        <div className="quantity-inputs">
                                                            <div className="quantity-row">
                                                                <label>Good</label>
                                                                <div className="input-with-unit">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={data.goodQuantity}
                                                                        onChange={(e) => handleGoodQuantityChange(item.id, e.target.value)}
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="unit-separator" />
                                                                    <span>{item.itemType?.measuringUnit}</span>
                                                                </div>
                                                            </div>

                                                            <div className="input-divider" />

                                                            <div className="quantity-row">
                                                                <label>Damaged</label>
                                                                <div className="input-with-unit">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={data.issues.find(i => i.issueType === 'DAMAGED')?.affectedQuantity || ''}
                                                                        onChange={(e) => {
                                                                            const existingIndex = data.issues.findIndex(i => i.issueType === 'DAMAGED');
                                                                            if (existingIndex >= 0) {
                                                                                if (e.target.value === '' || e.target.value === '0') {
                                                                                    handleRemoveIssue(item.id, existingIndex);
                                                                                } else {
                                                                                    handleUpdateIssue(item.id, existingIndex, 'affectedQuantity', e.target.value);
                                                                                }
                                                                            } else if (e.target.value && e.target.value !== '0') {
                                                                                setItemData(prev => ({
                                                                                    ...prev,
                                                                                    [item.id]: {
                                                                                        ...prev[item.id],
                                                                                        issues: [...prev[item.id].issues, { issueType: 'DAMAGED', affectedQuantity: e.target.value, issueDescription: '' }]
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="unit-separator" />
                                                                    <span>{item.itemType?.measuringUnit}</span>
                                                                </div>
                                                            </div>

                                                            <div className="input-divider" />

                                                            <div className="quantity-row">
                                                                <label>Never Arrived</label>
                                                                <div className="input-with-unit">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={data.issues.find(i => i.issueType === 'NOT_ARRIVED')?.affectedQuantity || ''}
                                                                        onChange={(e) => {
                                                                            const existingIndex = data.issues.findIndex(i => i.issueType === 'NOT_ARRIVED');
                                                                            if (existingIndex >= 0) {
                                                                                if (e.target.value === '' || e.target.value === '0') {
                                                                                    handleRemoveIssue(item.id, existingIndex);
                                                                                } else {
                                                                                    handleUpdateIssue(item.id, existingIndex, 'affectedQuantity', e.target.value);
                                                                                }
                                                                            } else if (e.target.value && e.target.value !== '0') {
                                                                                setItemData(prev => ({
                                                                                    ...prev,
                                                                                    [item.id]: {
                                                                                        ...prev[item.id],
                                                                                        issues: [...prev[item.id].issues, { issueType: 'NOT_ARRIVED', affectedQuantity: e.target.value, issueDescription: '' }]
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="unit-separator" />
                                                                    <span>{item.itemType?.measuringUnit}</span>
                                                                </div>
                                                            </div>

                                                            <div className="input-divider" />

                                                            <div className="quantity-row">
                                                                <label>Wrong Item</label>
                                                                <div className="input-with-unit">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={data.issues.find(i => i.issueType === 'WRONG_ITEM')?.affectedQuantity || ''}
                                                                        onChange={(e) => {
                                                                            const existingIndex = data.issues.findIndex(i => i.issueType === 'WRONG_ITEM');
                                                                            if (existingIndex >= 0) {
                                                                                if (e.target.value === '' || e.target.value === '0') {
                                                                                    handleRemoveIssue(item.id, existingIndex);
                                                                                } else {
                                                                                    handleUpdateIssue(item.id, existingIndex, 'affectedQuantity', e.target.value);
                                                                                }
                                                                            } else if (e.target.value && e.target.value !== '0') {
                                                                                setItemData(prev => ({
                                                                                    ...prev,
                                                                                    [item.id]: {
                                                                                        ...prev[item.id],
                                                                                        issues: [...prev[item.id].issues, { issueType: 'WRONG_ITEM', affectedQuantity: e.target.value, issueDescription: '' }]
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="unit-separator" />
                                                                    <span>{item.itemType?.measuringUnit}</span>
                                                                </div>
                                                            </div>

                                                            <div className="input-divider" />

                                                            <div className="quantity-row">
                                                                <label>Quality Issue</label>
                                                                <div className="input-with-unit">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={data.issues.find(i => i.issueType === 'QUALITY_ISSUE')?.affectedQuantity || ''}
                                                                        onChange={(e) => {
                                                                            const existingIndex = data.issues.findIndex(i => i.issueType === 'QUALITY_ISSUE');
                                                                            if (existingIndex >= 0) {
                                                                                if (e.target.value === '' || e.target.value === '0') {
                                                                                    handleRemoveIssue(item.id, existingIndex);
                                                                                } else {
                                                                                    handleUpdateIssue(item.id, existingIndex, 'affectedQuantity', e.target.value);
                                                                                }
                                                                            } else if (e.target.value && e.target.value !== '0') {
                                                                                setItemData(prev => ({
                                                                                    ...prev,
                                                                                    [item.id]: {
                                                                                        ...prev[item.id],
                                                                                        issues: [...prev[item.id].issues, { issueType: 'QUALITY_ISSUE', affectedQuantity: e.target.value, issueDescription: '' }]
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="unit-separator" />
                                                                    <span>{item.itemType?.measuringUnit}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="description-row">
                                                            <label>Description / Notes</label>
                                                            <textarea
                                                                placeholder="Add any notes about this delivery..."
                                                                value={data.description || ''}
                                                                onChange={(e) => setItemData(prev => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...prev[item.id],
                                                                        description: e.target.value
                                                                    }
                                                                }))}
                                                                rows={3}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {hasHistory && (
                                                <div className="history-section">
                                                    <div className="history-header">
                                                        <h5>DELIVERY HISTORY</h5>
                                                        <span className="history-count">{item.itemReceipts.length} {item.itemReceipts.length === 1 ? 'delivery' : 'deliveries'}</span>
                                                    </div>
                                                    <div className="history-body">
                                                        {item.itemReceipts.map((receipt, index) => {
                                                            console.log('Receipt:', JSON.stringify(receipt, null, 2));
                                                            const deliveryId = `${item.id}-${receipt.id}`;
                                                            const isDeliveryExpanded = expandedHistory[deliveryId] === true;

                                                            return (
                                                                <div key={receipt.id} className={`delivery-item ${isDeliveryExpanded ? 'expanded' : 'collapsed'}`}>
                                                                    <div
                                                                        className="delivery-item-header"
                                                                        onClick={() => setExpandedHistory(prev => ({
                                                                            ...prev,
                                                                            [deliveryId]: !isDeliveryExpanded
                                                                        }))}
                                                                    >
                                                                        <div className="delivery-header-left">
                                                                            <span className="delivery-number">Delivery #{index + 1}</span>
                                                                        </div>
                                                                        <div className="delivery-header-right">
                                                            <span className="delivery-summary">
                                                                {receipt.goodQuantity + (receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0)} {receipt.measuringUnit}
                                                            </span>
                                                                            <button className="expand-toggle">
                                                                                {isDeliveryExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {isDeliveryExpanded && (
                                                                        <div className="delivery-item-content">
                                                                            <div className="delivery-info-list">
                                                                                <div className="info-row">
                                                                                    <span className="info-label">TOTAL PROCESSED</span>
                                                                                    <span className="info-value">
                                                                        {receipt.goodQuantity + (receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0)} {receipt.measuringUnit}
                                                                    </span>
                                                                                </div>
                                                                                <div className="info-row">
                                                                                    <span className="info-label">GOOD RECEIVED</span>
                                                                                    <span className="info-value good">{receipt.goodQuantity} {receipt.measuringUnit}</span>
                                                                                </div>
                                                                                <div className="info-row">
                                                                                    <span className="info-label">TOTAL ISSUES</span>
                                                                                    <span className="info-value issue">
                                                                        {receipt.issues ? receipt.issues.reduce((sum, i) => sum + i.affectedQuantity, 0) : 0} {receipt.measuringUnit}
                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {receipt.issues && receipt.issues.length > 0 && (
                                                                                <div className="delivery-issues">
                                                                                    <div className="issues-title">ISSUES BREAKDOWN</div>
                                                                                    <div className="issues-table">
                                                                                        <div className="issues-table-header">
                                                                                            <span>Type</span>
                                                                                            <span>Quantity</span>
                                                                                            <span>Reported By</span>
                                                                                            <span>Reported At</span>
                                                                                            <span>Status</span>
                                                                                        </div>
                                                                                        {receipt.issues.map(issue => {
                                                                                            const issueExpandKey = `${deliveryId}-${issue.id}`;
                                                                                            const isIssueExpanded = expandedHistory[issueExpandKey];

                                                                                            return (
                                                                                                <React.Fragment key={issue.id}>
                                                                                                    <div
                                                                                                        className={`issues-table-row ${issue.issueStatus === 'RESOLVED' ? 'clickable' : ''}`}
                                                                                                        onClick={() => {
                                                                                                            if (issue.issueStatus === 'RESOLVED') {
                                                                                                                setExpandedHistory(prev => ({
                                                                                                                    ...prev,
                                                                                                                    [issueExpandKey]: !isIssueExpanded
                                                                                                                }));
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        <span className="issue-type">{issue.issueType.replace('_', ' ')}</span>
                                                                                                        <span className="issue-qty">{issue.affectedQuantity} {receipt.measuringUnit}</span>
                                                                                                        <span className="issue-reporter">{issue.reportedBy}</span>
                                                                                                        <span className="issue-date">{new Date(issue.reportedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                                                                        <span className={`issue-status ${issue.issueStatus.toLowerCase()}`}>
                                                                                            {issue.issueStatus}
                                                                                                            {issue.issueStatus === 'RESOLVED' && (
                                                                                                                <span className="expand-icon">{isIssueExpanded ? '▲' : '▼'}</span>
                                                                                                            )}
                                                                                        </span>
                                                                                                    </div>
                                                                                                    {isIssueExpanded && issue.issueStatus === 'RESOLVED' && (
                                                                                                        <div className="resolution-details">
                                                                                                            <div className="resolution-row">
                                                                                                                <span className="resolution-label">Resolution Type</span>
                                                                                                                <span className="resolution-value">{issue.resolutionType.replace('_', ' ')}</span>
                                                                                                            </div>
                                                                                                            <div className="resolution-row">
                                                                                                                <span className="resolution-label">Resolved By</span>
                                                                                                                <span className="resolution-value">{issue.resolvedBy}</span>
                                                                                                            </div>
                                                                                                            <div className="resolution-row">
                                                                                                                <span className="resolution-label">Resolved At</span>
                                                                                                                <span className="resolution-value">{new Date(issue.resolvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                            </div>
                                                                                                            <div className="resolution-row">
                                                                                                                <span className="resolution-label">Notes</span>
                                                                                                                <span className="resolution-value notes">{issue.resolutionNotes}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </React.Fragment>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Submit Section */}
            {!merchantTotals.isFullyProcessed && (
                <div className="receiving-section">
                    <h3 className="section-title">
                        <FiCheck />
                        Submit Delivery
                    </h3>

                    <div className="form-group-po-details">
                        <label className="form-label">Delivery Notes <span className="optional">(Optional)</span></label>
                        <textarea
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Add any general notes about this delivery session..."
                            rows={3}
                            className="form-textarea"
                        />
                    </div>

                    <div className="submit-actions">
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <span className="spinner"></span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <FiCheck />
                                    Submit Delivery
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivingTab;