import React, { useState } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiRefreshCw, FiUser, FiCalendar, FiFlag, FiFileText  // Added these icons
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./ManagerValidatedOffers.scss"

const ValidatedOffers = ({
                             offers,
                             activeOffer,
                             setActiveOffer,
                             getTotalPrice,
                             onRetryOffer
                         }) => {
    // Add state for success and error messages
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    // Define API_URL constant
    const API_URL = 'http://localhost:8080/api/v1';

    // Define fetchWithAuth utility function if it doesn't exist elsewhere
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'An error occurred');
        }

        return response.json();
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    const handleRetryOffer = async (offer) => {
        try {
            // Set loading state
            setIsLoading(true);

            // Clear any previous messages
            setSuccess('');
            setError('');

            // Call backend to create a new offer from the rejected one
            const response = await fetchWithAuth(`${API_URL}/offers/${offer.id}/retry`, {
                method: 'POST'
            });

            // If successful, redirect to the in-progress tab with the new offer
            if (response && response.id) {
                setSuccess('New offer created successfully.');

                // Call the callback to navigate to the in-progress tab
                if (onRetryOffer) {
                    onRetryOffer(response);
                }
            }
        } catch (error) {
            console.error('Error retrying offer:', error);

            // Handle the specific error for already existing retry
            if (error.message && error.message.includes("A retry for this offer is already in progress. Please complete or delete the existing retry before creating a new one.")) {
                setError('A retry for this offer is already in progress. Please complete the existing retry first.');
                setTimeout(() => setError(null), 3000);
            } else {
                console.log("messsss:" + error.message);
                setError('Failed to create new offer. Please try again.');
                setTimeout(() => setError(null), 3000);
            }
        } finally {
            setIsLoading(false);
            setTimeout(() => setSuccess(null), 3000);

        }
    };
    return (
        <div className="procurement-offers-main-content">
            {success && (
                <div className="procurement-notification procurement-notification-success">
                    <FiCheckCircle /> {success}
                </div>
            )}
            {error && (
                <div className="procurement-notification procurement-notification-error">
                    <FiX /> {error}
                </div>
            )}



            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Validated Offers</h3>
                </div>

                {offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiCheck size={48} className="empty-icon" />
                        <p>No validated offers yet. Offers will appear here once they are accepted or rejected.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card ${activeOffer?.id === offer.id ? 'selected' : ''} ${offer.status === 'MANAGERACCEPTED' ? 'card-accepted' : 'card-rejected'}`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                    {/*<span className={`procurement-status-badge status-${offer.status.toLowerCase()}`}>*/}
                                    {/*    {offer.status}*/}
                                    {/*</span>*/}
                                </div>
                                <div className="procurement-item-footer">
                                    <span className="procurement-item-date">
                                        <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
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
                                            {activeOffer.status.replace("MANAGER", "MANAGER ")}
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiClock /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="procurement-header-actions">
                                {/* Retry button moved to the right end of the header */}
                                {activeOffer.status === 'MANAGERREJECTED' && (
                                    <button
                                        className="procurement-button primary"
                                        onClick={() => handleRetryOffer(activeOffer)}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="button-spinner"></div>
                                        ) : (
                                            <FiRefreshCw size={16} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Request Order Information Card - ADDED HERE */}
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

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                <div className="procurement-request-summary-card">



                                    <h4>Validated Offer Details</h4>
                                    <p className="procurement-section-description">
                                        {activeOffer.status === 'MANAGERACCEPTED'
                                            ? 'This offer has been accepted and is now being processed by the finance.'
                                            : 'This offer has been rejected by the manager.'}
                                    </p>

                                    {/* Status Timeline */}
                                    <div className="procurement-timeline">
                                        <div className="procurement-timeline-item active">
                                            <div className="timeline-icon">
                                                <FiCheckCircle size={18} />
                                            </div>
                                            <div className="timeline-content">
                                                <h5>Offer Submitted</h5>
                                                <p className="timeline-date">{new Date(activeOffer.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className={`procurement-timeline-item ${activeOffer.status === 'MANAGERACCEPTED' ? 'active' : 'rejected'}`}>
                                            <div className="timeline-icon">
                                                {activeOffer.status === 'MANAGERACCEPTED' ? <FiCheckCircle size={18} /> : <FiX size={18} />}
                                            </div>
                                            <div className="timeline-content">
                                                <h5>{activeOffer.status === 'MANAGERACCEPTED' ? 'Offer Accepted' : 'Offer Rejected'}</h5>
                                                <p className="timeline-date">{new Date(activeOffer.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {activeOffer.status === 'MANAGERACCEPTED' && (
                                            <div className="procurement-timeline-item">
                                                <div className="timeline-icon">
                                                    <FiRefreshCw size={18} />
                                                </div>
                                                <div className="timeline-content">
                                                    <h5>Finance Processing</h5>
                                                </div>
                                            </div>
                                        )}
                                    </div>



                                    {activeOffer.status === 'MANAGERREJECTED' && (
                                        <div className="validated-rejection-reason">
                                            <h6>Rejection Reason:</h6>
                                            <p>{activeOffer.rejectionReason || 'No rejection reason provided'}</p>
                                        </div>
                                    )}


                                </div>

                                {/* Rest of the component remains the same */}
                                <div className="procurement-submitted-details">
                                    <h4>Procurement Solutions</h4>
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
                                                                    <th>Est. Delivery</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {offerItems.map((offerItem, idx) => (
                                                                    <tr key={offerItem.id || idx}>
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>{offerItem.estimatedDeliveryDays} days</td>
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
                                        <span>Total Items:</span>
                                        <span>{activeOffer.requestOrder?.requestItems?.length || 0}</span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Total Value:</span>
                                        <span className={`submitted-total-value ${activeOffer.status === 'MANAGERACCEPTED' ? 'text-success' : 'text-danger'}`}>
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
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
                                <path d="M18 14v4" />
                                <path d="M15 18h6" />
                            </svg>

                            <h3>No Validated Offers Selected</h3>

                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view details</p>
                            ) : (
                                <p>Offers will appear here once they are accepted or rejected</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ValidatedOffers;