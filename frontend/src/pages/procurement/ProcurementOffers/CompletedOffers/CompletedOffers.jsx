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
    FiFlag,
    FiDollarSign,
    FiArrowRight
} from 'react-icons/fi';
import "../ProcurementOffers.scss";
import "./CompletedOffers.scss";
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';

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
                                className={`procurement-item-card-completed ${activeOffer?.id === offer.id ? 'selected' : ''} card-success`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                </div>
                                <div className="procurement-item-footer">
                                    <span className="procurement-item-date">
                                        <FiClock />{new Date(offer.createdAt).toLocaleDateString()}
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

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                {/* Use the reusable RequestOrderDetails component */}
                                <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                                <div className="procurement-request-summary-card-completed">
                                    <h4>Offer Timeline</h4>
                                    <p className="procurement-section-description-completed">
                                        This timeline shows the complete journey of this offer from creation to completion.
                                    </p>

                                    {/* NEW TIMELINE DESIGN - MATCHING OTHER COMPONENTS */}
                                    <div className="procurement-timeline-completed">
                                        {/* Request Order Approved Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Request Order Approved</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Approved at: {activeOffer.requestOrder?.approvedAt ? new Date(activeOffer.requestOrder.approvedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="timeline-date-completed">
                                                    <FiUser size={14} /> Approved by: {activeOffer.requestOrder?.approvedBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Offer Submitted Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Offer Submitted</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Submitted at: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="timeline-date-completed">
                                                    <FiUser size={14} /> Submitted by: {activeOffer.createdBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Manager Accepted Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Manager Accepted</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Accepted at: {activeOffer.managerAcceptedAt ? new Date(activeOffer.managerAcceptedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="timeline-date-completed">
                                                    <FiUser size={14} /> Accepted by: {activeOffer.managerApprovedBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Finance Accepted Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Finance Accepted</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Accepted at: {activeOffer.financeAcceptedAt ? new Date(activeOffer.financeAcceptedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="timeline-date-completed">
                                                    <FiUser size={14} /> Accepted by: {activeOffer.financeApprovedBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Offer Finalized Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Offer Finalized</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Finalized at: {activeOffer.finalizedAt ? new Date(activeOffer.finalizedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="timeline-date-completed">
                                                    <FiUser size={14} /> Finalized by: {activeOffer.finalizedBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Completed Step */}
                                        <div className="procurement-timeline-item-completed active-completed">
                                            <div className="timeline-content-completed">
                                                <h5>Offer Completed</h5>
                                                <p className="timeline-date-completed">
                                                    <FiCalendar size={14} /> Completed at: {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                                {purchaseOrder && (
                                                    <p className="timeline-date-completed">
                                                        <FiFileText size={14} /> PO Number: #{purchaseOrder.poNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* END OF NEW TIMELINE DESIGN */}
                                </div>

                                {/* Procurement Items */}
                                <div className="procurement-submitted-details-completed">
                                    <h4>Completed Items</h4>
                                    <div className="procurement-submitted-items-completed">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                            // Skip request items that don't have finance-accepted offer items
                                            if (offerItems.length === 0) return null;

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-completed">
                                                    <div className="submitted-item-header-completed">
                                                        <div className="item-icon-name-completed">
                                                            <div className="item-icon-container-completed">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-completed">
                                                            {requestItem.quantity} {requestItem.itemType.measuringUnit}
                                                        </div>
                                                    </div>

                                                    {offerItems.length > 0 && (
                                                        <div className="submitted-offer-solutions-completed">
                                                            <table className="procurement-offer-entries-table-completed">
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

                                {/* Simple Purchase Order Notification */}
                                {purchaseOrder && (
                                    <div className="purchase-order-notification-simple">
                                        <div className="po-notification-content">
                                            <div className="po-notification-icon">
                                                <FiCheckCircle size={20} />
                                            </div>
                                            <div className="po-notification-text">
                                                <p>A purchase order has been created for this completed offer.</p>
                                            </div>
                                            <button
                                                className="btn-primary"
                                                onClick={() => window.location.href = `/procurement/purchase-orders`}
                                            >
                                                View Purchase Order
                                                <FiArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="procurement-empty-state-container">
                        <div className="procurement-empty-state">
                            <FiList size={64} color="#CBD5E1" />
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