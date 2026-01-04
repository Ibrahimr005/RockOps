import React, { useState, useEffect } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './ApprovalHistory.scss';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';

const ApprovalHistory = ({ showSnackbar }) => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchApprovalHistory();
    }, []);

    const fetchApprovalHistory = async () => {
        setLoading(true);
        try {
            const data = await inventoryValuationService.getApprovalHistory();
            setHistoryData(data);
        } catch (error) {
            console.error('Failed to fetch approval history:', error);
            showSnackbar('Failed to load approval history', 'error');
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
            day: 'numeric'
        });
    };

    const columns = [
        {
            accessor: 'warehouseName',
            header: 'WAREHOUSE',
            width: '180px',
            render: (row) => (
                <div className="warehouse-info">
                    <span className="warehouse-name">{row.warehouseName}</span>
                </div>
            )
        },
        {
            accessor: 'itemTypeCategory',
            header: 'CATEGORY',
            width: '150px',
            render: (row) => (
                <span className="category-tag">{row.itemTypeCategory}</span>
            )
        },
        {
            accessor: 'itemTypeName',
            header: 'ITEM',
            width: '200px'
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="quantity-value">
                    {row.quantity} {row.measuringUnit}
                </span>
            )
        },
        {
            accessor: 'approvedPrice',
            header: 'APPROVED PRICE',
            width: '150px',
            render: (row) => (
                <span className="approved-price">
            {row.approvedPrice ? `${row.approvedPrice.toFixed(2)} EGP` : '—'}
        </span>
            )
        },
        {
            accessor: 'totalValue',
            header: 'TOTAL VALUE',
            width: '150px',
            render: (row) => (
                <span className="total-value">
            {row.totalValue ? `${row.totalValue.toFixed(2)} EGP` : '—'}
        </span>
            )
        },
        {
            accessor: 'approvedAt',
            header: 'APPROVED ON',
            width: '180px',
            render: (row) => (
                <span className="date-value">{formatDate(row.approvedAt)}</span>
            )
        },
        {
            accessor: 'approvedBy',
            header: 'APPROVED BY',
            width: '150px',
            render: (row) => (
                <span className="user-value">{row.approvedBy || 'N/A'}</span>
            )
        }
    ];

    return (
        <>


            {/* DataTable */}
            <DataTable
                data={historyData}
                columns={columns}
                loading={loading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20, 50]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                    { accessor: 'warehouseName', header: 'Warehouse' },
                    { accessor: 'siteName', header: 'Site' },
                    { accessor: 'itemTypeCategory', header: 'Category' },
                    { accessor: 'itemTypeName', header: 'Item' },
                    { accessor: 'approvedBy', header: 'Approved By' }
                ]}
                className="approval-history-table"
                emptyMessage="No approval history found"
                showExportButton={true}
                exportButtonText="Export History"
                exportFileName="approval_history"
                customExportHeaders={{
                    'warehouseName': 'Warehouse',
                    'siteName': 'Site',
                    'itemTypeCategory': 'Category',
                    'itemTypeName': 'Item Name',
                    'quantity': 'Quantity',
                    'measuringUnit': 'Unit',
                    'approvedPrice': 'Approved Price (EGP)',
                    'totalValue': 'Total Value (EGP)',
                    'approvedAt': 'Approved On',
                    'approvedBy': 'Approved By'
                }}
            />
        </>
    );
};

export default ApprovalHistory;