import React, { useState, useEffect } from "react";
import "./ReportIssueModal.scss";

const ReportIssueModal = ({ purchaseOrder, isOpen, onClose, onSubmit }) => {
    const [issueItems, setIssueItems] = useState({});
    const [issueType, setIssueType] = useState({});
    const [comments, setComments] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
            // Reset state when modal opens
            if (purchaseOrder?.purchaseOrderItems) {
                const initialIssueItems = {};
                const initialIssueType = {};
                purchaseOrder.purchaseOrderItems.forEach(item => {
                    initialIssueItems[item.id] = false;
                    initialIssueType[item.id] = 'NOT_ARRIVED';
                });
                setIssueItems(initialIssueItems);
                setIssueType(initialIssueType);
            }
            setComments("");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen, purchaseOrder]);

    if (!isOpen || !purchaseOrder) return null;

    // Helper functions
    const getItemName = (item) => {
        return item.itemType?.name ||
            item.offerItem?.requestOrderItem?.itemType?.name ||
            item.itemTypeName ||
            "Unknown Item";
    };

    const getItemCategory = (item) => {
        return item.itemType?.itemCategory?.name ||
            item.itemType?.category?.name ||
            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
            item.itemCategory ||
            null;
    };

    const formatQuantity = (quantity, item) => {
        const unit = item.itemType?.measuringUnit ||
            item.offerItem?.requestOrderItem?.itemType?.measuringUnit ||
            'units';
        return `${quantity} ${unit}`;
    };

    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Handle item checkbox change
    const handleItemCheckChange = (itemId, checked) => {
        setIssueItems(prev => ({
            ...prev,
            [itemId]: checked
        }));
    };

    // Handle issue type change
    const handleIssueTypeChange = (itemId, type) => {
        setIssueType(prev => ({
            ...prev,
            [itemId]: type
        }));
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (isSubmitting) return;

        // Get items with issues
        const itemsWithIssues = Object.entries(issueItems)
            .filter(([_, hasIssue]) => hasIssue)
            .map(([itemId, _]) => ({
                purchaseOrderItemId: itemId,
                issueType: issueType[itemId]
            }));

        if (itemsWithIssues.length === 0) {
            alert('Please select at least one item with an issue');
            return;
        }

        if (!comments.trim()) {
            alert('Please provide details about the issue');
            return;
        }

        setIsSubmitting(true);
        try {
            // TODO: Call API to report issue
            console.log('Reporting issue:', {
                purchaseOrderId: purchaseOrder.id,
                items: itemsWithIssues,
                comments: comments
            });

            // Call parent's onSubmit
            if (onSubmit) {
                await onSubmit({
                    purchaseOrderId: purchaseOrder.id,
                    items: itemsWithIssues,
                    comments: comments
                });
            }

            onClose();
        } catch (error) {
            console.error('Error reporting issue:', error);
            alert('Failed to report issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate summary stats
    const totalItems = purchaseOrder.purchaseOrderItems?.length || 0;
    const itemsWithIssuesCount = Object.values(issueItems).filter(hasIssue => hasIssue).length;
    const hasAnyIssues = itemsWithIssuesCount > 0;

    return (
        <div className="report-issue-modal-overlay" onClick={onClose}>
            <div className="report-issue-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="report-issue-modal-header">
                    <div className="report-issue-modal-header-content">
                        <div className="report-issue-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="report-issue-modal-title">Report Purchase Order Issue</h2>
                            <div className="report-issue-modal-po-number">
                                PO #{purchaseOrder.poNumber}
                            </div>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="report-issue-modal-content">


                    {/* Summary Section */}
                    <div className="report-issue-summary">
                        <div className="summary-item">
                            <span className="summary-label">Total Items:</span>
                            <span className="summary-value">{totalItems}</span>
                        </div>
                        <div className="summary-item highlight">
                            <span className="summary-label">Items with Issues:</span>
                            <span className="summary-value">{itemsWithIssuesCount}</span>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="report-issue-items-section">
                        <h3 className="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Purchase Order Items
                        </h3>

                        {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                            <div className="report-issue-items-list">
                                {purchaseOrder.purchaseOrderItems.map((item, index) => (
                                    <div key={item.id || index} className={`report-issue-item-card ${issueItems[item.id] ? 'has-issue' : ''}`}>
                                        <div className="item-card-header">
                                            <div className="item-checkbox-section">
                                                <label className="report-issue-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={issueItems[item.id] || false}
                                                        onChange={(e) => handleItemCheckChange(item.id, e.target.checked)}
                                                    />
                                                    <span className="report-issue-checkmark"></span>
                                                </label>
                                                <div className="item-info">
                                                    <div className="item-icon-container">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                        </svg>
                                                    </div>
                                                    <div className="item-details">
                                                        <div className="item-name">{getItemName(item)}</div>
                                                        {getItemCategory(item) && (
                                                            <div className="item-category">{getItemCategory(item)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-quantity-price">
                                                <span className="item-quantity">{formatQuantity(item.quantity, item)}</span>
                                                <span className="item-price">{formatCurrency(item.totalPrice, purchaseOrder.currency)}</span>
                                            </div>
                                        </div>

                                        {issueItems[item.id] && (
                                            <div className="item-issue-details">
                                                <div className="issue-type-selector">
                                                    <label className="issue-type-label">Issue Type:</label>
                                                    <select
                                                        value={issueType[item.id] || 'NOT_ARRIVED'}
                                                        onChange={(e) => handleIssueTypeChange(item.id, e.target.value)}
                                                        className="issue-type-select"
                                                    >
                                                        <option value="NOT_ARRIVED">Items Never Arrived</option>
                                                        <option value="WRONG_QUANTITY">Wrong Quantity Delivered</option>
                                                        <option value="DAMAGED">Items Damaged</option>
                                                        <option value="WRONG_ITEM">Wrong Items Delivered</option>
                                                        <option value="QUALITY_ISSUE">Quality Issue</option>
                                                        <option value="OTHER">Other Issue</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-items">
                                <p>No items found in this purchase order.</p>
                            </div>
                        )}
                    </div>

                    {/* Comments Section */}
                    <div className="report-issue-comments-section">
                        <label className="comments-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Issue Details <span className="required">*</span>
                        </label>
                        <textarea
                            className="comments-textarea"
                            placeholder="Please provide detailed information about the issue(s). Include any relevant information such as expected delivery date, communication with merchant, etc."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={5}
                        />
                        <div className="comments-help-text">
                            This information will be sent to the procurement team for investigation.
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="report-issue-modal-footer">
                    <div className="footer-info">
                        {hasAnyIssues && comments.trim() ? (
                            <span className="footer-status ready">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Ready to submit
                            </span>
                        ) : (
                            <span className="footer-status warning">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {!hasAnyIssues ? 'Select items with issues' : 'Provide issue details'}
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
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-danger"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasAnyIssues || !comments.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="report-issue-spinner"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="8" x2="12" y2="12"/>
                                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    Report Issue
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportIssueModal;