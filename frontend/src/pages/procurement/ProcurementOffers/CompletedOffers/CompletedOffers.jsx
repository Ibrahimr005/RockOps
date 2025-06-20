import React, { useState } from 'react';
import {
    FiPackage,
    FiClock,
    FiCheckCircle,
    FiFileText,
    FiList,
    FiExternalLink,
    FiUser,
    FiCalendar,
    FiFlag
} from 'react-icons/fi';
import "../ProcurementOffers.scss";
import "./CompletedOffers.scss";

const CompletedOffers = ({
                             offers,
                             activeOffer,
                             setActiveOffer,
                             getTotalPrice,
                             fetchWithAuth,
                             API_URL
                         }) => {
    const [loading, setLoading] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState(null);

    // Format status for display
    const formatStatus = (status) => {
        if (!status) return 'Unknown Status';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Get purchase order for the selected offer
    const fetchPurchaseOrder = async (offerId) => {
        if (!offerId) return;

        setLoading(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/purchaseOrders/offers/${offerId}/purchase-order`);
            setPurchaseOrder(response);
        } catch (err) {
            console.error('Error fetching purchase order:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => (item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId) &&
                item.financeStatus === 'FINANCE_ACCEPTED'  // Only show finance accepted items
        );
    };

    // Fetch purchase order when active offer changes
    React.useEffect(() => {
        if (activeOffer && activeOffer.status === 'COMPLETED') {
            fetchPurchaseOrder(activeOffer.id);
        } else {
            setPurchaseOrder(null);
        }
    }, [activeOffer]);

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Completed Offers</h3>
                </div>

                {loading && !offers.length ? (
                    <div className="procurement-loading">
                        <div className="procurement-spinner"></div>
                        <p>Loading offers...</p>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiCheckCircle size={48} className="empty-icon" />
                        <p>No completed offers yet. Completed offers will appear here.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card ${activeOffer?.id === offer.id ? 'selected' : ''} card-success`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                </div>
                                <div className="procurement-item-footer">
                                    <span className="procurement-item-date">
                                        <FiClock /> {new Date(offer.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Offer Details Section */}
            <div className="procurement-details-section">
                {activeOffer ? (
                    <div className="procurement-details-content">
                        <div className="procurement-details-header">
                            <div className="procurement-header-content">
                                <div className="procurement-title-section">
                                    <h2 className="procurement-main-title">{activeOffer.title}</h2>
                                    <div className="procurement-header-meta">
                                        <span className={`procurement-status-badge status-${activeOffer.status.toLowerCase()}`}>
                                            {formatStatus(activeOffer.status)}
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiClock /> Completed: {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Purchase Order Information Banner - MOVED BEFORE Request Order */}
                        {purchaseOrder && (
                            <div className="purchase-order-notification">
                                <div className="notification-icon">
                                    <FiFileText size={20} />
                                </div>
                                <div className="notification-content">
                                    <h4>Purchase Order Created</h4>
                                    <p>PO Number: <strong>#{purchaseOrder.poNumber}</strong></p>
                                    <p>Created: {new Date(purchaseOrder.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                    className="view-purchase-order-details-button"
                                    onClick={() => window.location.href = `/procurement/purchase-orders/${purchaseOrder.id}`}
                                >
                                    View Details
                                </button>
                            </div>
                        )}

                        {/* Request Order Information Card */}
                        <div className="procurement-request-order-info-card">
                            <h4>Request Order Information</h4>

                            <div className="procurement-request-order-details-grid">
                                <div className="request-order-detail-item">
                                    <div className="request-order-detail-icon">
                                        <FiUser size={18} />
                                    </div>
                                    <div className="request-order-detail-content">
                                        <span className="request-order-detail-label">Requester</span>
                                        <span className="request-order-detail-value">{activeOffer.requestOrder?.requesterName || 'Unknown'}</span>
                                    </div>
                                </div>

                                <div className="request-order-detail-item">
                                    <div className="request-order-detail-icon">
                                        <FiCalendar size={18} />
                                    </div>
                                    <div className="request-order-detail-content">
                                        <span className="request-order-detail-label">Request Date</span>
                                        <span className="request-order-detail-value">{activeOffer.requestOrder?.createdAt ? new Date(activeOffer.requestOrder.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="request-order-detail-item">
                                    <div className="request-order-detail-icon">
                                        <FiCalendar size={18} />
                                    </div>
                                    <div className="request-order-detail-content">
                                        <span className="request-order-detail-label">Deadline</span>
                                        <span className="request-order-detail-value">{activeOffer.requestOrder?.deadline ? new Date(activeOffer.requestOrder.deadline).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="request-order-detail-item">
                                    <div className="request-order-detail-icon">
                                        <FiUser size={18} />
                                    </div>
                                    <div className="request-order-detail-content">
                                        <span className="request-order-detail-label">Created By</span>
                                        <span className="request-order-detail-value">{activeOffer.requestOrder?.createdBy || 'Unknown'}</span>
                                    </div>
                                </div>

                                {activeOffer.requestOrder?.priority && (
                                    <div className="request-order-detail-item">
                                        <div className="request-order-detail-icon">
                                            <FiFlag size={18} />
                                        </div>
                                        <div className="request-order-detail-content">
                                            <span className="request-order-detail-label">Priority</span>
                                            <span className={`request-order-detail-value request-priority ${activeOffer.requestOrder.priority.toLowerCase()}`}>
                                                {activeOffer.requestOrder.priority}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {activeOffer.requestOrder?.description && (
                                    <div className="request-order-detail-item description-item">
                                        <div className="request-order-detail-icon">
                                            <FiFileText size={18} />
                                        </div>
                                        <div className="request-order-detail-content">
                                            <span className="request-order-detail-label">Description</span>
                                            <p className="request-order-detail-value description-text">
                                                {activeOffer.requestOrder.description}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                <div className="finance-review-summary">
                                    <h4>Completed Offer Summary</h4>
                                    <p className="finance-review-description">
                                        This offer has been completed successfully. All items have been procured and a purchase order has been generated.
                                    </p>

                                    {/* Completion Timeline */}
                                    <div className="procurement-timeline">
                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiClock size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer Created</h5>
                                                <p className="timeline-date">
                                                    {new Date(activeOffer.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiCheckCircle size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer Accepted & Finance Approved</h5>
                                            </div>
                                        </div>

                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiFileText size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer finalized</h5>
                                                {purchaseOrder && (
                                                    <p className="timeline-date">
                                                        {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiCheckCircle size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Purchase Order Created</h5>
                                                <p className="timeline-date">
                                                    {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Procurement Items */}
                                <div className="procurement-submitted-details">
                                    <h4>Procured Items</h4>
                                    <div className="procurement-submitted-items">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                            // Skip request items that don't have finance-accepted offer items
                                            if (offerItems.length === 0) return null;

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card">
                                                    <div className="submitted-item-header">
                                                        <div className="item-icon-name">
                                                            <div className="item-icon-container">
                                                                <FiPackage size={20} />
                                                            </div>
                                                            <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity">
                                                            {requestItem.quantity} {requestItem.itemType.measuringUnit}
                                                        </div>
                                                    </div>

                                                    {offerItems.length > 0 && (
                                                        <div className="submitted-offer-solutions">
                                                            <table className="procurement-offer-entries-table">
                                                                <thead>
                                                                <tr>
                                                                    <th>Merchant</th>
                                                                    <th>Quantity</th>
                                                                    <th>Unit Price</th>
                                                                    <th>Total</th>
                                                                    <th>Status</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {offerItems.map((offerItem, idx) => (
                                                                    <tr key={offerItem.id || idx} className="item-completed">
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>
                                                                            <span className="completed-item-status">
                                                                                <FiCheckCircle size={14} /> Completed
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Total Summary */}
                                <div className="procurement-submitted-summary">
                                    <div className="submitted-summary-row">
                                        <span>Total Items Procured:</span>
                                        <span>
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'FINANCE_ACCEPTED'
                                            ).length || 0}
                                        </span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Total Value:</span>
                                        <span className="submitted-total-value text-success">
                                            ${getTotalPrice(activeOffer).toFixed(2)}
                                        </span>
                                    </div>
                                    {purchaseOrder && (
                                        <div className="submitted-summary-row">
                                            <span>Purchase Order:</span>
                                            <span className="po-link">
                                                <a href={`/procurement/purchase-orders/${purchaseOrder.id}`}>
                                                    #{purchaseOrder.poNumber}
                                                </a>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="procurement-empty-state-container">
                        <div className="procurement-empty-state">
                            <FiCheckCircle size={64} color="#10B981" />
                            <h3>No Completed Offer Selected</h3>
                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view completion details</p>
                            ) : (
                                <p>Completed offers will appear here once procurement is finished</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompletedOffers;