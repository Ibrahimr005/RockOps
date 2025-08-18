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
                        <label>Merchant ID</label>
                        <p>#{merchant.id}</p>
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

                <div className="merchant-details-info-group">
                    <h4>Categories & Services</h4>
                    <div className="merchant-details-info-item">
                        <label>Item Categories</label>
                        <div>
                            {merchant.itemCategories && merchant.itemCategories.length > 0 ? (
                                merchant.itemCategories.map((category, index) => (
                                    <span key={index} style={{
                                        display: 'inline-block',
                                        margin: '0.2rem',
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: 'var(--color-surface-hover)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.8rem'
                                    }}>
                                        {category.name || category}
                                    </span>
                                ))
                            ) : (
                                <p>No categories assigned</p>
                            )}
                        </div>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Notes</label>
                        <p>{merchant.notes || 'No additional notes'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicInfoTab;