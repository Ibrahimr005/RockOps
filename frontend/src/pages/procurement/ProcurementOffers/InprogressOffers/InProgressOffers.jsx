import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiSend, FiClock, FiAlertCircle,
    FiCheckCircle, FiPlusCircle, FiX, FiEdit, FiTrash2,
    FiUser, FiCalendar, FiFlag, FiFileText  // Add these new imports
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./InprogressOffers.scss"
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"

const InProgressOffers = ({
                              offers,
                              activeOffer,
                              setActiveOffer,
                              handleOfferStatusChange,
                              fetchWithAuth,
                              API_URL,
                              setError,
                              setSuccess
                          }) => {
    // State for InProgress tab
    const [merchants, setMerchants] = useState([]);
    const [selectedRequestItem, setSelectedRequestItem] = useState(null);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [selectedOfferItem, setSelectedOfferItem] = useState(null);
    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    // New offer item state
    const [newOfferItem, setNewOfferItem] = useState({
        requestOrderItemId: '',
        merchantId: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        currency: 'EGP',
        estimatedDeliveryDays: 7,
        deliveryNotes: '',
        comment: ''
    });

    // Edit offer item state
    const [editOfferItem, setEditOfferItem] = useState({
        merchantId: '',
        requestOrderItemId: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        currency: 'EGP',
        estimatedDeliveryDays: 7,
        deliveryNotes: '',
        comment: ''
    });

    // Fetch merchants for dropdown
    useEffect(() => {
        const fetchMerchants = async () => {
            try {
                const merchantsData = await fetchWithAuth(`${API_URL}/merchants`);
                setMerchants(merchantsData);
            } catch (error) {
                console.error('Error fetching merchants:', error);
                showSnackbar('error', 'Failed to load merchants. Please try again.');
            }
        };

        fetchMerchants();
    }, [API_URL, fetchWithAuth, setError]);

    // Submit an offer (change from INPROGRESS to SUBMITTED)
    const submitOffer = (offer) => {
        handleOfferStatusChange(offer.id, 'SUBMITTED');
        showSnackbar("success" , "Offer submitted successfully");
    };

    // Check if an offer is complete (has items for all request items)
    const isOfferComplete = (offer) => {
        if (!offer || !offer.requestOrder || !offer.offerItems) return false;

        // Get all request items
        const requestItems = offer.requestOrder.requestItems || [];
        if (requestItems.length === 0) return false;

        // Check each request item to ensure it has enough quantity covered
        return requestItems.every(requestItem => {
            // Get all offer items for this request item
            const offerItems = (offer.offerItems || []).filter(
                item => item.requestOrderItemId === requestItem.id ||
                    (item.requestOrderItem && item.requestOrderItem.id === requestItem.id)
            );

            // Calculate total offered quantity
            const totalOfferedQuantity = offerItems.reduce(
                (total, item) => total + (item.quantity || 0), 0
            );

            // Check if offered quantity meets or exceeds required quantity
            return totalOfferedQuantity >= requestItem.quantity;
        });
    };

    // Check if a request item already has an offer item
    const hasOfferItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return false;
        return activeOffer.offerItems.some(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Get default currency for the offer
    const getDefaultCurrency = () => {
        if (!activeOffer || !activeOffer.offerItems || activeOffer.offerItems.length === 0) return 'USD';
        return activeOffer.offerItems[0].currency || 'USD';
    };

    // Handle add offer item
    const handleAddOfferItem = async () => {
        if (!activeOffer || !selectedRequestItem) return;

        try {
            // Ensure total price is calculated correctly
            const totalPrice = newOfferItem.quantity * newOfferItem.unitPrice;

            const itemToAdd = {
                ...newOfferItem,
                requestOrderItemId: selectedRequestItem.id,
                totalPrice: totalPrice
            };

            const addedItem = await fetchWithAuth(`${API_URL}/offers/${activeOffer.id}/items`, {
                method: 'POST',
                body: JSON.stringify([itemToAdd])
            });

            // Update active offer with new items
            const updatedOffer = {
                ...activeOffer,
                offerItems: [...(activeOffer.offerItems || []), ...addedItem]
            };

            // Update active offer
            setActiveOffer(updatedOffer);

            showSnackbar('success', 'Procurement solution added successfully!');

            // Reset form and selected request item
            setNewOfferItem({
                requestOrderItemId: '',
                merchantId: '',
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                currency: 'USD',
                estimatedDeliveryDays: 7,
                deliveryNotes: '',
                comment: ''
            });
            setSelectedRequestItem(null);
            setShowAddItemModal(false);

            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error adding offer item:', error);
            showSnackbar('error', 'Failed to add procurement solution. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Handle edit offer item
    const handleEditOfferItem = (offerItem, requestItem) => {
        setSelectedRequestItem(requestItem);
        setSelectedOfferItem(offerItem);

        // Pre-populate the form with the existing item data
        setEditOfferItem({
            merchantId: offerItem.merchant?.id || offerItem.merchantId,
            requestOrderItemId: requestItem.id,
            quantity: offerItem.quantity,
            unitPrice: parseFloat(offerItem.unitPrice),
            totalPrice: parseFloat(offerItem.totalPrice),
            currency: offerItem.currency || 'USD',
            estimatedDeliveryDays: offerItem.estimatedDeliveryDays,
            deliveryNotes: offerItem.deliveryNotes || '',
            comment: offerItem.comment || ''
        });

        setShowEditItemModal(true);
    };

    // Handle save edited offer item
    const handleSaveEditedOfferItem = async () => {
        if (!activeOffer || !selectedOfferItem || !selectedRequestItem) return;

        try {
            // Ensure total price is calculated correctly
            const totalPrice = editOfferItem.quantity * editOfferItem.unitPrice;

            const itemToUpdate = {
                ...editOfferItem,
                totalPrice: totalPrice
            };

            const response = await fetchWithAuth(`${API_URL}/offers/items/${selectedOfferItem.id}`, {
                method: 'PUT',
                body: JSON.stringify(itemToUpdate)
            });

            // Update the offer item in the current state
            const updatedOfferItems = activeOffer.offerItems.map(item =>
                item.id === selectedOfferItem.id ? response : item
            );

            // Update active offer with the updated items
            const updatedOffer = {
                ...activeOffer,
                offerItems: updatedOfferItems
            };

            // Update active offer
            setActiveOffer(updatedOffer);

            showSnackbar('success', 'Procurement solution updated successfully!');

            // Reset form and selected items
            setEditOfferItem({
                merchantId: '',
                requestOrderItemId: '',
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                currency: 'USD',
                estimatedDeliveryDays: 7,
                deliveryNotes: '',
                comment: ''
            });
            setSelectedOfferItem(null);
            setSelectedRequestItem(null);
            setShowEditItemModal(false);

            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error updating offer item:', error);
            showSnackbar('error', 'Failed to update procurement solution. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Select a request item to add procurement for
    const handleSelectRequestItem = (requestItem) => {
        setSelectedRequestItem(requestItem);

        // Get existing offer items for this request item
        const offerItems = getOfferItemsForRequestItem(requestItem.id);
        const totalOffered = offerItems.reduce((total, item) => total + (item.quantity || 0), 0);

        // Set default quantity to remaining needed quantity
        setNewOfferItem({
            ...newOfferItem,
            requestOrderItemId: requestItem.id,
            quantity: Math.max(1, requestItem.quantity - totalOffered),
            currency: getDefaultCurrency() // Set default currency
        });

        setShowAddItemModal(true);
    };

    // Get total price for an offer
    const getTotalPrice = (offer) => {
        if (!offer || !offer.offerItems) return 0;
        return offer.offerItems.reduce((sum, item) => {
            const itemPrice = item.totalPrice ? parseFloat(item.totalPrice) : 0;
            return sum + itemPrice;
        }, 0);
    };

    // Get primary currency for an offer
    const getPrimaryCurrency = (offer) => {
        if (!offer || !offer.offerItems || offer.offerItems.length === 0) return 'USD';

        // Count occurrences of each currency
        const currencyCounts = {};
        offer.offerItems.forEach(item => {
            const currency = item.currency || 'USD';
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });

        // Find the most used currency
        let maxCount = 0;
        let primaryCurrency = 'USD';

        for (const [currency, count] of Object.entries(currencyCounts)) {
            if (count > maxCount) {
                maxCount = count;
                primaryCurrency = currency;
            }
        }

        return primaryCurrency;
    };

    // Add this function to calculate totals by currency
    const getTotalsByCurrency = (offer) => {
        if (!offer || !offer.offerItems || offer.offerItems.length === 0) return {};

        const totals = {};

        offer.offerItems.forEach(item => {
            const currency = item.currency || 'EGP';
            const amount = item.totalPrice ? parseFloat(item.totalPrice) : 0;

            if (!totals[currency]) {
                totals[currency] = 0;
            }

            totals[currency] += amount;
        });

        return totals;
    };

    // Add this function after the handleSaveEditedOfferItem function
    const handleDeleteOfferItem = async (offerItemId) => {
        if (!activeOffer) return;

        if (!window.confirm('Are you sure you want to remove this procurement solution?')) {
            return;
        }

        try {
            // Call API to delete the item
            await fetchWithAuth(`${API_URL}/offers/items/${offerItemId}`, {
                method: 'DELETE'
            });

            // Update UI to reflect deletion
            const updatedOfferItems = activeOffer.offerItems.filter(item => item.id !== offerItemId);

            const updatedOffer = {
                ...activeOffer,
                offerItems: updatedOfferItems
            };

            setActiveOffer(updatedOffer);
            showSnackbar('success', 'Procurement solution removed successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error removing offer item:', error);
            showSnackbar('error', 'Failed to remove procurement solution. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Helper function to show snackbar
    const showSnackbar = (type, message) => {
        setSnackbar({
            show: true,
            type,
            message
        });
    };

// Helper function to hide snackbar
    const hideSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            show: false
        }));
    };

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>In Progress Offers</h3>
                </div>

                {offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiEdit size={48} className="empty-icon" />
                        <p>No offers in progress. Start working on an unstarted offer first.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card ${activeOffer?.id === offer.id ? 'selected' : ''}`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                    <span className={`procurement-status-badge status-${offer.status.toLowerCase()}`}>
                                    {offer.status}
                                </span>
                                </div>
                                <div className="procurement-item-footer">
                                <span className="procurement-item-date">
                                    <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
                                </span>
                                </div>
                                <div className="procurement-item-footer">
                                <span className="procurement-item-completion">
                                    {isOfferComplete(offer) ?
                                        <span className="completion-complete"><FiCheckCircle /> Complete</span> :
                                        <span className="completion-incomplete"><FiAlertCircle /> Incomplete</span>
                                    }
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
                            <div>
                                <h3>{activeOffer.title}</h3>
                                <div className="procurement-header-meta">
                                <span className={`procurement-status-badge status-${activeOffer.status.toLowerCase()}`}>
                                    {activeOffer.status}
                                </span>
                                    <span className="procurement-meta-item">
                                    <FiClock /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                </span>
                                </div>
                            </div>

                            <div className="procurement-details-actions">
                                <button
                                    className="procurement-button start-working"
                                    onClick={() => submitOffer(activeOffer)}
                                    disabled={!isOfferComplete(activeOffer)}
                                >
                                    <FiSend /> {isOfferComplete(activeOffer) ? 'Submit Offer' : 'Complete All Items to Submit'}
                                </button>
                            </div>
                        </div>

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <>
                                {/* Request Order Information Card - NEW SECTION */}
                                <div className="procurement-request-order-info-card">
                                    <h4>Request Order Information</h4>

                                    <div className="procurement-request-order-details-grid">
                                        <div className="request-order-detail-item">
                                            <div className="request-order-detail-icon">
                                                <FiUser size={18} />
                                            </div>
                                            <div className="request-order-detail-content">
                                                <span className="request-order-detail-label">Requester</span>
                                                <span className="request-order-detail-value">{activeOffer.requestOrder.requesterName || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        <div className="request-order-detail-item">
                                            <div className="request-order-detail-icon">
                                                <FiCalendar size={18} />
                                            </div>
                                            <div className="request-order-detail-content">
                                                <span className="request-order-detail-label">Request Date</span>
                                                <span className="request-order-detail-value">{new Date(activeOffer.requestOrder.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="request-order-detail-item">
                                            <div className="request-order-detail-icon">
                                                <FiCalendar size={18} />
                                            </div>
                                            <div className="request-order-detail-content">
                                                <span className="request-order-detail-label">Deadline</span>
                                                <span className="request-order-detail-value">{new Date(activeOffer.requestOrder.deadline).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="request-order-detail-item">
                                            <div className="request-order-detail-icon">
                                                <FiUser size={18} />
                                            </div>
                                            <div className="request-order-detail-content">
                                                <span className="request-order-detail-label">Created By</span>
                                                <span className="request-order-detail-value">{activeOffer.requestOrder.createdBy || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        {activeOffer.requestOrder.priority && (
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

                                        {activeOffer.requestOrder.description && (
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

                                {/* Request Order Summary */}
                                <div className="procurement-request-summary-card">
                                    <h4>Request Order Items</h4>
                                    <p className="procurement-section-description">
                                        Complete all items below to submit this procurement offer.
                                    </p>

                                    {/* Progress Overview */}
                                    {/* Updated Progress Overview section */}
                                    <div className="procurement-overall-progress">
                                        <div className="procurement-progress-stats">
                                            <div className="procurement-progress-stat">
                                                <div className="procurement-progress-stat-label">Total Items</div>
                                                <div className="procurement-progress-stat-value">
                                                    {activeOffer.requestOrder?.requestItems?.length || 0}
                                                </div>
                                            </div>
                                            <div className="procurement-progress-stat">
                                                <div className="procurement-progress-stat-label">Items Covered</div>
                                                <div className={`procurement-progress-stat-value ${
                                                    isOfferComplete(activeOffer) ? 'fulfilled' : 'unfulfilled'
                                                }`}>
                                                    {activeOffer.requestOrder?.requestItems?.filter(item =>
                                                        hasOfferItem(item.id)).length || 0} / {activeOffer.requestOrder?.requestItems?.length || 0}
                                                </div>
                                            </div>
                                            <div className="procurement-progress-stat">
                                                <div className="procurement-progress-stat-label">Total Value</div>
                                                <div className="procurement-progress-stat-value currency-totals">
                                                    {Object.entries(getTotalsByCurrency(activeOffer)).map(([currency, total], index) => (
                                                        <div key={currency} className="currency-total-item">
                                                            {currency} {total.toFixed(2)}
                                                            {index < Object.entries(getTotalsByCurrency(activeOffer)).length - 1 && <span className="currency-separator">|</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Request Items with their Offer Items */}
                                <div className="procurement-request-items-section">
                                    {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                        const offerItems = getOfferItemsForRequestItem(requestItem.id);
                                        const totalOffered = offerItems.reduce((total, item) => total + (item.quantity || 0), 0);
                                        const progress = Math.min(100, (totalOffered / requestItem.quantity) * 100);
                                        const isComplete = totalOffered >= requestItem.quantity;

                                        return (
                                            <div key={requestItem.id} className="procurement-request-item-card">
                                                <div className="procurement-request-item-header">
                                                    <div className="item-icon-name">
                                                        <div className="item-icon-container">
                                                            <FiPackage size={20} />
                                                        </div>
                                                        <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                    </div>

                                                    {isComplete ? (
                                                        <span className="procurement-status-badge status-complete">
                                                        <FiCheckCircle size={14} /> Complete
                                                    </span>
                                                    ) : (
                                                        <span className="procurement-status-badge status-needed">
                                                        <FiAlertCircle size={14} /> Needs {requestItem.quantity - totalOffered} more {requestItem.itemType.measuringUnit}
                                                    </span>
                                                    )}
                                                </div>

                                                {/* Item Details */}
                                                <div className="procurement-request-item-details">
                                                    <div className="procurement-request-item-info">
                                                        <div className="item-detail">
                                                            <span className="detail-label">Required:</span>
                                                            <span className="detail-value">{requestItem.quantity} {requestItem.itemType.measuringUnit}</span>
                                                        </div>

                                                        {requestItem.comment && (
                                                            <div className="item-detail full-width">
                                                                <span className="detail-label">Notes:</span>
                                                                <span className="detail-value">{requestItem.comment}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="procurement-progress-container">
                                                    <div className="procurement-progress-bar">
                                                        <div
                                                            className={`procurement-progress-fill ${isComplete ? 'complete' : ''}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="procurement-progress-details">
                                                        <span>Progress: {Math.round(progress)}%</span>
                                                        <span>{totalOffered} of {requestItem.quantity} {requestItem.itemType.measuringUnit}</span>
                                                    </div>
                                                </div>

                                                {/* Current Offer Items for this Request Item */}
                                                {offerItems.length > 0 && (
                                                    <div className="procurement-existing-offer-items">
                                                        <h6>Current Procurement Solutions</h6>
                                                        <table className="procurement-offer-entries-table">
                                                            <thead>
                                                            <tr>
                                                                <th>Merchant</th>
                                                                <th>Quantity</th>
                                                                <th>Unit Price</th>
                                                                <th>Total</th>
                                                                <th>Delivery</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {offerItems.map((offerItem, idx) => (
                                                                <tr key={offerItem.id || idx}>
                                                                    <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                    <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                    <td>{offerItem.currency || 'USD'} {parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                    <td>{offerItem.currency || 'USD'} {parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                    <td>{offerItem.estimatedDeliveryDays} days</td>
                                                                    <td>
                                                                        <div className="procurement-action-buttons">
                                                                            <button
                                                                                className="procurement-action-button edit"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleEditOfferItem(offerItem, requestItem);
                                                                                }}
                                                                                title="Edit this solution"
                                                                            >
                                                                                <FiEdit size={16} />
                                                                            </button>
                                                                            <button
                                                                                className="procurement-action-button delete"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteOfferItem(offerItem.id);
                                                                                }}
                                                                                title="Remove this solution"
                                                                            >
                                                                                <FiTrash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Add New Offer Item Button */}
                                                <div className="procurement-request-item-actions">
                                                    <button
                                                        className="procurement-button primary-outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectRequestItem(requestItem);
                                                        }}
                                                    >
                                                        <FiPlusCircle /> {offerItems.length > 0 ? 'Add Another Solution' : 'Add Procurement Solution'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
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

                            <h3>No In Progress Offers Selected</h3>

                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view details</p>
                            ) : (
                                <p>Start working on unstarted offers first</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for adding offer item */}
            {showAddItemModal && selectedRequestItem && (
                <div className="procurement-modal-overlay">
                    <div className="procurement-modal-container">
                        <div className="procurement-modal-header">
                            <h4>Add Procurement Solution for: {selectedRequestItem.itemType?.name || 'Item'}</h4>
                            <button
                                className="procurement-modal-close-button"
                                onClick={() => setShowAddItemModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="procurement-modal-body">
                            <div className="procurement-form-group">
                                <label>Merchant</label>
                                <select
                                    className="procurement-form-select"
                                    value={newOfferItem.merchantId}
                                    onChange={(e) => setNewOfferItem({...newOfferItem, merchantId: e.target.value})}
                                    required
                                >
                                    <option value="">Select a merchant</option>
                                    {merchants.map(merchant => (
                                        <option key={merchant.id} value={merchant.id}>
                                            {merchant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="procurement-form-group">
                                <label>Currency</label>
                                <select
                                    className="procurement-form-select"
                                    value={newOfferItem.currency}
                                    onChange={(e) => setNewOfferItem({...newOfferItem, currency: e.target.value})}
                                    required
                                >
                                    <option value="EGP">EGP (Egyptian Pound)</option>
                                    <option value="USD">USD (US Dollar)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="GBP">GBP (British Pound)</option>
                                    <option value="JPY">JPY (Japanese Yen)</option>
                                    <option value="CAD">CAD (Canadian Dollar)</option>
                                    <option value="AUD">AUD (Australian Dollar)</option>
                                    <option value="CHF">CHF (Swiss Franc)</option>
                                    <option value="CNY">CNY (Chinese Yuan)</option>
                                    <option value="INR">INR (Indian Rupee)</option>
                                    <option value="SGD">SGD (Singapore Dollar)</option>
                                </select>
                            </div>

                            <div className="procurement-form-row">
                                <div className="procurement-form-group half">
                                    <label>Quantity ({selectedRequestItem.itemType?.measuringUnit})</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            min="1"
                                            value={newOfferItem.quantity}
                                            onChange={(e) => {
                                                const qty = parseInt(e.target.value) || 0;
                                                setNewOfferItem({
                                                    ...newOfferItem,
                                                    quantity: qty,
                                                    totalPrice: qty * newOfferItem.unitPrice
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="procurement-form-group half">
                                    <label>Unit Price</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            step="0.01"
                                            min="0"
                                            value={newOfferItem.unitPrice}
                                            onChange={(e) => {
                                                const price = parseFloat(e.target.value) || 0;
                                                setNewOfferItem({
                                                    ...newOfferItem,
                                                    unitPrice: price,
                                                    totalPrice: newOfferItem.quantity * price
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="procurement-form-row">
                                <div className="procurement-form-group half">
                                    <label>Total Price</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="text"
                                            className="procurement-form-input procurement-form-input-readonly with-currency-suffix"
                                            value={(newOfferItem.quantity * newOfferItem.unitPrice).toFixed(2)}
                                            readOnly
                                        />
                                        <div className="currency-prefix">{newOfferItem.currency}</div>
                                    </div>
                                </div>

                                <div className="procurement-form-group half">
                                    <label>Est. Delivery (days)</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            min="1"
                                            value={newOfferItem.estimatedDeliveryDays}
                                            onChange={(e) => setNewOfferItem({
                                                ...newOfferItem,
                                                estimatedDeliveryDays: parseInt(e.target.value) || 7
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="procurement-form-group">
                                <label>Delivery Notes</label>
                                <textarea
                                    className="procurement-form-textarea"
                                    value={newOfferItem.deliveryNotes}
                                    onChange={(e) => setNewOfferItem({
                                        ...newOfferItem,
                                        deliveryNotes: e.target.value
                                    })}
                                    placeholder="Any special delivery instructions"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="procurement-modal-footer">
                            <button
                                className="procurement-button secondary"
                                onClick={() => setShowAddItemModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="procurement-button start-working"
                                onClick={handleAddOfferItem}
                                disabled={!newOfferItem.merchantId || newOfferItem.quantity < 1 || newOfferItem.unitPrice <= 0}
                            >
                                Add to Offer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for editing offer item */}
            {showEditItemModal && selectedOfferItem && selectedRequestItem && (
                <div className="procurement-modal-overlay">
                    <div className="procurement-modal-container">
                        <div className="procurement-modal-header">
                            <h4>Edit Procurement Solution for: {selectedRequestItem.itemType?.name || 'Item'}</h4>
                            <button
                                className="procurement-modal-close-button"
                                onClick={() => setShowEditItemModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="procurement-modal-body">
                            <div className="procurement-form-group">
                                <label>Merchant</label>
                                <select
                                    className="procurement-form-select"
                                    value={editOfferItem.merchantId}
                                    onChange={(e) => setEditOfferItem({...editOfferItem, merchantId: e.target.value})}
                                    required
                                >
                                    <option value="">Select a merchant</option>
                                    {merchants.map(merchant => (
                                        <option key={merchant.id} value={merchant.id}>
                                            {merchant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="procurement-form-group">
                                <label>Currency</label>
                                <select
                                    className="procurement-form-select"
                                    value={editOfferItem.currency}
                                    onChange={(e) => setEditOfferItem({...editOfferItem, currency: e.target.value})}
                                    required
                                >
                                    <option value="EGP">EGP (Egyptian Pound)</option>
                                    <option value="USD">USD (US Dollar)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="GBP">GBP (British Pound)</option>
                                    <option value="JPY">JPY (Japanese Yen)</option>
                                    <option value="CAD">CAD (Canadian Dollar)</option>
                                    <option value="AUD">AUD (Australian Dollar)</option>
                                    <option value="CHF">CHF (Swiss Franc)</option>
                                    <option value="CNY">CNY (Chinese Yuan)</option>
                                    <option value="INR">INR (Indian Rupee)</option>
                                    <option value="SGD">SGD (Singapore Dollar)</option>
                                </select>
                            </div>

                            <div className="procurement-form-row">
                                <div className="procurement-form-group half">
                                    <label>Quantity ({selectedRequestItem.itemType?.measuringUnit})</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            min="1"
                                            value={editOfferItem.quantity}
                                            onChange={(e) => {
                                                const qty = parseInt(e.target.value) || 0;
                                                setEditOfferItem({
                                                    ...editOfferItem,
                                                    quantity: qty,
                                                    totalPrice: qty * editOfferItem.unitPrice
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="procurement-form-group half">
                                    <label>Unit Price</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            step="0.01"
                                            min="0"
                                            value={editOfferItem.unitPrice}
                                            onChange={(e) => {
                                                const price = parseFloat(e.target.value) || 0;
                                                setEditOfferItem({
                                                    ...editOfferItem,
                                                    unitPrice: price,
                                                    totalPrice: editOfferItem.quantity * price
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="procurement-form-row">
                                <div className="procurement-form-group half">
                                    <label>Total Price</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="text"
                                            className="procurement-form-input procurement-form-input-readonly with-currency-suffix"
                                            value={(editOfferItem.quantity * editOfferItem.unitPrice).toFixed(2)}
                                            readOnly
                                        />
                                        <div className="currency-prefix">{editOfferItem.currency}</div>
                                    </div>
                                </div>

                                <div className="procurement-form-group half">
                                    <label>Est. Delivery (days)</label>
                                    <div className="procurement-form-input-with-icon">
                                        <input
                                            type="number"
                                            className="procurement-form-input"
                                            min="1"
                                            value={editOfferItem.estimatedDeliveryDays}
                                            onChange={(e) => setEditOfferItem({
                                                ...editOfferItem,
                                                estimatedDeliveryDays: parseInt(e.target.value) || 7
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="procurement-form-group">
                                <label>Delivery Notes</label>
                                <textarea
                                    className="procurement-form-textarea"
                                    value={editOfferItem.deliveryNotes}
                                    onChange={(e) => setEditOfferItem({
                                        ...editOfferItem,
                                        deliveryNotes: e.target.value
                                    })}
                                    placeholder="Any special delivery instructions"
                                    rows={2}
                                />
                            </div>

                            <div className="procurement-form-group">
                                <label>Comments</label>
                                <textarea
                                    className="procurement-form-textarea"
                                    value={editOfferItem.comment}
                                    onChange={(e) => setEditOfferItem({
                                        ...editOfferItem,
                                        comment: e.target.value
                                    })}
                                    placeholder="Additional comments about this item"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="procurement-modal-footer">
                            <button
                                className="procurement-button secondary"
                                onClick={() => setShowEditItemModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="procurement-button start-working"
                                onClick={handleSaveEditedOfferItem}
                                disabled={!editOfferItem.merchantId || editOfferItem.quantity < 1 || editOfferItem.unitPrice <= 0}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Snackbar
                type={snackbar.type}
                text={snackbar.message}
                isVisible={snackbar.show}
                onClose={hideSnackbar}
                duration={3000}
            />
        </div>
    );
};

export default InProgressOffers;