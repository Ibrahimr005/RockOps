import React from 'react';
import { FiFileText, FiCalendar, FiUser, FiClock, FiAlignLeft } from 'react-icons/fi';

const RequestOrderTab = ({ requestOrder }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="request-order-tab">
            <div className="request-section">
                <h3 className="section-title">
                    <FiFileText />
                    Request Order Details
                </h3>
                <div className="info-grid">
                    <div className="info-item">
                        <FiFileText className="info-icon" />
                        <div className="info-content">
                            <span className="info-label">Title</span>
                            <span className="info-value">{requestOrder.title}</span>
                        </div>
                    </div>

                    {requestOrder.createdBy && (
                        <div className="info-item">
                            <FiUser className="info-icon" />
                            <div className="info-content">
                                <span className="info-label">Created By</span>
                                <span className="info-value">{requestOrder.createdBy}</span>
                            </div>
                        </div>
                    )}

                    {requestOrder.createdAt && (
                        <div className="info-item">
                            <FiCalendar className="info-icon" />
                            <div className="info-content">
                                <span className="info-label">Created Date</span>
                                <span className="info-value">{formatDate(requestOrder.createdAt)}</span>
                            </div>
                        </div>
                    )}

                    <div className="info-item">
                        <FiUser className="info-icon" />
                        <div className="info-content">
                            <span className="info-label">Requester</span>
                            <span className="info-value">{requestOrder.requesterName}</span>
                        </div>
                    </div>

                    {requestOrder.deadline && (
                        <div className="info-item">
                            <FiClock className="info-icon" />
                            <div className="info-content">
                                <span className="info-label">Deadline</span>
                                <span className="info-value">{formatDate(requestOrder.deadline)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {requestOrder.description && (
                    <div className="description-section">
                        <div className="description-header">
                            <FiAlignLeft />
                            <span>Description</span>
                        </div>
                        <div className="description-content">
                            {requestOrder.description}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestOrderTab;