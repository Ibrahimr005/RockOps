import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./MerchantDetails.scss";
import { merchantService } from '../../../services/merchantService';

const MerchantDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMerchantDetails = async () => {
            setLoading(true);
            try {
                const response = await merchantService.getById(id);
                const data = response.data;
                setMerchant(data);
            } catch (error) {
                console.error("Error fetching merchant details:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMerchantDetails();
    }, [id]);

    const goBack = () => {
        navigate(-1);
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="merchant-detail-container">
                <div className="merchant-detail-loading">
                    <div className="merchant-detail-spinner"></div>
                    <p>Loading merchant details...</p>
                </div>
            </div>
        );
    }

    if (error || !merchant) {
        return (
            <div className="merchant-detail-container">
                <div className="merchant-detail-error">
                    <h2>Error Loading Merchant</h2>
                    <p>{error || "Merchant not found"}</p>

                </div>
            </div>
        );
    }

    return (
        <div className="merchant-detail-container">
            <div className="merchant-detail-header">
                <h1>{merchant.name}</h1>
                <div className="merchant-type-badge">{merchant.merchantType}</div>
            </div>

            <div className="merchant-detail-content">
                <div className="merchant-detail-section">
                    <h2>Contact Information</h2>
                    <div className="merchant-detail-grid">
                        <div className="merchant-detail-item">
                            <label>Contact Person</label>
                            <p>{merchant.contactPersonName || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Email</label>
                            <p>{merchant.contactEmail || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Primary Phone</label>
                            <p>{merchant.contactPhone || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Secondary Phone</label>
                            <p>{merchant.contactSecondPhone || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Address</label>
                            <p>{merchant.address || "-"}</p>
                        </div>
                    </div>
                </div>

                <div className="merchant-detail-section">
                    <h2>Business Information</h2>
                    <div className="merchant-detail-grid">
                        <div className="merchant-detail-item">
                            <label>Tax ID</label>
                            <p>{merchant.taxIdentificationNumber || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Preferred Payment Method</label>
                            <p>{merchant.preferredPaymentMethod || "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Site</label>
                            <p>{merchant.site ? merchant.site.name : "None"}</p>
                        </div>
                    </div>
                </div>

                <div className="merchant-detail-section">
                    <h2>Performance Metrics</h2>
                    <div className="merchant-detail-grid">
                        <div className="merchant-detail-item">
                            <label>Reliability Score</label>
                            <div className="reliability-score">
                                {merchant.reliabilityScore ? (
                                    <div className="score-display">
                                        <div
                                            className="score-fill"
                                            style={{ width: `${(merchant.reliabilityScore / 5) * 100}%` }}
                                        ></div>
                                        <span>{merchant.reliabilityScore.toFixed(1)}</span>
                                    </div>
                                ) : (
                                    <p>Not Rated</p>
                                )}
                            </div>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Average Delivery Time</label>
                            <p>{merchant.averageDeliveryTime ? `${merchant.averageDeliveryTime} days` : "-"}</p>
                        </div>
                        <div className="merchant-detail-item">
                            <label>Last Order Date</label>
                            <p>{formatDate(merchant.lastOrderDate)}</p>
                        </div>
                    </div>
                </div>

                <div className="merchant-detail-section">
                    <h2>Item Categories</h2>
                    <div className="merchant-categories">
                        {merchant.itemCategories && merchant.itemCategories.length > 0 ? (
                            <div className="category-tags">
                                {merchant.itemCategories.map((category, index) => (
                                    <div className="category-tag" key={index}>
                                        {category.name}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No categories specified</p>
                        )}
                    </div>
                </div>

                <div className="merchant-detail-section">
                    <h2>Notes</h2>
                    <div className="merchant-notes">
                        {merchant.notes ? (
                            <p>{merchant.notes}</p>
                        ) : (
                            <p>No notes available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantDetails;