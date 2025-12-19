import React, { useState, useEffect } from 'react';
import './AssetValuesView.scss';
import FinanceAssetCard from '../../../../components/Finance/FinanceAssetCard/FinanceAssetCard.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';
import { FiMapPin, FiPackage, FiTool, FiArchive } from 'react-icons/fi';

const AssetValuesView = ({ showSnackbar }) => {
    const [sitesData, setSitesData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [expandedSite, setExpandedSite] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);

    const [warehousesData, setWarehousesData] = useState([]);
    const [expandedWarehouses, setExpandedWarehouses] = useState([]);
    const [warehouseTransactions, setWarehouseTransactions] = useState({});
    const [warehouseBreakdowns, setWarehouseBreakdowns] = useState({});
    const [transactionsLoading, setTransactionsLoading] = useState({});

    useEffect(() => {
        fetchAllSiteBalances();
    }, []);

    const fetchAllSiteBalances = async () => {
        setLoading(true);
        try {
            const data = await inventoryValuationService.getAllSiteBalances();
            setSitesData(data);
        } catch (error) {
            console.error('Failed to fetch site balances:', error);
            showSnackbar('Failed to load site balances', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewCategory = async (siteId, category) => {
        if (expandedSite === siteId && expandedCategory === category) {
            setExpandedSite(null);
            setExpandedCategory(null);
            setWarehousesData([]);
            setExpandedWarehouses([]);
            setWarehouseTransactions({});
            setWarehouseBreakdowns({});
            return;
        }

        setExpandedSite(siteId);
        setExpandedCategory(category);
        setExpandedWarehouses([]);
        setWarehouseTransactions({});
        setWarehouseBreakdowns({});

        if (category === 'warehouses') {
            setLoading(true);
            try {
                const data = await inventoryValuationService.getSiteBalance(siteId);
                setWarehousesData(data.warehouses || []);
            } catch (error) {
                console.error('Failed to fetch warehouse balances:', error);
                showSnackbar('Failed to load warehouse balances', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleWarehouseExpand = async (warehouseId) => {
        if (expandedWarehouses.includes(warehouseId)) {
            setExpandedWarehouses(prev => prev.filter(id => id !== warehouseId));
            setWarehouseTransactions(prev => {
                const newTransactions = { ...prev };
                delete newTransactions[warehouseId];
                return newTransactions;
            });
            setWarehouseBreakdowns(prev => {
                const newBreakdowns = { ...prev };
                delete newBreakdowns[warehouseId];
                return newBreakdowns;
            });
            return;
        }

        setExpandedWarehouses(prev => [...prev, warehouseId]);

        if (warehouseTransactions[warehouseId] && warehouseBreakdowns[warehouseId]) {
            return;
        }

        setTransactionsLoading(prev => ({ ...prev, [warehouseId]: true }));
        try {
            // Fetch real item breakdown
            const breakdown = await inventoryValuationService.getWarehouseItemBreakdown(warehouseId);
            setWarehouseBreakdowns(prev => ({
                ...prev,
                [warehouseId]: breakdown
            }));

            // Fetch real transaction history
            const transactions = await inventoryValuationService.getWarehouseTransactionHistory(warehouseId);

            // Filter only completed transactions (ACCEPTED or REJECTED)
            const completedTransactions = transactions.filter(tx =>
                tx.status === 'ACCEPTED' || tx.status === 'REJECTED'
            );

            setWarehouseTransactions(prev => ({
                ...prev,
                [warehouseId]: completedTransactions
            }));
        } catch (error) {
            console.error('Failed to fetch warehouse data:', error);
            showSnackbar('Failed to load warehouse data', 'error');
        } finally {
            setTransactionsLoading(prev => ({ ...prev, [warehouseId]: false }));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const transactionColumns = [
        {
            accessor: 'senderName',
            header: 'SENDER',
            width: '180px',
            render: (row) => (
                <div className="entity-cell">
                    <span className="entity-name">{row.senderName}</span>
                </div>
            )
        },
        {
            accessor: 'receiverName',
            header: 'RECEIVER',
            width: '180px',
            render: (row) => (
                <div className="entity-cell">
                    <span className="entity-name">{row.receiverName}</span>
                </div>
            )
        },

        {
            accessor: 'itemName',
            header: 'ITEM',
            width: '220px',
            render: (row) => <span className="item-name">{row.itemName}</span>
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="quantity-text">
                    {row.quantity} {row.measuringUnit}
                </span>
            )
        },
        {
            accessor: 'unitPrice',
            header: 'UNIT PRICE',
            width: '120px',
            render: (row) => (
                <span className="price-text">
                    {row.unitPrice ? `${row.unitPrice.toFixed(2)} EGP` : '—'}
                </span>
            )
        },
        {
            accessor: 'totalValue',
            header: 'TOTAL VALUE',
            width: '150px',
            render: (row) => {
                // Find current warehouse from expanded warehouses
                const currentWarehouse = warehousesData.find(w =>
                    expandedWarehouses.includes(w.warehouseId)
                );

                // Check if current warehouse is the receiver (gaining value)
                const isGaining = currentWarehouse && row.receiverName === currentWarehouse.warehouseName;

                if (!row.totalValue) {
                    return <span className="value-amount">—</span>;
                }

                return (
                    <div className={`value-impact ${isGaining ? 'positive' : 'negative'}`}>
                <span className="value-arrow">
                    {isGaining ? '↑' : '↓'}
                </span>
                        <span className="value-amount">
                    {row.totalValue.toFixed(2)} EGP
                </span>
                    </div>
                );
            }
        },
        {
            accessor: 'status',
            header: 'STATUS',
            width: '120px',
            render: (row) => (
                <span className={`status-badge3 ${row.status.toLowerCase()}`}>
                    {row.status}
                </span>
            )
        }
    ];

    return (
        <div className="asset-values-view">
            {loading && !expandedSite ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading site balances...</p>
                </div>
            ) : (
                <div className="sites-section">
                    <div className="sites-section-header">
                        <h3 className="sites-section-title">
                            <FiMapPin size={16} />
                            Sites
                        </h3>
                        <span className="sites-section-count">{sitesData.length} Total</span>
                    </div>

                    <div className="sites-list">
                        {sitesData.map((site, siteIndex) => (
                            <React.Fragment key={site.siteId}>
                                <div className="site-item">
                                    {/* Site Card */}
                                    <FinanceAssetCard
                                        title={site.siteName}
                                        subtitle="Asset Categories"
                                        value={site.totalValue?.toFixed(2) || '0.00'}
                                        icon={FiMapPin}
                                        variant="site"
                                        showValueLabel={true}
                                        categoryBreakdown={[
                                            {
                                                label: 'Warehouses',
                                                icon: FiPackage,
                                                count: site.totalWarehouses || 0,
                                                value: (site.totalValue * 0.6).toFixed(2),
                                                onViewDetails: () => handleViewCategory(site.siteId, 'warehouses'),
                                                disabled: false,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'warehouses'
                                            },
                                            {
                                                label: 'Equipment',
                                                icon: FiTool,
                                                count: 3,
                                                value: '475,000.00',
                                                onViewDetails: () => handleViewCategory(site.siteId, 'equipment'),
                                                disabled: true,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'equipment'
                                            },
                                            {
                                                label: 'Fixed Assets',
                                                icon: FiArchive,
                                                count: 2,
                                                value: '1,970,000.00',
                                                onViewDetails: () => handleViewCategory(site.siteId, 'fixedAssets'),
                                                disabled: true,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'fixedAssets'
                                            }
                                        ]}
                                    />

                                    {/* Expanded Category */}
                                    {expandedSite === site.siteId && expandedCategory === 'warehouses' && (
                                        <div className="category-expanded">
                                            <div className="category-section-header">
                                                <h3 className="category-section-title">
                                                    <FiPackage size={16} />
                                                    Warehouses
                                                </h3>
                                                <span className="category-section-count">{warehousesData.length} Total</span>
                                            </div>

                                            <div className="warehouses-list">
                                                {warehousesData.map((warehouse, warehouseIndex) => (
                                                    <React.Fragment key={warehouse.warehouseId}>
                                                        <div className="warehouse-item">
                                                            <FinanceAssetCard
                                                                title={warehouse.warehouseName}
                                                                subtitle={`${warehouse.totalItems || 0} items`}
                                                                value={warehouse.totalValue?.toFixed(2) || '0.00'}
                                                                icon={FiPackage}
                                                                variant="nested"
                                                                size="compact"
                                                                showValueLabel={true}
                                                                badge={
                                                                    warehouse.pendingApprovalCount > 0
                                                                        ? {
                                                                            text: `${warehouse.pendingApprovalCount} Pending`,
                                                                            variant: 'warning'
                                                                        }
                                                                        : null
                                                                }
                                                                isExpanded={expandedWarehouses.includes(warehouse.warehouseId)}
                                                                onExpand={() => handleWarehouseExpand(warehouse.warehouseId)}
                                                            />

                                                            {/* Value Breakdown - Only When Expanded */}
                                                            {expandedWarehouses.includes(warehouse.warehouseId) && (
                                                                <>
                                                                    <div className="value-breakdown-section">
                                                                        <div className="breakdown-header">
                                                                            <span className="breakdown-title">Value Composition</span>
                                                                        </div>

                                                                        {transactionsLoading[warehouse.warehouseId] ? (
                                                                            <div className="loading-state">
                                                                                <div className="spinner"></div>
                                                                                <p>Loading breakdown...</p>
                                                                            </div>
                                                                        ) : warehouseBreakdowns[warehouse.warehouseId]?.length > 0 ? (
                                                                            <div className="breakdown-grid">
                                                                                {warehouseBreakdowns[warehouse.warehouseId].map((item, index) => (
                                                                                    <div key={index} className="breakdown-item">
                                                                                        <div className="breakdown-item-header">
                                                                                            <span className="item-name">{item.itemName}</span>
                                                                                            <span className="item-value">{item.totalValue.toLocaleString()} EGP</span>
                                                                                        </div>
                                                                                        <div className="breakdown-item-details">
                                                                                            <span className="item-quantity">{item.quantity} {item.measuringUnit}</span>
                                                                                            <span className="item-separator">×</span>
                                                                                            <span className="item-unit-price">{item.unitPrice.toFixed(2)} EGP</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="empty-breakdown">
                                                                                <p>No items in this warehouse</p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Transaction History */}
                                                                    <div className="transactions-section">
                                                                        <div className="transactions-header">
                                                                            <span className="transactions-title">Transaction History</span>
                                                                        </div>

                                                                        <div className="transactions-table-wrapper">
                                                                            <DataTable
                                                                                data={warehouseTransactions[warehouse.warehouseId] || []}
                                                                                columns={transactionColumns}
                                                                                loading={transactionsLoading[warehouse.warehouseId] || false}
                                                                                tableTitle=""
                                                                                defaultItemsPerPage={5}
                                                                                itemsPerPageOptions={[5, 10, 15]}
                                                                                showSearch={true}
                                                                                showFilters={true}
                                                                                filterableColumns={[
                                                                                    { accessor: 'senderName', header: 'Sender' },
                                                                                    { accessor: 'receiverName', header: 'Receiver' },

                                                                                    { accessor: 'itemName', header: 'Item' },
                                                                                    { accessor: 'status', header: 'Status' }
                                                                                ]}
                                                                                className="transactions-table"
                                                                                emptyMessage="No transactions found"
                                                                                showExportButton={true}
                                                                                exportButtonText="Export"
                                                                                exportFileName={`${warehouse.warehouseName}_transactions`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Warehouse Separator */}
                                                        {warehouseIndex < warehousesData.length - 1 && (
                                                            <div className="warehouse-separator"></div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Coming Soon Categories */}
                                    {expandedSite === site.siteId && expandedCategory === 'equipment' && (
                                        <div className="category-expanded coming-soon">
                                            <div className="coming-soon-message">
                                                <FiTool size={24} />
                                                <span>Equipment tracking coming soon</span>
                                            </div>
                                        </div>
                                    )}

                                    {expandedSite === site.siteId && expandedCategory === 'fixedAssets' && (
                                        <div className="category-expanded coming-soon">
                                            <div className="coming-soon-message">
                                                <FiArchive size={24} />
                                                <span>Fixed assets management coming soon</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Site Separator */}
                                {siteIndex < sitesData.length - 1 && (
                                    <div className="site-separator"></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetValuesView;