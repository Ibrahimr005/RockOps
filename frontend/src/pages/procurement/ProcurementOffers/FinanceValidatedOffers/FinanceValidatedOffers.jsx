// /* ===== FINANCE VALIDATION MOVED TO FINANCE MODULE =====
//  * This component previously handled item-by-item finance validation within Procurement.
//  * Finance validation is now handled in: Finance → Procurement Reviews → Pending Offers
//  *
//  * This component is kept commented out for reference until integration is fully confirmed.
//  * Original code remains below for rollback if needed.
//  */
//
// const FinanceValidatedOffers = ({
//                                     offers,
//                                     activeOffer,
//                                     setActiveOffer,
//                                     onOfferFinalized,
//                                     onOpenFinalizeDialog,
//                                     onOfferCompleted,
//                                     onDeleteOffer,
//                                     onRetryOffer,
//                                     onRefresh
//                                 }) => {
//     return (
//         <div className="procurement-offers-main-content">
//             <div className="info-message-container">
//                 <div className="info-message">
//                     <h3>📋 Finance Validation Process Updated</h3>
//                     <p>
//                         Offer finance validation has been moved to the <strong>Finance Module</strong>.
//                     </p>
//                     <p>
//                         Offers pending finance approval will now appear in:
//                     </p>
//                     <p className="info-path">
//                         <strong>Finance → Procurement Reviews → Pending Offers</strong>
//                     </p>
//                     <p>
//                         Once Finance approves an offer, it will return here to the Procurement module
//                         and appear in the <strong>Finalize</strong> tab.
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// /* ===== ORIGINAL COMPONENT CODE - COMMENTED OUT =====
//  *
//  * [All the original FinanceValidatedOffers component code here]
//  *
//  ===== END COMMENTED SECTION ===== */
//
// export default FinanceValidatedOffers;
// import React, { useState, useEffect } from 'react';
// import {
//     FiPackage, FiCheck, FiClock, FiCheckCircle,
//     FiX, FiFileText, FiDollarSign, FiList,
//     FiUser, FiCalendar, FiFlag, FiTrendingUp, FiRefreshCw, FiTrash2, FiArrowRight
// } from 'react-icons/fi';
//
// import "../ProcurementOffers.scss";
// import "./FinanceValidatedOffers.scss"
// import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
// import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
// import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
// import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
// import { offerService } from '../../../../services/procurement/offerService.js';
//
// // Updated to accept offers, setError, and setSuccess from parent
// const FinanceValidatedOffers = ({
//                                     offers,
//                                     activeOffer,
//                                     setActiveOffer,
//                                     getTotalPrice,
//                                     setError,
//                                     setSuccess,
//                                     onRefresh, // Optional callback to refresh data after status update
//                                     onOfferFinalized, // New callback to handle offer finalization and tab switch
//                                     onRetryOffer, // Callback for retry functionality
//                                     onDeleteOffer // Callback for delete functionality
//                                 }) => {
//     const [loading, setLoading] = useState(false);
//     const [userRole, setUserRole] = useState(''); // Added for role checking
//     const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
//     const [offerToFinalizeId, setOfferToFinalizeId] = useState(null);
//
//     // New states for retry and delete functionality
//     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//     const [showRetryConfirm, setShowRetryConfirm] = useState(false);
//     const [showContinueAndReturnConfirm, setShowContinueAndReturnConfirm] = useState(false);
//     const [isDeleting, setIsDeleting] = useState(false);
//     const [isRetrying, setIsRetrying] = useState(false);
//     const [isContinueAndReturn, setIsContinueAndReturn] = useState(false);
//
//     // Snackbar states
//     const [showSnackbar, setShowSnackbar] = useState(false);
//     const [snackbarMessage, setSnackbarMessage] = useState('');
//     const [snackbarType, setSnackbarType] = useState('success');
//
//     const showNotification = (message, type = 'success') => {
//         setSnackbarMessage(message);
//         setSnackbarType(type);
//         setShowSnackbar(true);
//     };
//
//     const handleSnackbarClose = () => {
//         setShowSnackbar(false);
//     };
//
//     const handleError = (message) => {
//         if (typeof setError === 'function') {
//             setError(message);
//         } else {
//             showNotification(message, 'error');
//         }
//     };
//
//     const handleSuccess = (message) => {
//         if (typeof setSuccess === 'function') {
//             setSuccess(message);
//         } else {
//             showNotification(message, 'success');
//         }
//     };
//
//     // Fetch all finance reviewed offers - We're now getting offers as props
//     useEffect(() => {
//         // Get user role from localStorage
//         const userInfo = JSON.parse(localStorage.getItem('userInfo'));
//         if (userInfo && userInfo.role) {
//             setUserRole(userInfo.role);
//         }
//     }, []);
//
//     // NEW: Helper function to calculate fulfillment status
//     const calculateFulfillmentStatus = (offer) => {
//         if (!offer?.requestOrder?.requestItems) {
//             return { hasFullFulfillment: false, hasAcceptedItems: false, fulfillmentDetails: {} };
//         }
//
//         const acceptedQuantities = {};
//         const requestedQuantities = {};
//
//         // Group by request item to compare quantities
//         offer.requestOrder.requestItems.forEach(requestItem => {
//             requestedQuantities[requestItem.id] = requestItem.quantity;
//
//             const offerItems = getOfferItemsForRequestItem(requestItem.id);
//             acceptedQuantities[requestItem.id] = offerItems
//                 .filter(item => item.financeStatus === 'ACCEPTED')
//                 .reduce((sum, item) => sum + item.quantity, 0);
//         });
//
//         // Check if we have full fulfillment
//         const hasFullFulfillment = Object.keys(requestedQuantities).every(itemId =>
//             acceptedQuantities[itemId] >= requestedQuantities[itemId]
//         );
//
//         // Check if we have any accepted items
//         const hasAcceptedItems = Object.values(acceptedQuantities).some(qty => qty > 0);
//
//         return {
//             hasFullFulfillment,
//             hasAcceptedItems,
//             acceptedQuantities,
//             requestedQuantities
//         };
//     };
//
//     // Function to handle opening the finalize confirmation dialog
//     const handleOpenFinalizeDialog = (offerId) => {
//         setOfferToFinalizeId(offerId);
//         setShowFinalizeDialog(true);
//     };
//
//     // Function to handle the finalization after confirmation
//     const handleConfirmFinalize = async () => {
//         if (!offerToFinalizeId) return;
//
//         try {
//             setLoading(true);
//             setShowFinalizeDialog(false);
//             setError('');
//             setSuccess('');
//
//             // Update the offer status to FINALIZING using offerService
//             await offerService.updateStatus(offerToFinalizeId, 'FINALIZING');
//
//             handleSuccess('Offer has been sent to the finalizing section.');
//
//             // Find the finalized offer to pass to the callback
//             const finalizedOffer = offers.find(offer => offer.id === offerToFinalizeId);
//
//             // Call the callback to switch to finalize tab and set the specific offer as active
//             if (onOfferFinalized && finalizedOffer) {
//                 onOfferFinalized({
//                     ...finalizedOffer,
//                     status: 'FINALIZING'
//                 });
//             }
//
//             // Optional: You can call a refresh function here if provided as a prop
//             if (onRefresh) {
//                 onRefresh();
//             }
//
//         } catch (err) {
//             console.error('Error updating offer status to FINALIZING:', err);
//             handleError(err.message || 'Failed to update offer status. Please try again.');
//         } finally {
//             setLoading(false);
//             setOfferToFinalizeId(null);
//         }
//     };
//
//     // Function to close the dialog
//     const handleCancelFinalize = () => {
//         setShowFinalizeDialog(false);
//         setOfferToFinalizeId(null);
//     };
//
//     // Retry functionality (copied exactly from working ManagerValidatedOffers)
//     const handleRetryClick = () => {
//         setShowRetryConfirm(true);
//     };
//
//     const confirmRetry = async () => {
//         setIsRetrying(true);
//         try {
//             const response = await offerService.retryOffer(activeOffer.id);
//
//             if (response && response.id) {
//                 showNotification(`New offer created successfully (Retry ${response.retryCount}). Old offer has been removed.`, 'success');
//
//                 // Remove the old offer from the current offers list
//                 if (onDeleteOffer) {
//                     onDeleteOffer(activeOffer.id);
//                 }
//
//                 // Switch to the new offer in inprogress tab
//                 if (onRetryOffer) {
//                     onRetryOffer(response);
//                 }
//             }
//
//             setShowRetryConfirm(false);
//         } catch (error) {
//             console.error('Error retrying offer:', error);
//
//             if (error.message && error.message.includes("A retry for this offer is already in progress")) {
//                 showNotification('A retry for this offer is already in progress. Please complete the existing retry first.', 'error');
//             } else {
//                 showNotification('Failed to create new offer. Please try again.', 'error');
//             }
//         } finally {
//             setIsRetrying(false);
//         }
//     };
//
//     const cancelRetry = () => {
//         setShowRetryConfirm(false);
//     };
//
//     // NEW: Continue and Return functionality
//     const handleContinueAndReturnClick = () => {
//         setShowContinueAndReturnConfirm(true);
//     };
//
//     // Update the confirmContinueAndReturn function in FinanceValidatedOffers.jsx
//     // Update the confirmContinueAndReturn function in FinanceValidatedOffers.jsx
//     const confirmContinueAndReturn = async () => {
//         setIsContinueAndReturn(true);
//         try {
//             console.log('Starting continue and return...'); // Debug log
//
//             // Call backend service to split the offer
//             const result = await offerService.continueAndReturnOffer(activeOffer.id);
//
//             console.log('Backend result:', result); // Debug log
//
//             let successMessage = '';
//
//             // The backend returns IDs, not full objects
//             if (result.acceptedOfferId && result.newOfferId) {
//                 successMessage = 'Accepted items sent to finalization. New offer created for remaining quantities.';
//             } else if (result.acceptedOfferId) {
//                 successMessage = 'Accepted items sent to finalization.';
//             } else if (result.newOfferId) {
//                 successMessage = 'New offer created for remaining quantities.';
//             }
//
//             showNotification(successMessage, 'success');
//
//             // FIXED: Check for acceptedOfferId (not acceptedOffer)
//             if (result.acceptedOfferId && onOfferFinalized) {
//                 // Create a minimal offer object with the ID and status for the finalize tab
//                 const finalizedOffer = {
//                     ...activeOffer, // Copy current offer data
//                     id: result.acceptedOfferId,
//                     status: 'FINALIZING'
//                 };
//
//                 console.log('Switching to finalize tab with offer:', finalizedOffer); // Debug log
//
//                 // This will switch to the finalize tab and set the accepted offer as active
//                 onOfferFinalized(finalizedOffer);
//             }
//             // Only handle new offer if there's no accepted offer to finalize
//             else if (result.newOfferId && onRetryOffer) {
//                 const newOffer = {
//                     id: result.newOfferId,
//                     status: 'INPROGRESS'
//                 };
//                 onRetryOffer(newOffer);
//             }
//
//             // Remove current offer from finance validated tab
//             if (onDeleteOffer) {
//                 onDeleteOffer(activeOffer.id);
//             }
//
//             setShowContinueAndReturnConfirm(false);
//
//         } catch (error) {
//             console.error('Error in continue and return:', error);
//             showNotification('Failed to process offer. Please try again.', 'error');
//         } finally {
//             setIsContinueAndReturn(false);
//         }
//     };
//
//
//     const cancelContinueAndReturn = () => {
//         setShowContinueAndReturnConfirm(false);
//     };
//
//     // Delete functionality
//     const handleDeleteClick = () => {
//         setShowDeleteConfirm(true);
//     };
//
//     const confirmDelete = async () => {
//         setIsDeleting(true);
//         const offerTitle = activeOffer.title; // Store title before deletion
//         try {
//             await offerService.delete(activeOffer.id);
//
//             // Show success notification first
//             showNotification(`Offer "${offerTitle}" deleted successfully`, 'success');
//
//             // Close the confirmation dialog
//             setShowDeleteConfirm(false);
//
//             // Small delay to ensure snackbar is visible before calling parent callbacks
//             setTimeout(() => {
//                 if (onDeleteOffer) {
//                     onDeleteOffer(activeOffer.id);
//                 }
//             }, 100);
//
//         } catch (error) {
//             console.error('Error deleting offer:', error);
//             showNotification('Failed to delete offer. Please try again.', 'error');
//             setShowDeleteConfirm(false);
//         } finally {
//             setIsDeleting(false);
//         }
//     };
//
//     const cancelDelete = () => {
//         setShowDeleteConfirm(false);
//     };
//
//     // Get offer items for a specific request item
//     const getOfferItemsForRequestItem = (requestItemId) => {
//         if (!activeOffer || !activeOffer.offerItems) return [];
//         return activeOffer.offerItems.filter(
//             item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
//         );
//     };
//
//     // Format finance status for display
//     const formatFinanceStatus = (status) => {
//         if (!status) return 'Not Reviewed';
//         return status.replace(/_/g, ' ').toLowerCase()
//             .split(' ')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//             .join(' ');
//     };
//
//     // Format status for display
//     const formatStatus = (status) => {
//         if (!status) return 'Unknown Status';
//         return status.replace(/_/g, ' ').toLowerCase()
//             .split(' ')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//             .join(' ');
//     };
//
//     // NEW: Render action buttons based on fulfillment status
//     const renderActionButtons = () => {
//         if (!activeOffer) return null;
//
//         const { hasFullFulfillment, hasAcceptedItems } = calculateFulfillmentStatus(activeOffer);
//
//         if (hasFullFulfillment) {
//             // Case 1: Full fulfillment (including over-fulfillment) - Show all three options
//             return (
//                 <div className="action-buttons-group">
//                     <button
//                         className="btn-primary"
//                         onClick={() => handleOpenFinalizeDialog(activeOffer.id)}
//                         disabled={loading}
//                         title="Requested quantities met or exceeded - proceed to finalization"
//                         style={{ marginRight: '10px' }}
//                     >
//                         <FiCheckCircle /> Finalize Offer
//                     </button>
//                     <button
//                         className="btn-primary"
//                         onClick={handleRetryClick}
//                         disabled={loading || isRetrying}
//                         title="Start over with entire quantity"
//                         style={{ marginRight: '10px' }}
//                     >
//                         <FiRefreshCw />
//                         {isRetrying ? 'Creating...' : 'Retry Offer'}
//                     </button>
//                     <button
//                         className="btn-primary"
//                         onClick={handleDeleteClick}
//                         disabled={loading || isDeleting}
//                         title="Delete this offer permanently"
//                     >
//                         <FiTrash2 />
//                         {isDeleting ? 'Deleting...' : 'Delete Offer'}
//                     </button>
//                 </div>
//             );
//         } else if (hasAcceptedItems) {
//             // Case 2: Partial fulfillment - User chooses
//             return (
//                 <div className="action-buttons-group">
//                     <button
//                         className="btn-primary"
//                         onClick={handleContinueAndReturnClick}
//                         disabled={loading || isContinueAndReturn}
//                         title="Continue with accepted items and create new offer for remaining quantities"
//                         style={{ marginRight: '10px' }}
//                     >
//                         <FiArrowRight />
//                         {isContinueAndReturn ? 'Processing...' : 'Continue & Return'}
//                     </button>
//                     <button
//                         className="btn-primary"
//                         onClick={handleRetryClick}
//                         disabled={loading || isRetrying}
//                         title="Start over with entire quantity"
//                         style={{ marginRight: '10px' }}
//                     >
//                         <FiRefreshCw />
//                         {isRetrying ? 'Creating...' : 'Retry Entire Offer'}
//                     </button>
//                     <button
//                         className="btn-primary"
//                         onClick={handleDeleteClick}
//                         disabled={loading || isDeleting}
//                         title="Delete this offer permanently"
//                     >
//                         <FiTrash2 />
//                         {isDeleting ? 'Deleting...' : 'Delete Offer'}
//                     </button>
//                 </div>
//             );
//         } else {
//             // Case 3: Nothing accepted - Only retry or delete
//             return (
//                 <div className="action-buttons-group">
//                     <button
//                         className="btn-primary"
//                         onClick={handleRetryClick}
//                         disabled={loading || isRetrying}
//                         title="Create a new offer"
//                         style={{ marginRight: '10px' }}
//                     >
//                         <FiRefreshCw />
//                         {isRetrying ? 'Creating...' : 'Retry Offer'}
//                     </button>
//                     <button
//                         className="btn-primary"
//                         onClick={handleDeleteClick}
//                         disabled={loading || isDeleting}
//                         title="Delete this offer permanently"
//                     >
//                         <FiTrash2 />
//                         {isDeleting ? 'Deleting...' : 'Delete Offer'}
//                     </button>
//                 </div>
//             );
//         }
//     };
//
//     return (
//         <div className="procurement-offers-main-content">
//             {/* Offers List */}
//             <div className="procurement-list-section">
//                 <div className="procurement-list-header">
//                     <h3>Finance Validated Offers</h3>
//                 </div>
//
//                 {loading && !offers.length ? (
//                     <div className="procurement-loading">
//                         <div className="procurement-spinner"></div>
//                         <p>Loading offers...</p>
//                     </div>
//                 ) : offers.length === 0 ? (
//                     <div className="procurement-empty-state">
//                         <FiDollarSign size={48} className="empty-icon" />
//                         <p>No finance validated offers yet. Offers will appear here after finance review.</p>
//                     </div>
//                 ) : (
//                     <div className="procurement-items-list">
//                         {offers.map(offer => (
//                             <div
//                                 key={offer.id}
//                                 className={`procurement-item-card-finance ${activeOffer?.id === offer.id ? 'selected' : ''}
//             ${offer.status === 'FINANCE_ACCEPTED' || offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
//                                     offer.status === 'FINANCE_REJECTED' ? 'card-rejected' : 'card-partial'}`}
//                                 onClick={() => setActiveOffer(offer)}
//                             >
//                                 <div className="procurement-item-header">
//                                     <h4>{offer.title}</h4>
//                                 </div>
//                                 <div className="procurement-item-footer">
//                 <span className="procurement-item-date">
//                     <FiClock /> {new Date(offer.createdAt).toLocaleDateString()}
//                 </span>
//                                 </div>
//                                 <div className="procurement-item-footer">
//                 <span className={`procurement-item-status ${
//                     offer.status === 'FINANCE_ACCEPTED' ? 'status-accepted' :
//                         offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? 'status-partial' :
//                             'status-rejected'
//                 }`}>
//                     {offer.status === 'FINANCE_ACCEPTED' ? (
//                         <>
//                             <FiCheckCircle /> Accepted
//                         </>
//                     ) : offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ? (
//                         <>
//                             <FiFlag /> Partially Accepted
//                         </>
//                     ) : (
//                         <>
//                             <FiX /> Rejected
//                         </>
//                     )}
//                 </span>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//
//             {/* Offer Details Section */}
//             <div className="procurement-details-section">
//                 {activeOffer ? (
//                     <div className="procurement-details-content">
//                         <div className="procurement-details-header">
//                             <div className="procurement-header-content">
//                                 <div className="procurement-title-section">
//                                     <h2 className="procurement-main-title">{activeOffer.title}</h2>
//                                     <div className="procurement-header-meta">
//                                         <span className={`procurement-status-badge status-${activeOffer.status.toLowerCase()}`}>
//                                             {formatStatus(activeOffer.status)}
//                                         </span>
//                                         <span className="procurement-meta-item">
//                                             <FiClock /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="procurement-header-actions">
//                                 {/* SMART ACTION BUTTONS - Now uses the new logic */}
//                                 {renderActionButtons()}
//                             </div>
//                         </div>
//
//                         {!activeOffer.requestOrder ? (
//                             <div className="procurement-loading">
//                                 <div className="procurement-spinner"></div>
//                                 <p>Loading request order details...</p>
//                             </div>
//                         ) : (
//                             <div className="procurement-submitted-info">
//                                 {/* Use the reusable RequestOrderDetails component */}
//                                 <RequestOrderDetails requestOrder={activeOffer.requestOrder} />
//
//                                 {/* Replace the timeline section with the OfferTimeline component */}
//                                 <div className="procurement-request-summary-card-finance">
//                                     <OfferTimeline
//                                         offer={activeOffer}
//                                         variant="finance"
//                                         showRetryInfo={false}
//                                     />
//                                 </div>
//
//                                 {/* Procurement Items with Finance Status */}
//                                 <div className="procurement-submitted-details-finance">
//                                     <h4>Item Review Details</h4>
//                                     <div className="procurement-submitted-items-finance">
//                                         {activeOffer.requestOrder?.requestItems?.map(requestItem => {
//                                             const offerItems = getOfferItemsForRequestItem(requestItem.id);
//
//                                             return (
//                                                 <div key={requestItem.id} className="procurement-submitted-item-card-finance">
//                                                     <div className="submitted-item-header-finance">
//                                                         <div className="item-icon-name-finance">
//                                                             <div className="item-icon-container-finance">
//                                                                 <FiPackage size={22} />
//                                                             </div>
//                                                             <h5>{requestItem.itemType?.name || 'Item'}</h5>
//                                                         </div>
//                                                         <div className="submitted-item-quantity-finance">
//                                                             {requestItem.quantity} {requestItem.itemType?.measuringUnit}
//                                                         </div>
//                                                     </div>
//
//                                                     {offerItems.length > 0 && (
//                                                         <div className="submitted-offer-solutions-finance">
//                                                             <table className="procurement-offer-entries-table-finance">
//                                                                 <thead>
//                                                                 <tr>
//                                                                     <th>Merchant</th>
//                                                                     <th>Quantity</th>
//                                                                     <th>Unit Price</th>
//                                                                     <th>Total</th>
//                                                                     <th>Finance Status</th>
//                                                                 </tr>
//                                                                 </thead>
//                                                                 <tbody>
//                                                                 {offerItems.map((offerItem, idx) => (
//                                                                     <tr key={offerItem.id || idx} className={
//                                                                         offerItem.financeStatus === 'ACCEPTED' ? 'finance-accepted' :
//                                                                             offerItem.financeStatus === 'REJECTED' ? 'finance-rejected' : ''
//                                                                     }>
//                                                                         <td>{offerItem.merchant?.name || 'Unknown'}</td>
//                                                                         <td>{offerItem.quantity} {requestItem.itemType?.measuringUnit}</td>
//                                                                         <td>${parseFloat(offerItem.unitPrice || 0).toFixed(2)}</td>
//                                                                         <td>${parseFloat(offerItem.totalPrice || 0).toFixed(2)}</td>
//                                                                         <td>
//                                                                             <span className={`finance-item-status status-${(offerItem.financeStatus || '').toLowerCase()}`}>
//                                                                                 {formatFinanceStatus(offerItem.financeStatus)}
//                                                                             </span>
//                                                                             {offerItem.financeStatus === 'REJECTED' && offerItem.rejectionReason && (
//                                                                                 <span className="rejection-reason-icon" title={offerItem.rejectionReason}>
//                                                                                     <FiX size={14} />
//                                                                                 </span>
//                                                                             )}
//                                                                         </td>
//                                                                     </tr>
//                                                                 ))}
//                                                                 </tbody>
//                                                             </table>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </div>
//
//                                 {/* Total Summary */}
//                                 <div className="procurement-submitted-summary-finance">
//                                     <div className="summary-item-finance">
//                                         <FiPackage size={16} />
//                                         <span className="summary-label-finance">Total Items Accepted:</span>
//                                         <span className="summary-value-finance">
//                                             {activeOffer.offerItems?.filter(item =>
//                                                 item.financeStatus === 'ACCEPTED'
//                                             ).length || 0}
//                                         </span>
//                                     </div>
//                                     <div className="summary-item-finance">
//                                         <FiX size={16} />
//                                         <span className="summary-label-finance">Total Items Rejected:</span>
//                                         <span className="summary-value-finance">
//                                             {activeOffer.offerItems?.filter(item =>
//                                                 item.financeStatus === 'REJECTED'
//                                             ).length || 0}
//                                         </span>
//                                     </div>
//
//                                     <div className="summary-item-finance total-value-finance">
//                                         <FiDollarSign size={18} />
//                                         <span className="summary-label-finance">Total Approved Value:</span>
//                                         <span className="summary-value-finance total-finance">${getTotalPrice(activeOffer).toFixed(2)}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 ) : (
//                     <div className="procurement-empty-state-container">
//                         <div className="procurement-empty-state">
//                             <FiList size={64} color="#CBD5E1" />
//                             <h3>No Finance Validated Offer Selected</h3>
//                             {offers.length > 0 ? (
//                                 <p>Select an offer from the list to view details</p>
//                             ) : (
//                                 <p>Finance validated offers will appear here after finance review</p>
//                             )}
//                         </div>
//                     </div>
//                 )}
//             </div>
//
//             {/* Snackbar Component */}
//             <Snackbar
//                 type={snackbarType}
//                 text={snackbarMessage}
//                 isVisible={showSnackbar}
//                 onClose={handleSnackbarClose}
//                 duration={4000}
//             />
//
//             {/* Confirmation Dialog for Finalizing an Offer */}
//             <ConfirmationDialog
//                 isVisible={showFinalizeDialog}
//                 type="success"
//                 title="Finalize Offer"
//                 message="Are you sure you want to finalize this offer? This action will send the offer to the finalizing section and cannot be undone."
//                 confirmText="Finalize"
//                 onConfirm={handleConfirmFinalize}
//                 onCancel={handleCancelFinalize}
//                 isLoading={loading}
//                 size="large"
//             />
//
//             {/* Continue and Return Confirmation Dialog */}
//             <ConfirmationDialog
//                 isVisible={showContinueAndReturnConfirm}
//                 type="info"
//                 title="Continue & Return"
//                 message={`Accepted items will proceed to finalization, and a new offer will be created for the remaining quantities. This action cannot be undone.`}
//                 confirmText="Continue & Return"
//                 cancelText="Cancel"
//                 onConfirm={confirmContinueAndReturn}
//                 onCancel={cancelContinueAndReturn}
//                 isLoading={isContinueAndReturn}
//                 showIcon={true}
//                 size="large"
//             />
//
//             {/* Retry Confirmation Dialog */}
//             <ConfirmationDialog
//                 isVisible={showRetryConfirm}
//                 type="warning"
//                 title="Retry Entire Offer"
//                 message={`Are you sure you want to create a new offer for the entire quantity based on "${activeOffer?.title}"? This will discard the current finance review results.`}
//                 confirmText="Create New Offer"
//                 cancelText="Cancel"
//                 onConfirm={confirmRetry}
//                 onCancel={cancelRetry}
//                 isLoading={isRetrying}
//                 showIcon={true}
//                 size="large"
//             />
//
//             {/* Delete Confirmation Dialog */}
//             <ConfirmationDialog
//                 isVisible={showDeleteConfirm}
//                 type="delete"
//                 title="Delete Offer"
//                 message={`Are you sure you want to delete the offer "${activeOffer?.title}"? This action cannot be undone.`}
//                 confirmText="Delete Offer"
//                 cancelText="Cancel"
//                 onConfirm={confirmDelete}
//                 onCancel={cancelDelete}
//                 isLoading={isDeleting}
//                 showIcon={true}
//                 size="large"
//             />
//         </div>
//     );
// };
//
// export default FinanceValidatedOffers;

import React, { useState, useEffect } from 'react';
import {
    FiPackage, FiCheck, FiClock, FiCheckCircle,
    FiX, FiFileText, FiDollarSign, FiList,
    FiUser, FiCalendar, FiFlag, FiTrendingUp, FiRefreshCw, FiTrash2, FiArrowRight,FiAlertCircle
} from 'react-icons/fi';

import "../ProcurementOffers.scss";
import "./FinanceValidatedOffers.scss"
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import { offerService } from '../../../../services/procurement/offerService.js';
import { offerRequestItemService } from '../../../../services/procurement/offerRequestItemService.js';

const FinanceValidatedOffers = ({
                                    offers,
                                    activeOffer,
                                    setActiveOffer,
                                    onOfferFinalized,
                                    onDeleteOffer,
                                    onRetryOffer,
                                    onRefresh
                                }) => {
    const [loading, setLoading] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');

    // Dialog states
    const [showRetryConfirm, setShowRetryConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showContinueConfirm, setShowContinueConfirm] = useState(false);

    // Action loading states
    const [isRetrying, setIsRetrying] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [effectiveRequestItems, setEffectiveRequestItems] = useState([]);
    const [continueDialogType, setContinueDialogType] = useState('finalize'); // 'finalize' or 'continueReturn'
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
    const [selectedMerchantName, setSelectedMerchantName] = useState('');
    const [selectedItemName, setSelectedItemName] = useState('');

    // Show notification
    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
    };

    // Get offer items for a specific request item
    const getOfferItemsForRequestItem = (requestItemId) => {
        if (!activeOffer || !activeOffer.offerItems) return [];
        return activeOffer.offerItems.filter(
            item => item.requestOrderItem?.id === requestItemId || item.requestOrderItemId === requestItemId
        );
    };

    // Calculate total price of accepted items
    const getTotalAcceptedPrice = (offer) => {
        if (!offer || !offer.offerItems) return 0;
        return offer.offerItems
            .filter(item => item.financeStatus === 'ACCEPTED')
            .reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
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

    // Continue (move accepted items to finalize)
    const handleContinueClick = () => {
        setShowContinueConfirm(true);
    };

// Simple finalize (for full fulfillment)
    const handleFinalizeClick = () => {
        setShowContinueConfirm(true); // Reuse the same dialog
    };

    const confirmFinalize = async () => {
        setIsContinuing(true);
        try {
            console.log('Finalizing offer with full fulfillment...');

            // Just update status to FINALIZING
            await offerService.updateStatus(activeOffer.id, 'FINALIZING');

            showNotification('Offer has been sent to finalization.', 'success');

            // Switch to finalize tab
            if (onOfferFinalized) {
                const finalizedOffer = {
                    ...activeOffer,
                    status: 'FINALIZING'
                };
                onOfferFinalized(finalizedOffer);
            }

            // Remove from current tab
            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            setShowContinueConfirm(false);

        } catch (error) {
            console.error('Error finalizing offer:', error);
            showNotification('Failed to finalize offer. Please try again.', 'error');
        } finally {
            setIsContinuing(false);
        }
    };

// Continue and Return (for partial fulfillment)
    const handleContinueAndReturnClick = () => {
        setShowContinueConfirm(true);
    };

    const confirmContinueAndReturn = async () => {
        setIsContinuing(true);
        try {
            console.log('Starting continue and return process...');

            const result = await offerService.continueAndReturnOffer(activeOffer.id);
            console.log('Backend result:', result);

            let successMessage = '';

            if (result.acceptedOfferId && result.newOfferId) {
                successMessage = 'Accepted items sent to finalization. New offer created for remaining quantities.';
            } else if (result.acceptedOfferId) {
                successMessage = 'Accepted items sent to finalization.';
            } else if (result.newOfferId) {
                successMessage = 'New offer created for remaining quantities.';
            }

            showNotification(successMessage, 'success');

            // Switch to finalize tab with accepted offer
            if (result.acceptedOfferId && onOfferFinalized) {
                const finalizedOffer = {
                    ...activeOffer,
                    id: result.acceptedOfferId,
                    status: 'FINALIZING'
                };
                console.log('Switching to finalize tab with offer:', finalizedOffer);
                onOfferFinalized(finalizedOffer);
            }

            // Handle new offer for rejected items (don't auto-switch)
            if (result.newOfferId && onRetryOffer) {
                console.log('New offer created for rejected items:', result.newOfferId);
            }

            // Remove current offer from finance validated tab
            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            setShowContinueConfirm(false);

        } catch (error) {
            console.error('Error in continue and return:', error);
            showNotification('Failed to process offer. Please try again.', 'error');
        } finally {
            setIsContinuing(false);
        }
    };


    const cancelContinue = () => {
        setShowContinueConfirm(false);
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
        try {
            await offerService.deleteOffer(activeOffer.id);
            showNotification('Offer deleted successfully', 'success');

            // Remove from list
            if (onDeleteOffer) {
                onDeleteOffer(activeOffer.id);
            }

            setShowDeleteConfirm(false);
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

    // Check if offer has accepted items
    const hasAcceptedItems = () => {
        if (!activeOffer || !activeOffer.offerItems) return false;
        return activeOffer.offerItems.some(item => item.financeStatus === 'ACCEPTED');
    };

    // Render action buttons
// Render action buttons based on fulfillment status
    const renderActionButtons = () => {
        if (!activeOffer) return null;

        const { hasFullFulfillment, hasAcceptedItems } = calculateFulfillmentStatus(activeOffer);

        if (hasFullFulfillment) {
            // Case 1: Full fulfillment - Show Finalize option
            return (
                <div className="action-buttons-group">
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setContinueDialogType('finalize');
                            handleFinalizeClick();
                        }}
                        disabled={loading || isContinuing}
                        title="Requested quantities met or exceeded - proceed to finalization"
                    >
                        <FiCheckCircle />
                        {isContinuing ? 'Processing...' : 'Finalize Offer'}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleRetryClick}
                        disabled={loading || isRetrying}
                        title="Start over with entire quantity"
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
            );
        } else if (hasAcceptedItems) {
            // Case 2: Partial fulfillment - Show Continue & Return
            return (
                <div className="action-buttons-group">
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setContinueDialogType('continueReturn');
                            handleContinueAndReturnClick();
                        }}
                        disabled={loading || isContinuing}
                        title="Continue with accepted items and create new offer for remaining quantities"

                    >
                        <FiArrowRight />
                        {isContinuing ? 'Processing...' : 'Continue & Return'}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleRetryClick}
                        disabled={loading || isRetrying}
                        title="Start over with entire quantity"

                    >
                        <FiRefreshCw />
                        {isRetrying ? 'Creating...' : 'Retry Entire Offer'}
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
            );
        } else {
            // Case 3: Nothing accepted - Only retry or delete
            return (
                <div className="action-buttons-group">
                    <button
                        className="btn-primary"
                        onClick={handleRetryClick}
                        disabled={loading || isRetrying}
                        title="Create a new offer"

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
            );
        }
    };
    // Add totals by currency helper
    const getTotalsByCurrency = (offer) => {
        if (!offer || !offer.offerItems || offer.offerItems.length === 0) return {};

        const totals = {};

        offer.offerItems
            .filter(item => item.financeStatus === 'ACCEPTED')
            .forEach(item => {
                const currency = item.currency || 'EGP';
                const amount = item.totalPrice ? parseFloat(item.totalPrice) : 0;

                if (!totals[currency]) {
                    totals[currency] = 0;
                }

                totals[currency] += amount;
            });

        return totals;
    };

    // Calculate fulfillment status
    const calculateFulfillmentStatus = (offer) => {
        if (!offer?.requestOrder?.requestItems || !effectiveRequestItems) {
            return { hasFullFulfillment: false, hasAcceptedItems: false, fulfillmentDetails: {} };
        }

        const acceptedQuantities = {};
        const requestedQuantities = {};

        // Use effective request items instead of original
        effectiveRequestItems.forEach(requestItem => {
            const itemTypeId = requestItem.itemTypeId || requestItem.itemType?.id;
            requestedQuantities[itemTypeId] = requestItem.quantity;

            const offerItems = offer.offerItems.filter(
                item => item.itemType?.id === itemTypeId
            );

            acceptedQuantities[itemTypeId] = offerItems
                .filter(item => item.financeStatus === 'ACCEPTED')
                .reduce((sum, item) => sum + item.quantity, 0);
        });

        // Check if we have full fulfillment
        const hasFullFulfillment = Object.keys(requestedQuantities).every(itemTypeId =>
            acceptedQuantities[itemTypeId] >= requestedQuantities[itemTypeId]
        );

        // Check if we have any accepted items
        const hasAcceptedItems = Object.values(acceptedQuantities).some(qty => qty > 0);

        return {
            hasFullFulfillment,
            hasAcceptedItems,
            acceptedQuantities,
            requestedQuantities
        };
    };

    const handleViewRejectionReason = (offerItem, itemName) => {
        setSelectedRejectionReason(offerItem.rejectionReason || 'No reason provided');
        setSelectedMerchantName(offerItem.merchant?.name || 'Unknown Merchant');
        setSelectedItemName(itemName);
        setShowRejectionModal(true);
    };

    const closeRejectionModal = () => {
        setShowRejectionModal(false);
        setSelectedRejectionReason('');
        setSelectedMerchantName('');
        setSelectedItemName('');
    };


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
        if (activeOffer && activeOffer.offerItems && activeOffer.offerItems.length > 0) {
            console.log("=== OFFER ITEM DEBUG ===");
            console.log("First offer item:", activeOffer.offerItems[0]);
            console.log("Rejection reason:", activeOffer.offerItems[0].rejectionReason);
            console.log("Finance rejection reason:", activeOffer.offerItems[0].financeRejectionReason);
            console.log("All keys:", Object.keys(activeOffer.offerItems[0]));
            console.log("========================");
        }
    }, [activeOffer]);

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
    ${offer.financeStatus === 'FINANCE_ACCEPTED' || offer.financeStatus === 'FINANCE_PARTIALLY_ACCEPTED' ? 'card-accepted' :
                                    offer.financeStatus === 'FINANCE_REJECTED' ? 'card-rejected' : 'card-partial'}`}                                onClick={() => setActiveOffer(offer)}
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
    offer.financeStatus === 'FINANCE_ACCEPTED' ? 'status-accepted' :
        offer.financeStatus === 'FINANCE_PARTIALLY_ACCEPTED' ? 'status-partial' :
            'status-rejected'
}`}>
    {formatStatus(offer.financeStatus)}
</span>                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Offer Details */}
            <div className="procurement-details-section">
                {activeOffer ? (
                    <div>
                        {/* Header */}
                        <div className="procurement-details-header">
                            <div className="procurement-details-title">
                                <h2 className='procurement-main-title'>{activeOffer.title}</h2>
                                <span className={`procurement-status-badge ${
                                    activeOffer.financeStatus === 'FINANCE_ACCEPTED' ? 'status-accepted' :
                                        activeOffer.financeStatus === 'FINANCE_PARTIALLY_ACCEPTED' ? 'status-partial' :
                                            'status-rejected'
                                }`}>
    {formatStatus(activeOffer.financeStatus)}
</span>
                            </div>

                            {/* Action Buttons */}
                            {renderActionButtons()}
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

                                {/* Offer Timeline */}
                                <div className="procurement-request-summary-card-finance">
                                    <OfferTimeline
                                        offer={activeOffer}
                                        variant="finance"
                                        showRetryInfo={true}
                                    />
                                </div>

                                {/* Item Review Details - READ ONLY */}
                                <div className="procurement-submitted-details-finance">
                                    <h4>Finance Review Results</h4>
                                    <p className="section-description">
                                        Review the finance team's decisions for each item below.
                                    </p>
                                    <div className="procurement-submitted-items-finance">
                                        {effectiveRequestItems?.map(requestItem => {
                                            const itemTypeId = requestItem.itemTypeId || requestItem.itemType?.id;
                                            const offerItems = activeOffer.offerItems.filter(
                                                item => item.itemType?.id === itemTypeId
                                            );

                                            // Only show items that have offer items
                                            if (offerItems.length === 0) return null;

                                            const itemTypeName = requestItem.itemTypeName || requestItem.itemType?.name || 'Item';
                                            const itemTypeMeasuringUnit = requestItem.itemTypeMeasuringUnit || requestItem.itemType?.measuringUnit || 'units';

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-finance">
                                                    <div className="submitted-item-header-finance">
                                                        <div className="item-icon-name-finance">
                                                            <div className="item-icon-container-finance">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{itemTypeName}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-finance">
                                                            {requestItem.quantity} {itemTypeMeasuringUnit}
                                                        </div>
                                                    </div>

                                                    <div className="submitted-offer-solutions-finance">
                                                        <table className="procurement-offer-entries-table-finance">
                                                            <thead>
                                                            <tr>
                                                                <th>Merchant</th>
                                                                <th>Quantity</th>
                                                                <th>Unit Price</th>
                                                                <th>Total</th>
                                                                <th>Finance Decision</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {offerItems.map((offerItem, idx) => (
                                                                <tr key={offerItem.id || idx} className={
                                                                    offerItem.financeStatus === 'ACCEPTED' ? 'finance-accepted' :
                                                                        offerItem.financeStatus === 'REJECTED' ? 'finance-rejected' : ''
                                                                }>
                                                                    <td>{offerItem.merchant?.name || 'Unknown'}</td>
                                                                    <td>{offerItem.quantity} {itemTypeMeasuringUnit}</td>
                                                                    <td>{offerItem.currency || 'EGP'} {parseFloat(offerItem.unitPrice || 0).toFixed(2)}</td>
                                                                    <td>{offerItem.currency || 'EGP'} {parseFloat(offerItem.totalPrice || 0).toFixed(2)}</td>
                                                                    <td>
                                                                        <div className="finance-status-cell">
                                    <span className={`finance-item-status status-${(offerItem.financeStatus || '').toLowerCase()}`}>
                                        {formatFinanceStatus(offerItem.financeStatus)}
                                    </span>
                                                                            {offerItem.financeStatus === 'REJECTED' && offerItem.rejectionReason && (
                                                                                <button
                                                                                    className="rejection-reason-button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleViewRejectionReason(offerItem, itemTypeName);
                                                                                    }}
                                                                                    title="View rejection reason"
                                                                                >
                                                                                    <FiAlertCircle size={16} />
                                                                                </button>
                                                                            )}                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}                                    </div>
                                </div>

                                {/* Summary Section */}
                                <div className="procurement-submitted-summary-finance">
                                    <div className="summary-item-finance">
                                        <FiCheckCircle size={16} />
                                        <span className="summary-label-finance">Total Items Accepted:</span>
                                        <span className="summary-value-finance">
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'ACCEPTED'
                                            ).length || 0}
                                        </span>
                                    </div>

                                    <div className="summary-item-finance">
                                        <FiX size={16} />
                                        <span className="summary-label-finance">Total Items Rejected:</span>
                                        <span className="summary-value-finance">
                                            {activeOffer.offerItems?.filter(item =>
                                                item.financeStatus === 'REJECTED'
                                            ).length || 0}
                                        </span>
                                    </div>

                                    <div className="summary-item-finance total-value-finance">
                                        <FiDollarSign size={18} />
                                        <span className="summary-label-finance">Total Approved Value:</span>
                                        <span className="summary-value-finance total-finance">
    {Object.entries(getTotalsByCurrency(activeOffer)).map(([currency, total], idx) => (
        <span key={currency} style={{ marginLeft: idx > 0 ? '8px' : '0' }}>
            {idx > 0 && '+ '}
            {currency} {total.toFixed(2)}
        </span>
    ))}
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

            {/* Snackbar Component */}
            <Snackbar
                type={snackbarType}
                text={snackbarMessage}
                isVisible={showSnackbar}
                onClose={handleSnackbarClose}
                duration={4000}
            />

            {/* Continue Confirmation Dialog */}
            {/* Dynamic Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showContinueConfirm}
                type={continueDialogType === 'finalize' ? 'success' : 'info'}
                title={continueDialogType === 'finalize' ? 'Finalize Offer' : 'Continue & Return'}
                message={
                    continueDialogType === 'finalize'
                        ? 'Are you sure you want to finalize this offer? Accepted items will proceed to the finalization stage.'
                        : 'Accepted items will proceed to finalization, and a new offer will be created for the remaining quantities. This action cannot be undone.'
                }
                confirmText={continueDialogType === 'finalize' ? 'Finalize' : 'Continue & Return'}
                cancelText="Cancel"
                onConfirm={continueDialogType === 'finalize' ? confirmFinalize : confirmContinueAndReturn}
                onCancel={cancelContinue}
                isLoading={isContinuing}
                showIcon={true}
                size="large"
            />

            {/* Retry Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showRetryConfirm}
                type="warning"
                title="Retry Entire Offer"
                message={`Are you sure you want to create a new offer for the entire quantity based on "${activeOffer?.title}"? This will discard the current finance review results.`}
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

            {/* Rejection Reason Modal */}
            {/* Rejection Reason Modal */}
            {showRejectionModal && (
                <div className="modal-backdrop" onClick={closeRejectionModal}>
                    <div className="modal-content modal-md rejection-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                <FiAlertCircle style={{ color: 'var(--color-danger)' }} />
                                Rejection Details
                            </h2>
                            <button className="btn-close" onClick={closeRejectionModal}>
                                <FiX />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="rejection-details">
                                <div className="rejection-field">
                                    <label>Merchant</label>
                                    <div className="field-value">{selectedMerchantName}</div>
                                </div>

                                <div className="rejection-field">
                                    <label>Item</label>
                                    <div className="field-value">{selectedItemName}</div>
                                </div>

                                <div className="rejection-field">
                                    <label>Rejection Reason</label>
                                    <div className="field-value reason-text">{selectedRejectionReason}</div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="modal-btn-secondary" onClick={closeRejectionModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceValidatedOffers;