import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle, FiX, FiFileText, FiList,
    FiUser, FiCalendar, FiFlag  // Added these icons for Request Order Information
} from 'react-icons/fi';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import "../ProcurementOffers.scss";
import "./FinalizeOffers.scss";

const FinalizeOffers = ({
                            offers,
                            activeOffer,
                            setActiveOffer,
                            getTotalPrice,
                            fetchWithAuth,
                            API_URL,
                            setError,
                            setSuccess,
                            onOfferFinalized  // Add this new prop
                        }) => {
    const [loading, setLoading] = useState(false);
    const [finalizedItems, setFinalizedItems] = useState({});
    const [purchaseOrder, setPurchaseOrder] = useState(null);

    // Snackbar states
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');

    // Function to show snackbar
    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
    };

    // Use snackbar for notifications, fallback to props if available
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

    // Remove the old local error/success useEffect hooks since we're using Snackbar now

    // Function to handle finalizing an item
    const handleFinalizeItem = (offerItemId) => {
        setFinalizedItems(prev => ({
            ...prev,
            [offerItemId]: !prev[offerItemId]
        }));
    };

    // Function to save the finalized offer
    const saveFinalizedOffer = async () => {
        if (!activeOffer) return;

        setLoading(true);
        try {
            // Create an array of finalized item IDs
            const finalizedItemIds = Object.entries(finalizedItems)
                .filter(([_, isFinalized]) => isFinalized)
                .map(([id, _]) => id);

            if (finalizedItemIds.length === 0) {
                handleError('Please select at least one item to finalize');
                setLoading(false);
                return;
            }

            // Get token from localStorage
            const token = localStorage.getItem("token");

            // Log what we're sending to help debug
            console.log('Finalizing offer with ID:', activeOffer.id);
            console.log('Finalized item IDs:', finalizedItemIds);

            // Send the finalized items to the backend
            const response = await fetch(`${API_URL}/purchaseOrders/offers/${activeOffer.id}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ finalizedItemIds })
            });

            // Get the response data
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error response:', errorData);
                throw new Error(`Server responded with ${response.status}: ${errorData}`);
            }

            const responseData = await response.json();
            console.log('Response data:', responseData);

            // If we have a purchase order in the response, store it
            if (responseData.purchaseOrder) {
                setPurchaseOrder(responseData.purchaseOrder);
            }

            // Update the offer status in the UI by modifying the active offer
            const updatedActiveOffer = {
                ...activeOffer,
                status: 'FINALIZED'
            };
            setActiveOffer(updatedActiveOffer);

            // Update the offers list to remove the finalized offer or update its status
            // This is typically handled by the parent component, but we can trigger a callback
            // or filter out finalized offers locally if needed

            // If there's a parent callback to refresh offers, call it
            if (typeof window !== 'undefined' && window.refreshFinalizePage) {
                window.refreshFinalizePage();
            }

            handleSuccess(responseData.message || 'Offer finalized successfully! A purchase order has been created.');

            // Call the parent callback to remove this offer from the list
            if (onOfferFinalized) {
                onOfferFinalized(activeOffer.id);
            }

            // Clear the active offer since it's no longer available for finalization
            setTimeout(() => {
                setActiveOffer(null);
            }, 1500); // Give user time to see the success message

        } catch (err) {
            console.error('Error finalizing offer:', err);
            handleError('Failed to finalize offer: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    // Format status for display
    const formatStatus = (status) => {
        if (!status) return 'Unknown Status';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Get offer items for a specific request item - only show ACCEPTED items
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => (item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId) &&
                item.financeStatus === 'FINANCE_ACCEPTED'  // Only show finance accepted items
        );
    };

    // Count total accepted items and finalized items
    const totalAcceptedItems = activeOffer?.offerItems?.filter(item =>
        item.financeStatus === 'FINANCE_ACCEPTED'
    ).length || 0;

    const totalFinalizedItems = Object.values(finalizedItems).filter(v => v).length;

    return (
        <div className="procurement-offers-main-content">
            {/* Snackbar Notification */}
            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={4000}
            />

            {/* Offers List */}
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
                                className={`procurement-item-card ${activeOffer?.id === offer.id ? 'selected' : ''} 
                                           ${offer.status === 'FINANCE_ACCEPTED' || offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
                                    offer.status === 'FINALIZING' ? 'card-partial' :
                                        offer.status === 'FINALIZED' ? 'card-success' : ''}`}
                                onClick={() => {
                                    // Don't allow selecting offers that are already finalized
                                    if (offer.status === 'FINALIZED') return;

                                    setActiveOffer(offer);
                                    setFinalizedItems({}); // Reset finalized items when changing offers
                                    setPurchaseOrder(null); // Reset purchase order
                                }}
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
                                {/* Only show button if offer is not finalized and no purchase order exists */}
                                {activeOffer.status !== 'FINALIZED' && !purchaseOrder && (
                                    <button
                                        className="finalize-all-offer-button"
                                        onClick={saveFinalizedOffer}
                                        disabled={
                                            loading ||
                                            totalFinalizedItems === 0 ||
                                            purchaseOrder !== null // Disable if purchase order already created
                                        }
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

                        {/* If purchase order was created, show a success banner */}
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

                        {/* If offer is already finalized but no purchase order is shown yet, fetch it */}
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
                            <div className="procurement-submitted-info">
                                <div className="finance-review-summary">
                                    <h4>Finalize Offer Items</h4>
                                    <p className="finance-review-description">
                                        Please confirm each item that has been verified with the merchant.
                                        Check the box for each item once you've confirmed availability and delivery details.
                                        Only finance-accepted items are shown below.
                                    </p>
                                </div>

                                {/* Procurement Items with Finalize Checkboxes */}
                                <div className="procurement-submitted-details">
                                    <h4>Item Finalization</h4>
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
                                                                    <th>Finalize</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {offerItems.map((offerItem, idx) => (
                                                                    <tr key={offerItem.id || idx}
                                                                        className={finalizedItems[offerItem.id] ? 'item-finalized' : ''}
                                                                    >
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>
                                                                            <label className="finalize-checkbox-container">
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
                                                                                <span className="finalize-checkmark"></span>
                                                                            </label>
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
                                        <span>Total Finance-Accepted Items:</span>
                                        <span>
                                            {totalAcceptedItems}
                                        </span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Items Finalized:</span>
                                        <span>
                                            {totalFinalizedItems}
                                        </span>
                                    </div>
                                    <div className="submitted-summary-row">
                                        <span>Total Value of Finance-Accepted Items:</span>
                                        <span className="submitted-total-value text-success">
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

            {/* Snackbar Notification */}
            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={4000}
            />
        </div>
    );
};

export default FinalizeOffers;