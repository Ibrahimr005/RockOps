import React from 'react';
import {
    FiUser,
    FiCalendar,
    FiFileText,
    FiFlag
} from 'react-icons/fi';
import './RequestOrderDetails.scss';

const RequestOrderDetails = ({ requestOrder }) => {
    if (!requestOrder) {
        return null;
    }

    return (
        <div className="r0-details-procurement-request-summary-card">
            <h4>Request Order Details</h4>

            <div className="r0-details-procurement-request-details-grid">
                <div className="r0-details-request-detail-item">
                    <div className="r0-details-request-detail-icon">
                        <FiUser size={18} />
                    </div>
                    <div className="r0-details-request-detail-content">
                        <span className="r0-details-request-detail-label">Requester</span>
                        <span className="r0-details-request-detail-value">{requestOrder.requesterName || 'Unknown'}</span>
                    </div>
                </div>

                <div className="r0-details-request-detail-item">
                    <div className="r0-details-request-detail-icon">
                        <FiCalendar size={18} />
                    </div>
                    <div className="r0-details-request-detail-content">
                        <span className="r0-details-request-detail-label">Request Date</span>
                        <span className="r0-details-request-detail-value">{new Date(requestOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="r0-details-request-detail-item">
                    <div className="r0-details-request-detail-icon">
                        <FiCalendar size={18} />
                    </div>
                    <div className="r0-details-request-detail-content">
                        <span className="r0-details-request-detail-label">Deadline</span>
                        <span className="r0-details-request-detail-value">{new Date(requestOrder.deadline).toLocaleDateString()}</span>
                    </div>
                </div>

                {requestOrder.priority && (
                    <div className="r0-details-request-detail-item">
                        <div className="r0-details-request-detail-icon">
                            <FiFlag size={18} />
                        </div>
                        <div className="r0-details-request-detail-content">
                            <span className="r0-details-request-detail-label">Priority</span>
                            <span className={`r0-details-request-detail-value r0-details-request-priority ${requestOrder.priority ? requestOrder.priority.toLowerCase() : ''}`}>
                                {requestOrder.priority}
                            </span>
                        </div>
                    </div>
                )}

                {/* Description moved to the end and given full width class */}
                {requestOrder.description && (
                    <div className="r0-details-request-detail-item r0-details-request-detail-item-full-width">
                        <div className="r0-details-request-detail-icon">
                            <FiFileText size={18} />
                        </div>
                        <div className="r0-details-request-detail-content">
                            <span className="r0-details-request-detail-label">Description</span>
                            <p className="r0-details-request-detail-value r0-details-description-text">
                                {requestOrder.description}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestOrderDetails;