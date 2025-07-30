import React, { useState } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiRefreshCw, FiUser, FiCalendar, FiFlag, FiFileText, FiInbox, FiAlertTriangle,
    FiShoppingCart, FiTrash2, FiDollarSign
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./ManagerValidatedOffers.scss"

import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';

const ValidatedOffers = ({
                             offers,
                             activeOffer,
                             setActiveOffer,
                             getTotalPrice,
                             onRetryOffer,
                             onDeleteOffer // Add delete callback prop
                         }) => {
    // Add state for success and error messages
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

        const handleDeleteOffer = async (offer) => {
            try {
                // Set loading state
                setIsLoading(true);

                // Clear any previous messages
                setSuccess('');
                setError('');

                // Use the offerService to delete the offer
                await offerService.deleteOffer(offer.id);

                // Call the callback to update the parent component
                if (onDeleteOffer) {
                    onDeleteOffer(offer.id);
                }

                setSuccess('Offer deleted successfully.');
            } catch (error) {
                console.error('Error deleting offer:', error);
                setError('Failed to delete offer. Please try again.');
                setTimeout(() => setError(null), 3000);
            } finally {
                setIsLoading(false);
                setTimeout(() => setSuccess(null), 3000);
            }
        };

        const handleRetryOffer = async (offer) => {
            try {
                // Set loading state
                setIsLoading(true);

                // Clear any previous messages
                setSuccess('');
                setError('');

                // Use the offerService instead of direct API call
                const response = await offerService.retryOffer(offer.id);

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
                            <FiInbox size={48} className="empty-icon" />
                            <p>No validated offers yet. Offers will appear here once they are accepted or rejected.</p>
                        </div>
                    ) : (
                        <div className="procurement-items-list-manager">
                            {offers.map(offer => (
                                <div
                                    key={offer.id}
                                    className={`procurement-item-card-manager ${activeOffer?.id === offer.id ? 'selected' : ''} ${offer.status === 'MANAGERACCEPTED' ? 'card-accepted' : 'card-rejected'}`}
                                    onClick={() => setActiveOffer(offer)}
                                >
                                    <div className="procurement-item-header-manager">
                                        <h4>{offer.title}</h4>
                                    </div>
                                    <div className="procurement-item-footer-manager">
                                    <span className="procurement-item-date-manager">
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
                                    {/* Action buttons for rejected offers */}
                                    {activeOffer.status === 'MANAGERREJECTED' && (
                                        <>
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleRetryOffer(activeOffer)}
                                                disabled={isLoading}
                                                title="Retry Offer"
                                            >
                                                {isLoading ? (
                                                    <div className="button-spinner"></div>
                                                ) : (
                                                    <FiRefreshCw size={16} />
                                                )}
                                            </button>
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleDeleteOffer(activeOffer)}
                                                disabled={isLoading}
                                                title="Delete Offer"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </>
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
                                    {/* Use RequestOrderDetails component exactly like in UnstartedOffers */}
                                    <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                                    <div className="procurement-request-summary-card-manager">
                                        <h4>Validated Offer Details</h4>
                                        <p className="procurement-section-description-manager">
                                            {activeOffer.status === 'MANAGERACCEPTED'
                                                ? 'This offer has been accepted and is now being processed by the finance.'
                                                : 'This offer has been rejected by the manager.'}
                                        </p>

                                        {/* Status Timeline - matching submitted offers design */}
                                        <div className="procurement-timeline-manager">
                                            <div className="procurement-timeline-item-manager active-manager">
                                                <div className="timeline-content-manager">
                                                    <h5>Offer Submitted</h5>
                                                    <p className="timeline-date-manager">{new Date(activeOffer.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className={`procurement-timeline-item-manager ${activeOffer.status === 'MANAGERACCEPTED' ? 'active-manager' : 'rejected-manager'}`}>
                                                <div className="timeline-content-manager">
                                                    <h5>{activeOffer.status === 'MANAGERACCEPTED' ? 'Offer Accepted' : 'Offer Rejected'}</h5>
                                                    <p className="timeline-date-manager">{new Date(activeOffer.updatedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            {activeOffer.status === 'MANAGERACCEPTED' && (
                                                <div className="procurement-timeline-item-manager">
                                                    <div className="timeline-content-manager">
                                                        <h5>Finance Processing</h5>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {activeOffer.status === 'MANAGERREJECTED' && activeOffer.rejectionReason && (
                                            <div className="validated-rejection-reason-manager">
                                                <p><em>Rejection reason: {activeOffer.rejectionReason}</em></p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Procurement Solutions */}
                                    <div className="procurement-submitted-details-manager">
                                        <h4>Procurement Solutions</h4>
                                        <div className="procurement-submitted-items-manager">
                                            {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                                const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                                return (
                                                    <div key={requestItem.id} className="procurement-submitted-item-card-manager">
                                                        <div className="submitted-item-header-manager">
                                                            <div className="item-icon-name-manager">
                                                                <div className="item-icon-container-manager">
                                                                    <FiPackage size={22} />
                                                                </div>
                                                                <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                            </div>
                                                            <div className="submitted-item-quantity-manager">
                                                                {requestItem.quantity} {requestItem.itemType.measuringUnit}
                                                            </div>
                                                        </div>

                                                        {offerItems.length > 0 && (
                                                            <div className="submitted-offer-solutions-manager">
                                                                <table className="procurement-offer-entries-table-manager">
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

                                    {/* Total Summary - exactly like submitted offers */}
                                    <div className="procurement-submitted-summary-manager">
                                        <div className="summary-item">
                                            <FiPackage size={16} />
                                            <span className="summary-label">Total Items:</span>
                                            <span className="summary-value">{activeOffer.requestOrder?.requestItems?.length || 0}</span>
                                        </div>
                                        <div className="summary-item">
                                            <FiUser size={16} />
                                            <span className="summary-label">Submitted By:</span>
                                            <span className="summary-value">{activeOffer.createdBy || 'System'}</span>
                                        </div>
                                        <div className="summary-item total-value">
                                            <FiDollarSign size={18} />
                                            <span className="summary-label">Total Value:</span>
                                            <span className="summary-value total">${getTotalPrice(activeOffer).toFixed(2)}</span>
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