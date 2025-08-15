import React, {useEffect} from "react";
import "./MerchantViewModal.scss";

const MerchantViewModal = ({ merchant, isOpen, onClose }) => {
    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        if (isOpen) {
            // Add the modal-open class
            document.body.classList.add('modal-open');
        }

        // Cleanup function - this runs when the component unmounts or when isOpen changes
        return () => {
            // Simply remove the class and let CSS handle the rest
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);

    // Early return AFTER useEffect so cleanup can run
    if (!isOpen || !merchant) return null;

    // Get merchant type badge class
    const getTypeClass = (type) => {
        return `merchant-detail-modal-type-badge ${type?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    };

    return (
        <div className="merchant-detail-modal-overlay" onClick={onClose}>
            <div className="merchant-detail-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="merchant-detail-modal-header">
                    <div className="merchant-detail-modal-header-content">
                        <h2 className="merchant-detail-modal-title">{merchant.name}</h2>
                        <div className={getTypeClass(merchant.merchantType)}>
                            {merchant.merchantType || 'Unknown Type'}
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="merchant-detail-modal-content">
                    {/* Contact Information Section */}
                    <div className="merchant-detail-modal-content-section">
                        <h3 className="merchant-detail-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Contact Information
                        </h3>
                        <div className="merchant-detail-modal-overview-grid">
                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Contact Person</span>
                                    <span className="merchant-detail-modal-value">{merchant.contactPersonName || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Email</span>
                                    <span className="merchant-detail-modal-value">{merchant.contactEmail || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Primary Phone</span>
                                    <span className="merchant-detail-modal-value">{merchant.contactPhone || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Secondary Phone</span>
                                    <span className="merchant-detail-modal-value">{merchant.contactSecondPhone || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item merchant-detail-modal-full-width">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Address</span>
                                    <span className="merchant-detail-modal-value">{merchant.address || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Information Section */}
                    <div className="merchant-detail-modal-content-section">
                        <h3 className="merchant-detail-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                            Business Information
                        </h3>
                        <div className="merchant-detail-modal-overview-grid">
                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10,9 9,9 8,9"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Tax ID</span>
                                    <span className="merchant-detail-modal-value">{merchant.taxIdentificationNumber || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="3" width="15" height="13"/>
                                        <path d="M16 8h4v11H6"/>
                                        <circle cx="10" cy="8.5" r="2"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Payment Method</span>
                                    <span className="merchant-detail-modal-value">{merchant.preferredPaymentMethod || "N/A"}</span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Site</span>
                                    <span className="merchant-detail-modal-value">{merchant.site ? merchant.site.name : "None"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics Section */}
                    <div className="merchant-detail-modal-content-section">
                        <h3 className="merchant-detail-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                            </svg>
                            Performance Metrics
                        </h3>
                        <div className="merchant-detail-modal-overview-grid">
                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12,2 15.09,8.26 22,9 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9 8.91,8.26"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Reliability Score</span>
                                    <div className="merchant-detail-modal-reliability-container">
                                        {merchant.reliabilityScore ? (
                                            <div className="merchant-detail-modal-reliability-score">
                                                <div className="merchant-detail-modal-score-bar">
                                                    <div
                                                        className="merchant-detail-modal-score-fill"
                                                        style={{ width: `${(merchant.reliabilityScore / 10) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="merchant-detail-modal-score-text">
                                                    {merchant.reliabilityScore.toFixed(1)}/10
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="merchant-detail-modal-value">Not Rated</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Avg Delivery Time</span>
                                    <span className="merchant-detail-modal-value">
                                        {merchant.averageDeliveryTime ? `${merchant.averageDeliveryTime} days` : "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="merchant-detail-modal-overview-item">
                                <div className="merchant-detail-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div className="merchant-detail-modal-overview-content">
                                    <span className="merchant-detail-modal-label">Last Order Date</span>
                                    <span className="merchant-detail-modal-value">{formatDate(merchant.lastOrderDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Categories Section */}
                    {merchant.itemCategories && merchant.itemCategories.length > 0 && (
                        <div className="merchant-detail-modal-content-section">
                            <h3 className="merchant-detail-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                </svg>
                                Item Categories
                            </h3>
                            <div className="merchant-detail-modal-categories-grid">
                                {merchant.itemCategories.map((category, index) => (
                                    <div key={index} className="merchant-detail-modal-category-card">
                                        <div className="merchant-detail-modal-category-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                                            </svg>
                                        </div>
                                        <span className="merchant-detail-modal-category-name">{category.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    {merchant.notes && (
                        <div className="merchant-detail-modal-content-section">
                            <h3 className="merchant-detail-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                                Notes
                            </h3>
                            <div className="merchant-detail-modal-notes-box">
                                <p className="merchant-detail-modal-notes-text">{merchant.notes}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MerchantViewModal;