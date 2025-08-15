import React, { useState } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiRefreshCw, FiUser, FiCalendar, FiDollarSign, FiInbox,
    FiShoppingCart, FiTrash2, FiTrendingUp
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./ManagerValidatedOffers.scss"

import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import Snackbar from '../../../../components/common/Snackbar/Snackbar.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';

const ValidatedOffers = ({
                             offers,
                             activeOffer,
                             setActiveOffer,
                             getTotalPrice,
                             onRetryOffer,
                             onDeleteOffer
                         }) => {
    // Snackbar state
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Confirmation dialog states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRetryConfirm, setShowRetryConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Show delete confirmation dialog
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    // Show retry confirmation dialog
    const handleRetryClick = () => {
        setShowRetryConfirm(true);
    };

    // Handle confirmed deletion
    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await offerService.delete(activeOffer.id);

            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            setNotificationMessage(`Offer "${activeOffer.title}" deleted successfully`);
            setNotificationType('success');
            setShowNotification(true);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Error deleting offer:', error);
            setNotificationMessage('Failed to delete offer. Please try again.');
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle confirmed retry
// Handle confirmed retry
    const confirmRetry = async () => {
        setIsRetrying(true);
        try {
            const response = await offerService.retryOffer(activeOffer.id);

            if (response && response.id) {
                // Delete the old offer since we're replacing it with a new one
                await offerService.delete(activeOffer.id);

                setNotificationMessage(`New offer created successfully. Old offer has been removed.`);
                setNotificationType('success');
                setShowNotification(true);

                // Remove the old offer from the current offers list
                if (onDeleteOffer) {
                    onDeleteOffer(activeOffer.id);
                }

                // Switch to the new offer in inprogress tab
                if (onRetryOffer) {
                    onRetryOffer(response);
                }
            }

            setShowRetryConfirm(false);
        } catch (error) {
            console.error('Error retrying offer:', error);

            if (error.message && error.message.includes("A retry for this offer is already in progress")) {
                setNotificationMessage('A retry for this offer is already in progress. Please complete the existing retry first.');
            } else {
                setNotificationMessage('Failed to create new offer. Please try again.');
            }
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsRetrying(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const cancelRetry = () => {
        setShowRetryConfirm(false);
    };

    return (
        <div className="procurement-offers-main-content">
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
                    // Replace the offers list section in ValidatedOffers with this:

                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-manager ${activeOffer?.id === offer.id ? 'selected' : ''} ${offer.status === 'MANAGERACCEPTED' ? 'card-accepted' : 'card-rejected'}`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                </div>
                                <div className="procurement-item-footer">
                <span className="procurement-item-date">
                    <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
                </span>
                                </div>
                                <div className="procurement-item-footer">
                <span className={`procurement-item-status ${offer.status === 'MANAGERACCEPTED' ? 'status-accepted' : 'status-rejected'}`}>
                    {offer.status === 'MANAGERACCEPTED' ? (
                        <>
                            <FiCheckCircle /> Accepted
                        </>
                    ) : (
                        <>
                            <FiX /> Rejected
                        </>
                    )}
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
                                            onClick={handleRetryClick}
                                            title="Retry Offer"
                                        >
                                            <FiRefreshCw size={16} />
                                        </button>
                                        <button
                                            className="btn-primary"
                                            onClick={handleDeleteClick}
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
                                    <h4>Offer Timeline</h4>
                                    <p className="procurement-section-description-manager">
                                        {activeOffer.status === 'MANAGERACCEPTED'
                                            ? 'This offer has been accepted and is now being processed by the finance.'
                                            : 'This offer has been rejected by the manager.'}
                                    </p>

                                    {/* Status Timeline - matching submitted offers design */}
                                    <div className="procurement-timeline-manager">
                                        {/* Request Order Approved Step */}
                                        <div className="procurement-timeline-item-manager active">
                                            <div className="timeline-content-manager">
                                                <h5>Request Order Approved</h5>
                                                <p className="timeline-meta-manager">
                                                    <FiCalendar size={14} /> Approved at: {activeOffer.requestOrder?.approvedAt ? new Date(activeOffer.requestOrder.approvedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="timeline-meta-manager">
                                                    <FiUser size={14} /> Approved by: {activeOffer.requestOrder?.approvedBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Offer Submitted Step */}
                                        <div className="procurement-timeline-item-manager active">
                                            <div className="timeline-content-manager">
                                                <h5>Offer Submitted</h5>
                                                <p className="timeline-meta-manager">
                                                    <FiCalendar size={14} /> Submitted at: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="timeline-meta-manager">
                                                    <FiUser size={14} /> Submitted by: {activeOffer.createdBy || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Manager Decision Step */}
                                        <div className={`procurement-timeline-item-manager ${
                                            activeOffer.status === 'MANAGERACCEPTED' ? 'active' :
                                                activeOffer.status === 'MANAGERREJECTED' ? 'rejected' : ''
                                        }`}>
                                            <div className="timeline-content-manager">
                                                <h5>
                                                    {activeOffer.status === 'MANAGERACCEPTED' ? 'Manager Accepted' :
                                                        activeOffer.status === 'MANAGERREJECTED' ? 'Manager Rejected' : ''}
                                                </h5>
                                                <p className="timeline-meta-manager">
                                                    {activeOffer.status === 'MANAGERACCEPTED' ? (
                                                        <>
                                                            <FiCalendar size={14} /> Accepted at: {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiCalendar size={14} /> Rejected at: {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                        </>
                                                    )}
                                                </p>
                                                {activeOffer.status === 'MANAGERACCEPTED' && (
                                                    <p className="timeline-meta-manager">
                                                        <FiUser size={14} /> Accepted by: {activeOffer.managerApprovedBy || 'N/A'}
                                                    </p>
                                                )}

                                                {/* Enhanced rejection reason display */}
                                                {activeOffer.status === 'MANAGERREJECTED' && activeOffer.rejectionReason && (
                                                    <div className="rejection-reason-manager">
                                                        <p><strong>Rejection Reason:</strong> {activeOffer.rejectionReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Finance Processing Step */}
                                        {activeOffer.status === 'MANAGERACCEPTED' && (
                                            <div className="procurement-timeline-item-manager">
                                                <div className="timeline-content-manager">
                                                    <h5>Finance Processing</h5>
                                                    <p className="timeline-meta-manager">
                                                        <FiTrendingUp size={14} /> Sent to finance department
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="delete"
                title="Delete Offer"
                message={`Are you sure you want to delete the offer "${activeOffer?.title}"? This action cannot be undone.`}
                confirmText="Delete Offer"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                isLoading={isDeleting}
                showIcon={true}
                size="large"
            />

            {/* Retry Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showRetryConfirm}
                type="warning"
                title="Retry Offer"
                message={`Are you sure you want to create a new offer based on "${activeOffer?.title}"? This will create a duplicate offer that you can modify.`}
                confirmText="Create New Offer"
                cancelText="Cancel"
                onConfirm={confirmRetry}
                onCancel={cancelRetry}
                isLoading={isRetrying}
                showIcon={true}
                size="large"
            />

            {/* Snackbar Component */}
            <Snackbar
                type={notificationType}
                message={notificationMessage}
                show={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default ValidatedOffers;
