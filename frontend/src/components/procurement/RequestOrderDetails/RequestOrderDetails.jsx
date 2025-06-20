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
        <div className="procurement-request-summary-card">
            <h4>Request Order Details</h4>

            <div className="procurement-request-details-grid">
                <div className="request-detail-item">
                    <div className="request-detail-icon">
                        <FiUser size={18} />
                    </div>
                    <div className="request-detail-content">
                        <span className="request-detail-label">Requester</span>
                        <span className="request-detail-value">{requestOrder.requesterName || 'Unknown'}</span>
                    </div>
                </div>

                <div className="request-detail-item">
                    <div className="request-detail-icon">
                        <FiCalendar size={18} />
                    </div>
                    <div className="request-detail-content">
                        <span className="request-detail-label">Request Date</span>
                        <span className="request-detail-value">{new Date(requestOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                {requestOrder.description && (
                    <div className="request-detail-item">
                        <div className="request-detail-icon">
                            <FiFileText size={18} />
                        </div>
                        <div className="request-detail-content">
                            <span className="request-detail-label">Description</span>
                            <p className="request-detail-value description-text">
                                {requestOrder.description}
                            </p>
                        </div>
                    </div>
                )}

                <div className="request-detail-item">
                    <div className="request-detail-icon">
                        <FiCalendar size={18} />
                    </div>
                    <div className="request-detail-content">
                        <span className="request-detail-label">Deadline</span>
                        <span className="request-detail-value">{new Date(requestOrder.deadline).toLocaleDateString()}</span>
                    </div>
                </div>

                {requestOrder.priority && (
                    <div className="request-detail-item">
                        <div className="request-detail-icon">
                            <FiFlag size={18} />
                        </div>
                        <div className="request-detail-content">
                            <span className="request-detail-label">Priority</span>
                            <span className={`request-detail-value request-priority ${requestOrder.priority.toLowerCase()}`}>
                                {requestOrder.priority}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestOrderDetails;