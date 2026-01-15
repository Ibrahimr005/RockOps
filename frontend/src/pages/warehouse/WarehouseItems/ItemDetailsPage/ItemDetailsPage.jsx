import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { itemService } from '../../../../services/warehouse/itemService';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { FiArrowLeft, FiPackage } from 'react-icons/fi';
import './ItemDetailsPage.scss';

const ItemDetailsPage = ({ showSnackbar }) => {
    const { id: warehouseId, itemTypeId } = useParams();
    const navigate = useNavigate();

    const [itemDetails, setItemDetails] = useState(null);
    const [warehouseData, setWarehouseData] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [warehouseId, itemTypeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch warehouse data
            const warehouse = await warehouseService.getById(warehouseId);
            setWarehouseData(warehouse);

            // Fetch item transaction details
            const details = await itemService.getItemTransactionDetails(warehouseId, itemTypeId);

            // Calculate total quantity and set item details
            const totalQuantity = details.reduce((sum, item) => sum + item.quantity, 0);
            const firstItem = details[0];

            setItemDetails({
                itemTypeName: firstItem?.itemType?.name || 'Unknown Item',
                itemCategoryName: firstItem?.itemType?.itemCategory?.name || 'Unknown Category',
                parentCategoryName: firstItem?.itemType?.itemCategory?.parentCategory?.name || 'Unknown Parent',
                measuringUnit: firstItem?.itemType?.measuringUnit || 'units',
                totalQuantity: totalQuantity,
                entryCount: details.length
            });

            // Process transaction history
            const historyWithWarehouseNames = await Promise.all(
                details.map(async (detail) => {
                    if (detail.transactionItem?.transaction) {
                        const transaction = detail.transactionItem.transaction;
                        let senderName = "Unknown";
                        let receiverName = "Unknown";

                        if (transaction.senderType === 'WAREHOUSE' && transaction.senderId) {
                            try {
                                const senderWarehouse = await warehouseService.getById(transaction.senderId);
                                senderName = senderWarehouse.name;
                            } catch (error) {
                                console.error('Error fetching sender warehouse:', error);
                            }
                        }
                        if (transaction.receiverType === 'WAREHOUSE' && transaction.receiverId) {
                            try {
                                const receiverWarehouse = await warehouseService.getById(transaction.receiverId);
                                receiverName = receiverWarehouse.name;
                            } catch (error) {
                                console.error('Error fetching receiver warehouse:', error);
                            }
                        }

                        return {
                            ...detail,
                            senderName,
                            receiverName
                        };
                    }
                    return detail;
                })
            );

            // Sort by date (most recent first)
            const sortedHistory = historyWithWarehouseNames.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setTransactionHistory(sortedHistory);
        } catch (error) {
            console.error('Error fetching item details:', error);
            showSnackbar('Failed to load item details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        if (itemDetails) {
            console.log("=== ITEM DETAILS DEBUG ===");
            console.log("Full itemDetails object:", itemDetails);
            console.log("itemCategoryName:", itemDetails.itemCategoryName);
            console.log("itemCategory:", itemDetails.itemCategory);
            console.log("parentCategory:", itemDetails.parentCategory);
            console.log("All keys:", Object.keys(itemDetails));
            console.log("========================");
        }
    }, [itemDetails]);

    const historyColumns = [
        {
            accessor: 'source',
            header: 'SOURCE',
            width: '150px',
            render: (row) => {
                if (row.transactionItem?.transaction) {
                    return (
                        <span className="source-badge transaction">
                            Transaction
                        </span>
                    );
                }
                if (row.itemSource === 'PURCHASE_ORDER') {
                    return <span className="source-badge purchase-order">Purchase Order</span>;
                }
                if (row.itemSource === 'MANUAL_ENTRY') {
                    return <span className="source-badge manual-entry">Manual Entry</span>;
                }
                if (row.itemSource === 'INITIAL_STOCK') {
                    return <span className="source-badge initial-stock">Initial Stock</span>;
                }
                return <span className="source-badge unknown">Unknown</span>;
            }
        },
        {
            accessor: 'batchNumber',
            header: 'BATCH / PO   #',
            width: '120px',
            render: (row) => {
                if (row.transactionItem?.transaction) {
                    return (
                        <span className="batch-number">
                            {row.batchNumber || row.transactionItem.transaction.batchNumber || '—'}
                        </span>
                    );
                }
                if (row.sourceReference) {
                    return <span className="batch-number">{row.sourceReference}</span>;
                }
                return '—';
            }
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="quantity-value">
                    {row.quantity} {row.itemType?.measuringUnit || 'units'}
                </span>
            )
        },
        {
            accessor: 'senderName',
            header: 'SENDER',
            width: '180px',
            render: (row) => {
                if (row.transactionItem?.transaction) {
                    return <span className="warehouse-name">{row.senderName || 'Unknown'}</span>;
                }
                if (row.merchantName) {
                    return <span className="merchant-name">{row.merchantName}</span>;
                }
                return '—';
            }
        },
        {
            accessor: 'receiverName',
            header: 'RECEIVER',
            width: '180px',
            render: (row) => {
                if (row.transactionItem?.transaction) {
                    return <span className="warehouse-name">{row.receiverName || warehouseData?.name}</span>;
                }
                return <span className="warehouse-name">{warehouseData?.name}</span>;
            }
        },
        {
            accessor: 'createdAt',
            header: 'DATE',
            width: '180px',
            render: (row) => (
                <span className="date-text">{formatDate(row.createdAt)}</span>
            )
        },
        {
            accessor: 'createdBy',
            header: 'ADDED BY',
            width: '150px',
            render: (row) => {
                const addedBy = row.createdBy || row.transactionItem?.transaction?.addedBy;
                return addedBy ? <span className="user-name">{addedBy}</span> : '—';
            }
        }
    ];

    if (loading) {
        return (
            <div className="item-details-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading item details...</p>
                </div>
            </div>
        );
    }

    if (!itemDetails) {
        return (
            <div className="item-details-page">
                <div className="error-state">
                    <p>Item not found</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="item-details-page">
            <IntroCard
                title={itemDetails.itemTypeName}
                label={warehouseData?.name || 'WAREHOUSE'}
                breadcrumbs={[
                    {
                        label: 'Warehouses',
                        icon: <FiPackage size={14} />,
                        onClick: () => navigate('/warehouses')
                    },
                    {
                        label: warehouseData?.name || 'Warehouse',
                        onClick: () => navigate(`/warehouses/${warehouseId}`)
                    },
                    {
                        label: itemDetails.itemTypeName
                    }
                ]}
                icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                }
                stats={[
                    {
                        label: 'Total Quantity',
                        value: `${itemDetails.totalQuantity} ${itemDetails.measuringUnit}`
                    },
                    {
                        label: 'Total Entries',
                        value: itemDetails.entryCount
                    },
                    {
                        label: 'Category',
                        value: itemDetails.parentCategoryName
                            ? `${itemDetails.parentCategoryName} > ${itemDetails.itemCategoryName}`
                            : itemDetails.itemCategoryName
                    }
                ]}
            />

            <div className="item-history-section">
                <DataTable
                    data={transactionHistory}
                    columns={historyColumns}
                    loading={loading}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[10, 20, 50]}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={[
                        { accessor: 'source', header: 'Source' },
                        { accessor: 'createdBy', header: 'Added By' }
                    ]}
                    className="item-history-table"
                    showExportButton={true}
                    exportButtonText="Export History"
                    exportFileName={`${itemDetails.itemTypeName}_history_${warehouseData?.name}`}
                />
            </div>
        </div>
    );
};

export default ItemDetailsPage;