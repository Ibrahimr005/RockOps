import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../../components/common/DataTable/DataTable';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2.jsx';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { FiPackage } from 'react-icons/fi';
import './ItemTypeDetailsPage.scss';

const ItemTypeDetailsPage = () => {
    const { itemTypeId } = useParams();
    const navigate = useNavigate();

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchItemTypeDetails();
    }, [itemTypeId]);

    const fetchItemTypeDetails = async () => {
        setLoading(true);
        try {
            const data = await itemTypeService.getItemTypeDetails(itemTypeId);
            setDetails(data);
        } catch (error) {
            console.error('Failed to fetch item type details:', error);
            showSnackbar('Failed to load item type details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const formatCurrency = (value) => {
        if (!value && value !== 0) return '—';
        return `${Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} EGP`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Warehouse Distribution Columns
    const distributionColumns = [
        {
            accessor: 'siteName',
            header: 'SITE',
            width: '180px',
            render: (row) => <span className="it-page-site-name">{row.siteName}</span>
        },
        {
            accessor: 'warehouseName',
            header: 'WAREHOUSE',
            width: '200px',
            render: (row) => (
                <span
                    className="it-page-warehouse-link"
                    onClick={() => navigate(`/warehouses/${row.warehouseId}`)}
                >
                    {row.warehouseName}
                </span>
            )
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="it-page-quantity-value">
                    {row.quantity} {details?.measuringUnit || ''}
                </span>
            )
        },
        {
            accessor: 'unitPrice',
            header: 'UNIT PRICE',
            width: '140px',
            render: (row) => (
                <span className="it-page-price-value">{formatCurrency(row.unitPrice)}</span>
            )
        },
        {
            accessor: 'totalValue',
            header: 'TOTAL VALUE',
            width: '160px',
            render: (row) => (
                <span className="it-page-total-value">{formatCurrency(row.totalValue)}</span>
            )
        },
        {
            accessor: 'lastUpdated',
            header: 'LAST UPDATED',
            width: '180px',
            render: (row) => (
                <span className="it-page-date-value">{formatDate(row.lastUpdated)}</span>
            )
        }
    ];

    // Price History Columns
    const priceHistoryColumns = [
        {
            accessor: 'warehouseName',
            header: 'WAREHOUSE',
            width: '200px'
        },
        {
            accessor: 'approvedPrice',
            header: 'APPROVED PRICE',
            width: '150px',
            render: (row) => (
                <span className="it-page-price-value">{formatCurrency(row.approvedPrice)}</span>
            )
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="it-page-quantity-value">
                    {row.quantity} {details?.measuringUnit || ''}
                </span>
            )
        },
        {
            accessor: 'approvedBy',
            header: 'APPROVED BY',
            width: '150px',
            render: (row) => <span className="it-page-user-value">{row.approvedBy || '—'}</span>
        },
        {
            accessor: 'approvedAt',
            header: 'APPROVED ON',
            width: '180px',
            render: (row) => (
                <span className="it-page-date-value">{formatDate(row.approvedAt)}</span>
            )
        }
    ];

    // Get unique values for filter dropdowns
    const getUniqueValues = (data, accessor) => {
        if (!data || data.length === 0) return [];
        return [...new Set(data.map(item => item[accessor]))].filter(Boolean).sort();
    };

    if (loading) {
        return (
            <div className="it-page-container">
                <div className="it-page-loading-container">
                    <div className="it-page-spinner"></div>
                    <p>Loading item type details...</p>
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="it-page-container">
                <div className="it-page-error-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h4>Item Type Not Found</h4>
                    <p>The requested item type could not be found.</p>
                    <button className="it-page-retry-button" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="it-page-container">
            <IntroCard
                title={details.itemTypeName}
                label="ITEM TYPE"
                breadcrumbs={[
                    {
                        label: 'Warehouses',
                        icon: <FiPackage size={14} />,
                        onClick: () => navigate('/warehouses')
                    },
                    {
                        label: 'Item Types',
                        onClick: () => navigate('/warehouses/item-types')
                    },
                    {
                        label: details.itemTypeName
                    }
                ]}
                icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                }
                stats={[
                    {
                        label: 'Measuring Unit',
                        value: details.measuringUnit || '—'
                    },
                    {
                        label: 'Serial Number',
                        value: details.serialNumber || '—'
                    },
                    {
                        label: 'Min Quantity',
                        value: details.minQuantity ? `${details.minQuantity} ${details.measuringUnit}` : '—'
                    },
                    {
                        label: 'Category',
                        value: details.parentCategoryName
                            ? `${details.parentCategoryName} > ${details.categoryName}`
                            : details.categoryName || '—'
                    }
                ]}
            />

            {/* Overview Section */}
            <div className="it-page-overview-section">
                <div className="it-page-section-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        Item Information
                    </h3>
                </div>

                <div className="it-page-info-grid">
                    <div className="it-page-info-card">
                        <div className="it-page-info-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="2" x2="12" y2="22"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="it-page-info-content">
                            <div className="it-page-info-label">Base Price</div>
                            <div className="it-page-info-value">{formatCurrency(details.basePrice)}</div>
                        </div>
                    </div>

                    <div className="it-page-info-card">
                        <div className="it-page-info-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            </svg>
                        </div>
                        <div className="it-page-info-content">
                            <div className="it-page-info-label">Total Quantity</div>
                            <div className="it-page-info-value">{details.totalQuantity || 0} {details.measuringUnit || ''}</div>
                        </div>
                    </div>

                    <div className="it-page-info-card">
                        <div className="it-page-info-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="2" x2="12" y2="22"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="it-page-info-content">
                            <div className="it-page-info-label">Total Value</div>
                            <div className="it-page-info-value">{formatCurrency(details.totalValue)}</div>
                        </div>
                    </div>

                    <div className="it-page-info-card">
                        <div className="it-page-info-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div className="it-page-info-content">
                            <div className="it-page-info-label">Avg. Unit Price</div>
                            <div className="it-page-info-value">{formatCurrency(details.averageUnitPrice)}</div>
                        </div>
                    </div>

                    <div className="it-page-info-card">
                        <div className="it-page-info-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <div className="it-page-info-content">
                            <div className="it-page-info-label">Warehouse Count</div>
                            <div className="it-page-info-value">{details.warehouseCount || 0}</div>
                        </div>
                    </div>

                    {details.pendingApprovalsCount > 0 && (
                        <div className="it-page-info-card it-page-warning">
                            <div className="it-page-info-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>
                            <div className="it-page-info-content">
                                <div className="it-page-info-label">Pending Approvals</div>
                                <div className="it-page-info-value">{details.pendingApprovalsCount}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Base Price Update Info */}
                {details.basePriceUpdatedAt && (
                    <div className="it-page-base-price-info">
                        <div className="it-page-price-info-header">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            <span>Base Price automatically updated from last 3 completed purchase orders</span>
                        </div>
                        <div className="it-page-price-info-details">
                            <div className="it-page-price-info-item">
                                <span className="it-page-price-label">Last Updated:</span>
                                <span className="it-page-price-value">{formatDate(details.basePriceUpdatedAt)}</span>
                            </div>
                            <div className="it-page-price-info-item">
                                <span className="it-page-price-label">Updated By:</span>
                                <span className="it-page-price-value">{details.basePriceUpdatedBy || 'System'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Warehouse Distribution Section */}
            <div className="it-page-data-section">
                <div className="it-page-section-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        Warehouse Distribution
                    </h3>
                    <div className="it-page-section-count">
                        {details.warehouseDistribution?.length || 0} {details.warehouseDistribution?.length === 1 ? 'Warehouse' : 'Warehouses'}
                    </div>
                </div>

                <DataTable
                    data={details.warehouseDistribution || []}
                    columns={distributionColumns}
                    loading={false}
                    tableTitle=""
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 15, 20]}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={[
                        {
                            accessor: 'siteName',
                            header: 'Site',
                            type: 'select',
                            options: getUniqueValues(details.warehouseDistribution, 'siteName')
                        },
                        {
                            accessor: 'warehouseName',
                            header: 'Warehouse',
                            type: 'select',
                            options: getUniqueValues(details.warehouseDistribution, 'warehouseName')
                        },
                        {
                            accessor: 'quantity',
                            header: 'Quantity',
                            type: 'select',
                            options: getUniqueValues(details.warehouseDistribution, 'quantity')
                        },
                        {
                            accessor: 'unitPrice',
                            header: 'Unit Price',
                            type: 'select',
                            options: getUniqueValues(details.warehouseDistribution, 'unitPrice').map(v => formatCurrency(v))
                        },
                        {
                            accessor: 'totalValue',
                            header: 'Total Value',
                            type: 'select',
                            options: getUniqueValues(details.warehouseDistribution, 'totalValue').map(v => formatCurrency(v))
                        }
                    ]}
                    className="it-page-distribution-table"
                    emptyMessage="This item type is not present in any warehouse"
                    showExportButton={true}
                    exportButtonText="Export Distribution"
                    exportFileName={`${details.itemTypeName}_distribution`}
                />
            </div>

            {/* Price History Section */}
            <div className="it-page-data-section">
                <div className="it-page-section-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        Price Approval History
                    </h3>
                    <div className="it-page-section-count">
                        {details.priceHistory?.length || 0} {details.priceHistory?.length === 1 ? 'Record' : 'Records'}
                    </div>
                </div>

                <DataTable
                    data={details.priceHistory || []}
                    columns={priceHistoryColumns}
                    loading={false}
                    tableTitle=""
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 15, 20]}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={[
                        {
                            accessor: 'warehouseName',
                            header: 'Warehouse',
                            type: 'select',
                            options: getUniqueValues(details.priceHistory, 'warehouseName')
                        },
                        {
                            accessor: 'approvedBy',
                            header: 'Approved By',
                            type: 'select',
                            options: getUniqueValues(details.priceHistory, 'approvedBy')
                        },
                        {
                            accessor: 'approvedPrice',
                            header: 'Approved Price',
                            type: 'select',
                            options: getUniqueValues(details.priceHistory, 'approvedPrice').map(v => formatCurrency(v))
                        },
                        {
                            accessor: 'quantity',
                            header: 'Quantity',
                            type: 'select',
                            options: getUniqueValues(details.priceHistory, 'quantity')
                        }
                    ]}
                    className="it-page-price-history-table"
                    emptyMessage="No price approval history found"
                    showExportButton={true}
                    exportButtonText="Export History"
                    exportFileName={`${details.itemTypeName}_price_history`}
                />
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </div>
    );
};

export default ItemTypeDetailsPage;