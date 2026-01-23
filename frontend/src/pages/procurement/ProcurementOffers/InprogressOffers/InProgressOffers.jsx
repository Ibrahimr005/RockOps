import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiSend, FiClock, FiAlertCircle,
    FiCheckCircle, FiPlusCircle, FiEdit, FiTrash2,
    FiDownload, FiUpload, FiFileText
} from 'react-icons/fi';

import "../ProcurementOffers.scss"
import "./InprogressOffers.scss"
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx"
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import ProcurementSolutionModal from './ProcurementSolutionModal/ProcurementSolutionModal.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import ModifyRequestItemsModal from './ModifyRequestItems/ModifyRequestItemsModal.jsx';
import RFQExportDialog from './RFQExportDialog/RFQExportDialog.jsx';
import RFQImportDialog from './RFQImportDialog/RFQImportDialog.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';
import { procurementService } from '../../../../services/procurement/procurementService.js';
import { offerRequestItemService } from '../../../../services/procurement/offerRequestItemService.js';
import { itemTypeService } from '../../../../services/itemTypeService.js';

const InProgressOffers = ({
                              offers,
                              activeOffer,
                              setActiveOffer,
                              handleOfferStatusChange,
                              fetchWithAuth,
                              API_URL,
                              setError,
                              setSuccess,
                              onDeleteOffer
                          }) => {
    // State for InProgress tab
    const [merchants, setMerchants] = useState([]);
    const [selectedRequestItem, setSelectedRequestItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedOfferItem, setSelectedOfferItem] = useState(null);

    // NEW: RFQ related states
    const [itemTypes, setItemTypes] = useState([]);
    const [requestItems, setRequestItems] = useState([]);
    const [showModifyItemsModal, setShowModifyItemsModal] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [effectiveRequestItems, setEffectiveRequestItems] = useState([]);
    const [allOffersEffectiveItems, setAllOffersEffectiveItems] = useState({});

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

    // New states for delete offer functionality
    const [showDeleteOfferConfirm, setShowDeleteOfferConfirm] = useState(false);
    const [isDeletingOffer, setIsDeletingOffer] = useState(false);

    // Fetch merchants for dropdown
    useEffect(() => {
        const fetchMerchants = async () => {
            try {
                const response = await procurementService.getAllMerchants();
                const merchantsData = response.data || response;
                setMerchants(merchantsData);
            } catch (error) {
                console.error('Error fetching merchants:', error);
                showSnackbar('error', 'Failed to load merchants. Please try again.');
            }
        };

        fetchMerchants();
    }, []);


    useEffect(() => {
        const fetchItemTypes = async () => {
            try {
                const response = await itemTypeService.getAll();

                // Extract data array from response
                const data = response.data || response;

                setItemTypes(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching item types:', error);
                setItemTypes([]);
            }
        };

        fetchItemTypes();
    }, []);

    // NEW: RFQ Handlers
    const handleModifyItems = async () => {
        if (!activeOffer) return;

        try {
            // Load effective request items
            const items = await offerRequestItemService.getEffectiveRequestItems(activeOffer.id);
            setRequestItems(items);
            setShowModifyItemsModal(true);
        } catch (error) {
            console.error('Error loading request items:', error);
            showSnackbar('error', 'Failed to load request items');
        }
    };

    const handleExportRFQ = async () => {
        if (!activeOffer) return;

        try {
            // Load effective request items
            const items = await offerRequestItemService.getEffectiveRequestItems(activeOffer.id);
            setRequestItems(items);
            setShowExportDialog(true);
        } catch (error) {
            console.error('Error loading request items:', error);
            showSnackbar('error', 'Failed to load request items');
        }
    };

    const handleImportRFQ = () => {
        if (!activeOffer) return;
        setShowImportDialog(true);
    };

    const handleRFQSuccess = async () => {
        if (activeOffer) {
            try {
                // Reload the entire offer to get updated offerItems
                const updatedOffer = await offerService.getById(activeOffer.id);
                setActiveOffer(updatedOffer);

                // Reload effective request items for the active offer
                const items = await offerRequestItemService.getEffectiveRequestItems(activeOffer.id);
                setEffectiveRequestItems(items);

                // Update the all offers map
                setAllOffersEffectiveItems(prev => ({
                    ...prev,
                    [activeOffer.id]: items
                }));

            } catch (error) {
                console.error('Error reloading offer:', error);
                showSnackbar('error', 'Failed to reload offer data');
            }
        }
    };    // ... (keep all your existing functions: submitOffer, handleConfirmSubmit, handleDeleteOfferClick, etc.)
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

            const submittedOffer = {
                ...offer,
                status: 'SUBMITTED'
            };

            if (handleOfferStatusChange) {
                await handleOfferStatusChange(offer.id, 'SUBMITTED', submittedOffer);
            }

            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
            showSnackbar("success", "Offer submitted successfully");
            setActiveOffer(null);

        } catch (error) {
            console.error('Error submitting offer:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showSnackbar('error', 'Failed to submit offer. Please try again.');
        }
    };

    // Delete offer functionality
    const handleDeleteOfferClick = () => {
        setShowDeleteOfferConfirm(true);
    };

    const confirmDeleteOffer = async () => {
        setIsDeletingOffer(true);
        const offerTitle = activeOffer.title;
        const offerIdToDelete = activeOffer.id;

        try {
            await offerService.delete(activeOffer.id);
            showSnackbar('success', `Offer "${offerTitle}" deleted successfully`);
            setShowDeleteOfferConfirm(false);
            setActiveOffer(null);

            if (onDeleteOffer) {
                onDeleteOffer(offerIdToDelete);
            }

        } catch (error) {
            console.error('Error deleting offer:', error);
            showSnackbar('error', 'Failed to delete offer. Please try again.');
            setShowDeleteOfferConfirm(false);
        } finally {
            setIsDeletingOffer(false);
        }
    };

    const cancelDeleteOffer = () => {
        setShowDeleteOfferConfirm(false);
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
// Handle confirmed deletion
    const handleConfirmDelete = async (offerItemId) => {
        if (!activeOffer) return;

        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));
            await offerService.deleteItem(offerItemId);

            const updatedOfferItems = activeOffer.offerItems.filter(item => item.id !== offerItemId);
            const updatedOffer = {
                ...activeOffer,
                offerItems: updatedOfferItems
            };

            setActiveOffer(updatedOffer);
            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));

            // Force re-render with updated data
            setTimeout(() => setActiveOffer({...updatedOffer}), 100);

            showSnackbar('success', 'Procurement solution deleted successfully!');
        } catch (error) {
            console.error('Error deleting offer item:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showSnackbar('error', error.message || 'Failed to delete procurement solution. Please try again.');
        }
    };
    // Handle confirmation dialog cancel
    const handleConfirmationCancel = () => {
        setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
    };

    // Check if an offer is complete (has items for all request items)
    const isOfferComplete = (offer) => {
        if (!offer || !effectiveRequestItems || effectiveRequestItems.length === 0) return false;

        return effectiveRequestItems.every(requestItem => {
            const itemTypeId = requestItem.itemTypeId || requestItem.itemType?.id;

            // Get offer items that match this item type
            const offerItems = (offer.offerItems || []).filter(
                item => item.itemType?.id === itemTypeId
            );

            const totalOfferedQuantity = offerItems.reduce(
                (total, item) => total + (item.quantity || 0), 0
            );

            return totalOfferedQuantity >= requestItem.quantity;
        });
    };


    const hasOfferItem = (requestItemId, itemTypeId) => {
        if (!activeOffer || !activeOffer.offerItems) return false;

        // Match by item type ID (handles both original and modified items)
        if (itemTypeId) {
            return activeOffer.offerItems.some(
                item => item.itemType?.id === itemTypeId
            );
        }

        // Fallback: match by request item ID (for original items only)
        return activeOffer.offerItems.some(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Get offer items for a specific request item
    // Get offer items for a specific request item (matches by item type ID)
    const getOfferItemsForRequestItem = (requestItemId, itemTypeId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];

        // Match by item type ID (this handles both original and modified items)
        if (itemTypeId) {
            return activeOffer.offerItems.filter(
                item => item.itemType?.id === itemTypeId
            );
        }

        // Fallback: match by request item ID (for original items only)
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
// Handle modal save (both add and edit)
    const handleModalSave = async (formData) => {
        if (!activeOffer || !selectedRequestItem) return;

        try {
            if (modalMode === 'add') {
                const existingOfferItems = activeOffer.offerItems || [];
                const existingItem = existingOfferItems.find(item =>
                    (item.requestOrderItem?.id === selectedRequestItem.id ||
                        item.requestOrderItemId === selectedRequestItem.id) &&
                    item.merchantId === formData.merchantId &&
                    parseFloat(item.unitPrice) === parseFloat(formData.unitPrice) &&
                    item.currency === formData.currency
                );

                if (existingItem) {
                    const newQuantity = (existingItem.quantity || 0) + (formData.quantity || 0);
                    const newTotalPrice = newQuantity * parseFloat(formData.unitPrice);

                    const updateData = {
                        quantity: newQuantity,
                        totalPrice: newTotalPrice,
                        estimatedDeliveryDays: formData.estimatedDeliveryDays,
                        deliveryNotes: formData.deliveryNotes,
                        comment: formData.comment
                    };

                    const updatedItem = await offerService.updateItem(existingItem.id, updateData);

                    const updatedOfferItems = activeOffer.offerItems.map(item =>
                        item.id === existingItem.id ? updatedItem : item
                    );

                    const updatedOffer = {
                        ...activeOffer,
                        offerItems: updatedOfferItems
                    };

                    setActiveOffer(updatedOffer);
                    handleCloseModal();
                    showSnackbar('success', 'Procurement solution merged with existing entry!');
                } else {
                    const itemToAdd = {
                        ...formData,
                        itemTypeId: selectedRequestItem.itemTypeId || selectedRequestItem.itemType?.id // Send itemTypeId
                    };

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

                    const addedItems = await offerService.addItems(activeOffer.id, [itemToAdd]);

                    const updatedOffer = {
                        ...activeOffer,
                        offerItems: [...(activeOffer.offerItems || []), ...addedItems]
                    };

                    setActiveOffer(updatedOffer);
                    handleCloseModal();
                    showSnackbar('success', 'Procurement solution added successfully!');
                }
            } else {
                const updatedItem = await offerService.updateItem(selectedOfferItem.id, formData);

                const updatedOfferItems = activeOffer.offerItems.map(item =>
                    item.id === selectedOfferItem.id ? updatedItem : item
                );

                const updatedOffer = {
                    ...activeOffer,
                    offerItems: updatedOfferItems
                };

                setActiveOffer(updatedOffer);
                handleCloseModal();
                showSnackbar('success', 'Procurement solution updated successfully!');
            }
        } catch (error) {
            console.error('Error saving offer item:', error);
            showSnackbar('error', error.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} procurement solution. Please try again.`);
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

        const currencyCounts = {};
        offer.offerItems.forEach(item => {
            const currency = item.currency || 'USD';
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });

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

    useEffect(() => {
        const loadAllEffectiveItems = async () => {
            if (offers && offers.length > 0) {
                const itemsMap = {};

                // Load effective items for all offers
                await Promise.all(
                    offers.map(async (offer) => {
                        try {
                            const items = await offerRequestItemService.getEffectiveRequestItems(offer.id);
                            itemsMap[offer.id] = items;
                        } catch (error) {
                            console.error(`Error loading effective items for offer ${offer.id}:`, error);
                            // Fallback to original items
                            itemsMap[offer.id] = offer.requestOrder?.requestItems || [];
                        }
                    })
                );

                setAllOffersEffectiveItems(itemsMap);
            }
        };

        loadAllEffectiveItems();
    }, [offers]);

// Keep the existing useEffect for activeOffer
    useEffect(() => {
        const loadEffectiveItems = async () => {
            if (activeOffer && activeOffer.id) {
                try {
                    const items = await offerRequestItemService.getEffectiveRequestItems(activeOffer.id);
                    setEffectiveRequestItems(items);
                } catch (error) {
                    console.error('Error loading effective request items:', error);
                    setEffectiveRequestItems(activeOffer.requestOrder?.requestItems || []);
                }
            } else {
                setEffectiveRequestItems([]);
            }
        };

        loadEffectiveItems();
    }, [activeOffer]);

    useEffect(() => {
        if (activeOffer && activeOffer.offerItems) {
            console.log("=== ACTIVE OFFER DEBUG ===");
            console.log("Active Offer:", activeOffer);
            console.log("Offer Items:", activeOffer.offerItems);
            console.log("First offer item:", activeOffer.offerItems[0]);
            if (activeOffer.offerItems[0]) {
                console.log("Delivery days:", activeOffer.offerItems[0].estimatedDeliveryDays);
            }
            console.log("========================");
        }
    }, [activeOffer]);



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
                        {offers.map(offer => {
                            // Get effective items for this specific offer from the map
                            const offerEffectiveItems = allOffersEffectiveItems[offer.id] || offer.requestOrder?.requestItems || [];

                            const isComplete = offerEffectiveItems.length > 0 && offerEffectiveItems.every(requestItem => {
                                const itemTypeId = requestItem.itemTypeId || requestItem.itemType?.id;
                                const offerItems = (offer.offerItems || []).filter(
                                    item => item.itemType?.id === itemTypeId
                                );
                                const totalOfferedQuantity = offerItems.reduce(
                                    (total, item) => total + (item.quantity || 0), 0
                                );
                                return totalOfferedQuantity >= requestItem.quantity;
                            });

                            return (
                                <div
                                    key={offer.id}
                                    className={`procurement-item-card-inprogress ${activeOffer?.id === offer.id ? 'selected' : ''}`}
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
                <span className={`procurement-item-status ${isComplete ? 'completion-complete' : 'completion-incomplete'}`}>
                    {isComplete ? (
                        <>
                            <FiCheckCircle /> Complete
                        </>
                    ) : (
                        <>
                            <FiAlertCircle /> Incomplete
                        </>
                    )}
                </span>
                                    </div>
                                </div>
                            );
                        })}                    </div>
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
                                {/* NEW: RFQ Action Buttons */}


                                <div className="action-buttons-group">
                                    <button
                                        className="btn-primary"
                                        onClick={() => submitOffer(activeOffer)}
                                        disabled={!isOfferComplete(activeOffer)}
                                        style={{ marginRight: '10px' }}
                                    >
                                        <FiSend /> {isOfferComplete(activeOffer) ? 'Submit Offer' : 'Complete All Items to Submit'}
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleDeleteOfferClick}
                                        disabled={isDeletingOffer}
                                        title="Delete this offer permanently"
                                    >
                                        <FiTrash2 />
                                        {isDeletingOffer ? 'Deleting...' : 'Delete Offer'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ... Rest of your existing JSX remains exactly the same ... */}
                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <>
                                <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                                <div className="procurement-request-summary-card-inprogress">
                                    <OfferTimeline
                                        offer={activeOffer}
                                        variant="inprogress"
                                        showRetryInfo={true}
                                    />
                                </div>

                                <div className="procurement-request-summary-card-inprogress procurement-request-items-summary">
                                    <h4>
                                        <span>Request Order Items</span>
                                        <div className="request-items-actions">
                                            <button
                                                className="btn-modify-items"
                                                onClick={handleModifyItems}
                                                title="Modify Request Items"
                                            >
                                                <FiEdit /> Modify Items
                                            </button>
                                            <button
                                                className="btn-modify-items"
                                                onClick={handleExportRFQ}
                                                title="Export RFQ to Excel"
                                            >
                                                <FiDownload /> Export RFQ
                                            </button>
                                            <button
                                                className="btn-modify-items"
                                                onClick={handleImportRFQ}
                                                title="Import RFQ Response"
                                            >
                                                <FiUpload /> Import Response
                                            </button>
                                        </div>
                                    </h4>
                                    <p className="procurement-section-description-inprogress">
                                        Complete all items below to submit this procurement offer.
                                    </p>

                                    <div className="procurement-overall-progress-inprogress">
                                        <div className="procurement-progress-stats-inprogress">
                                            <div className="procurement-progress-stat-inprogress">
                                                <div className="procurement-progress-stat-label-inprogress">Total Items</div>
                                                <div className="procurement-progress-stat-value-inprogress">
                                                    {effectiveRequestItems?.length || 0}
                                                </div>
                                            </div>


                                            <div className="procurement-progress-stat-inprogress">
                                                <div className="procurement-progress-stat-label-inprogress">Items Covered</div>
                                                <div className={`procurement-progress-stat-value-inprogress ${
                                                    isOfferComplete(activeOffer) ? 'fulfilled' : 'unfulfilled'
                                                }`}>
                                                    {effectiveRequestItems?.filter(item => {
                                                        const itemTypeId = item.itemTypeId || item.itemType?.id;
                                                        return hasOfferItem(item.id, itemTypeId);
                                                    }).length || 0} / {effectiveRequestItems?.length || 0}
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

                                <div className="procurement-request-items-section-inprogress">
                                    {effectiveRequestItems?.map(requestItem => {
                                        const offerItems = getOfferItemsForRequestItem(
                                            requestItem.id,
                                            requestItem.itemTypeId || requestItem.itemType?.id
                                        );
                                        const totalOffered = offerItems.reduce((total, item) => total + (item.quantity || 0), 0);
                                        const progress = Math.min(100, (totalOffered / requestItem.quantity) * 100);
                                        const isComplete = totalOffered >= requestItem.quantity;

                                        // Handle both DTO format and full object format
                                        const itemTypeName = requestItem.itemTypeName || requestItem.itemType?.name || 'Item';
                                        const itemTypeMeasuringUnit = requestItem.itemTypeMeasuringUnit || requestItem.itemType?.measuringUnit || 'units';

                                        return (
                                            <div key={requestItem.id} className="procurement-request-item-card-inprogress">
                                                <div className="procurement-request-item-header-inprogress">
                                                    <div className="item-icon-name-inprogress">
                                                        <div className="item-icon-container-inprogress">
                                                            <FiPackage size={20} />
                                                        </div>
                                                        <h5>{itemTypeName}</h5>
                                                    </div>

                                                    {isComplete ? (
                                                        <span className="procurement-status-badge status-complete">
                                                        <FiCheckCircle size={14} /> Complete
                                                    </span>
                                                    ) : (
                                                        <span className="procurement-status-badge status-needed">
    <FiAlertCircle size={14} /> Needs {requestItem.quantity - totalOffered} more {itemTypeMeasuringUnit}
</span>
                                                    )}
                                                </div>

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

                                                <div className="procurement-progress-container-inprogress">
                                                    <div className="procurement-progress-bar-inprogress">
                                                        <div
                                                            className={`procurement-progress-fill-inprogress ${isComplete ? 'complete' : ''}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="procurement-progress-details">
                                                        <span>Progress: {Math.round(progress)}%</span>
                                                        <span>{totalOffered} of {requestItem.quantity} {itemTypeMeasuringUnit}</span>
                                                    </div>
                                                </div>

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
                                                                    <td>{offerItem.quantity} {itemTypeMeasuringUnit}</td>
                                                                    <td>{offerItem.currency || 'USD'} {offerItem.unitPrice ? parseFloat(offerItem.unitPrice).toFixed(2) : 'N/A'}</td>
                                                                    <td>{offerItem.currency || 'USD'} {offerItem.totalPrice ? parseFloat(offerItem.totalPrice).toFixed(2) : 'N/A'}</td>
                                                                    <td>{offerItem.estimatedDeliveryDays || 'N/A'} days</td>
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

            <ModifyRequestItemsModal
                isVisible={showModifyItemsModal}
                onClose={() => setShowModifyItemsModal(false)}
                offer={activeOffer}
                onSuccess={handleRFQSuccess}
                itemTypes={itemTypes}
                onShowSnackbar={showSnackbar}
            />
            <RFQExportDialog
                isVisible={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                offer={activeOffer}
                requestItems={requestItems}
            />

            <RFQImportDialog
                isVisible={showImportDialog}
                onClose={() => setShowImportDialog(false)}
                offer={activeOffer}
                merchants={merchants}
                onSuccess={handleRFQSuccess}
                onShowSnackbar={showSnackbar}
            />

            {/* Submit Offer Confirmation Dialog */}
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

            {/* Delete Offer Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDeleteOfferConfirm}
                type="delete"
                title="Delete Offer"
                message={`Are you sure you want to delete the offer "${activeOffer?.title}"? This action cannot be undone.`}
                confirmText="Delete Offer"
                cancelText="Cancel"
                onConfirm={confirmDeleteOffer}
                onCancel={cancelDeleteOffer}
                isLoading={isDeletingOffer}
                showIcon={true}
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