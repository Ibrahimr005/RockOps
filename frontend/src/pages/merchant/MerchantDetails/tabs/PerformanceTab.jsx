import React from 'react';
import "../MerchantDetails.scss"

const PerformanceTab = ({ merchant, formatDate }) => {
    const getDeliveryTimeDisplay = () => {
        if (merchant.averageDeliveryTime) {
            return `${merchant.averageDeliveryTime} days`;
        }
        return 'Not specified';
    };

    return (
        <div className="merchant-details-tab-panel">
            <h3>Performance & Business</h3>

            <div className="merchant-details-terms-grid">
                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Reliability Score</div>
                    <div className="merchant-details-term-value">
                        {merchant.reliabilityScore ? `${merchant.reliabilityScore}/5.0` : 'Not rated'}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Average Delivery Time</div>
                    <div className="merchant-details-term-value">
                        {getDeliveryTimeDisplay()}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Payment Method</div>
                    <div className="merchant-details-term-value">
                        {merchant.preferredPaymentMethod || 'Not specified'}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Last Order</div>
                    <div className="merchant-details-term-value">
                        {merchant.lastOrderDate ? formatDate(merchant.lastOrderDate) : 'No orders'}
                    </div>
                </div>
            </div>

            <div className="merchant-details-info-grid">
                <div className="merchant-details-info-group">
                    <h4>Performance Metrics</h4>
                    <div className="merchant-details-info-item">
                        <label>Reliability Score</label>
                        <p>{merchant.reliabilityScore ? `${merchant.reliabilityScore} out of 5.0` : 'Not rated'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Average Delivery Time</label>
                        <p>{merchant.averageDeliveryTime ? `${merchant.averageDeliveryTime} days` : 'Not tracked'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Last Order Date</label>
                        <p>{formatDate(merchant.lastOrderDate)}</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Business Preferences</h4>
                    <div className="merchant-details-info-item">
                        <label>Preferred Payment Method</label>
                        <p>{merchant.preferredPaymentMethod || 'Not specified'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Merchant Type</label>
                        <p>{merchant.merchantType || 'Not specified'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Business Registration</label>
                        <p>{merchant.taxIdentificationNumber ? 'Registered' : 'Not registered'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceTab;