import React, { useState, useEffect } from 'react';
import './AssetValuesView.scss';
import SubPageHeader from '../../../../components/common/SubPageHeader/SubPageHeader';
import FinanceAssetCard from '../../../../components/finance/FinanceAssetCard/FinanceAssetCard.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';
import { equipmentFinanceService } from '../../../../services/finance/equipmentFinanceService.js';
import { siteService } from '../../../../services/siteService.js';
import { FiMapPin, FiPackage, FiTool, FiArchive, FiFilter } from 'react-icons/fi';
import siteimgg from "../../../../assets/imgs/siteimgg.jpg";

const AssetValuesView = ({ showSnackbar, selectedSiteIds = [] }) => {
    const [sitesData, setSitesData] = useState([]);
    const [loading, setLoading] = useState(false);



    const [filteredSitesData, setFilteredSitesData] = useState([]);

    const [expandedSite, setExpandedSite] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);

    // Warehouse states
    const [warehousesData, setWarehousesData] = useState([]);
    const [expandedWarehouses, setExpandedWarehouses] = useState([]);
    const [warehouseTransactions, setWarehouseTransactions] = useState({});
    const [warehouseBreakdowns, setWarehouseBreakdowns] = useState({});
    const [transactionsLoading, setTransactionsLoading] = useState({});

    // Equipment states
    const [equipmentData, setEquipmentData] = useState([]);
    const [expandedEquipment, setExpandedEquipment] = useState([]);
    const [equipmentFinancials, setEquipmentFinancials] = useState({});
    const [equipmentLoading, setEquipmentLoading] = useState({});


    const formatCurrency = (value) => {
        if (!value && value !== 0) return '0';
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const calculateWarehousesTotal = (site) => {
        if (!site.warehouses || site.warehouses.length === 0) {
            return 0;
        }
        return site.warehouses.reduce((sum, w) => sum + (w.totalValue || 0), 0);
    };

    useEffect(() => {
        fetchAllSiteBalances();
    }, []);

    const fetchAllSiteBalances = async () => {
        setLoading(true);
        try {
            const data = await inventoryValuationService.getAllSiteBalances();
            console.log('🔍 Site balances data:', data); // ADD THIS
            console.log('🔍 First site:', data[0]); // ADD THIS
            setSitesData(data);
            setFilteredSitesData(data);
        } catch (error) {
            console.error('Failed to fetch site balances:', error);
            showSnackbar('Failed to load site balances', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
// Filter logic - replace the existing useEffect
    useEffect(() => {
        if (selectedSiteIds.length === 0) {
            // No filter selected = show all
            setFilteredSitesData(sitesData);
        } else {
            const filtered = sitesData.filter(site =>
                selectedSiteIds.includes(site.siteId)
            );
            setFilteredSitesData(filtered);
        }
    }, [selectedSiteIds, sitesData]);





    const handleViewCategory = async (siteId, category) => {
        if (expandedSite === siteId && expandedCategory === category) {
            setExpandedSite(null);
            setExpandedCategory(null);
            setWarehousesData([]);
            setExpandedWarehouses([]);
            setWarehouseTransactions({});
            setWarehouseBreakdowns({});
            setEquipmentData([]);
            setExpandedEquipment([]);
            setEquipmentFinancials({});
            return;
        }

        setExpandedSite(siteId);
        setExpandedCategory(category);
        setExpandedWarehouses([]);
        setWarehouseTransactions({});
        setWarehouseBreakdowns({});
        setExpandedEquipment([]);
        setEquipmentFinancials({});

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
        } else if (category === 'equipment') {
            await handleViewEquipmentCategory(siteId);
        }
    };

    const handleViewEquipmentCategory = async (siteId) => {
        setLoading(true);
        try {
            const response = await siteService.getSiteEquipment(siteId);
            console.log('Equipment response:', response); // Debug log

            // Handle different response formats
            const data = response.data || response || [];

            // Ensure it's an array
            if (Array.isArray(data)) {
                setEquipmentData(data);
            } else {
                console.error('Equipment data is not an array:', data);
                setEquipmentData([]);
                showSnackbar('Invalid equipment data format', 'error');
            }
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
            setEquipmentData([]); // Set empty array on error
            showSnackbar('Failed to load equipment', 'error');
        } finally {
            setLoading(false);
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

            // Fetch ALL item history (transactions + manual entries + purchase orders)
            const history = await inventoryValuationService.getWarehouseItemHistory(warehouseId);

            setWarehouseTransactions(prev => ({
                ...prev,
                [warehouseId]: history
            }));

        } catch (error) {
            console.error('Failed to fetch warehouse data:', error);
            showSnackbar('Failed to load warehouse data', 'error');
        } finally {
            setTransactionsLoading(prev => ({ ...prev, [warehouseId]: false }));
        }
    };

    const handleEquipmentExpand = async (equipmentId) => {
        if (expandedEquipment.includes(equipmentId)) {
            setExpandedEquipment(prev => prev.filter(id => id !== equipmentId));
            setEquipmentFinancials(prev => {
                const newFinancials = { ...prev };
                delete newFinancials[equipmentId];
                return newFinancials;
            });
            return;
        }

        setExpandedEquipment(prev => [...prev, equipmentId]);

        if (equipmentFinancials[equipmentId]) {
            return;
        }

        setEquipmentLoading(prev => ({ ...prev, [equipmentId]: true }));
        try {
            const financials = await equipmentFinanceService.getEquipmentFinancials(equipmentId);
            setEquipmentFinancials(prev => ({
                ...prev,
                [equipmentId]: financials
            }));
        } catch (error) {
            console.error('Failed to fetch equipment financials:', error);
            showSnackbar('Failed to load equipment financials', 'error');
        } finally {
            setEquipmentLoading(prev => ({ ...prev, [equipmentId]: false }));
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
            accessor: 'itemSource',
            header: 'SOURCE',
            width: '140px',
            render: (row) => {
                const source = row.itemSource || 'UNKNOWN';
                const sourceConfig = {
                    'TRANSACTION': { className: 'transaction', label: 'Transaction' },
                    'PURCHASE_ORDER': { className: 'purchase-order', label: 'Purchase Order' },
                    'MANUAL_ENTRY': { className: 'manual-entry', label: 'Manual Entry' },
                    'INITIAL_STOCK': { className: 'initial-stock', label: 'Initial Stock' },
                    'UNKNOWN': { className: 'unknown', label: 'Unknown' }
                };
                const config = sourceConfig[source] || sourceConfig['UNKNOWN'];
                return <span className={`source-badge ${config.className}`}>{config.label}</span>;
            }
        },
        {
            accessor: 'batchNumber',
            header: 'REF #',
            width: '100px',
            render: (row) => (
                <span className="batch-number">
                {row.batchNumber || row.sourceReference || '—'}
            </span>
            )
        },
        {
            accessor: 'itemName',
            header: 'ITEM',
            width: '180px',
            render: (row) => <span className="item-name">{row.itemName || '—'}</span>
        },
        {
            accessor: 'quantity',
            header: 'QTY',
            width: '100px',
            render: (row) => (
                <span className="quantity-text">
                {row.quantity} {row.measuringUnit || ''}
            </span>
            )
        },
        {
            accessor: 'unitPrice',
            header: 'UNIT PRICE',
            width: '110px',
            render: (row) => (
                <span className="price-text">
                {row.unitPrice ? `${row.unitPrice.toFixed(2)} EGP` : '—'}
            </span>
            )
        },
        {
            accessor: 'totalValue',
            header: 'TOTAL',
            width: '120px',
            render: (row) => (
                <span className="value-amount">
                {row.totalValue ? `${row.totalValue.toFixed(2)} EGP` : '—'}
            </span>
            )
        },
        {
            accessor: 'senderName',
            header: 'FROM',
            width: '150px',
            render: (row) => (
                <span className="entity-name">
                {row.senderName || row.merchantName || '—'}
            </span>
            )
        },
        {
            accessor: 'receiverName',
            header: 'TO',
            width: '150px',
            render: (row) => <span className="entity-name">{row.receiverName || '—'}</span>
        },
        {
            accessor: 'createdAt',
            header: 'DATE',
            width: '140px',
            render: (row) => (
                <span className="date-value">{formatDate(row.createdAt)}</span>
            )
        },
        {
            accessor: 'createdBy',
            header: 'BY',
            width: '120px',
            render: (row) => <span className="user-value">{row.createdBy || '—'}</span>
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
                    <div className="sites-list">
                        {filteredSitesData.map((site, siteIndex) => (
                            <React.Fragment key={site.siteId}>
                                <div className="site-item">
                                    {/* Site Card */}
                                    <FinanceAssetCard
                                        title={site.siteName}
                                        subtitle="Asset Categories"
                                        value={formatCurrency(site.totalValue)}
                                        imageUrl={site.photoUrl}
                                        imageFallback={siteimgg}
                                        variant="site"
                                        showValueLabel={true}
                                        categoryBreakdown={[
                                            {
                                                label: 'Warehouses',
                                                icon: FiPackage,
                                                count: site.totalWarehouses || 0,
                                                value: site.totalWarehouseValue || 0, // Pass raw number
                                                onViewDetails: () => handleViewCategory(site.siteId, 'warehouses'),
                                                disabled: false,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'warehouses'
                                            },
                                            {
                                                label: 'Equipment',
                                                icon: FiTool,
                                                count: site.equipmentCount || 0,
                                                value: site.totalEquipmentValue?.toFixed(2) || '0.00',
                                                onViewDetails: () => handleViewCategory(site.siteId, 'equipment'),
                                                disabled: false,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'equipment'
                                            },
                                            {
                                                label: 'Fixed Assets',
                                                icon: FiArchive,
                                                count: 0,
                                                value: '0.00',
                                                onViewDetails: () => handleViewCategory(site.siteId, 'fixedAssets'),
                                                disabled: true,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'fixedAssets'
                                            }
                                        ]}
                                    />

                                    {/* Expanded Warehouses Category */}
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
                                                                value={formatCurrency(warehouse.totalValue)}
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
                                                                                    { accessor: 'itemSource', header: 'Source' },
                                                                                    { accessor: 'itemName', header: 'Item' },
                                                                                    { accessor: 'senderName', header: 'From' },
                                                                                    { accessor: 'createdBy', header: 'Added By' }
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

                                    {/* Expanded Equipment Category */}
                                    {expandedSite === site.siteId && expandedCategory === 'equipment' && (
                                        <div className="category-expanded">
                                            <div className="category-section-header">
                                                <h3 className="category-section-title">
                                                    <FiTool size={16} />
                                                    Equipment
                                                </h3>
                                                <span className="category-section-count">{equipmentData.length} Total</span>
                                            </div>

                                            <div className="equipment-list">
                                                {equipmentData.map((equipment, equipmentIndex) => (
                                                    <React.Fragment key={equipment.id}>
                                                        <div className="equipment-item">
                                                            <FinanceAssetCard
                                                                title={equipment.name}
                                                                subtitle={`${equipment.type?.name || 'Equipment'} • ${equipment.model}`}
                                                                value={formatCurrency(equipment.egpPrice)}
                                                                icon={FiTool}
                                                                variant="nested"
                                                                size="compact"
                                                                showValueLabel={true}
                                                                badge={
                                                                    equipment.status === 'IN_MAINTENANCE'
                                                                        ? {
                                                                            text: 'In Maintenance',
                                                                            variant: 'warning'
                                                                        }
                                                                        : equipment.status === 'RUNNING'
                                                                            ? {
                                                                                text: 'Active',
                                                                                variant: 'success'
                                                                            }
                                                                            : null
                                                                }
                                                                isExpanded={expandedEquipment.includes(equipment.id)}
                                                                onExpand={() => handleEquipmentExpand(equipment.id)}
                                                            />

                                                            {/* Financial Breakdown - Only When Expanded */}
                                                            {/* Financial Breakdown - Only When Expanded */}
                                                            {expandedEquipment.includes(equipment.id) && (
                                                                <div className="equipment-financial-section">
                                                                    {equipmentLoading[equipment.id] ? (
                                                                        <div className="loading-state">
                                                                            <div className="spinner"></div>
                                                                            <p>Loading financials...</p>
                                                                        </div>
                                                                    ) : equipmentFinancials[equipment.id] ? (
                                                                        <>
                                                                            <div className="financial-summary">
                                                                                <div className="financial-summary-header">
                                                                                    <span className="summary-title">Value Composition</span>
                                                                                    <span className="summary-updated">
                            Last updated: {formatDate(equipmentFinancials[equipment.id].lastUpdated)}
                        </span>
                                                                                </div>

                                                                                <div className="breakdown-grid">
                                                                                    {/* Purchase Price Card */}
                                                                                    <div className="breakdown-item equipment-purchase">
                                                                                        <div className="breakdown-item-header">
                                                                                            <span className="item-name">Purchase Price</span>
                                                                                            <span className="item-value">
                                    {formatCurrency(equipmentFinancials[equipment.id].purchasePrice)} EGP
                                </span>
                                                                                        </div>
                                                                                        <div className="breakdown-item-details">
                                                                                            <span className="item-description">Original equipment cost</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Current Inventory Card */}
                                                                                    <div className="breakdown-item equipment-inventory">
                                                                                        <div className="breakdown-item-header">
                                                                                            <span className="item-icon">📦</span>
                                                                                            <span className="item-name">Current Inventory</span>
                                                                                            <span className="item-value">
                                    {formatCurrency(equipmentFinancials[equipment.id].currentInventoryValue)} EGP
                                </span>
                                                                                        </div>
                                                                                        <div className="breakdown-item-details">
                                                                                            <span className="item-description">Value of unused consumables</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Total Expenses Card */}
                                                                                    <div className="breakdown-item equipment-expenses">
                                                                                        <div className="breakdown-item-header">
                                                                                            <span className="item-icon">📉</span>
                                                                                            <span className="item-name">Total Expenses</span>
                                                                                            <span className="item-value">
                                    {formatCurrency(equipmentFinancials[equipment.id].totalExpenses)} EGP
                                </span>
                                                                                        </div>
                                                                                        <div className="breakdown-item-details">
                                                                                            <span className="item-description">Consumables used historically</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="empty-breakdown">
                                                                            <p>No financial data available</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}                                                        </div>

                                                        {/* Equipment Separator */}
                                                        {equipmentIndex < equipmentData.length - 1 && (
                                                            <div className="equipment-separator"></div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Coming Soon Fixed Assets */}
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
                                {siteIndex < filteredSitesData.length - 1 && (
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