import React, { useState, useEffect } from 'react';
import { FiTruck, FiPackage, FiDollarSign, FiUser, FiPhone, FiFileText } from 'react-icons/fi';
import { logisticsService } from '../../../../../services/procurement/logisticsService';
import './LogisticsTab.scss';

const LogisticsTab = ({ purchaseOrder, onError }) => {
    const [logistics, setLogistics] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (purchaseOrder?.id) {
            fetchLogistics();
        }
    }, [purchaseOrder?.id]);

    const fetchLogistics = async () => {
        setIsLoading(true);
        try {
            const logisticsData = await logisticsService.getByPurchaseOrder(purchaseOrder.id);
            setLogistics(logisticsData);
        } catch (error) {
            console.error('Error fetching logistics:', error);
            if (onError) {
                onError('Failed to load logistics data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="logistics-tab">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading logistics data...</p>
                </div>
            </div>
        );
    }

    // Calculate total allocated cost for this PO
    const totalAllocatedCost = logistics.reduce((sum, entry) =>
        sum + parseFloat(entry.allocatedCost || 0), 0
    );

    return (
        <div className="logistics-tab">
            {/* Summary Card */}
            <div className="logistics-summary-card">
                <div className="summary-header">
                    <h3 className="summary-title">
                        <FiDollarSign />
                        Logistics Cost Summary
                    </h3>
                </div>

                <div className="summary-grid">
                    <div className="summary-item">
                        <div className="summary-label">Total Entries</div>
                        <div className="summary-value">{logistics.length}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Allocated Cost</div>
                        <div className="summary-value logistics-cost">
                            {purchaseOrder.currency} {totalAllocatedCost.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logistics Entries */}
            {logistics.length > 0 ? (
                <div className="logistics-section">
                    <div className="section-title">
                        <FiTruck />
                        Logistics Entries ({logistics.length})
                    </div>

                    <div className="logistics-list">
                        {logistics.map(entry => (
                            <LogisticsCard key={entry.logisticsId} logistics={entry} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    <FiTruck size={48} />
                    <h3>No Logistics Entries</h3>
                    <p>No logistics have been allocated to this purchase order yet.</p>
                </div>
            )}
        </div>
    );
};

// Simplified Logistics Card Component (read-only)
const LogisticsCard = ({ logistics }) => {
    return (
        <div className="logistics-card standalone">
            <div className="logistics-card-header">
                <div className="logistics-icon">
                    <FiPackage />
                </div>
                <div className="logistics-main-info">
                    <div className="logistics-number">{logistics.logisticsNumber}</div>
                    <div className="logistics-company">{logistics.merchantName}</div>
                </div>
                <div className="logistics-cost-info">
                    <div className="cost-label">Allocated Cost</div>
                    <div className="cost-value">
                        {logistics.currency} {parseFloat(logistics.allocatedCost).toFixed(2)}
                    </div>
                    <div className="cost-percentage">
                        ({parseFloat(logistics.costPercentage).toFixed(2)}% of total)
                    </div>
                </div>
            </div>

            <div className="logistics-card-body">
                <div className="logistics-detail">
                    <FiTruck />
                    <span className="detail-label">Carrier:</span>
                    <span className="detail-value">{logistics.carrierCompany}</span>
                </div>

                <div className="logistics-detail">
                    <FiUser />
                    <span className="detail-label">Driver:</span>
                    <span className="detail-value">{logistics.driverName}</span>
                </div>

                {logistics.driverPhone && (
                    <div className="logistics-detail">
                        <FiPhone />
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{logistics.driverPhone}</span>
                    </div>
                )}

                {logistics.notes && (
                    <div className="logistics-detail notes">
                        <FiFileText />
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{logistics.notes}</span>
                    </div>
                )}

                {/* Items in this logistics entry */}
                {logistics.items && logistics.items.length > 0 && (
                    <div className="logistics-items">
                        <div className="items-header">Items ({logistics.items.length})</div>
                        <div className="items-list">
                            {logistics.items.map(item => (
                                <div key={item.purchaseOrderItemId} className="item-tag">
                                    <div className="item-tag-main">
                                        <FiPackage size={12} />
                                        <span className="item-tag-name">{item.itemTypeName}</span>
                                    </div>
                                    <div className="item-tag-details">
                        <span className="item-qty">
                            {item.quantity} {item.measuringUnit}
                        </span>
                                        <span className="item-separator">•</span>
                                        <span className="item-price">
                            {logistics.currency} {parseFloat(item.unitPrice).toFixed(2)}/unit
                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogisticsTab;