import React, { useState } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiRefreshCw, FiUser, FiCalendar, FiDollarSign, FiInbox,
    FiShoppingCart, FiTrash2, FiTrendingUp, FiAlertTriangle
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./ManagerValidatedOffers.scss"

import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import Snackbar from '../../../../components/common/Snackbar/Snackbar.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
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
    const [isProcessingFinance, setIsProcessingFinance] = useState(false);

    // Finance review states
    const [showFinanceReview, setShowFinanceReview] = useState(false);
    const [financeDecisions, setFinanceDecisions] = useState({});
    const [rejectionReasons, setRejectionReasons] = useState({});

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Initialize finance decisions when starting finance review
    const initializeFinanceDecisions = () => {
        const decisions = {};
        const reasons = {};

        if (activeOffer?.offerItems) {
            activeOffer.offerItems.forEach(item => {
                decisions[item.id] = item.financeStatus || 'PENDING';
                reasons[item.id] = '';
            });
        }

        setFinanceDecisions(decisions);
        setRejectionReasons(reasons);
        setShowFinanceReview(true);
    };

    // Handle finance decision change for an offer item
    const handleFinanceDecisionChange = (itemId, decision) => {
        setFinanceDecisions(prev => ({
            ...prev,
            [itemId]: decision
        }));

        // Clear rejection reason if accepting
        if (decision === 'ACCEPTED') {
            setRejectionReasons(prev => ({
                ...prev,
                [itemId]: ''
            }));
        }
    };

    // Handle rejection reason change
    const handleRejectionReasonChange = (itemId, reason) => {
        setRejectionReasons(prev => ({
            ...prev,
            [itemId]: reason
        }));
    };

    // Calculate overall finance status based on item decisions
    const calculateOverallFinanceStatus = () => {
        const decisions = Object.values(financeDecisions);
        const acceptedCount = decisions.filter(d => d === 'ACCEPTED').length;
        const rejectedCount = decisions.filter(d => d === 'REJECTED').length;

        if (acceptedCount === decisions.length) {
            return 'FINANCE_ACCEPTED';
        } else if (rejectedCount === decisions.length) {
            return 'FINANCE_REJECTED';
        } else {
            return 'FINANCE_PARTIALLY_ACCEPTED';
        }
    };

    // Submit finance review
    // Submit finance review with detailed logging
    // Fixed handleSubmitFinanceReview function for ValidatedOffers.jsx

    const handleSubmitFinanceReview = async () => {
        try {
            setIsProcessingFinance(true);
            console.log('🔄 Starting finance review for offer:', activeOffer.id);
            console.log('📋 Finance decisions:', financeDecisions);
            console.log('📝 Rejection reasons:', rejectionReasons);

            // Update each offer item's finance status
            let itemUpdateResults = [];
            for (const [itemId, decision] of Object.entries(financeDecisions)) {
                const rejectionReason = decision === 'REJECTED' ? rejectionReasons[itemId] : null;
                console.log(`🔄 Updating item ${itemId} to ${decision}`, rejectionReason ? `with reason: ${rejectionReason}` : '');

                try {
                    const itemResult = await offerService.updateItemFinanceStatus(itemId, decision, rejectionReason);
                    console.log(`✅ Item ${itemId} update SUCCESS:`, itemResult);
                    itemUpdateResults.push({ itemId, success: true, result: itemResult });
                } catch (itemError) {
                    console.error(`❌ Item ${itemId} update FAILED:`, itemError);
                    console.error(`Item ${itemId} error response:`, itemError.response?.data);
                    console.error(`Item ${itemId} error status:`, itemError.response?.status);
                    itemUpdateResults.push({ itemId, success: false, error: itemError });
                    // Continue with other items instead of stopping
                }
            }

            console.log('📊 Item update results summary:', itemUpdateResults);

            // Calculate and update overall offer status
            const overallStatus = calculateOverallFinanceStatus();
            console.log('🎯 Calculated overall status:', overallStatus);
            console.log('🆔 Offer ID:', activeOffer.id);

            try {
                // FIX 1: Try the same method signature as SubmittedOffers (with null as third parameter)
                console.log('🔄 Method 1: Using same signature as SubmittedOffers with null rejection reason...');
                const offerResult = await offerService.updateStatus(activeOffer.id, overallStatus, null);
                console.log('✅ Method 1 SUCCESS:', offerResult);

            } catch (method1Error) {
                console.error('❌ Method 1 FAILED:', method1Error);

                try {
                    // FIX 2: Try without the third parameter (original way)
                    console.log('🔄 Method 2: Using original method without rejection reason...');
                    const offerResult = await offerService.updateStatus(activeOffer.id, overallStatus);
                    console.log('✅ Method 2 SUCCESS:', offerResult);

                } catch (method2Error) {
                    console.error('❌ Method 2 FAILED:', method2Error);

                    try {
                        // FIX 3: Check if there's a specific method for finance status updates
                        console.log('🔄 Method 3: Checking for updateFinanceStatus method...');
                        if (typeof offerService.updateFinanceStatus === 'function') {
                            const offerResult = await offerService.updateFinanceStatus(activeOffer.id, overallStatus);
                            console.log('✅ Method 3 SUCCESS:', offerResult);
                        } else {
                            throw new Error('updateFinanceStatus method not available');
                        }

                    } catch (method3Error) {
                        console.error('❌ Method 3 FAILED:', method3Error);

                        try {
                            // FIX 4: Try with an empty string as rejection reason
                            console.log('🔄 Method 4: Using empty string as rejection reason...');
                            const offerResult = await offerService.updateStatus(activeOffer.id, overallStatus, '');
                            console.log('✅ Method 4 SUCCESS:', offerResult);

                        } catch (method4Error) {
                            console.error('❌ Method 4 FAILED:', method4Error);

                            // FIX 5: Log the exact method signature and throw the most descriptive error
                            console.error('🔍 offerService.updateStatus method:', offerService.updateStatus);
                            console.error('🔍 All offerService methods:', Object.getOwnPropertyNames(offerService));

                            throw new Error(`All update methods failed. Last error: ${method4Error.message}`);
                        }
                    }
                }
            }

            // Show success message
            setNotificationMessage(`Finance review completed successfully! Offer status: ${overallStatus}`);
            setNotificationType('success');
            setShowNotification(true);

            // Clean up modal state
            setShowFinanceReview(false);
            setFinanceDecisions({});
            setRejectionReasons({});

            // Remove from current list since it's moved to finance tab
            if (onDeleteOffer) {
                console.log('🗑️ Removing offer from current tab');
                onDeleteOffer(activeOffer.id);
            }

        } catch (error) {
            console.error('💥 Overall finance review error:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                stack: error.stack,
                response: error.response
            });

            setNotificationMessage(`Failed to submit finance review: ${error.message}`);
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsProcessingFinance(false);
            console.log('🏁 Finance review process completed');
        }
    };

// Alternative approach: Check your offerService.js file
// The issue might be in how the updateStatus method is implemented
// Here's what to look for in your offerService.js:

    /*
    Expected method signature might be one of these:

    1. updateStatus(offerId, status, rejectionReason = null)
    2. updateStatus(offerId, status)
    3. Different method names for different types of updates

    Check your offerService.js file and see which signature it expects!
    */

// Quick debugging function to add to your component:
    const debugOfferService = () => {
        console.log('🔍 Debugging offerService:');
        console.log('Methods available:', Object.getOwnPropertyNames(offerService));
        console.log('updateStatus method:', offerService.updateStatus);
        console.log('updateStatus toString:', offerService.updateStatus.toString());

        // If updateFinanceStatus exists
        if (offerService.updateFinanceStatus) {
            console.log('updateFinanceStatus method:', offerService.updateFinanceStatus);
            console.log('updateFinanceStatus toString:', offerService.updateFinanceStatus.toString());
        }
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
    const confirmRetry = async () => {
        setIsRetrying(true);
        try {
            const response = await offerService.retryOffer(activeOffer.id);

            if (response && response.id) {
                setNotificationMessage(`New offer created successfully (Retry ${response.retryCount}). Old offer has been removed.`);
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

    const cancelFinanceReview = () => {
        setShowFinanceReview(false);
        setFinanceDecisions({});
        setRejectionReasons({});
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
                                {/* Finance review button for accepted offers */}
                                {activeOffer.status === 'MANAGERACCEPTED' && (
                                    <button
                                        className="btn-primary"
                                        onClick={initializeFinanceDecisions}
                                        title="Start Finance Review"
                                        style={{ marginRight: '10px' }}
                                    >
                                        <FiDollarSign size={16} />
                                        Finance Review
                                    </button>
                                )}

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

                                {/* Replace the timeline section with the OfferTimeline component */}
                                <div className="procurement-request-summary-card-manager">
                                    <OfferTimeline
                                        offer={activeOffer}
                                        variant="manager"
                                        showRetryInfo={true}
                                    />
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
                                                                    <th>Finance Status</th>
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
                                                                        <td>
                                                                            <span className={`submitted-offer-finance-status-badge ${(offerItem.financeStatus || 'PENDING').toLowerCase()}`}>
                                                                                {offerItem.financeStatus || 'PENDING'}
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

            {/* Finance Review Modal */}
            {showFinanceReview && (
                <div className="pro-ro-modal-backdrop">
                    <div className="pro-ro-modal" style={{ maxWidth: '800px' }}>
                        <div className="pro-ro-modal-header">
                            <h2>
                                <FiDollarSign style={{ marginRight: '10px' }} />
                                Finance Review - {activeOffer?.title}
                            </h2>
                            <button className="btn-close" onClick={cancelFinanceReview}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="pro-ro-modal-content">
                            <div className="submitted-offer-finance-review-content">
                                <div className="submitted-offer-finance-review-instructions">
                                    <FiAlertTriangle style={{ color: '#f59e0b', marginRight: '8px' }} />
                                    <p>Review each offer item and decide whether to accept or reject it. Rejected items require a reason.</p>
                                </div>

                                <div className="submitted-offer-finance-review-items">
                                    {activeOffer?.offerItems?.map(offerItem => (
                                        <div key={offerItem.id} className="submitted-offer-finance-review-item">
                                            <div className="submitted-offer-finance-item-header">
                                                <h4>{offerItem.merchant?.name || 'Unknown Merchant'}</h4>
                                                <div className="submitted-offer-finance-item-details">
                                                    <span>Qty: {offerItem.quantity}</span>
                                                    <span>Unit Price: ${parseFloat(offerItem.unitPrice).toFixed(2)}</span>
                                                    <span>Total: ${parseFloat(offerItem.totalPrice).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="submitted-offer-finance-decision-controls">
                                                <div className="submitted-offer-finance-decision-buttons">
                                                    <button
                                                        className={`submitted-offer-finance-decision-btn accept ${financeDecisions[offerItem.id] === 'ACCEPTED' ? 'selected' : ''}`}
                                                        onClick={() => handleFinanceDecisionChange(offerItem.id, 'ACCEPTED')}
                                                    >
                                                        <FiCheck /> Accept
                                                    </button>
                                                    <button
                                                        className={`submitted-offer-finance-decision-btn reject ${financeDecisions[offerItem.id] === 'REJECTED' ? 'selected' : ''}`}
                                                        onClick={() => handleFinanceDecisionChange(offerItem.id, 'REJECTED')}
                                                    >
                                                        <FiX /> Reject
                                                    </button>
                                                </div>

                                                {financeDecisions[offerItem.id] === 'REJECTED' && (
                                                    <div className="submitted-offer-rejection-reason">
                                                        <label>Rejection Reason:</label>
                                                        <textarea
                                                            value={rejectionReasons[offerItem.id] || ''}
                                                            onChange={(e) => handleRejectionReasonChange(offerItem.id, e.target.value)}
                                                            placeholder="Please provide a reason for rejection..."
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="submitted-offer-finance-review-summary">
                                    <h4>Review Summary</h4>
                                    <p>Overall Status: <strong>{calculateOverallFinanceStatus()}</strong></p>
                                    <p>
                                        Accepted: {Object.values(financeDecisions).filter(d => d === 'ACCEPTED').length} |
                                        Rejected: {Object.values(financeDecisions).filter(d => d === 'REJECTED').length} |
                                        Pending: {Object.values(financeDecisions).filter(d => d === 'PENDING').length}
                                    </p>
                                </div>
                            </div>

                            <div className="pro-ro-modal-footer">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={cancelFinanceReview}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSubmitFinanceReview}
                                    disabled={isProcessingFinance || Object.values(financeDecisions).some(d => d === 'PENDING')}
                                >
                                    {isProcessingFinance ? 'Processing...' : 'Submit Finance Review'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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