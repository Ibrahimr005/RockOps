import React, { useState, useEffect } from 'react';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2.jsx';
import RequestOrderDetails from '../../../../components/procurement/RequestOrderDetails/RequestOrderDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import OfferTimeline from '../../../../components/procurement/OfferTimeline/OfferTimeline.jsx';
import { offerService } from '../../../../services/procurement/offerService.js';
import { offerRequestItemService } from '../../../../services/procurement/offerRequestItemService.js';

import "../ProcurementOffers.scss";
import "./InspectionOffers.scss";
import {
    FiPackage, FiClock, FiCheckCircle, FiXCircle,
    FiCheck, FiX, FiCalendar, FiDollarSign,
    FiClipboard, FiSearch as FiSearchIcon
} from 'react-icons/fi';
import { Button } from '../../../../components/common/Button';

const InspectionOffers = ({
    offers,
    activeOffer,
    setActiveOffer,
    getTotalPrice,
    setError,
    setSuccess,
    onOfferFinalized,
    onOfferResetToUnstarted,
    onDeleteOffer
}) => {
    const [userRole, setUserRole] = useState(null);
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [inspectedBy, setInspectedBy] = useState('');
    const [effectiveRequestItems, setEffectiveRequestItems] = useState([]);

    // Snackbar states
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');

    // Confirmation dialog states
    const [confirmationDialog, setConfirmationDialog] = useState({
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

    const [rejectionReason, setRejectionReason] = useState('');

    const showNotification = (message, type = 'success') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setShowSnackbar(true);
    };

    const handleSnackbarClose = () => {
        setShowSnackbar(false);
    };

    const handleConfirmationCancel = () => {
        setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
        setRejectionReason('');
        setInspectionNotes('');
    };

    useEffect(() => {
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

    const getTotalsByCurrency = (offer) => {
        if (!offer || !offer.offerItems || offer.offerItems.length === 0) return {};
        const totals = {};
        offer.offerItems.forEach(item => {
            const currency = item.currency || 'EGP';
            const amount = item.totalPrice ? parseFloat(item.totalPrice) : 0;
            if (!totals[currency]) totals[currency] = 0;
            totals[currency] += amount;
        });
        return totals;
    };

    // Handle approve inspection
    const handleApproveInspection = (e, offer) => {
        e.stopPropagation();
        setConfirmationDialog({
            show: true,
            type: 'success',
            title: 'Approve Inspection',
            message: `Are you sure you want to approve the inspection for "${offer.title}"? This will move the offer to the Finalize stage.`,
            confirmText: 'Approve Inspection',
            onConfirm: () => handleConfirmApprove(offer),
            isLoading: false,
            showInput: true,
            inputLabel: 'Inspection Notes (optional)',
            inputPlaceholder: 'Add any inspection notes or comments...',
            inputRequired: false
        });
        setInspectionNotes('');
    };

    const handleConfirmApprove = async (offer) => {
        if (!inspectedBy || inspectedBy.trim() === '') {
            showNotification('Please enter who performed the inspection.', 'error');
            return;
        }
        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

            await offerService.handleInspection(offer.id, 'APPROVE', inspectionNotes || null, inspectedBy.trim());

            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
            setInspectionNotes('');
            setInspectedBy('');
            showNotification('Inspection approved! Offer moved to Finalize stage.', 'success');

            if (onOfferFinalized) {
                setTimeout(() => {
                    onOfferFinalized({ ...offer, status: 'FINALIZING' });
                }, 100);
            }
        } catch (error) {
            console.error('Error approving inspection:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showNotification(`Error: ${error.message || 'Failed to approve inspection'}`, 'error');
        }
    };

    // Handle fail inspection
    const handleFailInspection = (e, offer) => {
        e.stopPropagation();
        setConfirmationDialog({
            show: true,
            type: 'danger',
            title: 'Fail Inspection',
            message: `Are you sure you want to fail the inspection for "${offer.title}"? This will reset the offer back to Unstarted so a new offer can be submitted.`,
            confirmText: 'Fail Inspection',
            onConfirm: (reason) => handleConfirmReject(offer, reason),
            isLoading: false,
            showInput: true,
            inputLabel: 'Rejection Reason',
            inputPlaceholder: 'Please provide a detailed reason for failing this inspection...',
            inputRequired: true
        });
        setRejectionReason('');
    };

    const handleConfirmReject = async (offer, rejectionReason) => {
        try {
            setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

            await offerService.handleInspection(offer.id, 'REJECT', rejectionReason);

            setConfirmationDialog(prev => ({ ...prev, show: false, isLoading: false }));
            setRejectionReason('');
            showNotification('Inspection failed. Offer has been reset to Unstarted.', 'success');

            if (onOfferResetToUnstarted) {
                setTimeout(() => {
                    onOfferResetToUnstarted({ ...offer, status: 'UNSTARTED' });
                }, 100);
            }
        } catch (error) {
            console.error('Error failing inspection:', error);
            setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
            showNotification(`Error: ${error.message || 'Failed to reject inspection'}`, 'error');
        }
    };

    return (
        <div className="procurement-offers-main-content">
            {/* Offers List */}
            <div className="procurement-list-section">
                <div className="procurement-list-header">
                    <h3>Equipment Inspection</h3>
                </div>

                {offers.length === 0 ? (
                    <div className="procurement-empty-state">
                        <FiSearchIcon size={48} className="empty-icon" />
                        <p>No equipment offers pending inspection.</p>
                    </div>
                ) : (
                    <div className="procurement-items-list">
                        {offers.map(offer => (
                            <div
                                key={offer.id}
                                className={`procurement-item-card-inspection ${activeOffer?.id === offer.id ? 'selected' : ''}`}
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
                                        <span className="procurement-status-badge status-inspection">
                                            <FiClipboard /> Pending Inspection
                                        </span>
                                        <span className="procurement-meta-item">
                                            <FiCalendar /> Created: {new Date(activeOffer.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="procurement-header-actions">
                                <Button
                                    variant="success"
                                    onClick={(e) => handleApproveInspection(e, activeOffer)}
                                    title="Approve Inspection"
                                >
                                    <FiCheck />
                                    <span>Pass Inspection</span>
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={(e) => handleFailInspection(e, activeOffer)}
                                    title="Fail Inspection"
                                >
                                    <FiX />
                                    <span>Fail Inspection</span>
                                </Button>
                            </div>
                        </div>

                        {/* Inspected By Field */}
                        <div className="inspection-examined-by">
                            <label htmlFor="inspectedBy">Inspected / Examined By <span className="required">*</span></label>
                            <input
                                id="inspectedBy"
                                type="text"
                                value={inspectedBy}
                                onChange={(e) => setInspectedBy(e.target.value)}
                                placeholder="Enter the name of the person who inspected the equipment"
                                className="inspection-examined-input"
                            />
                        </div>

                        {/* Approval Status Summary */}
                        <div className="inspection-approval-summary">
                            <h4>Approval Status</h4>
                            <div className="inspection-status-items">
                                <div className="inspection-status-item approved">
                                    <FiCheckCircle className="inspection-status-icon" />
                                    <span>Manager Accepted</span>
                                </div>
                                <div className="inspection-status-item approved">
                                    <FiCheckCircle className="inspection-status-icon" />
                                    <span>Finance Accepted</span>
                                </div>
                                <div className="inspection-status-item pending">
                                    <FiClipboard className="inspection-status-icon" />
                                    <span>Inspection Pending</span>
                                </div>
                            </div>
                        </div>

                        {/* Request Order Details */}
                        <RequestOrderDetails requestOrder={activeOffer.requestOrder} />

                        {!activeOffer.requestOrder ? (
                            <div className="procurement-loading">
                                <div className="procurement-spinner"></div>
                                <p>Loading request order details...</p>
                            </div>
                        ) : (
                            <div className="procurement-submitted-info">
                                <OfferTimeline
                                    offer={activeOffer}
                                    variant="submitted"
                                    showRetryInfo={true}
                                />

                                {/* Procurement Solutions */}
                                <div className="procurement-submitted-details-submitted">
                                    <h4>Procurement Solutions</h4>
                                    <div className="procurement-submitted-items-submitted">
                                        {effectiveRequestItems?.map(requestItem => {
                                            const equipmentSpecId = requestItem.equipmentSpecId || requestItem.equipmentSpec?.id;
                                            const itemTypeId = requestItem.itemTypeId || requestItem.itemType?.id;
                                            const isEquipmentItem = !!(equipmentSpecId);
                                            let offerItems = [];

                                            if (itemTypeId) {
                                                offerItems = activeOffer.offerItems.filter(
                                                    item => item.itemType?.id === itemTypeId
                                                );
                                            } else if (equipmentSpecId) {
                                                offerItems = activeOffer.offerItems.filter(
                                                    item => (item.equipmentSpec?.id === equipmentSpecId) || (item.equipmentSpecId === equipmentSpecId)
                                                );
                                            } else {
                                                offerItems = activeOffer.offerItems.filter(
                                                    item => item.requestOrderItem?.id === requestItem.id || item.requestOrderItemId === requestItem.id
                                                );
                                            }

                                            if (offerItems.length === 0) return null;

                                            const itemTypeName = requestItem.itemTypeName || requestItem.itemType?.name || requestItem.equipmentName || requestItem.equipmentSpec?.name || 'Item';
                                            const itemTypeMeasuringUnit = isEquipmentItem ? 'unit' : (requestItem.itemTypeMeasuringUnit || requestItem.itemType?.measuringUnit || 'units');

                                            return (
                                                <div key={requestItem.id} className="procurement-submitted-item-card-submitted">
                                                    <div className="submitted-item-header-submitted">
                                                        <div className="item-icon-name-submitted">
                                                            <div className="item-icon-container-submitted">
                                                                <FiPackage size={22} />
                                                            </div>
                                                            <h5>{itemTypeName}</h5>
                                                        </div>
                                                        <div className="submitted-item-quantity-submitted">
                                                            {requestItem.quantity} {itemTypeMeasuringUnit}
                                                        </div>
                                                    </div>

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
                                                                        <td>{offerItem.quantity} {itemTypeMeasuringUnit}</td>
                                                                        <td>{offerItem.currency || 'EGP'} {parseFloat(offerItem.unitPrice).toFixed(2)}</td>
                                                                        <td>{offerItem.currency || 'EGP'} {parseFloat(offerItem.totalPrice).toFixed(2)}</td>
                                                                        <td>{offerItem.estimatedDeliveryDays ? `${offerItem.estimatedDeliveryDays} days` : 'N/A'}</td>
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

                                {/* Summary */}
                                <div className="procurement-submitted-summary-submitted">
                                    <div className="summary-item">
                                        <FiPackage size={16} />
                                        <span className="summary-label">Total Equipment:</span>
                                        <span className="summary-value">{activeOffer.requestOrder?.requestItems?.length || 0}</span>
                                    </div>
                                    <div className="summary-item total-value">
                                        <FiDollarSign size={18} />
                                        <span className="summary-label">Total Value:</span>
                                        <span className="summary-value total">
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
                            <FiClipboard size={64} color="#CBD5E1" />
                            <h3>No Inspection Offers Selected</h3>
                            {offers.length > 0 ? (
                                <p>Select an equipment offer from the list to inspect</p>
                            ) : (
                                <p>Equipment offers will appear here after manager and finance approval</p>
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
                inputValue={confirmationDialog.type === 'danger' ? rejectionReason : inspectionNotes}
                onInputChange={confirmationDialog.type === 'danger' ? setRejectionReason : setInspectionNotes}
                size="large"
            />

            {/* Snackbar */}
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

export default InspectionOffers;
