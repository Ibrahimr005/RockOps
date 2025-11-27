import React from 'react';
import { FaBuilding, FaMapMarkerAlt, FaIdCard, FaPhone, FaEnvelope, FaCalendar, FaStar, FaTruck, FaFileInvoiceDollar, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './OverviewTab.scss';

const OverviewTab = ({ merchant, formatDate, getSiteName, stats = {} }) => {

    const getReliabilityRating = (score) => {
        if (!score) return { label: 'Not Rated', class: 'not-rated' };
        if (score >= 4.5) return { label: 'Excellent', class: 'excellent' };
        if (score >= 3.5) return { label: 'Good', class: 'good' };
        if (score >= 2.5) return { label: 'Fair', class: 'fair' };
        return { label: 'Poor', class: 'poor' };
    };

    const reliabilityRating = getReliabilityRating(merchant.reliabilityScore);

    return (
        <div className="overview-tab">
            {/* Merchant Header Card */}


       

            {/* Information Sections */}
            <div className="overview-info-sections">
                {/* Contact Information */}
                <div className="info-section">
                    <div className="section-header">
                        <FaPhone />
                        <h3>Contact Information</h3>
                    </div>
                    <div className="info-content">
                        <div className="info-row">
                            <label>Contact Person</label>
                            <span>{merchant.contactPersonName || 'Not specified'}</span>
                        </div>
                        <div className="info-row">
                            <label>Email Address</label>
                            <span className="info-link">
                                {merchant.contactEmail ? (
                                    <a href={`mailto:${merchant.contactEmail}`}>{merchant.contactEmail}</a>
                                ) : 'Not specified'}
                            </span>
                        </div>
                        <div className="info-row">
                            <label>Primary Phone</label>
                            <span className="info-link">
                                {merchant.contactPhone ? (
                                    <a href={`tel:${merchant.contactPhone}`}>{merchant.contactPhone}</a>
                                ) : 'Not specified'}
                            </span>
                        </div>
                        {merchant.contactSecondPhone && (
                            <div className="info-row">
                                <label>Secondary Phone</label>
                                <span className="info-link">
                                    <a href={`tel:${merchant.contactSecondPhone}`}>{merchant.contactSecondPhone}</a>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Business Details */}
                <div className="info-section">
                    <div className="section-header">
                        <FaBuilding />
                        <h3>Business Details</h3>
                    </div>
                    <div className="info-content">
                        <div className="info-row">
                            <label>Business Address</label>
                            <span>{merchant.address || 'Not specified'}</span>
                        </div>
                        <div className="info-row">
                            <label>Merchant Type</label>
                            <span className="merchant-type-text">{merchant.merchantType || 'Not specified'}</span>
                        </div>
                        <div className="info-row">
                            <label>Tax ID Number</label>
                            <span className="tax-id">{merchant.taxIdentificationNumber || 'Not specified'}</span>
                        </div>
                        {merchant.preferredPaymentMethod && (
                            <div className="info-row">
                                <label>Preferred Payment</label>
                                <span>{merchant.preferredPaymentMethod.replace(/_/g, ' ')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Metrics */}
                {merchant.reliabilityScore && (
                    <div className="info-section">
                        <div className="section-header">
                            <FaStar />
                            <h3>Performance Metrics</h3>
                        </div>
                        <div className="info-content">
                            <div className="info-row">
                                <label>Reliability Score</label>
                                <span className={`performance-value ${reliabilityRating.class}`}>
                                    {merchant.reliabilityScore.toFixed(1)} / 5.0
                                </span>
                            </div>
                            {merchant.averageDeliveryTime && (
                                <div className="info-row">
                                    <label>Average Delivery Time</label>
                                    <span>{merchant.averageDeliveryTime} days</span>
                                </div>
                            )}
                            <div className="info-row">
                                <label>Member Since</label>
                                <span>{formatDate(merchant.createdAt)}</span>
                            </div>
                            <div className="info-row">
                                <label>Last Updated</label>
                                <span>{formatDate(merchant.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Additional Notes */}
                {merchant.notes && (
                    <div className="info-section full-width">
                        <div className="section-header">
                            <FaFileInvoiceDollar />
                            <h3>Additional Notes</h3>
                        </div>
                        <div className="info-content">
                            <div className="notes-content">
                                {merchant.notes}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewTab;