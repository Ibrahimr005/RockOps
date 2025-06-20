import React, { useState } from 'react';
import {
    FiPackage,
    FiEdit,
    FiInbox,
    FiClock,
    FiUser,
    FiCalendar,
    FiFileText,
    FiTag,
    FiFlag
} from 'react-icons/fi';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2.jsx'
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import "../ProcurementOffers.scss"
import "./UnstartedOffers.scss"

const UnstartedOffers = ({ offers, activeOffer, setActiveOffer, handleOfferStatusChange }) => {
    // Snackbar state
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Confirmation dialog state
    const [showStartWorkingConfirm, setShowStartWorkingConfirm] = useState(false);
    const [isStartingWork, setIsStartingWork] = useState(false);

    // Start working on an offer (change from UNSTARTED to INPROGRESS)
    const handleStartWorkingClick = () => {
        setShowStartWorkingConfirm(true);
    };

    const confirmStartWorking = async () => {
        setIsStartingWork(true);
        try {
            await handleOfferStatusChange(activeOffer.id, 'INPROGRESS');

            // Show success notification
            setNotificationMessage(`Offer "${activeOffer.title}" is now in progress`);
            setNotificationType('success');
            setShowNotification(true);

            // Close confirmation dialog
            setShowStartWorkingConfirm(false);
        } catch (error) {
            // Show error notification if something goes wrong
            setNotificationMessage('Failed to start working on offer. Please try again.');
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsStartingWork(false);
        }
    };

    const cancelStartWorking = () => {
        setShowStartWorkingConfirm(false);
    };

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Unstarted Offers</h3>
                </div>

                {offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiInbox size={48} className="empty-icon" />
                        <p>No unstarted offers found.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-unstarted ${activeOffer?.id === offer.id ? 'selected' : ''}`}
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
                                    className="btn-primary"
                                    onClick={handleStartWorkingClick}
                                >
                                    Start Working
                                </button>
                            </div>
                        </div>

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            /* Unstarted Offer Content with updated class names */
                            <div className="procurement-unstarted-offers-info">
                                <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                                {/* Show list of request items that will need procurement with updated class names */}
                                {activeOffer.requestOrder.requestItems && activeOffer.requestOrder.requestItems.length > 0 && (
                                    <div className="procurement-unstarted-offers-items-preview">
                                        <h4>Items That Will Need Procurement</h4>

                                        {/* Updated Item Cards with specific class names */}
                                        <div className="procurement-unstarted-offers-items-grid">
                                            {activeOffer.requestOrder.requestItems.map(item => (
                                                <div key={item.id} className="procurement-unstarted-offers-item-preview-card">
                                                    <div className="procurement-unstarted-offers-item-preview-header">
                                                        <div className="procurement-unstarted-offers-item-icon-container">
                                                            <FiPackage className="procurement-unstarted-offers-item-icon" size={20} />
                                                        </div>
                                                        <div className="procurement-unstarted-offers-item-title-container">
                                                            <div className="procurement-unstarted-offers-item-name">{item.itemType?.name || 'Unknown'}</div>
                                                            <div className="procurement-unstarted-offers-item-category">{item.itemType.category || 'Item'}</div>
                                                        </div>
                                                        <div className="procurement-unstarted-offers-item-badge">
                                                            {item.quantity} {item.itemType.measuringUnit || 'units'}
                                                        </div>
                                                    </div>

                                                    {item.comment && (
                                                        <div className="procurement-unstarted-offers-item-notes">
                                                            <div className="procurement-unstarted-offers-item-notes-label">Notes:</div>
                                                            <div className="procurement-unstarted-offers-item-notes-content">{item.comment}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                            <h3>No Offers Selected</h3>

                            {offers.length > 0 ? (
                                <p>Select an offer from the list to view details</p>
                            ) : (
                                <p>Offers are created when a request order is accepted</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showStartWorkingConfirm}
                type="success"
                title="Start Working on Offer"
                message={`Are you sure you want to start working on "${activeOffer?.title}"?\u00A0\u00A0\u00A0This will move the offer to In Progress status.`}

                confirmText="Start Working"
                cancelText="Cancel"
                onConfirm={confirmStartWorking}
                onCancel={cancelStartWorking}
                isLoading={isStartingWork}
                size="medium"
            />

            {/* Snackbar Component */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default UnstartedOffers;