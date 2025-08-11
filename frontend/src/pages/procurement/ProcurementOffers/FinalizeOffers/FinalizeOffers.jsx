import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle, FiX, FiFileText, FiList,
    FiUser, FiCalendar, FiDollarSign, FiTrendingUp
} from 'react-icons/fi';
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx"
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import { offerService } from '../../../../services/procurement/offerService.js';
import "../ProcurementOffers.scss";
import "./FinalizeOffers.scss";
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';

const FinalizeOffers = ({
                            offers,
                            activeOffer,
                            setActiveOffer,
                            getTotalPrice,
                            setError,
                            setSuccess,
                            onOfferFinalized, // This should switch to completed tab
                            onOfferCompleted // New callback for completed offers
                        }) => {
    const [loading, setLoading] = useState(false);
    const [finalizedItems, setFinalizedItems] = useState({});
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

    const saveFinalizedOffer = async () => {
        if (!activeOffer) return;

        setLoading(true);
        setShowConfirmDialog(false);
        try {
            const finalizedItemIds = Object.entries(finalizedItems)
                .filter(([_, isFinalized]) => isFinalized)
                .map(([id, _]) => id);

            if (finalizedItemIds.length === 0) {
                handleError('Please select at least one item to finalize');
                setLoading(false);
                return;
            }

            console.log('Finalizing offer with ID:', activeOffer.id);
            console.log('Finalized item IDs:', finalizedItemIds);

            // Use a direct API call for finalization (since offerService may not have this endpoint)
            const token = localStorage.getItem("token");

            const response = await fetch(`http://localhost:8080/api/v1/purchaseOrders/offers/${activeOffer.id}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ finalizedItemIds })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error response:', errorData);
                throw new Error(`Server responded with ${response.status}: ${errorData}`);
            }

            const responseData = await response.json();
            console.log('Response data:', responseData);

            // Create the completed offer object
            const completedOffer = {
                ...activeOffer,
                status: 'COMPLETED',
                finalizedAt: new Date().toISOString(),
                finalizedBy: 'Current User' // Replace with actual user info
            };

            handleSuccess(responseData.message || 'Offer finalized successfully! A purchase order has been created.');

            // Call the callback to switch to completed tab with this offer
            if (onOfferCompleted) {
                onOfferCompleted(completedOffer);
            }

            // Remove the offer from current list
            if (onOfferFinalized) {
                onOfferFinalized(activeOffer.id);
            }

        } catch (err) {
            console.error('Error finalizing offer:', err);
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

    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => (item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId) &&
                item.financeStatus === 'FINANCE_ACCEPTED'
        );
    };

    const totalAcceptedItems = activeOffer?.offerItems?.filter(item =>
        item.financeStatus === 'FINANCE_ACCEPTED'
    ).length || 0;

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
                    // Replace the offers list section in FinalizeOffers with this:

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
                                    <button
                                        className="btn-primary"
                                        onClick={handleConfirmFinalization}
                                        disabled={
                                            loading ||
                                            totalFinalizedItems === 0 ||
                                            purchaseOrder !== null
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

                        <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                        <div className="procurement-request-summary-card-finalize">
                            <h4>Offer Timeline</h4>
                            <p className="procurement-section-description-finalize">
                                This timeline shows the key milestones in the finalization process.
                            </p>

                            {/* NEW TIMELINE DESIGN */}
                            <div className="procurement-timeline-finalize">
                                {/* Request Order Approved Step */}
                                <div className="procurement-timeline-item-finalize active-finalize">
                                    <div className="timeline-content-finalize">
                                        <h5>Request Order Approved</h5>
                                        <p className="timeline-date-finalize">
                                            <FiCalendar size={14} /> Approved at: {activeOffer.requestOrder?.approvedAt ? new Date(activeOffer.requestOrder.approvedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p className="timeline-date-finalize">
                                            <FiUser size={14} /> Approved by: {activeOffer.requestOrder?.approvedBy || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Offer Submitted Step */}
                                <div className="procurement-timeline-item-finalize active-finalize">
                                    <div className="timeline-content-finalize">
                                        <h5>Offer Submitted</h5>
                                        <p className="timeline-date-finalize">
                                            <FiCalendar size={14} /> Submitted at: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                        </p>
                                        <p className="timeline-date-finalize">
                                            <FiUser size={14} /> Submitted by: {activeOffer.createdBy || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Manager Accepted Step */}
                                <div className="procurement-timeline-item-finalize active-finalize">
                                    <div className="timeline-content-finalize">
                                        <h5>Manager Accepted</h5>
                                        <p className="timeline-date-finalize">
                                            <FiCalendar size={14} /> Accepted at: {activeOffer.updatedAt ? new Date(activeOffer.updatedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p className="timeline-date-finalize">
                                            <FiUser size={14} /> Accepted by: {activeOffer.managerApprovedBy || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Finance Accepted Step */}
                                <div className="procurement-timeline-item-finalize active-finalize">
                                    <div className="timeline-content-finalize">
                                        <h5>Finance Accepted</h5>
                                        <p className="timeline-date-finalize">
                                            <FiCalendar size={14} /> Accepted at: {activeOffer.updatedAt ? new Date(activeOffer.updatedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p className="timeline-date-finalize">
                                            <FiUser size={14} /> Accepted by: {activeOffer.financeApprovedBy || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Awaiting Finalization / Finalized Step */}
                                <div className={`procurement-timeline-item-finalize ${activeOffer.status === 'FINALIZED' ? 'active-finalize' : ''}`}>
                                    <div className="timeline-content-finalize">
                                        <h5>
                                            {activeOffer.status === 'FINALIZED' ? 'Offer Finalized' : 'Awaiting Finalization'}
                                        </h5>
                                        {activeOffer.status === 'FINALIZED' ? (
                                            <>
                                                <p className="timeline-date-finalize">
                                                    <FiCalendar size={14} /> Finalized at: {new Date(activeOffer.finalizedAt || activeOffer.updatedAt).toLocaleDateString()}
                                                </p>
                                                <p className="timeline-date-finalize">
                                                    <FiUser size={14} /> Finalized by: {activeOffer.finalizedBy || 'N/A'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="timeline-date-finalize">
                                                <FiClock size={14} /> Pending finalization from procurement.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* END OF NEW TIMELINE DESIGN */}
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
                                                            {requestItem.quantity} {requestItem.itemType.measuringUnit}
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
                                                                    <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                    <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                    <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
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
                message={`Are you sure you want to finalize ${totalFinalizedItems} item${totalFinalizedItems !== 1 ? 's' : ''} from this offer? The total value to be finalized is ${getFinalizedTotalValue().toFixed(2)}. This action will create a purchase order and cannot be undone.`}
                confirmText="Finalize Offer"
                cancelText="Cancel"
                onConfirm={saveFinalizedOffer}
                onCancel={handleConfirmDialogCancel}
                isLoading={loading}
                showIcon={true}
                size="large"
            />
        </div>
    );
};

export default FinalizeOffers;