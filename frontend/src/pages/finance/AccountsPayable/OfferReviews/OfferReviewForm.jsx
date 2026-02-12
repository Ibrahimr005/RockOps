import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { FiCheck, FiX, FiDollarSign, FiAlertTriangle, FiPackage, FiMapPin, FiUser } from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import { offerService } from '../../../../services/procurement/offerService';
import { warehouseService } from '../../../../services/warehouseService';
import './OfferReviewForm.scss';

const OfferReviewForm = ({ offer, onClose, onSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingOffer, setFetchingOffer] = useState(true);
    const [fullOfferData, setFullOfferData] = useState(null);
    const [budgetCategory, setBudgetCategory] = useState('');
    const [notes, setNotes] = useState('');

    // ✅ ADD THESE: Confirmation dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [reviewSummary, setReviewSummary] = useState({ accepted: 0, rejected: 0 });

    // Track decision for each item
    const [itemDecisions, setItemDecisions] = useState({});
    const [rejectionReasons, setRejectionReasons] = useState({});

    const { showSuccess, showError } = useSnackbar();

    // Get current user info
    const getCurrentUserId = () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        return userInfo?.id || '00000000-0000-0000-0000-000000000000';
    };

    const getCurrentUserName = () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        return userInfo?.username || userInfo?.name || 'Unknown User';
    };

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Fetch full offer details from procurement API
    useEffect(() => {
        const fetchOfferDetails = async () => {
            try {
                setFetchingOffer(true);
                const response = await offerService.getById(offer.offerId);
                const offerData = response.data || response;
                console.log('Full Offer Data:', offerData);

                if (offerData.requestOrder?.requesterId && offerData.requestOrder?.partyType === 'WAREHOUSE') {
                    try {
                        const warehouseResponse = await warehouseService.getById(offerData.requestOrder.requesterId);
                        const warehouseData = warehouseResponse.data || warehouseResponse;
                        console.log('Warehouse Data:', warehouseData);
                        offerData.warehouseDetails = warehouseData;
                    } catch (err) {
                        console.error('Error fetching warehouse details:', err);
                    }
                }

                setFullOfferData(offerData);

                // Initialize decisions for all items
                if (offerData?.offerItems) {
                    const decisions = {};
                    offerData.offerItems.forEach(item => {
                        decisions[item.id] = item.financeStatus || 'PENDING';
                    });
                    setItemDecisions(decisions);
                }
            } catch (err) {
                console.error('Error fetching offer details:', err);
                showError('Failed to load offer details');
            } finally {
                setFetchingOffer(false);
            }
        };

        if (offer.offerId) {
            fetchOfferDetails();
        }
    }, [offer.offerId]);

    const handleItemDecision = (itemId, decision) => {
        setItemDecisions(prev => ({
            ...prev,
            [itemId]: decision
        }));

        // Clear rejection reason if accepting
        if (decision === 'ACCEPTED') {
            setRejectionReasons(prev => {
                const updated = { ...prev };
                delete updated[itemId];
                return updated;
            });
        }
    };

    const handleRejectionReason = (itemId, reason) => {
        setRejectionReasons(prev => ({
            ...prev,
            [itemId]: reason
        }));
    };

    const validateForm = () => {
        // Check if all items have been reviewed
        const pendingItems = Object.values(itemDecisions).filter(d => d === 'PENDING').length;
        if (pendingItems > 0) {
            showError(`Please review all ${pendingItems} pending items`);
            return false;
        }

        // Check if rejected items have reasons
        for (const [itemId, decision] of Object.entries(itemDecisions)) {
            if (decision === 'REJECTED') {
                if (!rejectionReasons[itemId] || rejectionReasons[itemId].trim() === '') {
                    showError('Please provide rejection reason for all rejected items');
                    return false;
                }
            }
        }

        // Check if at least one item is accepted
        const acceptedCount = Object.values(itemDecisions).filter(d => d === 'ACCEPTED').length;
        if (acceptedCount === 0) {
            if (!window.confirm('All items are rejected. Are you sure you want to continue?')) {
                return false;
            }
        }

        // Budget category required if any items accepted
        if (acceptedCount > 0 && !budgetCategory.trim()) {
            showError('Please select a budget category for accepted items');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            // Prepare request data
            const requestData = {
                offerId: offer.offerId,
                reviewerUserId: getCurrentUserId(),
                reviewerName: getCurrentUserName(),
                budgetCategory: budgetCategory,
                notes: notes,
                itemDecisions: Object.entries(itemDecisions).map(([itemId, decision]) => ({
                    offerItemId: itemId,
                    decision: decision,
                    rejectionReason: decision === 'REJECTED' ? rejectionReasons[itemId] : null
                }))
            };

            console.log('Submitting item-level review:', requestData);

            // Call the new reviewItems endpoint
            await financeService.accountsPayable.offerReviews.reviewItems(requestData);

            showSuccess('Offer reviewed successfully!');
            onSubmit();

        } catch (error) {
            console.error('Error reviewing offer:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to submit review';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getItemsByMerchant = () => {
        if (!fullOfferData?.offerItems) return {};

        return fullOfferData.offerItems.reduce((acc, item) => {
            const merchantName = item.merchant?.name || 'Unknown Merchant';
            if (!acc[merchantName]) {
                acc[merchantName] = [];
            }
            acc[merchantName].push(item);
            return acc;
        }, {});
    };

    const calculateSummary = () => {
        const total = fullOfferData?.offerItems?.length || 0;
        const accepted = Object.values(itemDecisions).filter(d => d === 'ACCEPTED').length;
        const rejected = Object.values(itemDecisions).filter(d => d === 'REJECTED').length;
        const pending = total - accepted - rejected;

        return { total, accepted, rejected, pending };
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Get unique merchants from offer items
    const getMerchants = () => {
        if (!fullOfferData?.offerItems || fullOfferData.offerItems.length === 0) return [];
        const merchantMap = new Map();
        fullOfferData.offerItems.forEach(item => {
            if (item.merchant) {
                merchantMap.set(item.merchant.id, item.merchant);
            }
        });
        return Array.from(merchantMap.values());
    };

    if (fetchingOffer) {
        return (
            <div className="modal-overlay">
                <div className="modal-container offer-review-modal">
                    <div className="loading-container">
                        <p>Loading offer details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!fullOfferData) {
        return (
            <div className="modal-overlay">
                <div className="modal-container offer-review-modal">
                    <div className="error-container">
                        <p>Failed to load offer details</p>
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const itemsByMerchant = getItemsByMerchant();
    const summary = calculateSummary();
    const merchants = getMerchants();
    const totalItems = fullOfferData.offerItems?.length || 0;
    const warehouseName = fullOfferData?.requestOrder?.requesterName || 'N/A';
    const siteName = fullOfferData?.warehouseDetails?.site?.name || 'N/A';

    return (
        <div className="modal-overlay">
            <div className="modal-container offer-review-modal offer-review-modal-large">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiPackage />
                        <h2>Review Offer Items - {fullOfferData.title || offer.offerNumber}</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Offer Flow - From/To */}
                    <div className="offer-flow-section">
                        <div className="flow-item">
                            <div className="flow-header">
                                <FiMapPin className="flow-icon" />
                                <span className="flow-label">From</span>
                            </div>
                            <div className="flow-content">
                                <div className="location-info">
                                    <h4>{warehouseName}</h4>
                                    <p className="site-name">{siteName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flow-arrow">→</div>

                        <div className="flow-item">
                            <div className="flow-header">
                                <FiUser className="flow-icon" />
                                <span className="flow-label">To Merchant{merchants.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flow-content">
                                {merchants.length > 0 ? (
                                    merchants.map((merchant, index) => (
                                        <div key={merchant.id} className="merchant-info">
                                            <h4>{merchant.name}</h4>
                                            {merchant.contactPersonName && (
                                                <p className="contact-person">{merchant.contactPersonName}</p>
                                            )}
                                            {merchant.contactPhone && (
                                                <p className="contact-phone">{merchant.contactPhone}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-data">No merchant specified</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/*/!* Review Summary Badges *!/*/}
                    {/*<div className="review-summary-section">*/}
                    {/*    <div className="summary-badges">*/}
                    {/*        <span className="summary-badge total">Total: {summary.total}</span>*/}
                    {/*        <span className="summary-badge accepted">✓ Accepted: {summary.accepted}</span>*/}
                    {/*        <span className="summary-badge rejected">✗ Rejected: {summary.rejected}</span>*/}
                    {/*        <span className="summary-badge pending">⏳ Pending: {summary.pending}</span>*/}
                    {/*    </div>*/}
                    {/*</div>*/}

                    {/* Items Grouped by Merchant */}
                    <div className="items-by-merchant-section">
                        <div className="section-header">
                            <FiPackage />
                            <h3>Review Items by Merchant</h3>
                        </div>

                        {Object.entries(itemsByMerchant).map(([merchantName, items]) => (
                            <div key={merchantName} className="merchant-group">
                                <div className="merchant-group-header">
                                    <FiUser />
                                    <h4>{merchantName}</h4>
                                    <span className="item-count">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                                </div>

                                <div className="merchant-items-list">
                                    {items.map(item => (
                                        <div key={item.id} className={`review-item-card ${itemDecisions[item.id]?.toLowerCase() || ''}`}>
                                            <div className="item-details">
                                                <div className="item-info">
                                                    <strong className="item-name">
                                                        {item.requestOrderItem?.itemType?.name || 'Item'}
                                                    </strong>
                                                    <div className="item-specs">
                                                        <span>Qty: {item.quantity} {item.requestOrderItem?.itemType?.measuringUnit || 'units'}</span>
                                                        <span>•</span>
                                                        <span>Unit Price: {formatCurrency(item.unitPrice)}</span>
                                                    </div>
                                                    {item.deliveryNotes && (
                                                        <div className="delivery-notes">
                                                            <FiAlertTriangle size={12} />
                                                            <span>{item.deliveryNotes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="item-price">
                                                    <strong>{formatCurrency(item.totalPrice)}</strong>
                                                    <span className="currency">{item.currency || 'EGP'}</span>
                                                </div>
                                            </div>

                                            <div className="item-decision-controls">
                                                <button
                                                    className={`decision-btn accept-btn ${itemDecisions[item.id] === 'ACCEPTED' ? 'selected' : ''}`}
                                                    onClick={() => handleItemDecision(item.id, 'ACCEPTED')}
                                                    disabled={loading}
                                                >
                                                    <FiCheck /> Accept
                                                </button>
                                                <button
                                                    className={`decision-btn reject-btn ${itemDecisions[item.id] === 'REJECTED' ? 'selected' : ''}`}
                                                    onClick={() => handleItemDecision(item.id, 'REJECTED')}
                                                    disabled={loading}
                                                >
                                                    <FiX /> Reject
                                                </button>
                                            </div>

                                            {itemDecisions[item.id] === 'REJECTED' && (
                                                <div className="rejection-reason-section">
                                                    <label>Rejection Reason *</label>
                                                    <textarea
                                                        value={rejectionReasons[item.id] || ''}
                                                        onChange={(e) => handleRejectionReason(item.id, e.target.value)}
                                                        placeholder="Provide reason for rejection (e.g., 'Price too high', 'Budget constraints')..."
                                                        rows={2}
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Financial Details - Only show if items accepted */}
                    {summary.accepted > 0 && (
                        <div className="financial-details-section">
                            <div className="section-header">
                                <FiDollarSign />
                                <h3>Financial Details</h3>
                            </div>

                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Budget Category <span className="required">*</span>
                                </label>
                                <select
                                    value={budgetCategory}
                                    onChange={(e) => setBudgetCategory(e.target.value)}
                                    required
                                >
                                    <option value="">Select category...</option>
                                    <option value="OPERATIONAL">Operational Expenses</option>
                                    <option value="CAPITAL">Capital Expenditure</option>
                                    <option value="MAINTENANCE">Maintenance & Repairs</option>
                                    <option value="PROJECT">Project-Based</option>
                                    <option value="INVENTORY">Inventory Purchase</option>
                                </select>
                            </div>

                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Review Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any additional notes about this review..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || summary.pending > 0}
                    >
                        {loading ? (
                            <span>Submitting...</span>
                        ) : (
                            <>
                                <FaCheckCircle />
                                <span>Submit Review ({summary.accepted} Accepted, {summary.rejected} Rejected)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfferReviewForm;