import React from 'react';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2.jsx'
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';

import "../ProcurementOffers.scss"
import "./SubmittedOffers.scss"
import {
    FiPackage, FiSend, FiClock, FiCheckCircle,
    FiX, FiCheck, FiTrash2, FiCalendar, FiUser,
    FiTrendingUp, FiDollarSign, FiShoppingCart
} from 'react-icons/fi';

const SubmittedOffers = ({
                             offers,
                             setOffers, // Add this prop to update the offers list
                             activeOffer,
                             setActiveOffer,
                             onApproveOffer, // Add these new props
                             onDeclineOffer,  // for handling approve/decline actions
                             managerRoles = ['MANAGER', 'ADMIN', 'PROCUREMENT_MANAGER','PROCUREMENT'] // Default manager roles
                         }) => {
    // Get user role from localStorage
    const [userRole, setUserRole] = React.useState(null);

    // Snackbar states
    const [showSnackbar, setShowSnackbar] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarType, setSnackbarType] = React.useState('success');

    // Confirmation dialog states
    const [confirmationDialog, setConfirmationDialog] = React.useState({
        show: false,
        type: 'warning',
        title: '',
        message: '',
        confirmText: 'Confirm',
        onConfirm: null,
        isLoading: false,
        showInput: false,
        inputLabel: '',
        inputPlaceholder: '',
        inputRequired: false
    });

    const [rejectionReason, setRejectionReason] = React.useState('');

    // Function to show snackbar
    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
    };

    // Handle confirmation dialog cancel
    const handleConfirmationCancel = () => {
        setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
        setRejectionReason('');
    };

    React.useEffect(() => {
        try {
            const userInfoString = localStorage.getItem('userInfo');
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error('Error getting user role from localStorage:', error);
        }
    }, []);

    // Get total price for an offer
    const getTotalPrice = (offer) => {
        if (!offer || !offer.offerItems) return 0;
        return offer.offerItems.reduce((sum, item) => {
            const itemPrice = item.totalPrice ? parseFloat(item.totalPrice) : 0;
            return sum + itemPrice;
        }, 0);
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Get status display info
    const getStatusInfo = (status) => {
        switch (status?.toUpperCase()) {
            case 'SUBMITTED':
                return { text: 'Submitted', icon: FiSend };
            case 'MANAGERACCEPTED':
                return { text: 'Accepted', icon: FiCheckCircle };
            case 'MANAGERREJECTED':
                return { text: 'Rejected', icon: FiX };
            default:
                return { text: status, icon: FiClock };
        }
    };

    // Handle approve action - show confirmation dialog
    const handleApprove = (e, offer) => {
        e.stopPropagation(); // Prevent triggering the card click

        setConfirmationDialog({
            show: true,
            type: 'success',
            title: 'Approve Offer',
            message: `Are you sure you want to approve the offer "${offer.title}"? This will send it to finance for review.`,
            confirmText: 'Approve Offer',
            onConfirm: () => handleConfirmApprove(offer),
            isLoading: false,
            showInput: false
        });
    };

    // Handle confirmed approval
    const handleConfirmApprove = async (offer) => {
        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

            // First, update the offer status to ACCEPTED using the service
            await offerService.updateStatus(offer.id, 'MANAGERACCEPTED');

            // Then, update the finance status to PENDING_FINANCE_REVIEW using the service
            await offerService.updateFinanceStatus(offer.id, 'PENDING_FINANCE_REVIEW');

            // Remove the offer from the submitted offers list
            const updatedOffers = offers.filter(o => o.id !== offer.id);
            setOffers(updatedOffers);

            // Clear active offer if it was the approved one
            if (activeOffer && activeOffer.id === offer.id) {
                setActiveOffer(updatedOffers.length > 0 ? updatedOffers[0] : null);
            }

            // Call the parent component's handler if provided
            if (onApproveOffer) {
                onApproveOffer(offer.id);
            }

            // Close dialog and show success notification
            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
            showNotification('Offer has been approved and sent to finance for review!', 'success');

        } catch (error) {
            console.error('Error approving offer:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showNotification(`Error: ${error.message || 'Failed to approve offer'}`, 'error');
        }
    };

    // Handle decline action - show confirmation dialog with input
    const handleDecline = (e, offer) => {
        e.stopPropagation(); // Prevent triggering the card click

        setConfirmationDialog({
            show: true,
            type: 'danger',
            title: 'Decline Offer',
            message: `Are you sure you want to decline the offer "${offer.title}"? Please provide a reason for the rejection.`,
            confirmText: 'Decline Offer',
            onConfirm: (reason) => handleConfirmDecline(offer, reason),
            isLoading: false,
            showInput: true,
            inputLabel: 'Rejection Reason',
            inputPlaceholder: 'Please provide a detailed reason for declining this offer...',
            inputRequired: true
        });

        // Reset rejection reason when opening dialog
        setRejectionReason('');
    };

    // Handle confirmed decline
    const handleConfirmDecline = async (offer, rejectionReason) => {
        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

            // Use the service to update status with rejection reason
            await offerService.updateStatus(offer.id, 'MANAGERREJECTED', rejectionReason);

            // Remove the offer from the submitted offers list
            const updatedOffers = offers.filter(o => o.id !== offer.id);
            setOffers(updatedOffers);

            // Clear active offer if it was the declined one
            if (activeOffer && activeOffer.id === offer.id) {
                setActiveOffer(updatedOffers.length > 0 ? updatedOffers[0] : null);
            }

            // Call the parent component's handler if provided
            if (onDeclineOffer) {
                onDeclineOffer(offer.id);
            }

            // Close dialog and show success notification
            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
            setRejectionReason('');
            showNotification('Offer has been declined successfully!', 'success');

        } catch (error) {
            console.error('Error declining offer:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showNotification(`Error: ${error.message || 'Failed to decline offer'}`, 'error');
        }
    };

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Submitted Offers</h3>
                </div>

                {offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiSend size={48} className="empty-icon" />
                        <p>No submitted offers yet. Complete an offer and submit it.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-submitted ${activeOffer?.id === offer.id ? 'selected' : ''}`}
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
                                        <span className={`procurement-status-badge status-${activeOffer.status?.toLowerCase()}`}>
                                            {getStatusInfo(activeOffer.status).text}
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiCalendar /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiDollarSign /> Total: ${getTotalPrice(activeOffer).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="procurement-header-actions">
                                {/* Action buttons - only shown for managers */}
                                {activeOffer.status === 'SUBMITTED' && userRole && managerRoles.includes(userRole) && (
                                    <>
                                        <button
                                            className="btn-primary"
                                            onClick={(e) => handleApprove(e, activeOffer)}
                                            title="Approve Offer"
                                        >
                                            <FiCheck />
                                            <span>Approve</span>
                                        </button>
                                        <button
                                            className="btn-primary"
                                            onClick={(e) => handleDecline(e, activeOffer)}
                                            title="Decline Offer"
                                        >
                                            <FiX />
                                            <span>Decline</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Use RequestOrderDetails Component */}
                        <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                {/* Replace the old timeline with the new OfferTimeline component */}
                                <OfferTimeline
                                    offer={activeOffer}
                                    variant="submitted"
                                    showRetryInfo={true}
                                />

                                {/* Enhanced Procurement Details */}
                                <div className="procurement-submitted-details-submitted">
                                    <h4>Procurement Solutions</h4>
                                    <div className="procurement-submitted-items-submitted">
                                        {activeOffer.requestOrder?.requestItems?.map(requestItem => {
                                            const offerItems = getOfferItemsForRequestItem(requestItem.id);

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-submitted">
                                                    <div className="submitted-item-header-submitted">
                                                        <div className="item-icon-name-submitted">
                                                            <div className="item-icon-container-submitted">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{requestItem.itemType?.name || 'Item'}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-submitted">
                                                            {requestItem.quantity} {requestItem.itemType.measuringUnit}
                                                        </div>
                                                    </div>

                                                    {offerItems.length > 0 && (
                                                        <div className="submitted-offer-solutions-submitted">
                                                            <table className="procurement-offer-entries-table-submitted">
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

                                {/* Simplified Summary */}
                                <div className="procurement-submitted-summary-submitted">
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

                            <h3>No Submitted Offers Selected</h3>

                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view details</p>
                            ) : (
                                <p>Complete offers in progress to see them here</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmationDialog.show}
                type={confirmationDialog.type}
                title={confirmationDialog.title}
                message={confirmationDialog.message}
                confirmText={confirmationDialog.confirmText}
                cancelText="Cancel"
                onConfirm={confirmationDialog.onConfirm}
                onCancel={handleConfirmationCancel}
                isLoading={confirmationDialog.isLoading}
                showInput={confirmationDialog.showInput}
                inputLabel={confirmationDialog.inputLabel}
                inputPlaceholder={confirmationDialog.inputPlaceholder}
                inputRequired={confirmationDialog.inputRequired}
                inputValue={rejectionReason}
                onInputChange={setRejectionReason}
                size="large"
            />

            {/* Snackbar Notification */}
            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={3000}
            />
        </div>
    );
};

export default SubmittedOffers;