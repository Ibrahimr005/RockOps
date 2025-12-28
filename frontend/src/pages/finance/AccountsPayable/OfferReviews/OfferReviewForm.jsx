import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { FiPackage, FiMapPin, FiUser, FiDollarSign } from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import { offerService } from '../../../../services/procurement/offerService';
import { warehouseService } from '../../../../services/warehouseService';
import './OfferReviewForm.scss';

const OfferReviewForm = ({ offer, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        offerId: offer.offerId,
        action: 'APPROVE',
        budgetCategory: '',
        approvalNotes: '',
        rejectionReason: '',
        expectedPaymentDate: ''
    });
    const [fullOfferData, setFullOfferData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingOffer, setFetchingOffer] = useState(true);
    const [errors, setErrors] = useState({});
    const { showSuccess, showError } = useSnackbar();

    // Fetch full offer details from procurement API
    useEffect(() => {
        const fetchOfferDetails = async () => {
            try {
                setFetchingOffer(true);
                const response = await offerService.getById(offer.offerId);
                const offerData = response.data || response; // DEFINE offerData HERE
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

                setFullOfferData(offerData); // Use offerData instead of response
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = (action) => {
        const newErrors = {};

        if (action === 'APPROVE') {
            if (!formData.budgetCategory.trim()) {
                newErrors.budgetCategory = 'Budget category is required for approval';
            }
        } else {
            if (!formData.rejectionReason.trim()) {
                newErrors.rejectionReason = 'Rejection reason is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleApprove = async () => {
        if (!validateForm('APPROVE')) {
            showError('Please provide budget category');
            return;
        }

        setLoading(true);

        try {
            await financeService.accountsPayable.offerReviews.review({
                ...formData,
                action: 'APPROVE'
            });
            showSuccess('Offer approved successfully');
            onSubmit();
        } catch (err) {
            console.error('Error approving offer:', err);
            const errorMessage = err.response?.data?.message || 'Failed to approve offer';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!validateForm('REJECT')) {
            showError('Please provide rejection reason');
            return;
        }

        setLoading(true);

        try {
            await financeService.accountsPayable.offerReviews.review({
                ...formData,
                action: 'REJECT'
            });
            showSuccess('Offer rejected successfully');
            onSubmit();
        } catch (err) {
            console.error('Error rejecting offer:', err);
            const errorMessage = err.response?.data?.message || 'Failed to reject offer';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
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

    const merchants = getMerchants();
    const totalItems = fullOfferData.offerItems?.length || 0;
    const warehouseName = fullOfferData?.requestOrder?.requesterName || 'N/A';
    const siteName = fullOfferData?.warehouseDetails?.site?.name || 'N/A';

    return (
        <div className="modal-overlay">
            <div className="modal-container offer-review-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiPackage />
                        <h2>Review Offer - {fullOfferData.title || offer.offerNumber}</h2>
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

                    {/* Offer Items Summary */}
                    <div className="offer-items-section">
                        <div className="section-header">
                            <FiPackage />
                            <h3>Offer Items ({totalItems})</h3>
                        </div>
                        <div className="items-table-wrapper">
                            <table className="items-table">
                                <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Merchant</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                </tr>
                                </thead>
                                <tbody>
                                {fullOfferData.offerItems && fullOfferData.offerItems.length > 0 ? (
                                    fullOfferData.offerItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div className="item-name">
                                                    {item.itemType?.name || item.requestOrderItem?.itemType?.name || 'N/A'}
                                                </div>
                                            </td>
                                            <td>{item.merchant?.name || 'N/A'}</td>
                                            <td>{item.quantity} {item.requestOrderItem?.itemType?.unit || ''}</td>
                                            <td>{formatCurrency(item.unitPrice)}</td>
                                            <td className="total-price">{formatCurrency(item.totalPrice)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-items">No items in this offer</td>
                                    </tr>
                                )}
                                </tbody>
                                <tfoot>
                                <tr className="total-row">
                                    <td colSpan="4"><strong>Total Amount</strong></td>
                                    <td className="total-amount">
                                        <strong>{formatCurrency(offer.totalAmount)}</strong>
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="financial-details-section">
                        <div className="section-header">
                            <FiDollarSign />
                            <h3>Financial Details</h3>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Total Amount:</label>
                                <span className="amount">{formatCurrency(offer.totalAmount)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Currency:</label>
                                <span>{offer.currency}</span>
                            </div>
                            {/*<div className="detail-item">*/}
                            {/*    <label>Status:</label>*/}
                            {/*    <span>{fullOfferData.status || 'N/A'}</span>*/}
                            {/*</div>*/}
                        </div>
                    </div>

                    {/* Review Form Fields */}
                    <div className="review-form-section">
                        <h3>Review Details</h3>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Budget Category <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="budgetCategory"
                                value={formData.budgetCategory}
                                onChange={handleChange}
                                className={errors.budgetCategory ? 'error' : ''}
                                placeholder="e.g., Operations, Marketing, IT"
                            />
                            {errors.budgetCategory && <span className="error-text">{errors.budgetCategory}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Expected Payment Date
                            </label>
                            <input
                                type="date"
                                name="expectedPaymentDate"
                                value={formData.expectedPaymentDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Approval Notes
                            </label>
                            <textarea
                                name="approvalNotes"
                                value={formData.approvalNotes}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Optional notes about this approval..."
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Rejection Reason (if rejecting)
                            </label>
                            <textarea
                                name="rejectionReason"
                                value={formData.rejectionReason}
                                onChange={handleChange}
                                className={errors.rejectionReason ? 'error' : ''}
                                rows="3"
                                placeholder="Provide reason if you plan to reject this offer..."
                            />
                            {errors.rejectionReason && <span className="error-text">{errors.rejectionReason}</span>}
                        </div>
                    </div>
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
                        className="btn-danger"
                        onClick={handleReject}
                        disabled={loading}
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <FaTimesCircle />
                                <span>Reject Offer</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-success"
                        onClick={handleApprove}
                        disabled={loading}
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <FaCheckCircle />
                                <span>Approve Offer</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfferReviewForm;