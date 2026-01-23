import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle, FiX, FiFileText, FiList,
    FiUser, FiCalendar, FiDollarSign, FiTrendingUp, FiRefreshCw, FiTrash2
} from 'react-icons/fi';
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx"
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';
import  {financeService} from '../../../../services/financeService';
import "../ProcurementOffers.scss";
import "./FinalizeOffers.scss";

const FinalizeOffers = ({
                            offers,
                            activeOffer,
                            setActiveOffer,
                            getTotalPrice,
                            setError,
                            setSuccess,
                            onOfferFinalized, // This should switch to completed tab
                            onOfferCompleted, // New callback for completed offers
                            onRetryOffer, // Callback for retry functionality
                            onDeleteOffer // Callback for delete functionality
                        }) => {
    const [loading, setLoading] = useState(false);
    const [finalizedItems, setFinalizedItems] = useState({});
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // New states for retry and delete functionality
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRetryConfirm, setShowRetryConfirm] = useState(false);
    const [showUnfinalizedItemsDialog, setShowUnfinalizedItemsDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

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

    const handleFinalizeItem = (offerItemId) => {
        setFinalizedItems(prev => ({
            ...prev,
            [offerItemId]: !prev[offerItemId]
        }));
    };

    const handleConfirmFinalization = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmDialogCancel = () => {
        setShowConfirmDialog(false);
    };

    // Retry functionality
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

    // Delete functionality
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const offerTitle = activeOffer.title; // Store title before deletion
        try {
            await offerService.delete(activeOffer.id);

            // Show success notification first
            showNotification(`Offer "${offerTitle}" deleted successfully`, 'success');

            // Close the confirmation dialog
            setShowDeleteConfirm(false);

            // Small delay to ensure snackbar is visible before calling parent callbacks
            setTimeout(() => {
                if (onDeleteOffer) {
                    onDeleteOffer(activeOffer.id);
                }
            }, 100);

        } catch (error) {
            console.error('Error deleting offer:', error);
            showNotification('Failed to delete offer. Please try again.', 'error');
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const saveFinalizedOffer = async () => {
        if (!activeOffer) return;

        const finalizedItemIds = Object.entries(finalizedItems)
            .filter(([_, isFinalized]) => isFinalized)
            .map(([id, _]) => id);

        if (finalizedItemIds.length === 0) {
            handleError('Please select at least one item to finalize');
            return;
        }

        // Check if there are unfinalized accepted items
        // const allAcceptedItems = activeOffer.offerItems.filter(item =>
        //     item.financeStatus === 'ACCEPTED'
        // );

        // Check if there are unfinalized items
        const allAcceptedItems = activeOffer.offerItems || [];

        const unfinalizedItems = allAcceptedItems.filter(item =>
            !finalizedItemIds.includes(item.id.toString())
        );

        if (unfinalizedItems.length > 0) {
            // Show dialog asking what to do with unfinalized items
            setShowUnfinalizedItemsDialog(true);
            return;
        }

        // If all items are finalized, proceed normally
        await processFinalizeOffer(finalizedItemIds, false);
    };

    const handleUnfinalizedItemsDialogClose = () => {
        setShowUnfinalizedItemsDialog(false);
    };

    // const processFinalizeOffer = async (finalizedItemIds, createOfferForRemaining = false) => {
    //     setLoading(true);
    //     setShowConfirmDialog(false);
    //     setShowUnfinalizedItemsDialog(false);
    //
    //     try {
    //         console.log('Finalizing offer with ID:', activeOffer.id);
    //         console.log('Finalized item IDs:', finalizedItemIds);
    //
    //         let responseData;
    //
    //         if (createOfferForRemaining) {
    //             // Use new endpoint for creating offer with remaining items
    //             responseData = await offerService.finalizeWithRemaining(activeOffer.id, finalizedItemIds);
    //         } else {
    //             // Use the purchaseOrderService instead of direct fetch
    //             responseData = await purchaseOrderService.finalizeOffer(activeOffer.id, finalizedItemIds);
    //         }
    //
    //         // Create the completed offer object
    //         const completedOffer = {
    //             ...activeOffer,
    //             status: 'COMPLETED',
    //             finalizedAt: new Date().toISOString(),
    //             finalizedBy: 'Current User'
    //         };
    //
    //         let successMessage = 'Offer finalized successfully! A purchase order has been created.';
    //
    //         if (createOfferForRemaining && responseData.newOffer) {
    //             successMessage += ' A new offer has been created for the remaining items.';
    //
    //             // Handle the new offer for remaining items
    //             if (onRetryOffer) {
    //                 onRetryOffer(responseData.newOffer);
    //             }
    //         }
    //
    //         handleSuccess(responseData.message || successMessage);
    //
    //         // Call the callback to switch to completed tab with this offer
    //         if (onOfferCompleted) {
    //             onOfferCompleted(completedOffer);
    //         }
    //
    //         // Remove the offer from current list
    //         if (onOfferFinalized) {
    //             onOfferFinalized(activeOffer.id);
    //         }
    //
    //     } catch (err) {
    //         console.error('Error finalizing offer:', err);
    //         handleError('Failed to finalize offer: ' + (err.message || 'Unknown error'));
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const processFinalizeOffer = async (finalizedItemIds, createOfferForRemaining = false) => {
        setLoading(true);
        setShowConfirmDialog(false);
        setShowUnfinalizedItemsDialog(false);

        try {
            console.log('🔵 Finalizing offer with ID:', activeOffer.id);
            console.log('🔵 Finalized item IDs:', finalizedItemIds);

            let responseData;

            if (createOfferForRemaining) {
                responseData = await offerService.finalizeWithRemaining(activeOffer.id, finalizedItemIds);
            } else {
                responseData = await purchaseOrderService.finalizeOffer(activeOffer.id, finalizedItemIds);
            }

            console.log('✅ Offer finalized, PO created:', responseData);

            // Extract PO ID and Offer ID
            // ✅ NEW CODE - Check multiple possible locations for PO ID
            console.log('🔵 Full responseData:', responseData);

// Try different possible locations for the PO ID
            const purchaseOrderId = responseData.id ||
                responseData.purchaseOrderId ||
                responseData.data?.id ||
                responseData.data?.purchaseOrderId ||
                (responseData.purchaseOrder && responseData.purchaseOrder.id);

            const offerId = activeOffer.id;

            console.log('🔵 Extracted PO ID:', purchaseOrderId);
            console.log('🔵 Extracted Offer ID:', offerId);
            console.log('🔵 Response structure:', Object.keys(responseData));


            // ✅ CREATE PAYMENT REQUEST using financeService
            if (purchaseOrderId && offerId) {
                try {
                    console.log('🔵 Creating payment request via financeService...');

                    // Get username from localStorage
                    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                    const username = userInfo?.username || userInfo?.name || 'system';

                    console.log('🔵 Username:', username);

                    // Call financeService.paymentRequests.createFromPurchaseOrder
                    const response = await financeService.accountsPayable.paymentRequests.createFromPurchaseOrder(
                        purchaseOrderId,
                        offerId,
                        username
                    );

                    const paymentRequest = response.data || response;
                    console.log('✅ Payment request created successfully:', paymentRequest);

                    handleSuccess(
                        'Offer finalized successfully! Purchase Order and Payment Request created.'
                    );
                } catch (prError) {
                    console.error('❌ Failed to create payment request:', prError);
                    console.error('❌ Error details:', prError.response?.data);

                    // Still show success for PO, but warn about payment request
                    const errorMessage = prError.response?.data?.error || prError.message || 'Unknown error';
                    handleSuccess(
                        `Offer finalized and Purchase Order created. Payment Request creation failed: ${errorMessage}`
                    );
                }
            } else {
                console.warn('⚠️ Missing purchaseOrderId or offerId');
                console.warn('⚠️ purchaseOrderId:', purchaseOrderId);
                console.warn('⚠️ offerId:', offerId);
                console.warn('⚠️ responseData:', responseData);
                handleSuccess('Offer finalized successfully! Purchase Order created.');
            }

            // Create the completed offer object
            const completedOffer = {
                ...activeOffer,
                status: 'COMPLETED',
                finalizedAt: new Date().toISOString(),
                finalizedBy: 'Current User'
            };

            // Handle new offer for remaining items if applicable
            if (createOfferForRemaining && responseData.newOffer) {
                if (onRetryOffer) {
                    onRetryOffer(responseData.newOffer);
                }
            }

            // Call callbacks
            if (onOfferCompleted) {
                onOfferCompleted(completedOffer);
            }

            if (onOfferFinalized) {
                onOfferFinalized(activeOffer.id);
            }

        } catch (err) {
            console.error('❌ Error finalizing offer:', err);
            handleError('Failed to finalize offer: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const formatStatus = (status) => {
        if (!status) return 'Unknown Status';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // const getOfferItemsForRequestItem = (requestItemId) => {
    //     if (!activeOffer || !activeOffer.offerItems) return [];
    //     return activeOffer.offerItems.filter(
    //         item => (item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId) &&
    //             item.financeStatus === 'ACCEPTED'
    //     );
    // };

    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => (item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId)
            // Remove the financeStatus check - ALL items in a FINALIZING offer should be shown
        );
    };

    // const totalAcceptedItems = activeOffer?.offerItems?.filter(item =>
    //     item.financeStatus === 'ACCEPTED'
    // ).length || 0;

    const totalAcceptedItems = activeOffer?.offerItems?.length || 0;

    const totalFinalizedItems = Object.values(finalizedItems).filter(v => v).length;

    const getFinalizedTotalValue = () => {
        return Object.entries(finalizedItems)
            .filter(([_, isFinalized]) => isFinalized)
            .reduce((acc, [id, _]) => {
                const item = activeOffer.offerItems.find(o => o.id.toString() === id);
                return acc + (item ? parseFloat(item.totalPrice) : 0);
            }, 0);
    };



    return (
        <div className="procurement-offers-main-content">
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Finalize Offers</h3>
                </div>

                {loading && !offers.length ? (
                    <div className="procurement-loading">
                        <div className="procurement-spinner"></div>
                        <p>Loading offers...</p>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiList size={48} className="empty-icon" />
                        <p>No offers to finalize yet. Offers accepted by finance will appear here.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-finalize ${activeOffer?.id === offer.id ? 'selected' : ''}
                       ${offer.status === 'FINANCE_ACCEPTED' || offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
                                    offer.status === 'FINALIZING' ? 'card-partial' :
                                        offer.status === 'FINALIZED' ? 'card-success' : ''}`}
                                onClick={() => {
                                    if (offer.status === 'FINALIZED') return;
                                    setActiveOffer(offer);
                                    setFinalizedItems({});
                                    setPurchaseOrder(null);
                                }}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                </div>
                                <div className="procurement-item-footer">
                <span className="procurement-item-date">
                    <FiClock />{new Date(offer.createdAt).toLocaleDateString()}
                </span>
                                </div>
                                <div className="procurement-item-footer">

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                                {activeOffer.status !== 'FINALIZED' && !purchaseOrder && (
                                    <div className="action-buttons-group">
                                        <button
                                            className="btn-primary"
                                            onClick={handleConfirmFinalization}
                                            disabled={
                                                loading ||
                                                totalFinalizedItems === 0 ||
                                                purchaseOrder !== null
                                            }
                                            style={{ marginRight: '10px' }}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="button-spinner"></div> Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <FiCheckCircle /> Confirm Finalization
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className="btn-primary"
                                            onClick={handleRetryClick}
                                            disabled={loading || isRetrying}
                                            title="Start over with entire quantity"
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
                                )}
                            </div>
                        </div>

                        <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                        {/* Replace the timeline section with the OfferTimeline component */}
                        <div className="procurement-request-summary-card-finalize">
                            <OfferTimeline
                                offer={activeOffer}
                                showRetryInfo={false}
                            />
                        </div>

                        {purchaseOrder && (
                            <div className="purchase-order-notification">
                                <div className="notification-icon">
                                    <FiFileText size={20} />
                                </div>
                                <div className="notification-content">
                                    <h4>Purchase Order Created</h4>
                                    <p>A purchase order #{purchaseOrder.poNumber || purchaseOrder.id} has been generated for this offer.</p>
                                </div>
                                <button
                                    className="view-purchase-order-button"
                                    onClick={() => window.location.href = '/procurement/purchase-orders'}
                                >
                                    View Purchase Orders
                                </button>
                            </div>
                        )}

                        {activeOffer.status === 'FINALIZED' && !purchaseOrder && !loading && (
                            <div className="purchase-order-notification">
                                <div className="notification-icon">
                                    <FiFileText size={20} />
                                </div>
                                <div className="notification-content">
                                    <h4>Offer Finalized</h4>
                                    <p>This offer has been finalized and a purchase order has been created.</p>
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
                            <div className="procurement-submitted-info-finalize">
                                {/* Item Review Details Section */}
                                <div className="procurement-submitted-details-finalize">
                                    <h4>Finalize Offer Items</h4>
                                    <div className="procurement-submitted-items-finalize">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                            // Only render if there are finance-accepted items for this request item
                                            if (offerItems.length === 0) return null;

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-finalize">
                                                    <div className="submitted-item-header-finalize">
                                                        <div className="item-icon-name-finalize">
                                                            <div className="item-icon-container-finalize">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-finalize">
                                                            {requestItem.quantity} {requestItem.itemType?.measuringUnit}
                                                        </div>
                                                    </div>

                                                    <div className="submitted-offer-solutions-finalize">
                                                        <table className="procurement-offer-entries-table-finalize">
                                                            <thead>
                                                            <tr>
                                                                <th>Merchant</th>
                                                                <th>Quantity</th>
                                                                <th>Unit Price</th>
                                                                <th>Total</th>
                                                                <th>Finalize</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {offerItems.map((offerItem) => (
                                                                <tr
                                                                    key={offerItem.id}
                                                                    className={finalizedItems[offerItem.id] ? 'item-finalized-finalize' : ''}
                                                                >
                                                                    <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                    <td>{offerItem.quantity} {requestItem.itemType?.measuringUnit}</td>
                                                                    <td>${parseFloat(offerItem.unitPrice || 0).toFixed(2)}</td>
                                                                    <td>${parseFloat(offerItem.totalPrice || 0).toFixed(2)}</td>
                                                                    <td>
                                                                        <label className="finalize-checkbox-container-finalize">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!!finalizedItems[offerItem.id]}
                                                                                onChange={() => handleFinalizeItem(offerItem.id)}
                                                                                disabled={
                                                                                    activeOffer.status === 'FINALIZED' ||
                                                                                    purchaseOrder !== null ||
                                                                                    loading
                                                                                }
                                                                            />
                                                                            <span className="finalize-checkmark-finalize"></span>
                                                                        </label>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* End of Item Review Details Section */}

                                {/* Total Summary */}
                                <div className="procurement-submitted-summary-finalize">
                                    <div className="summary-item-finalize">
                                        <FiCheck size={16} />
                                        <span className="summary-label-finalize">Total Items Finalized:</span>
                                        <span className="summary-value-finalize">
                                            {totalFinalizedItems}
                                        </span>
                                    </div>

                                    <div className="summary-item-finalize total-value-finalize">
                                        <FiDollarSign size={18} />
                                        <span className="summary-label-finalize">Total Value to be Finalized:</span>
                                        <span className="summary-value-finalize total-finalize">
                                            ${getFinalizedTotalValue().toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                {/* End of Total Summary */}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="procurement-empty-state-container">
                        <div className="procurement-empty-state">
                            <FiList size={64} color="#CBD5E1" />
                            <h3>No Offer Selected</h3>
                            {offers.length > 0 ? (
                                <p>Select an offer from the list to begin finalization</p>
                            ) : (
                                <p>Finance accepted offers will appear here for finalization</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={4000}
            />

            {/* Confirmation Dialog for Finalizing an Offer */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="success"
                title="Finalize Offer"
                message={`Are you sure you want to finalize ${totalFinalizedItems} item${totalFinalizedItems !== 1 ? 's' : ''} from this offer? The total value to be finalized is $${getFinalizedTotalValue().toFixed(2)}. This action will create a purchase order and cannot be undone.`}
                confirmText="Finalize Offer"
                cancelText="Cancel"
                onConfirm={saveFinalizedOffer}
                onCancel={handleConfirmDialogCancel}
                isLoading={loading}
                showIcon={true}
                size="large"
            />

            {/* Retry Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showRetryConfirm}
                type="warning"
                title="Retry Entire Offer"
                message={`Are you sure you want to create a new offer for the entire quantity based on "${activeOffer?.title}"? This will discard the current finalization progress.`}
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

            {/* Unfinalized Items Dialog */}
            <ConfirmationDialog
                isVisible={showUnfinalizedItemsDialog}
                type="info"
                title="Handle Unfinalized Items"
                message={`You have selected to finalize ${Object.values(finalizedItems).filter(v => v).length} items, but ${activeOffer?.offerItems?.filter(item =>
                    !Object.keys(finalizedItems).some(id => id === item.id.toString() && finalizedItems[id])
                ).length || 0} items remain unfinalized. What would you like to do with the unfinalized items?`}
                confirmText="Create New Offer for Remaining"
                cancelText="Finalize Selected Only"
                onConfirm={() => {
                    const finalizedItemIds = Object.entries(finalizedItems)
                        .filter(([_, isFinalized]) => isFinalized)
                        .map(([id, _]) => id);
                    processFinalizeOffer(finalizedItemIds, true);
                }}
                onCancel={() => {
                    const finalizedItemIds = Object.entries(finalizedItems)
                        .filter(([_, isFinalized]) => isFinalized)
                        .map(([id, _]) => id);
                    processFinalizeOffer(finalizedItemIds, false);
                }}
                onClose={handleUnfinalizedItemsDialogClose}
                isLoading={loading}
                showIcon={true}
                size="large"
            />

        </div>
    );
};

export default FinalizeOffers;