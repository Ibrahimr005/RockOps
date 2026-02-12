import React, { useState, useEffect } from 'react';
import './AssetValuesView.scss';
import SubPageHeader from '../../../../components/common/SubPageHeader/SubPageHeader';
import FinanceAssetCard from '../FinanceAssetCard/FinanceAssetCard.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';
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
    const [equipmentConsumables, setEquipmentConsumables] = useState({});
    const [equipmentLoading, setEquipmentLoading] = useState({});

    const formatCurrency = (value) => {
        if (!value && value !== 0) return '0';
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    useEffect(() => {
        fetchAllSiteValuations();
    }, []);

    const fetchAllSiteValuations = async () => {
        setLoading(true);
        try {
            const data = await inventoryValuationService.getAllSiteValuations();
            setSitesData(data);
            setFilteredSitesData(data);
        } catch (error) {
            console.error('Failed to fetch site valuations:', error);
            showSnackbar('Failed to load site valuations', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSiteIds.length === 0) {
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
            setEquipmentConsumables({});
            return;
        }

        setExpandedSite(siteId);
        setExpandedCategory(category);
        setExpandedWarehouses([]);
        setWarehouseTransactions({});
        setWarehouseBreakdowns({});
        setExpandedEquipment([]);
        setEquipmentFinancials({});
        setEquipmentConsumables({});

        if (category === 'warehouses') {
            setLoading(true);
            try {
                const data = await inventoryValuationService.getSiteBalance(siteId);
                console.log('📦 WAREHOUSE DATA:', data.warehouses);
                data.warehouses.forEach((warehouse, index) => {
                    console.log(`Warehouse ${index}:`, warehouse);
                });
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
            const response = await siteService.getSiteEquipmentDTO(siteId);
            const data = response.data || response || []; // ✅ Handle response wrapping

            console.log('🔧 EQUIPMENT RESPONSE:', response);
            console.log('🔧 EQUIPMENT DATA:', data);

            if (Array.isArray(data)) {
                data.forEach((equipment, index) => {
                    console.log(`Equipment ${index}:`, equipment);
                    console.log('  - imageUrl:', equipment.imageUrl);
                });

                setEquipmentData(data);

                // Fetch financials for all equipment immediately
                const financialsPromises = data.map(equipment =>
                    inventoryValuationService.getEquipmentFinancials(equipment.id)
                        .then(financials => ({ equipmentId: equipment.id, financials }))
                        .catch(error => {
                            console.error(`Failed to fetch financials for equipment ${equipment.id}:`, error);
                            return { equipmentId: equipment.id, financials: null };
                        })
                );

                const allFinancials = await Promise.all(financialsPromises);

                const financialsMap = {};
                allFinancials.forEach(({ equipmentId, financials }) => {
                    if (financials) {
                        financialsMap[equipmentId] = financials;
                    }
                });

                setEquipmentFinancials(financialsMap);
            } else {
                console.error('Equipment data is not an array:', data);
                setEquipmentData([]);
                showSnackbar('Invalid equipment data format', 'error');
            }
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
            setEquipmentData([]);
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
            const breakdown = await inventoryValuationService.getWarehouseItemBreakdown(warehouseId);
            setWarehouseBreakdowns(prev => ({
                ...prev,
                [warehouseId]: breakdown
            }));

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
            setEquipmentConsumables(prev => {
                const newConsumables = { ...prev };
                delete newConsumables[equipmentId];
                return newConsumables;
            });
            return;
        }

        setExpandedEquipment(prev => [...prev, equipmentId]);

        if (equipmentConsumables[equipmentId]) {
            return;
        }

        setEquipmentLoading(prev => ({ ...prev, [equipmentId]: true }));
        try {
            const consumables = await inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);
            setEquipmentConsumables(prev => ({
                ...prev,
                [equipmentId]: consumables
            }));
        } catch (error) {
            console.error('Failed to fetch equipment consumables:', error);
            showSnackbar('Failed to load equipment consumables', 'error');
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
                    <p>Loading site valuations...</p>
                </div>
            ) : (
                <div className="sites-section">
                    <div className="sites-list">
                        {filteredSitesData.map((site, siteIndex) => (
                            <React.Fragment key={site.siteId}>
                                <div className="site-item">
                                    <FinanceAssetCard
                                        title={site.siteName}
                                        subtitle="Asset Categories"
                                        value={formatCurrency(site.totalValue)}
                                        expenses={formatCurrency(site.totalExpenses)}
                                        imageUrl={site.photoUrl}
                                        imageFallback={siteimgg}
                                        variant="site"
                                        showValueLabel={true}
                                        categoryBreakdown={[
                                            {
                                                label: 'Warehouses',
                                                icon: FiPackage,
                                                count: site.warehouseCount || 0,
                                                value: site.warehouseValue || 0,
                                                expenses: site.warehouseExpenses || 0,
                                                onViewDetails: () => handleViewCategory(site.siteId, 'warehouses'),
                                                disabled: false,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'warehouses'
                                            },
                                            {
                                                label: 'Equipment',
                                                icon: FiTool,
                                                count: site.equipmentCount || 0,
                                                value: site.equipmentValue || 0,
                                                expenses: site.equipmentExpenses || 0,
                                                onViewDetails: () => handleViewCategory(site.siteId, 'equipment'),
                                                disabled: false,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'equipment'
                                            },
                                            {
                                                label: 'Fixed Assets',
                                                icon: FiArchive,
                                                count: site.fixedAssetsCount || 0,
                                                value: site.fixedAssetsValue || 0,
                                                expenses: site.fixedAssetsExpenses || 0,
                                                onViewDetails: () => handleViewCategory(site.siteId, 'fixedAssets'),
                                                disabled: true,
                                                isActive: expandedSite === site.siteId && expandedCategory === 'fixedAssets'
                                            }
                                        ]}
                                    />

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
                                                                expenses={formatCurrency(0)}
                                                                imageUrl={warehouse.photoUrl}
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

                                                                    <div className="transactions-section">
                                                                        <div className="transactions-header">
                                                                            <span className="transactions-title">Item History</span>
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

                                                        {warehouseIndex < warehousesData.length - 1 && (
                                                            <div className="warehouse-separator"></div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                                                value={equipmentFinancials[equipment.id] ? formatCurrency(equipmentFinancials[equipment.id].currentValue) : formatCurrency(equipment.egpPrice)}
                                                                expenses={equipmentFinancials[equipment.id] ? formatCurrency(equipmentFinancials[equipment.id].totalExpenses) : formatCurrency(0)}
                                                                icon={FiTool}
                                                                imageUrl={equipment.imageUrl}
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

                                                            {expandedEquipment.includes(equipment.id) && (
                                                                <>
                                                                    {equipmentLoading[equipment.id] ? (
                                                                        <div className="loading-state">
                                                                            <div className="spinner"></div>
                                                                            <p>Loading financials...</p>
                                                                        </div>
                                                                    ) : equipmentFinancials[equipment.id] ? (
                                                                        <>
                                                                            <div className="equipment-financial-section">
                                                                                <div className="financial-summary">
                                                                                    <div className="financial-summary-header">
                                                                                        <span className="summary-title">Value Composition</span>
                                                                                        <span className="summary-updated">
                                                                                            Last updated: {formatDate(equipmentFinancials[equipment.id].lastUpdated)}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="breakdown-grid">
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

                                                                                        <div className="breakdown-item equipment-depreciation">
                                                                                            <div className="breakdown-item-header">
                                                                                                <span className="item-name">Depreciation</span>
                                                                                                <span className="item-value depreciation-negative">
            -{formatCurrency(equipmentFinancials[equipment.id].accumulatedDepreciation)} EGP
        </span>
                                                                                            </div>
                                                                                            <div className="breakdown-item-details">
                                                                                                <div className="depreciation-explanation">
                                                                                                    {equipment.usefulLifeYears ? (
                                                                                                        <>
                    <span className="depreciation-formula">
                        (Purchase Price - Salvage Value) ÷ Useful Life × Years Elapsed
                    </span>
                                                                                                            <span className="depreciation-calculation">
                        ({formatCurrency(equipmentFinancials[equipment.id].purchasePrice)} - {formatCurrency(equipment.salvageValue || 0)}) ÷ {equipment.usefulLifeYears} years × {(equipmentFinancials[equipment.id].accumulatedDepreciation / ((equipmentFinancials[equipment.id].purchasePrice - (equipment.salvageValue || 0)) / equipment.usefulLifeYears)).toFixed(2)} years
                    </span>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <span className="depreciation-formula">
                    No depreciation schedule set
                </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="breakdown-item equipment-current-value">
                                                                                            <div className="breakdown-item-header">
                                                                                                <span className="item-name">Current Value</span>
                                                                                                <span className="item-value">
                                                                                                    {formatCurrency(equipmentFinancials[equipment.id].currentValue)} EGP
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="breakdown-item-details">
                                                                                                <span className="item-description">
                                                                                                    {formatCurrency(equipmentFinancials[equipment.id].purchasePrice)} - {formatCurrency(equipmentFinancials[equipment.id].accumulatedDepreciation)} = {formatCurrency(equipmentFinancials[equipment.id].currentValue)}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="equipment-financial-section">
                                                                                <div className="financial-summary">
                                                                                    <div className="financial-summary-header">
                                                                                        <span className="summary-title">Expenses Composition</span>
                                                                                        <span className="summary-updated">
                                                                                            Last updated: {formatDate(equipmentFinancials[equipment.id].lastUpdated)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {equipmentLoading[equipment.id] ? (
                                                                                        <div className="loading-state">
                                                                                            <div className="spinner"></div>
                                                                                            <p>Loading expenses...</p>
                                                                                        </div>
                                                                                    ) : equipmentConsumables[equipment.id]?.length > 0 ? (
                                                                                        <div className="breakdown-grid">
                                                                                            {equipmentConsumables[equipment.id].map((consumable, index) => (
                                                                                                <div key={index} className="breakdown-item">
                                                                                                    <div className="breakdown-item-header">
                                                                                                        <span className="item-name">{consumable.itemName}</span>
                                                                                                        <span className="item-value">{consumable.totalValue.toLocaleString()} EGP</span>
                                                                                                    </div>
                                                                                                    <div className="breakdown-item-details">
                                                                                                        <span className="item-quantity">{consumable.quantity} {consumable.measuringUnit}</span>
                                                                                                        <span className="item-separator">×</span>
                                                                                                        <span className="item-unit-price">{consumable.unitPrice.toFixed(2)} EGP</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="empty-breakdown">
                                                                                            <p>No consumables expenses</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="empty-breakdown">
                                                                            <p>No financial data available</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {equipmentIndex < equipmentData.length - 1 && (
                                                            <div className="equipment-separator"></div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
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