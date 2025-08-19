
import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiFileText, FiDollarSign, FiList,
    FiUser, FiCalendar, FiFlag, FiTrendingUp
} from 'react-icons/fi';

import "../ProcurementOffers.scss";
import "./FinanceValidatedOffers.scss"
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
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
                                    onOfferFinalized // New callback to handle offer finalization and tab switch
                                }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(''); // Added for role checking
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [offerToFinalizeId, setOfferToFinalizeId] = useState(null);

    // Fetch all finance reviewed offers - We're now getting offers as props
    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
    }, []);

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

            setSuccess('Offer has been sent to the finalizing section.');

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
            setError(err.message || 'Failed to update offer status. Please try again.');
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
                                {/* Finalize button for finance-accepted offers */}
                                {activeOffer && (activeOffer.status === 'FINANCE_ACCEPTED' || activeOffer.status === 'FINANCE_PARTIALLY_ACCEPTED') && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleOpenFinalizeDialog(activeOffer.id)}
                                        disabled={loading}
                                    >
                                        <FiCheckCircle /> Finalize Offer
                                    </button>
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
                                                            {requestItem.quantity} {requestItem.itemType.measuringUnit}
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
                                                                        offerItem.financeStatus === 'FINANCE_ACCEPTED' ? 'finance-accepted' :
                                                                            offerItem.financeStatus === 'FINANCE_REJECTED' ? 'finance-rejected' : ''
                                                                    }>
                                                                        <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                        <td>{offerItem.quantity} {requestItem.itemType.measuringUnit}</td>
                                                                        <td>${parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>${parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>
                                                                            <span className={`finance-item-status status-${(offerItem.financeStatus || '').toLowerCase()}`}>
                                                                                {formatFinanceStatus(offerItem.financeStatus)}
                                                                            </span>
                                                                            {offerItem.financeStatus === 'FINANCE_REJECTED' && offerItem.rejectionReason && (
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
                                                item.financeStatus === 'FINANCE_ACCEPTED'
                                            ).length || 0}
                                        </span>
                                    </div>
                                    <div className="summary-item-finance">
                                        <FiX size={16} />
                                        <span className="summary-label-finance">Total Items Rejected:</span>
                                        <span className="summary-value-finance">
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'FINANCE_REJECTED'
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
        </div>
    );
};

export default FinanceValidatedOffers;