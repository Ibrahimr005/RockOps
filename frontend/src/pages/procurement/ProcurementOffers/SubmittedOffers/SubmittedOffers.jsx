import React from 'react';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2.jsx'
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';

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

    // Function to show snackbar
    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
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

    // Handle approve action with API call and state updates
    const handleApprove = async (e, offer) => {
        e.stopPropagation(); // Prevent triggering the card click
        if (window.confirm(`Are you sure you want to approve this offer: ${offer.title}?`)) {
            try {
                // First, update the offer status to ACCEPTED
                const statusResponse = await fetch(`http://localhost:8080/api/v1/offers/${offer.id}/status?status=MANAGERACCEPTED`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (statusResponse.ok) {
                    // Then, update the finance status to PENDING_FINANCE_REVIEW
                    const financeResponse = await fetch(`http://localhost:8080/api/v1/offers/${offer.id}/finance-status?financeStatus=PENDING_FINANCE_REVIEW`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (financeResponse.ok) {
                        // Remove the offer from the submitted offers list
                        const updatedOffers = offers.filter(o => o.id !== offer.id);
                        setOffers(updatedOffers);

                        // Clear active offer if it was the approved one
                        if (activeOffer && activeOffer.id === offer.id) {
                            setActiveOffer(null);
                        }

                        // Call the parent component's handler if provided
                        if (onApproveOffer) {
                            onApproveOffer(offer.id);
                        }

                        showNotification('Offer has been approved and sent to finance for review!', 'success');
                    } else {
                        const errorData = await financeResponse.json();
                        showNotification(`Error updating finance status: ${errorData.message || 'Failed to update finance status'}`, 'error');
                    }
                } else {
                    const errorData = await statusResponse.json();
                    showNotification(`Error: ${errorData.message || 'Failed to approve offer'}`, 'error');
                }
            } catch (error) {
                console.error('Error approving offer:', error);
                showNotification('Error: Could not connect to the server', 'error');
            }
        }
    };

    // Handle decline action with API call and state updates
    const handleDecline = async (e, offer) => {
        e.stopPropagation(); // Prevent triggering the card click

        // Prompt for rejection reason
        const rejectionReason = window.prompt("Please provide a reason for rejecting this offer:", "");

        // If user cancels the prompt or doesn't provide a reason, don't proceed
        if (rejectionReason === null) {
            return; // User cancelled
        }

        if (rejectionReason.trim() === "") {
            showNotification("Please provide a rejection reason.", 'error');
            return;
        }

        if (window.confirm(`Are you sure you want to decline this offer: ${offer.title}?`)) {
            try {
                const response = await fetch(`http://localhost:8080/api/v1/offers/${offer.id}/status?status=MANAGERREJECTED&rejectionReason=${encodeURIComponent(rejectionReason)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    // Remove the offer from the submitted offers list
                    const updatedOffers = offers.filter(o => o.id !== offer.id);
                    setOffers(updatedOffers);

                    // Clear active offer if it was the declined one
                    if (activeOffer && activeOffer.id === offer.id) {
                        setActiveOffer(null);
                    }

                    // Call the parent component's handler if provided
                    if (onDeclineOffer) {
                        onDeclineOffer(offer.id);
                    }

                    showNotification('Offer has been declined successfully!', 'success');
                } else {
                    const errorData = await response.json();
                    showNotification(`Error: ${errorData.message || 'Failed to decline offer'}`, 'error');
                }
            } catch (error) {
                console.error('Error declining offer:', error);
                showNotification('Error: Could not connect to the server', 'error');
            }
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
                    <div className="procurement-items-list-submitted">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-submitted ${activeOffer?.id === offer.id ? 'selected' : ''}`}
                                onClick={() => setActiveOffer(offer)}
                            >
                                <div className="procurement-item-header-submitted">
                                    <h4>{offer.title}</h4>
                                </div>
                                <div className="procurement-item-footer-submitted">
                                    <span className="procurement-item-date-submitted">
                                        <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
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
                                            className="procurement-button primary approve-button"
                                            onClick={(e) => handleApprove(e, activeOffer)}
                                            title="Approve Offer"
                                        >
                                            <FiCheck />
                                            <span>Approve</span>
                                        </button>
                                        <button
                                            className="procurement-button secondary decline-button"
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
                                <div className="procurement-request-summary-card-submitted">
                                    <h4>Submitted Offer Overview</h4>
                                    <p className="procurement-section-description-submitted">
                                        This offer has been submitted to management for review and approval. Track the progress through the timeline below.
                                    </p>

                                    {/* Enhanced Status Timeline */}
                                    <div className="procurement-timeline-submitted">
                                        <div className="procurement-timeline-item-submitted active">
                                            <div className="timeline-icon-submitted">
                                                <FiCheckCircle size={20} />
                                            </div>
                                            <div className="timeline-content-submitted">
                                                <h5>Offer Submitted</h5>
                                                <p className="timeline-date-submitted">
                                                    <FiCalendar size={14} />
                                                    {new Date(activeOffer.submittedAtM).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`procurement-timeline-item-submitted ${
                                            activeOffer.status === 'MANAGERACCEPTED' ? 'active' :
                                                activeOffer.status === 'MANAGERREJECTED' ? 'rejected' : ''
                                        }`}>
                                            <div className="timeline-icon-submitted">
                                                {activeOffer.status === 'MANAGERACCEPTED' ? <FiCheckCircle size={20} /> :
                                                    activeOffer.status === 'MANAGERREJECTED' ? <FiX size={20} /> :
                                                        <FiClock size={20} />}
                                            </div>
                                            <div className="timeline-content-submitted">
                                                <h5>
                                                    {activeOffer.status === 'MANAGERACCEPTED' ? 'Offer Accepted' :
                                                        activeOffer.status === 'MANAGERREJECTED' ? 'Offer Rejected' :
                                                            'Awaiting Management Review'}
                                                </h5>
                                                {(activeOffer.status === 'MANAGERACCEPTED' || activeOffer.status === 'MANAGERREJECTED') ? (
                                                    <p className="timeline-date-submitted">
                                                        <FiCalendar size={14} />
                                                        {new Date(activeOffer.updatedAt).toLocaleDateString()}
                                                    </p>
                                                ) : (
                                                    <p className="timeline-date-submitted">
                                                        <FiUser size={14} />
                                                        Pending manager decision
                                                    </p>
                                                )}

                                                {/* Enhanced rejection reason display */}
                                                {activeOffer.status === 'MANAGERREJECTED' && activeOffer.rejectionReason && (
                                                    <div className="rejection-reason-submitted">
                                                        <p><strong>Rejection Reason:</strong> {activeOffer.rejectionReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {activeOffer.status === 'MANAGERACCEPTED' && (
                                            <div className="procurement-timeline-item-submitted">
                                                <div className="timeline-icon-submitted">
                                                    <FiDollarSign size={20} />
                                                </div>
                                                <div className="timeline-content-submitted">
                                                    <h5>Finance Review</h5>
                                                    <p className="timeline-date-submitted">
                                                        <FiTrendingUp size={14} />
                                                        Sent to finance department
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

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
                                                            <FiShoppingCart size={14} />
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

                                {/* Enhanced Total Summary */}
                                <div className="procurement-submitted-summary-submitted">
                                    <div className="submitted-summary-row-submitted">
                                        <span><FiPackage size={16} /> Total Items:</span>
                                        <span>{activeOffer.requestOrder?.requestItems?.length || 0}</span>
                                    </div>
                                    <div className="submitted-summary-row-submitted">
                                        <span><FiUser size={16} /> Submitted By:</span>
                                        <span>{activeOffer.createdBy || 'System'}</span>
                                    </div>
                                    <div className="submitted-summary-row-submitted">
                                        <span><FiDollarSign size={18} /> Total Value:</span>
                                        <span className="submitted-total-value-submitted">${getTotalPrice(activeOffer).toFixed(2)}</span>
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