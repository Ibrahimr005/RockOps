import React, { useState, useEffect } from 'react';
import { offerService } from '../../../../../services/procurement/offerService';
import { offerRequestItemService } from '../../../../../services/procurement/offerRequestItemService';
import './OverviewTab.scss';

const OverviewTab = ({ purchaseOrder }) => {

    const [timelineEvents, setTimelineEvents] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [modificationHistory, setModificationHistory] = useState([]);
    const [modificationsLoading, setModificationsLoading] = useState(false);


    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Format date and time helper
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // Format currency
    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };



    // Get item name
    const getItemName = (item) => {
        return item.itemType?.name ||
            item.offerItem?.requestOrderItem?.itemType?.name ||
            item.itemTypeName ||
            "Unknown Item";
    };

    // Get item category
    const getItemCategory = (item) => {
        return item.itemType?.category?.name ||
            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
            item.itemCategory ||
            null;
    };

    // Format quantity
    const formatQuantity = (item) => {
        const unit = item.itemType?.measuringUnit ||
            item.offerItem?.requestOrderItem?.itemType?.measuringUnit ||
            'units';
        const quantity = item.quantity || 0;
        return `${quantity} ${unit}`;
    };

    // Check if an item was modified
    const getItemModification = (item) => {
        if (!modificationHistory || modificationHistory.length === 0) return null;

        const itemTypeId = item.itemType?.id || item.offerItem?.requestOrderItem?.itemType?.id;
        if (!itemTypeId) return null;

        // Find modifications for this specific item
        const itemMods = modificationHistory.filter(mod =>
            mod.itemTypeId === itemTypeId
        );

        if (itemMods.length === 0) return null;

        // Get the most recent modification
        const latestMod = itemMods[0]; // Already sorted by timestamp desc

        return {
            action: latestMod.action,
            oldQuantity: latestMod.oldQuantity,
            newQuantity: latestMod.newQuantity,
            modifiedBy: latestMod.actionBy,
            modifiedAt: latestMod.timestamp
        };
    };

    useEffect(() => {
        const fetchTimeline = async () => {
            if (purchaseOrder?.offer?.id) {
                setTimelineLoading(true);
                try {
                    const timeline = await offerService.getTimeline(purchaseOrder.offer.id);
                    setTimelineEvents(timeline || []);
                } catch (err) {
                    console.error('Error fetching timeline:', err);
                }
                setTimelineLoading(false);
            }
        };
        fetchTimeline();
    }, [purchaseOrder?.offer?.id]);

    useEffect(() => {
        const fetchModificationHistory = async () => {
            if (purchaseOrder?.offer?.id) {
                setModificationsLoading(true);
                try {
                    const history = await offerRequestItemService.getModificationHistory(purchaseOrder.offer.id);
                    setModificationHistory(Array.isArray(history) ? history : []);
                } catch (err) {
                    console.error('Error fetching modification history:', err);
                    setModificationHistory([]);
                }
                setModificationsLoading(false);
            }
        };
        fetchModificationHistory();
    }, [purchaseOrder?.offer?.id]);;

    useEffect(() => {
        const updateTimelineLineHeight = () => {
            const container = document.querySelector('.offer-timeline-po-container');
            const line = document.querySelector('.offer-timeline-po-line');
            const steps = document.querySelectorAll('.offer-timeline-po-step');

            if (container && line && steps.length > 0) {
                const lastStep = steps[steps.length - 1];
                const lastMarker = lastStep.querySelector('.offer-timeline-po-marker');

                if (lastMarker) {
                    // Get the offset from the top of the container to the last marker
                    const containerRect = container.getBoundingClientRect();
                    const markerRect = lastMarker.getBoundingClientRect();

                    // Calculate relative to the scrollable content
                    const lineHeight = (markerRect.top - containerRect.top) + container.scrollTop + 7;

                    line.style.height = `${lineHeight}px`;
                }
            }
        };

        if (!timelineLoading && timelineEvents.length > 0) {
            setTimeout(updateTimelineLineHeight, 250);
        }
    }, [timelineLoading, timelineEvents, purchaseOrder]);

    // Get modification badge component
    const getModificationBadge = (modification) => {
        if (!modification) return null;

        const badgeConfig = {
            ADD: { label: 'ADDED', className: 'mod-badge-added' },
            EDIT: { label: 'MODIFIED', className: 'mod-badge-edited' },
            DELETE: { label: 'DELETED', className: 'mod-badge-deleted' }
        };

        const config = badgeConfig[modification.action] || badgeConfig.EDIT;

        return (
            <div className={`modification-badge ${config.className}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {modification.action === 'ADD' && <path d="M12 5v14m-7-7h14"/>}
                    {modification.action === 'EDIT' && <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>}
                    {modification.action === 'EDIT' && <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>}
                    {modification.action === 'DELETE' && <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>}
                </svg>
                {config.label}
            </div>
        );
    };

    return (
        <div className="overview-tab">
            {/* Purchase Order Overview Section */}
            <div className="overview-section">
                <h3 className="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Purchase Order Details
                </h3>
                <div className="overview-grid">
                    <div className="overview-item">
                        <div className="overview-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                            </svg>
                        </div>
                        <div className="overview-content">
                            <span className="overview-label">PO Number</span>
                            <span className="overview-value">#{purchaseOrder.poNumber}</span>
                        </div>
                    </div>

                    <div className="overview-item">
                        <div className="overview-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div className="overview-content">
                            <span className="overview-label">Created Date</span>
                            <span className="overview-value">{formatDate(purchaseOrder.createdAt)}</span>
                        </div>
                    </div>

                    {purchaseOrder.expectedDeliveryDate && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12,6 12,12 16,14"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Expected Delivery</span>
                                <span className="overview-value">{formatDate(purchaseOrder.expectedDeliveryDate)}</span>
                            </div>
                        </div>
                    )}

                    {purchaseOrder.createdBy && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created By</span>
                                <span className="overview-value">{purchaseOrder.createdBy}</span>
                            </div>
                        </div>
                    )}

                    <div className="overview-item">
                        <div className="overview-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="overview-content">
                            <span className="overview-label">Total Amount</span>
                            <span className="overview-value">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</span>
                        </div>
                    </div>

                    {purchaseOrder.paymentTerms && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                    <line x1="1" y1="10" x2="23" y2="10"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Payment Terms</span>
                                <span className="overview-value">{purchaseOrder.paymentTerms}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Request Order Section */}
            {purchaseOrder.requestOrder && (
                <div className="overview-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                            <path d="M20 4v7a2 2 0 01-2 2H6"/>
                        </svg>
                        Request Order Information
                    </h3>
                    <div className="request-info">
                        <div className="request-item">
                            <div className="request-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <div className="request-content">
                                <span className="request-label">Title</span>
                                <span className="request-value">{purchaseOrder.requestOrder.title}</span>
                            </div>
                        </div>

                        {purchaseOrder.requestOrder.description && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="17" y1="10" x2="3" y2="10"/>
                                        <line x1="21" y1="6" x2="3" y2="6"/>
                                        <line x1="21" y1="14" x2="3" y2="14"/>
                                        <line x1="17" y1="18" x2="3" y2="18"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Description</span>
                                    <span className="request-value">{purchaseOrder.requestOrder.description}</span>
                                </div>
                            </div>
                        )}

                        <div className="request-item">
                            <div className="request-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="request-content">
                                <span className="request-label">Requester</span>
                                <span className="request-value">{purchaseOrder.requestOrder.requesterName}</span>
                            </div>
                        </div>

                        {purchaseOrder.requestOrder.employeeRequestedBy && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="8.5" cy="7" r="4"/>
                                        <line x1="20" y1="8" x2="20" y2="14"/>
                                        <line x1="23" y1="11" x2="17" y2="11"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Employee Requested By</span>
                                    <span className="request-value">{purchaseOrder.requestOrder.employeeRequestedBy}</span>
                                </div>
                            </div>
                        )}

                        {purchaseOrder.requestOrder.createdAt && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Created Date</span>
                                    <span className="request-value">{formatDate(purchaseOrder.requestOrder.createdAt)}</span>
                                </div>
                            </div>
                        )}

                        {purchaseOrder.requestOrder.createdBy && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Created By</span>
                                    <span className="request-value">{purchaseOrder.requestOrder.createdBy}</span>
                                </div>
                            </div>
                        )}

                        {purchaseOrder.requestOrder.approvedAt && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Approved Date</span>
                                    <span className="request-value">{formatDate(purchaseOrder.requestOrder.approvedAt)}</span>
                                </div>
                            </div>
                        )}

                        {purchaseOrder.requestOrder.approvedBy && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="8.5" cy="7" r="4"/>
                                        <polyline points="17 11 19 13 23 9"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Approved By</span>
                                    <span className="request-value">{purchaseOrder.requestOrder.approvedBy}</span>
                                </div>
                            </div>
                        )}

                        {purchaseOrder.requestOrder.deadline && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Deadline</span>
                                    <span className="request-value">{formatDate(purchaseOrder.requestOrder.deadline)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Offer Section */}
            {purchaseOrder.offer && (
                <div className="overview-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                            <path d="M3 12h6m12 0h-6"/>
                        </svg>
                        Related Offer
                    </h3>
                    <div className="overview-grid">
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Title</span>
                                <span className="overview-value">{purchaseOrder.offer.title}</span>
                            </div>
                        </div>

                        {purchaseOrder.offer.description && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="17" y1="10" x2="3" y2="10"/>
                                        <line x1="21" y1="6" x2="3" y2="6"/>
                                        <line x1="21" y1="14" x2="3" y2="14"/>
                                        <line x1="17" y1="18" x2="3" y2="18"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Description</span>
                                    <span className="overview-value">{purchaseOrder.offer.description}</span>
                                </div>
                            </div>
                        )}

                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created By</span>
                                <span className="overview-value">{purchaseOrder.offer.createdBy}</span>
                            </div>
                        </div>

                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created Date</span>
                                <span className="overview-value">{formatDate(purchaseOrder.offer.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Offer Timeline */}
                    <div className="offer-timeline-po-wrapper">
                        <h4 className="offer-timeline-po-header">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            Offer Timeline
                        </h4>

                        {!timelineLoading && timelineEvents.length > 4 && (
                            <div className="offer-timeline-po-scroll-hint">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <polyline points="19 12 12 19 5 12"/>
                                </svg>
                                Scroll to see full timeline
                            </div>
                        )}

                        {timelineLoading ? (
                            <div className="offer-timeline-po-loading">Loading timeline...</div>
                        ) : (
                            <div className="offer-timeline-po-container">
                                <div className="offer-timeline-po-line"></div>
                                {/* Request Order Approved */}
                                {purchaseOrder.requestOrder?.approvedAt && (
                                    <div className="offer-timeline-po-step offer-timeline-po-step-completed">
                                        <div className="offer-timeline-po-marker"></div>
                                        <div className="offer-timeline-po-content">
                                            <div className="offer-timeline-po-title">Request Order Approved</div>
                                            <div className="offer-timeline-po-info">
                <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Approved by: {purchaseOrder.requestOrder.approvedBy || 'N/A'}
                </span>
                                                <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Approved at: {formatDate(purchaseOrder.requestOrder.approvedAt)}
                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Offer Created */}
                                <div className="offer-timeline-po-step offer-timeline-po-step-completed">
                                    <div className="offer-timeline-po-marker"></div>
                                    <div className="offer-timeline-po-content">
                                        <div className="offer-timeline-po-title">Offer Created</div>
                                        <div className="offer-timeline-po-info">
            <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                Created by: {purchaseOrder.offer.createdBy || 'N/A'}
            </span>
                                            <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Created at: {formatDate(purchaseOrder.offer.createdAt)}
            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Timeline Events */}
                                {timelineEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className={`offer-timeline-po-step ${
                                            event.eventType === 'MANAGER_REJECTED' || event.eventType === 'FINANCE_REJECTED'
                                                ? 'offer-timeline-po-step-rejected'
                                                : 'offer-timeline-po-step-completed'
                                        }`}
                                    >
                                        <div className="offer-timeline-po-marker"></div>
                                        <div className="offer-timeline-po-content">
                                            <div className="offer-timeline-po-title">{event.displayTitle}</div>
                                            <div className="offer-timeline-po-info">
                <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    {event.eventType === 'OFFER_SUBMITTED' && 'Submitted by: '}
                    {event.eventType === 'MANAGER_ACCEPTED' && 'Accepted by: '}
                    {event.eventType === 'MANAGER_REJECTED' && 'Rejected by: '}
                    {event.eventType === 'FINANCE_ACCEPTED' && 'Approved by: '}
                    {event.eventType === 'FINANCE_REJECTED' && 'Rejected by: '}
                    {event.eventType === 'FINANCE_PARTIALLY_ACCEPTED' && 'Processed by: '}
                    {event.eventType === 'OFFER_FINALIZED' && 'Finalized by: '}
                    {event.eventType === 'OFFER_COMPLETED' && 'Completed by: '}
                    {event.eventType === 'OFFER_RETRIED' && 'Retried by: '}
                    {!['OFFER_SUBMITTED', 'MANAGER_ACCEPTED', 'MANAGER_REJECTED', 'FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED', 'OFFER_FINALIZED', 'OFFER_COMPLETED', 'OFFER_RETRIED'].includes(event.eventType) && 'Processed by: '}
                    {event.actionBy || 'N/A'}
                </span>
                                                <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                                                    {event.eventType === 'OFFER_SUBMITTED' && 'Submitted at: '}
                                                    {event.eventType === 'MANAGER_ACCEPTED' && 'Accepted at: '}
                                                    {event.eventType === 'MANAGER_REJECTED' && 'Rejected at: '}
                                                    {event.eventType === 'FINANCE_ACCEPTED' && 'Approved at: '}
                                                    {event.eventType === 'FINANCE_REJECTED' && 'Rejected at: '}
                                                    {event.eventType === 'FINANCE_PARTIALLY_ACCEPTED' && 'Processed at: '}
                                                    {event.eventType === 'OFFER_FINALIZED' && 'Finalized at: '}
                                                    {event.eventType === 'OFFER_COMPLETED' && 'Completed at: '}
                                                    {event.eventType === 'OFFER_RETRIED' && 'Retried at: '}
                                                    {!['OFFER_SUBMITTED', 'MANAGER_ACCEPTED', 'MANAGER_REJECTED', 'FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED', 'OFFER_FINALIZED', 'OFFER_COMPLETED', 'OFFER_RETRIED'].includes(event.eventType) && 'Processed at: '}
                                                    {formatDate(event.eventTime)}
                </span>
                                            </div>
                                            {event.notes && (event.eventType === 'MANAGER_REJECTED' || event.eventType === 'FINANCE_REJECTED') && (
                                                <div className="offer-timeline-po-rejection">
                                                    Rejection reason: {event.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Purchase Order Created */}
                                <div className="offer-timeline-po-step offer-timeline-po-step-completed">
                                    <div className="offer-timeline-po-marker"></div>
                                    <div className="offer-timeline-po-content">
                                        <div className="offer-timeline-po-title">Purchase Order Created</div>
                                        <div className="offer-timeline-po-info">
            <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                Created by: {purchaseOrder.createdBy || 'N/A'}
            </span>
                                            <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Created at: {formatDate(purchaseOrder.createdAt)}
            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Item Modifications History Section */}
            {modificationHistory && modificationHistory.length > 0 && (
                <div className="overview-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Item Modification History
                        <span className="modification-count">{modificationHistory.length} changes</span>
                    </h3>

                    <div className="modifications-timeline-container">
                        {modificationsLoading ? (
                            <div className="modifications-loading">Loading modification history...</div>
                        ) : (
                            <div className="modifications-list">
                                {modificationHistory.map((mod, index) => (
                                    <div key={mod.id || index} className={`modification-entry modification-${mod.action.toLowerCase()}`}>
                                        <div className="modification-icon">
                                            {mod.action === 'ADD' && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                                </svg>
                                            )}
                                            {mod.action === 'EDIT' && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            )}
                                            {mod.action === 'DELETE' && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                </svg>
                                            )}
                                        </div>

                                        <div className="modification-content">
                                            <div className="modification-header">
                                                <div className="modification-action-badge">
                                                    {mod.action === 'ADD' && 'Item Added'}
                                                    {mod.action === 'EDIT' && 'Item Modified'}
                                                    {mod.action === 'DELETE' && 'Item Deleted'}
                                                </div>
                                                <div className="modification-timestamp">
                                                    {formatDateTime(mod.timestamp)}
                                                </div>
                                            </div>

                                            <div className="modification-item-name">{mod.itemTypeName}</div>

                                            <div className="modification-details">
                                                {mod.action === 'ADD' && (
                                                    <div className="modification-change">
                                                        <span className="change-label">Quantity:</span>
                                                        <span className="change-value new-value">
                                                            {mod.newQuantity} {mod.itemTypeMeasuringUnit}
                                                        </span>
                                                    </div>
                                                )}

                                                {mod.action === 'EDIT' && (
                                                    <>
                                                        {mod.oldQuantity !== mod.newQuantity && (
                                                            <div className="modification-change">
                                                                <span className="change-label">Quantity:</span>
                                                                <span className="change-value old-value">
                                                                    {mod.oldQuantity} {mod.itemTypeMeasuringUnit}
                                                                </span>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="9 18 15 12 9 6"/>
                                                                </svg>
                                                                <span className="change-value new-value">
                                                                    {mod.newQuantity} {mod.itemTypeMeasuringUnit}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {mod.oldComment !== mod.newComment && (
                                                            <div className="modification-change">
                                                                <span className="change-label">Comment:</span>
                                                                {mod.oldComment && (
                                                                    <span className="change-value old-value">"{mod.oldComment}"</span>
                                                                )}
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="9 18 15 12 9 6"/>
                                                                </svg>
                                                                <span className="change-value new-value">
                                                                    {mod.newComment ? `"${mod.newComment}"` : 'No comment'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {mod.action === 'DELETE' && (
                                                    <div className="modification-change">
                                                        <span className="change-label">Quantity:</span>
                                                        <span className="change-value old-value">
                                                            {mod.oldQuantity} {mod.itemTypeMeasuringUnit}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="modification-footer">
                                                <div className="modification-user">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                        <circle cx="12" cy="7" r="4"/>
                                                    </svg>
                                                    {mod.actionBy}
                                                </div>
                                                {mod.notes && (
                                                    <div className="modification-notes">{mod.notes}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Purchase Order Items Section */}
            <div className="overview-section">
                <h3 className="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Purchase Order Items ({purchaseOrder.purchaseOrderItems?.length || 0})
                </h3>

                {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                    <>
                        {/* Group items by merchant */}
                        {Object.entries(
                            purchaseOrder.purchaseOrderItems.reduce((acc, item) => {
                                const merchantId = item.merchant?.id || 'no-merchant';
                                const merchantName = item.merchant?.name || 'Unknown Merchant';

                                if (!acc[merchantId]) {
                                    acc[merchantId] = {
                                        merchantName: merchantName,
                                        merchant: item.merchant,
                                        items: []
                                    };
                                }
                                acc[merchantId].items.push(item);
                                return acc;
                            }, {})
                        ).map(([merchantId, merchantGroup]) => (
                            <div key={merchantId} className="merchant-group">
                                {/* Merchant Header */}
                                <div className="merchant-header">
                                    <div className="merchant-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9 22 9 12 15 12 15 22"/>
                                        </svg>
                                    </div>
                                    <div className="merchant-info">
                                        <div className="merchant-name">{merchantGroup.merchantName}</div>
                                        <div className="merchant-item-count">
                                            {merchantGroup.items.length} {merchantGroup.items.length === 1 ? 'item' : 'items'}
                                        </div>
                                    </div>
                                    {merchantGroup.merchant?.contactPhone && (
                                        <div className="merchant-contact">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                            </svg>
                                            {merchantGroup.merchant.contactPhone}
                                        </div>
                                    )}
                                </div>

                                {/* Items Grid for this Merchant */}
                                <div className="items-grid">
                                    {merchantGroup.items.map((item, index) => (
                                        <div key={item.id || index} className="item-card">
                                            <div className="item-header">
                                                <div className="item-icon-container">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                    </svg>
                                                </div>
                                                <div className="item-title-container">
                                                    <div className="item-name">{getItemName(item)}</div>
                                                    {getItemCategory(item) && (
                                                        <div className="item-category">{getItemCategory(item)}</div>
                                                    )}
                                                </div>
                                                <div className="item-quantity">{formatQuantity(item)}</div>
                                            </div>

                                            <div className="item-divider"></div>

                                            <div className="item-details">
                                                <div className="item-detail-row">
                                                    <span className="item-detail-label">Unit Price:</span>
                                                    <span className="item-detail-value">
                                            {formatCurrency(item.unitPrice, item.currency || purchaseOrder.currency)}
                                        </span>
                                                </div>
                                                <div className="item-detail-row">
                                                    <span className="item-detail-label">Total Price:</span>
                                                    <span className="item-detail-value">
                                            {formatCurrency(item.totalPrice, item.currency || purchaseOrder.currency)}
                                        </span>
                                                </div>
                                                {item.estimatedDeliveryDays && (
                                                    <div className="item-detail-row">
                                                        <span className="item-detail-label">Delivery:</span>
                                                        <span className="item-detail-value">
                                                {item.estimatedDeliveryDays} days
                                            </span>
                                                    </div>
                                                )}
                                            </div>

                                            {item.comment && (
                                                <>
                                                    <div className="item-divider"></div>
                                                    <div className="item-comment">
                                                        <div className="item-comment-label">Comment:</div>
                                                        <div className="item-comment-text">{item.comment}</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 12h8"/>
                            </svg>
                        </div>
                        <div className="empty-content">
                            <p className="empty-title">No items found</p>
                            <p className="empty-description">This purchase order doesn't contain any items.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewTab;