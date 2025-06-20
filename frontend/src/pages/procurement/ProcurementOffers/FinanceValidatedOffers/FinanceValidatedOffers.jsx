import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiFileText, FiDollarSign, FiList,
    FiUser, FiCalendar, FiFlag  // Added these icons for Request Order Information
} from 'react-icons/fi';

import "../ProcurementOffers.scss";
import "./FinanceValidatedOffers.scss"

// Updated to accept offers, setError, and setSuccess from parent
const FinanceValidatedOffers = ({
                                    offers,
                                    activeOffer,
                                    setActiveOffer,
                                    getTotalPrice,
                                    fetchWithAuth,
                                    API_URL,
                                    setError,
                                    setSuccess
                                }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(''); // Added for role checking

    // Fetch all finance reviewed offers - We're now getting offers as props
    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
    }, []);

    // Handle clicking the Finalize Offer button
    const handleFinalizeClick = async (offerId) => {
        try {
            setLoading(true);
            // Update the offer status to FINALIZING
            await fetchWithAuth(`${API_URL}/offers/${offerId}/status?status=FINALIZING`, {
                method: 'PUT'
            });


        } catch (err) {
            console.error('Error updating offer status to FINALIZING:', err);
            setError('Failed to update offer status. Please try again.');
            setLoading(false);
        }
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Format finance status for display
    const formatFinanceStatus = (status) => {
        if (!status) return 'Not Reviewed';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Format status for display
    const formatStatus = (status) => {
        if (!status) return 'Unknown Status';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Finance Validated Offers</h3>
                </div>

                {loading && !offers.length ? (
                    <div className="procurement-loading">
                        <div className="procurement-spinner"></div>
                        <p>Loading offers...</p>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiDollarSign size={48} className="empty-icon" />
                        <p>No finance validated offers yet. Offers will appear here after finance review.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card ${activeOffer?.id === offer.id ? 'selected' : ''} 
                        ${offer.status === 'FINANCE_ACCEPTED' || offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
                                    offer.status === 'FINANCE_REJECTED' ? 'card-rejected' : 'card-partial'}`}

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
                                            <FiClock /> Updated: {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="procurement-header-actions">
                                {/* Finalize button for finance-accepted offers */}
                                {activeOffer && (activeOffer.status === 'FINANCE_ACCEPTED' || activeOffer.status === 'FINANCE_PARTIALLY_ACCEPTED') && (
                                    <button
                                        className="finalize-offer-button"
                                        onClick={() => handleFinalizeClick(activeOffer.id)}
                                        disabled={loading}
                                    >
                                        <FiCheckCircle /> {loading ? 'Processing...' : 'Finalize Offer'}
                                    </button>
                                )}
                            </div>
                        </div>

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

                        {/* Purchase Order Notification Banner */}
                        {activeOffer && (activeOffer.financeStatus === 'FINANCE_ACCEPTED' ||
                            activeOffer.financeStatus === 'FINANCE_PARTIALLY_ACCEPTED') && (
                            <div className="purchase-order-notification">
                                <div className="notification-icon">
                                    <FiFileText size={20} />
                                </div>
                                <div className="notification-content">
                                    <h4>Purchase Order Created</h4>
                                    <p>A purchase order has been generated for this offer. Visit the Purchase Orders section to view and manage it.</p>
                                </div>
                                <button
                                    className="view-purchase-order-button"
                                    onClick={() => window.location.href = '/procurement/purchase-orders'}
                                >
                                    View Purchase Orders
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                <div className="finance-review-summary">
                                    <h4>Validated Offer Details</h4>
                                    <p className="finance-review-description">
                                        {activeOffer.status === 'FINANCE_ACCEPTED' || activeOffer.status === 'FINANCE_ACCEPTED' ?
                                            'All items in this offer were accepted by finance. Please finalize the offer to create a purchase order.' :
                                            activeOffer.status === 'FINANCE_REJECTED' ?
                                                'This offer was rejected by finance.' :
                                                'Some items in this offer were accepted and some were rejected by finance.'}
                                    </p>

                                    {/* Finance Review Timeline */}
                                    <div className="procurement-timeline">
                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiCheckCircle size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer Submitted</h5>
                                                <p className="timeline-date">
                                                    {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiCheck size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer Accepted</h5>
                                                <p className="timeline-date">
                                                    {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiDollarSign size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Finance Review Completed</h5>
                                                <p className="timeline-date">
                                                    {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {activeOffer.status === 'FINANCE_ACCEPTED' && (
                                            <div className="procurement-timeline-item">
                                                <div className="timeline-icon">
                                                    <FiFileText size={18} />
                                                </div>
                                                <div className="timeline-content">
                                                    <h5>Waiting for Finalization</h5>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Procurement Items with Finance Status */}
                                <div className="procurement-submitted-details">
                                    <h4>Item Review Details</h4>
                                    <div className="procurement-submitted-items">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

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
                                                                    <th>Finance Status</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {offerItems.map((offerItem, idx) => (
                                                                    <tr key={offerItem.id || idx} className={
                                                                        offerItem.financeStatus === 'FINANCE_ACCEPTED' ? 'finance-accepted' :
                                                                            offerItem.financeStatus === 'FINANCE_REJECTED' ? 'finance-rejected' : ''
                                                                    }>
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>
                                                                            <span className={`finance-item-status status-${(offerItem.financeStatus || '').toLowerCase()}`}>
                                                                                {formatFinanceStatus(offerItem.financeStatus)}
                                                                            </span>
                                                                            {offerItem.financeStatus === 'FINANCE_REJECTED' && offerItem.rejectionReason && (
                                                                                <span className="rejection-reason-icon" title={offerItem.rejectionReason}>
                                                                                    <FiX size={14} />
                                                                                </span>
                                                                            )}
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
                                        <span>Total Items Accepted:</span>
                                        <span>
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'FINANCE_ACCEPTED'
                                            ).length || 0}
                                        </span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Total Items Rejected:</span>
                                        <span>
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'FINANCE_REJECTED'
                                            ).length || 0}
                                        </span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Total Approved Value:</span>
                                        <span className={`submitted-total-value text-success`}>
                                            ${getTotalPrice(activeOffer).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="procurement-empty-state-container">
                        <div className="procurement-empty-state">
                            <FiList size={64} color="#CBD5E1" />
                            <h3>No Finance Validated Offer Selected</h3>
                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view details</p>
                            ) : (
                                <p>Finance validated offers will appear here after finance review</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceValidatedOffers;