import React from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaMobileAlt } from 'react-icons/fa';
import "../MerchantDetails.scss"

const ContactDetailsTab = ({ merchant }) => {
    return (
        <div className="merchant-details-tab-panel">
            <h3>Contact Details</h3>

            <div className="merchant-details-contact-grid">
                <div className="merchant-details-contact-card">
                    <div className="merchant-details-contact-header">
                        <FaUser className="merchant-details-contact-icon" />
                        <h4>Contact Person</h4>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Full Name</div>
                        <div className="merchant-details-contact-value">
                            {merchant.contactPersonName || 'Not specified'}
                        </div>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Company</div>
                        <div className="merchant-details-contact-value">
                            {merchant.name || 'Not specified'}
                        </div>
                    </div>
                </div>

                <div className="merchant-details-contact-card">
                    <div className="merchant-details-contact-header">
                        <FaEnvelope className="merchant-details-contact-icon" />
                        <h4>Email</h4>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Email Address</div>
                        <div className="merchant-details-contact-value">
                            {merchant.contactEmail ? (
                                <a href={`mailto:${merchant.contactEmail}`}>
                                    {merchant.contactEmail}
                                </a>
                            ) : (
                                'Not specified'
                            )}
                        </div>
                    </div>
                </div>

                <div className="merchant-details-contact-card">
                    <div className="merchant-details-contact-header">
                        <FaPhone className="merchant-details-contact-icon" />
                        <h4>Phone Numbers</h4>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Primary Phone</div>
                        <div className="merchant-details-contact-value">
                            {merchant.contactPhone ? (
                                <a href={`tel:${merchant.contactPhone}`}>
                                    {merchant.contactPhone}
                                </a>
                            ) : (
                                'Not specified'
                            )}
                        </div>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Secondary Phone</div>
                        <div className="merchant-details-contact-value">
                            {merchant.contactSecondPhone ? (
                                <a href={`tel:${merchant.contactSecondPhone}`}>
                                    <FaMobileAlt style={{ marginRight: '0.5rem' }} />
                                    {merchant.contactSecondPhone}
                                </a>
                            ) : (
                                'Not specified'
                            )}
                        </div>
                    </div>
                </div>

                <div className="merchant-details-contact-card">
                    <div className="merchant-details-contact-header">
                        <FaMapMarkerAlt className="merchant-details-contact-icon" />
                        <h4>Address</h4>
                    </div>
                    <div className="merchant-details-contact-detail">
                        <div className="merchant-details-contact-label">Business Address</div>
                        <div className="merchant-details-contact-value">
                            {merchant.address || 'Not specified'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactDetailsTab;