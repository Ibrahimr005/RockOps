import React, { useState, useEffect } from 'react';
import { FiTruck, FiPackage, FiDollarSign, FiUser, FiPhone, FiFileText, FiCheckCircle, FiRotateCcw, FiFilter, FiCheck, FiChevronUp } from 'react-icons/fi';
import { logisticsService } from '../../../../../services/procurement/logisticsService';
import './LogisticsTab.scss';

const LogisticsTab = ({ purchaseOrder, onError }) => {
    const [logistics, setLogistics] = useState([]);
    const [returnLogistics, setReturnLogistics] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState(['po', 'return']); // Both selected by default

    useEffect(() => {
        if (purchaseOrder?.id) {
            fetchLogistics();
        }
    }, [purchaseOrder?.id]);

    const fetchLogistics = async () => {
        setIsLoading(true);
        try {
            // Fetch PO logistics
            const poLogisticsData = await logisticsService.getByPurchaseOrder(purchaseOrder.id);

            // Fetch Return logistics for this PO
            const returnLogisticsData = await logisticsService.getReturnLogisticsByPurchaseOrder(purchaseOrder.id);

            setLogistics(poLogisticsData);
            setReturnLogistics(returnLogisticsData);
        } catch (error) {
            console.error('Error fetching logistics:', error);
            if (onError) {
                onError('Failed to load logistics data');
            }
        } finally {
            setIsLoading(false);
        }
    };
    const handleFilterChange = (filterId) => {
        setSelectedFilters(prev => {
            if (prev.includes(filterId)) {
                return prev.filter(id => id !== filterId);
            } else {
                return [...prev, filterId];
            }
        });
    };

    const handleSelectAll = () => {
        setSelectedFilters(['po', 'return']);
    };

    const handleClearAll = () => {
        setSelectedFilters([]);
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

    // Filter logistics based on selection
    const filteredPOLogistics = selectedFilters.includes('po') ? logistics : [];
    const filteredReturnLogistics = selectedFilters.includes('return') ? returnLogistics : [];
    const allFilteredLogistics = [...filteredPOLogistics, ...filteredReturnLogistics];

    // Calculate total allocated cost
    const totalAllocatedCost = allFilteredLogistics.reduce((sum, entry) =>
        sum + parseFloat(entry.allocatedCost || 0), 0
    );

    const filterItems = [
        { id: 'po', name: 'Purchase Order Logistics' },
        { id: 'return', name: 'Purchase Order Return Logistics' }
    ];

    const selectedCount = selectedFilters.length;
    const totalCount = filterItems.length;
    const hasActiveFilters = selectedCount > 0 && selectedCount < totalCount;

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
                        <div className="summary-value">{allFilteredLogistics.length}</div>
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
            {allFilteredLogistics.length > 0 ? (
                <div className="logistics-section">
                    <div className="section-header-with-filter">
                        <div className="section-title">
                            <FiTruck />
                            Logistics Entries ({allFilteredLogistics.length})
                        </div>
                        <button
                            className={`logistics-filter-btn ${isFilterOpen ? 'logistics-filter-btn--active' : ''}`}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <FiFilter />
                            {hasActiveFilters && (
                                <span className="logistics-filter-count">
                                    {selectedCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Panel */}
                    {isFilterOpen && (
                        <div className="logistics-filter-panel">
                            <div className="logistics-filter-header">
                                <h4>
                                    <FiFilter size={16} />
                                    Filter Logistics
                                </h4>
                                <div className="filter-actions">
                                    <button
                                        type="button"
                                        className="filter-reset-btn"
                                        onClick={handleSelectAll}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        className="filter-reset-btn"
                                        onClick={handleClearAll}
                                        disabled={selectedCount === 0}
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        className={`filter-collapse-btn ${!isFilterOpen ? 'collapsed' : ''}`}
                                        onClick={() => setIsFilterOpen(false)}
                                    >
                                        <FiChevronUp />
                                    </button>
                                </div>
                            </div>
                            <div className="logistics-filter-list">
                                {filterItems.map((item) => (
                                    <div key={item.id} className="logistics-filter-item">
                                        <label className="filter-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedFilters.includes(item.id)}
                                                onChange={() => handleFilterChange(item.id)}
                                            />
                                            <span className="filter-checkbox-custom">
                                                <FiCheck size={12} />
                                            </span>
                                            <span className="filter-checkbox-text">{item.name}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="logistics-list">
                        {filteredPOLogistics.map(entry => (
                            <LogisticsCard key={entry.logisticsId} logistics={entry} type="po" currency={purchaseOrder.currency} />
                        ))}
                        {filteredReturnLogistics.map(entry => (
                            <LogisticsCard key={entry.logisticsId} logistics={entry} type="return" currency={purchaseOrder.currency} />
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
const LogisticsCard = ({ logistics, type, currency }) => {
    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING_APPROVAL': 'Pending Approval',
            'PENDING_PAYMENT': 'Pending Payment',
            'COMPLETED': 'Completed'
        };
        return displayMap[status] || status;
    };

    const getPaymentStatusDisplay = (paymentStatus) => {
        const displayMap = {
            'PENDING': 'Pending',
            'APPROVED': 'Approved',
            'PAID': 'Paid',
            'REJECTED': 'Rejected'
        };
        return displayMap[paymentStatus] || paymentStatus;
    };

    const isReturn = type === 'return';

    return (
        <div className={`logistics-card standalone ${isReturn ? 'logistics-card--return' : ''}`}>
            <div className="logistics-card-header">
                <div className="logistics-icon">
                    {isReturn ? <FiRotateCcw /> : <FiPackage />}
                </div>
                <div className="logistics-main-info">
                    <div className="logistics-number">{logistics.logisticsNumber}</div>
                    <div className="logistics-company">{logistics.merchantName}</div>

                </div>
                <div className="logistics-cost-info">
                    <div className="cost-label">Allocated Cost</div>
                    <div className="cost-value">
                        {currency} {parseFloat(logistics.allocatedCost).toFixed(2)}
                    </div>
                    <div className="cost-percentage">
                        ({parseFloat(logistics.costPercentage).toFixed(2)}% of total)
                    </div>
                </div>
            </div>

            <div className="logistics-card-body">
                <div className="logistics-details-container">
                    <div className="logistics-detail">
                        <FiTruck />
                        <div className="detail-content">
                            <span className="detail-label">Carrier</span>
                            <span className="detail-value">{logistics.carrierCompany}</span>
                        </div>
                    </div>

                    <div className="logistics-detail">
                        <FiUser />
                        <div className="detail-content">
                            <span className="detail-label">Driver</span>
                            <span className="detail-value">{logistics.driverName}</span>
                        </div>
                    </div>

                    {logistics.driverPhone && (
                        <div className="logistics-detail">
                            <FiPhone />
                            <div className="detail-content">
                                <span className="detail-label">Phone</span>
                                <span className="detail-value">{logistics.driverPhone}</span>
                            </div>
                        </div>
                    )}

                    {logistics.status && (
                        <div className="logistics-detail">
                            <FiCheckCircle />
                            <div className="detail-content">
                                <span className="detail-label">Status</span>
                                <span className={`detail-value detail-value--status-${logistics.status?.toLowerCase()}`}>
                                    {getStatusDisplay(logistics.status).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}

                    {logistics.paymentStatus && (
                        <div className="logistics-detail">
                            <FiDollarSign />
                            <div className="detail-content">
                                <span className="detail-label">Payment Status</span>
                                <span className={`detail-value detail-value--payment-${logistics.paymentStatus?.toLowerCase()}`}>
                                    {getPaymentStatusDisplay(logistics.paymentStatus).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {logistics.notes && (
                    <div className="logistics-detail notes">
                        <FiFileText />
                        <span className="detail-label">Notes</span>
                        <span className="detail-value">{logistics.notes}</span>
                    </div>
                )}

                {/* Items in this logistics entry */}
                {logistics.items && logistics.items.length > 0 && (
                    <div className="logistics-items">
                        <div className="items-header">
                            {isReturn ? 'Return Items' : 'Items'} ({logistics.items.length})
                        </div>
                        <div className="items-list">
                            {logistics.items.map(item => (
                                <div key={item.purchaseOrderItemId || item.purchaseOrderReturnItemId} className="item-tag">
                                    <div className="item-tag-main">
                                        {isReturn ? <FiRotateCcw size={14} /> : <FiPackage size={14} />}
                                        <span className="item-tag-name">{item.itemTypeName}</span>
                                    </div>
                                    <div className="item-tag-details">
                                        <span className="item-qty">
                                            {isReturn ? `Return: ${item.quantity}` : `${item.quantity} ${item.measuringUnit}`}
                                        </span>
                                        <span className="item-separator">•</span>
                                        <span className="item-price">
                                            {currency} {parseFloat(item.unitPrice).toFixed(2)}/unit
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