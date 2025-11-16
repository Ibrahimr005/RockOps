import React from 'react';
import { FiShoppingBag, FiCalendar, FiUser, FiAlignLeft } from 'react-icons/fi';

const OfferTab = ({ offer }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="offer-tab">
            <div className="offer-section">
                <h3 className="section-title">
                    <FiShoppingBag />
                    Offer Details
                </h3>
                <div className="info-grid">
                    <div className="info-item">
                        <FiShoppingBag className="info-icon" />
                        <div className="info-content">
                            <span className="info-label">Title</span>
                            <span className="info-value">{offer.title}</span>
                        </div>
                    </div>

                    {offer.createdBy && (
                        <div className="info-item">
                            <FiUser className="info-icon" />
                            <div className="info-content">
                                <span className="info-label">Created By</span>
                                <span className="info-value">{offer.createdBy}</span>
                            </div>
                        </div>
                    )}

                    {offer.createdAt && (
                        <div className="info-item">
                            <FiCalendar className="info-icon" />
                            <div className="info-content">
                                <span className="info-label">Created Date</span>
                                <span className="info-value">{formatDate(offer.createdAt)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {offer.description && (
                    <div className="description-section">
                        <div className="description-header">
                            <FiAlignLeft />
                            <span>Description</span>
                        </div>
                        <div className="description-content">
                            {offer.description}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfferTab;