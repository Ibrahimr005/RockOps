import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiFileText, FiDollarSign, FiList,
    FiUser, FiCalendar, FiFlag, FiTrendingUp, FiRefreshCw, FiTrash2, FiArrowRight
} from 'react-icons/fi';

import "../ProcurementOffers.scss";
import "./FinanceValidatedOffers.scss"
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import { offerService } from '../../../../services/procurement/offerService.js';

// Updated to accept offers, setError, and setSuccess from parent
const FinanceValidatedOffers = ({
                                    offers,
                                    activeOffer,
                                    setActiveOffer,
                                    getTotalPrice,
                                    setError,
                                    setSuccess,
                                    onRefresh, // Optional callback to refresh data after status update
                                    onOfferFinalized, // New callback to handle offer finalization and tab switch
                                    onRetryOffer, // Callback for retry functionality
                                    onDeleteOffer // Callback for delete functionality
                                }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(''); // Added for role checking
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [offerToFinalizeId, setOfferToFinalizeId] = useState(null);

    // New states for retry and delete functionality
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRetryConfirm, setShowRetryConfirm] = useState(false);
    const [showContinueAndReturnConfirm, setShowContinueAndReturnConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isContinueAndReturn, setIsContinueAndReturn] = useState(false);

    // Snackbar states
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');

    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
    };

    const handleError = (message) => {
        if (typeof setError === 'function') {
            setError(message);
        } else {
            showNotification(message, 'error');
        }
    };

    const handleSuccess = (message) => {
        if (typeof setSuccess === 'function') {
            setSuccess(message);
        } else {
            showNotification(message, 'success');
        }
    };

    // Fetch all finance reviewed offers - We're now getting offers as props
    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
    }, []);

    // NEW: Helper function to calculate fulfillment status
    const calculateFulfillmentStatus = (offer) => {
        if (!offer?.requestOrder?.requestItems) {
            return { hasFullFulfillment: false, hasAcceptedItems: false, fulfillmentDetails: {} };
        }

        const acceptedQuantities = {};
        const requestedQuantities = {};

        // Group by request item to compare quantities
        offer.requestOrder.requestItems.forEach(requestItem => {
            requestedQuantities[requestItem.id] = requestItem.quantity;

            const offerItems = getOfferItemsForRequestItem(requestItem.id);
            acceptedQuantities[requestItem.id] = offerItems
                .filter(item => item.financeStatus === 'ACCEPTED')
                .reduce((sum, item) => sum + item.quantity, 0);
        });

        // Check if we have full fulfillment
        const hasFullFulfillment = Object.keys(requestedQuantities).every(itemId =>
            acceptedQuantities[itemId] >= requestedQuantities[itemId]
        );

        // Check if we have any accepted items
        const hasAcceptedItems = Object.values(acceptedQuantities).some(qty => qty > 0);

        return {
            hasFullFulfillment,
            hasAcceptedItems,
            acceptedQuantities,
            requestedQuantities
        };
    };

    // Function to handle opening the finalize confirmation dialog
    const handleOpenFinalizeDialog = (offerId) => {
        setOfferToFinalizeId(offerId);
        setShowFinalizeDialog(true);
    };

    // Function to handle the finalization after confirmation
    const handleConfirmFinalize = async () => {
        if (!offerToFinalizeId) return;

        try {
            setLoading(true);
            setShowFinalizeDialog(false);
            setError('');
            setSuccess('');

            // Update the offer status to FINALIZING using offerService
            await offerService.updateStatus(offerToFinalizeId, 'FINALIZING');

            handleSuccess('Offer has been sent to the finalizing section.');

            // Find the finalized offer to pass to the callback
            const finalizedOffer = offers.find(offer => offer.id === offerToFinalizeId);

            // Call the callback to switch to finalize tab and set the specific offer as active
            if (onOfferFinalized && finalizedOffer) {
                onOfferFinalized({
                    ...finalizedOffer,
                    status: 'FINALIZING'
                });
            }

            // Optional: You can call a refresh function here if provided as a prop
            if (onRefresh) {
                onRefresh();
            }

        } catch (err) {
            console.error('Error updating offer status to FINALIZING:', err);
            handleError(err.message || 'Failed to update offer status. Please try again.');
        } finally {
            setLoading(false);
            setOfferToFinalizeId(null);
        }
    };

    // Function to close the dialog
    const handleCancelFinalize = () => {
        setShowFinalizeDialog(false);
        setOfferToFinalizeId(null);
    };

    // Retry functionality (copied exactly from working ManagerValidatedOffers)
    const handleRetryClick = () => {
        setShowRetryConfirm(true);
    };

    const confirmRetry = async () => {
        setIsRetrying(true);
        try {
            const response = await offerService.retryOffer(activeOffer.id);

            if (response && response.id) {
                showNotification(`New offer created successfully (Retry ${response.retryCount}). Old offer has been removed.`, 'success');

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
                showNotification('A retry for this offer is already in progress. Please complete the existing retry first.', 'error');
            } else {
                showNotification('Failed to create new offer. Please try again.', 'error');
            }
        } finally {
            setIsRetrying(false);
        }
    };

    const cancelRetry = () => {
        setShowRetryConfirm(false);
    };

    // NEW: Continue and Return functionality
    const handleContinueAndReturnClick = () => {
        setShowContinueAndReturnConfirm(true);
    };

    const confirmContinueAndReturn = async () => {
        setIsContinueAndReturn(true);
        try {
            // Call backend service to split the offer
            const result = await offerService.continueAndReturnOffer(activeOffer.id);

            let successMessage = '';

            if (result.acceptedOffer && result.newOffer) {
                successMessage = 'Accepted items sent to finalization. New offer created for remaining quantities.';
            } else if (result.acceptedOffer) {
                successMessage = 'Accepted items sent to finalization.';
            } else if (result.newOffer) {
                successMessage = 'New offer created for remaining quantities.';
            }

            showNotification(successMessage, 'success');

            // Handle accepted offer going to finalization
            if (result.acceptedOffer && onOfferFinalized) {
                onOfferFinalized(result.acceptedOffer);
            }

            // Handle new offer for remaining quantities
            if (result.newOffer && onRetryOffer) {
                onRetryOffer(result.newOffer);
            }

            // Remove current offer from finance validated tab
            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            setShowContinueAndReturnConfirm(false);

        } catch (error) {
            console.error('Error in continue and return:', error);
            showNotification('Failed to process offer. Please try again.', 'error');
        } finally {
            setIsContinueAndReturn(false);
        }
    };

    const cancelContinueAndReturn = () => {
        setShowContinueAndReturnConfirm(false);
    };

    // Delete functionality
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await offerService.delete(activeOffer.id);

            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            showNotification(`Offer "${activeOffer.title}" deleted successfully`, 'success');
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Error deleting offer:', error);
            showNotification('Failed to delete offer. Please try again.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
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

    // NEW: Render action buttons based on fulfillment status
    const renderActionButtons = () => {
        if (!activeOffer) return null;

        const { hasFullFulfillment, hasAcceptedItems } = calculateFulfillmentStatus(activeOffer);

        if (hasFullFulfillment) {
            // Case 1: Full fulfillment - Auto continue to finalization
            return (
                <button
                    className="btn-primary"
                    onClick={() => handleOpenFinalizeDialog(activeOffer.id)}
                    disabled={loading}
                    title="All requested quantities accepted - proceed to finalization"
                >
                    <FiCheckCircle /> Finalize Offer
                </button>
            );
        } else if (hasAcceptedItems) {
            // Case 2: Partial fulfillment - User chooses
            return (
                <div className="action-buttons-group">
                    <button
                        className="btn-primary"
                        onClick={handleContinueAndReturnClick}
                        disabled={loading || isContinueAndReturn}
                        title="Continue with accepted items and create new offer for remaining quantities"
                        style={{ marginRight: '10px' }}
                    >
                        <FiArrowRight />
                        {isContinueAndReturn ? 'Processing...' : 'Continue & Return'}
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={handleRetryClick}
                        disabled={loading || isRetrying}
                        title="Start over with entire quantity"
                        style={{ marginRight: '10px' }}
                    >
                        <FiRefreshCw />
                        {isRetrying ? 'Creating...' : 'Retry Entire Offer'}
                    </button>
                    <button
                        className="btn-danger"
                        onClick={handleDeleteClick}
                        disabled={loading || isDeleting}
                        title="Delete this offer permanently"
                    >
                        <FiTrash2 />
                        {isDeleting ? 'Deleting...' : 'Delete Offer'}
                    </button>
                </div>
            );
        } else {
            // Case 3: Nothing accepted - Only retry or delete
            return (
                <div className="action-buttons-group">
                    <button
                        className="btn-primary"
                        onClick={handleRetryClick}
                        disabled={loading || isRetrying}
                        title="Create a new offer"
                        style={{ marginRight: '10px' }}
                    >
                        <FiRefreshCw />
                        {isRetrying ? 'Creating...' : 'Retry Offer'}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleDeleteClick}
                        disabled={loading || isDeleting}
                        title="Delete this offer permanently"
                    >
                        <FiTrash2 />
                        {isDeleting ? 'Deleting...' : 'Delete Offer'}
                    </button>
                </div>
            );
        }
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
                                className={`procurement-item-card-finance ${activeOffer?.id === offer.id ? 'selected' : ''}
            ${offer.status === 'FINANCE_ACCEPTED' || offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
                                    offer.status === 'FINANCE_REJECTED' ? 'card-rejected' : 'card-partial'}`}
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
                <span className={`procurement-item-status ${
                    offer.status === 'FINANCE_ACCEPTED' ? 'status-accepted' :
                        offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'status-partial' :
                            'status-rejected'
                }`}>
                    {offer.status === 'FINANCE_ACCEPTED' ? (
                        <>
                            <FiCheckCircle /> Accepted
                        </>
                    ) : offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? (
                        <>
                            <FiFlag /> Partially Accepted
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
                                            {formatStatus(activeOffer.status)}
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiClock /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="procurement-header-actions">
                                {/* SMART ACTION BUTTONS - Now uses the new logic */}
                                {renderActionButtons()}
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

                                {/* Replace the timeline section with the OfferTimeline component */}
                                <div className="procurement-request-summary-card-finance">
                                    <OfferTimeline
                                        offer={activeOffer}
                                        variant="finance"
                                        showRetryInfo={false}
                                    />
                                </div>

                                {/* Procurement Items with Finance Status */}
                                <div className="procurement-submitted-details-finance">
                                    <h4>Item Review Details</h4>
                                    <div className="procurement-submitted-items-finance">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-finance">
                                                    <div className="submitted-item-header-finance">
                                                        <div className="item-icon-name-finance">
                                                            <div className="item-icon-container-finance">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-finance">
                                                            {requestItem.quantity} {requestItem.itemType?.measuringUnit}
                                                        </div>
                                                    </div>

                                                    {offerItems.length > 0 && (
                                                        <div className="submitted-offer-solutions-finance">
                                                            <table className="procurement-offer-entries-table-finance">
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
                                                                        offerItem.financeStatus === 'ACCEPTED' ? 'finance-accepted' :
                                                                            offerItem.financeStatus === 'REJECTED' ? 'finance-rejected' : ''
                                                                    }>
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType?.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice || 0).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice || 0).toFixed(2)}</td>
                                                                        <td>
                                                                            <span className={`finance-item-status status-${(offerItem.financeStatus || '').toLowerCase()}`}>
                                                                                {formatFinanceStatus(offerItem.financeStatus)}
                                                                            </span>
                                                                            {offerItem.financeStatus === 'REJECTED' && offerItem.rejectionReason && (
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
                                <div className="procurement-submitted-summary-finance">
                                    <div className="summary-item-finance">
                                        <FiPackage size={16} />
                                        <span className="summary-label-finance">Total Items Accepted:</span>
                                        <span className="summary-value-finance">
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'ACCEPTED'
                                            ).length || 0}
                                        </span>
                                    </div>
                                    <div className="summary-item-finance">
                                        <FiX size={16} />
                                        <span className="summary-label-finance">Total Items Rejected:</span>
                                        <span className="summary-value-finance">
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'REJECTED'
                                            ).length || 0}
                                        </span>
                                    </div>

                                    <div className="summary-item-finance total-value-finance">
                                        <FiDollarSign size={18} />
                                        <span className="summary-label-finance">Total Approved Value:</span>
                                        <span className="summary-value-finance total-finance">${getTotalPrice(activeOffer).toFixed(2)}</span>
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

            {/* Snackbar Component */}
            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={4000}
            />

            {/* Confirmation Dialog for Finalizing an Offer */}
            <ConfirmationDialog
                isVisible={showFinalizeDialog}
                type="success"
                title="Finalize Offer"
                message="Are you sure you want to finalize this offer? This action will send the offer to the finalizing section and cannot be undone."
                confirmText="Finalize"
                onConfirm={handleConfirmFinalize}
                onCancel={handleCancelFinalize}
                isLoading={loading}
                size="large"
            />

            {/* Continue and Return Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showContinueAndReturnConfirm}
                type="info"
                title="Continue & Return"
                message={`Accepted items will proceed to finalization, and a new offer will be created for the remaining quantities. This action cannot be undone.`}
                confirmText="Continue & Return"
                cancelText="Cancel"
                onConfirm={confirmContinueAndReturn}
                onCancel={cancelContinueAndReturn}
                isLoading={isContinueAndReturn}
                showIcon={true}
                size="large"
            />

            {/* Retry Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showRetryConfirm}
                type="warning"
                title="Retry Entire Offer"
                message={`Are you sure you want to create a new offer for the entire quantity based on "${activeOffer?.title}"? This will discard the current finance review results.`}
                confirmText="Create New Offer"
                cancelText="Cancel"
                onConfirm={confirmRetry}
                onCancel={cancelRetry}
                isLoading={isRetrying}
                showIcon={true}
                size="large"
            />

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
        </div>
    );
};

export default FinanceValidatedOffers;