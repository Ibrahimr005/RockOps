import React from 'react';
import "../MerchantDetails.scss"

const BasicInfoTab = ({ merchant, formatDate, getSiteName }) => {
    return (
        <div className="merchant-details-tab-panel">
            <h3>Basic Information</h3>

            <div className="merchant-details-info-grid">
                <div className="merchant-details-info-group">
                    <h4>Merchant Details</h4>
                    <div className="merchant-details-info-item">
                        <label>Merchant Name</label>
                        <p>{merchant.name || 'Not specified'}</p>
                    </div>

                    <div className="merchant-details-info-item">
                        <label>Merchant Type</label>
                        <p>{merchant.merchantType || 'Not specified'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Tax Identification Number</label>
                        <p>{merchant.taxIdentificationNumber || 'Not specified'}</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Location & Assignment</h4>
                    <div className="merchant-details-info-item">
                        <label>Business Address</label>
                        <p>{merchant.address || 'Not specified'}</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Assigned Site</label>
                        <p>{getSiteName()}</p>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default BasicInfoTab;