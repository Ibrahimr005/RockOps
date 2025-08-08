import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiSend, FiClock, FiAlertCircle,
    FiCheckCircle, FiPlusCircle, FiEdit, FiTrash2
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./InprogressOffers.scss"
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ProcurementSolutionModal from './ProcurementSolutionModal.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx'; // Add this import

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
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedOfferItem, setSelectedOfferItem] = useState(null);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    // Add confirmation dialog state
    const [confirmationDialog, setConfirmationDialog] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: null,
        isLoading: false
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
        // Show confirmation dialog before submitting
        setConfirmationDialog({
            show: true,
            type: 'success',
            title: 'Submit Offer',
            message: `Are you sure you want to submit the offer "${offer.title}"? Once submitted, you won't be able to make changes.`,
            onConfirm: () => handleConfirmSubmit(offer),
            isLoading: false
        });
    };

    // Handle confirmed submission
    const handleConfirmSubmit = async (offer) => {
        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

            // Call the status change handler
            await handleOfferStatusChange(offer.id, 'SUBMITTED', offer);

            // Close confirmation dialog
            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));

            // Show success message
            showSnackbar("success", "Offer submitted successfully");
        } catch (error) {
            console.error('Error submitting offer:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showSnackbar('error', 'Failed to submit offer. Please try again.');
        }
    };

    // Handle delete offer item request (shows confirmation dialog)
    const handleDeleteOfferItem = (offerItemId, offerItem) => {
        const merchantName = offerItem?.merchant?.name || 'Unknown Merchant';

        setConfirmationDialog({
            show: true,
            type: 'delete',
            title: 'Delete Procurement Solution',
            message: `Are you sure you want to remove the procurement solution from "${merchantName}"? This action cannot be undone.`,
            onConfirm: () => handleConfirmDelete(offerItemId),
            isLoading: false
        });
    };

    // Handle confirmed deletion
    const handleConfirmDelete = async (offerItemId) => {
        if (!activeOffer) return;

        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

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

            // Close confirmation dialog
            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));

            // Force re-render to update completion status
            setTimeout(() => setActiveOffer({...updatedOffer}), 100);

            showSnackbar('success', 'Procurement solution removed successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error removing offer item:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showSnackbar('error', 'Failed to remove procurement solution. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Handle confirmation dialog cancel
    const handleConfirmationCancel = () => {
        setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
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
        if (!activeOffer || !activeOffer.offerItems || activeOffer.offerItems.length === 0) return 'EGP';
        return activeOffer.offerItems[0].currency || 'EGP';
    };

    // Handle modal save (both add and edit)
    const handleModalSave = async (formData) => {
        if (!activeOffer || !selectedRequestItem) return;

        try {
            console.log("=== FRONTEND DEBUG ===");
            console.log("Modal mode:", modalMode);
            console.log("Active offer ID:", activeOffer.id);
            console.log("Selected request item ID:", selectedRequestItem.id);
            console.log("Form data received from modal:", formData);

            if (modalMode === 'add') {
                // Add new offer item
                const itemToAdd = {
                    ...formData,
                    requestOrderItemId: selectedRequestItem.id
                };

                console.log("Final item to add:", itemToAdd);
                console.log("Item to add details:");
                console.log("  requestOrderItemId:", itemToAdd.requestOrderItemId);
                console.log("  merchantId:", itemToAdd.merchantId);
                console.log("  quantity:", itemToAdd.quantity, "(type:", typeof itemToAdd.quantity, ")");
                console.log("  unitPrice:", itemToAdd.unitPrice, "(type:", typeof itemToAdd.unitPrice, ")");
                console.log("  totalPrice:", itemToAdd.totalPrice, "(type:", typeof itemToAdd.totalPrice, ")");
                console.log("  currency:", itemToAdd.currency);
                console.log("  estimatedDeliveryDays:", itemToAdd.estimatedDeliveryDays);
                console.log("  deliveryNotes:", itemToAdd.deliveryNotes);
                console.log("  comment:", itemToAdd.comment);

                // Validate data before sending
                if (!itemToAdd.merchantId) {
                    throw new Error("Merchant ID is required");
                }
                if (!itemToAdd.quantity || itemToAdd.quantity <= 0) {
                    throw new Error("Quantity must be greater than 0");
                }
                if (!itemToAdd.unitPrice || isNaN(itemToAdd.unitPrice)) {
                    throw new Error("Valid unit price is required");
                }
                if (!itemToAdd.totalPrice || isNaN(itemToAdd.totalPrice)) {
                    throw new Error("Valid total price is required");
                }
                if (!itemToAdd.currency) {
                    throw new Error("Currency is required");
                }

                console.log("Validation passed, sending request...");

                const addedItem = await fetchWithAuth(`${API_URL}/offers/${activeOffer.id}/items`, {
                    method: 'POST',
                    body: JSON.stringify([itemToAdd])
                });

                console.log("Response from server:", addedItem);

                // Update active offer with new items
                const updatedOffer = {
                    ...activeOffer,
                    offerItems: [...(activeOffer.offerItems || []), ...addedItem]
                };

                setActiveOffer(updatedOffer);
                showSnackbar('success', 'Procurement solution added successfully!');
            } else {
                // Edit existing offer item
                console.log("Editing offer item ID:", selectedOfferItem.id);
                console.log("Edit form data:", formData);

                const response = await fetchWithAuth(`${API_URL}/offers/items/${selectedOfferItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
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

                setActiveOffer(updatedOffer);
                showSnackbar('success', 'Procurement solution updated successfully!');
            }

            // Close modal and reset state
            handleCloseModal();
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error saving offer item:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            showSnackbar('error', `Failed to ${modalMode === 'add' ? 'add' : 'update'} procurement solution. Please try again.`);
            setTimeout(() => setError(null), 3000);
        }
    };

    // Handle opening modal for adding new item
    const handleSelectRequestItem = (requestItem) => {
        setSelectedRequestItem(requestItem);
        setSelectedOfferItem(null);
        setModalMode('add');
        setShowModal(true);
    };

    // Handle opening modal for editing existing item
    const handleEditOfferItem = (offerItem, requestItem) => {
        setSelectedRequestItem(requestItem);
        setSelectedOfferItem(offerItem);
        setModalMode('edit');
        setShowModal(true);
    };

    // Handle closing modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedRequestItem(null);
        setSelectedOfferItem(null);
        setModalMode('add');
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

    // Add this function to calculate totals by currency with better formatting
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
                    <div className="procurement-items-list-inprogress">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-inprogress ${activeOffer?.id === offer.id ? 'selected' : ''}`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header">
                                    <h4>{offer.title}</h4>
                                    {/*    <span className={`procurement-status-badge status-${offer.status.toLowerCase()}`}>*/}
                                    {/*    {offer.status}*/}
                                    {/*</span>*/}
                                </div>
                                <div className="procurement-item-footer-inprogress">
                                <span className="procurement-item-date-inprogress">
                                    <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
                                </span>
                                </div>
                                <div className="procurement-item-footer-inprogress">
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
                            <div className="procurement-title-section">
                                <h2 className="procurement-main-title">{activeOffer.title}</h2>
                                <div className="procurement-header-meta-inprogress">
                                <span className={`procurement-status-badge status-${activeOffer.status.toLowerCase()}`}>
                                    {activeOffer.status}
                                </span>
                                    <span className="procurement-meta-item-inprogress">
                                    <FiClock /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                </span>
                                </div>
                            </div>

                            <div className="procurement-details-actions">
                                <button
                                    className="btn-primary"
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
                                {/* Use RequestOrderDetails Component */}
                                <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                                {/* Request Order Summary */}
                                <div className="procurement-request-summary-card-inprogress">
                                    <h4>Request Order Items</h4>
                                    <p className="procurement-section-description-inprogress">
                                        Complete all items below to submit this procurement offer.
                                    </p>

                                    {/* Progress Overview */}
                                    <div className="procurement-overall-progress-inprogress">
                                        <div className="procurement-progress-stats-inprogress">
                                            <div className="procurement-progress-stat-inprogress">
                                                <div className="procurement-progress-stat-label-inprogress">Total Items</div>
                                                <div className="procurement-progress-stat-value-inprogress">
                                                    {activeOffer.requestOrder?.requestItems?.length || 0}
                                                </div>
                                            </div>
                                            <div className="procurement-progress-stat-inprogress">
                                                <div className="procurement-progress-stat-label-inprogress">Items Covered</div>
                                                <div className={`procurement-progress-stat-value-inprogress ${
                                                    isOfferComplete(activeOffer) ? 'fulfilled' : 'unfulfilled'
                                                }`}>
                                                    {activeOffer.requestOrder?.requestItems?.filter(item =>
                                                        hasOfferItem(item.id)).length || 0} / {activeOffer.requestOrder?.requestItems?.length || 0}
                                                </div>
                                            </div>
                                            <div className="procurement-progress-stat-inprogress">
                                                <div className="procurement-progress-stat-label-inprogress">Total Value</div>
                                                <div className="procurement-progress-stat-value-inprogress currency-totals-inprogress">
                                                    {Object.entries(getTotalsByCurrency(activeOffer)).length === 0 ? (
                                                        <div className="currency-total-item-inprogress">
                                                            <span className="currency-code">No</span>
                                                            <span className="currency-amount">items yet</span>
                                                        </div>
                                                    ) : (
                                                        Object.entries(getTotalsByCurrency(activeOffer)).map(([currency, total]) => (
                                                            <div key={currency} className="currency-total-item-inprogress">
                                                                <span className="currency-code">{currency}</span>
                                                                <span className="currency-amount">{total.toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Request Items with their Offer Items */}
                                <div className="procurement-request-items-section-inprogress">
                                    {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                        const offerItems = getOfferItemsForRequestItem(requestItem.id);
                                        const totalOffered = offerItems.reduce((total, item) => total + (item.quantity || 0), 0);
                                        const progress = Math.min(100, (totalOffered / requestItem.quantity) * 100);
                                        const isComplete = totalOffered >= requestItem.quantity;

                                        return (
                                            <div key={requestItem.id} className="procurement-request-item-card-inprogress">
                                                <div className="procurement-request-item-header-inprogress">
                                                    <div className="item-icon-name-inprogress">
                                                        <div className="item-icon-container-inprogress">
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

                                                {/* Item Details - Simple Design */}
                                                <div className="procurement-request-item-details-inprogress">
                                                    <div className="procurement-request-item-info-inprogress">


                                                        {requestItem.comment && (
                                                            <div className="item-notes-info-inprogress">
                                                                <div className="notes-label-inprogress">Notes</div>
                                                                <div className="notes-text-inprogress">{requestItem.comment}</div>
                                                            </div>
                                                        )}

                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="procurement-progress-container-inprogress">
                                                    <div className="procurement-progress-bar-inprogress">
                                                        <div
                                                            className={`procurement-progress-fill-inprogress ${isComplete ? 'complete' : ''}`}
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
                                                    <div className="procurement-existing-offer-items-inprogress">
                                                        <h6>Current Procurement Solutions</h6>
                                                        <table className="procurement-offer-entries-table-inprogress">
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
                                                                                    handleDeleteOfferItem(offerItem.id, offerItem);
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
                                                <div className="procurement-request-item-actions-inprogress">
                                                    <button
                                                        className="btn-add-solution"
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

            {/* Procurement Solution Modal */}
            <ProcurementSolutionModal
                isVisible={showModal}
                mode={modalMode}
                requestItem={selectedRequestItem}
                offerItem={selectedOfferItem}
                merchants={merchants}
                onClose={handleCloseModal}
                onSave={handleModalSave}
                defaultCurrency={getDefaultCurrency()}
            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmationDialog.show}
                type={confirmationDialog.type}
                title={confirmationDialog.title}
                message={confirmationDialog.message}
                confirmText={confirmationDialog.type === 'delete' ? "Delete Solution" : "Submit Offer"}
                cancelText="Cancel"
                onConfirm={confirmationDialog.onConfirm}
                onCancel={handleConfirmationCancel}
                isLoading={confirmationDialog.isLoading}
                size="large"
            />

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