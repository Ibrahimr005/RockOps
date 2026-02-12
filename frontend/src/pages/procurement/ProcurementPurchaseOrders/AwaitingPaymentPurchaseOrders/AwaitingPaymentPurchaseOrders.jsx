import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiClock } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';

const AwaitingPaymentPurchaseOrders = ({ purchaseOrders: propsPurchaseOrders, onDataChange, loading: parentLoading }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const purchaseOrders = propsPurchaseOrders || [];  // ← DEFINE FIRST

    // THEN ADD LOGGING AFTER
    console.log('=== AWAITING PAYMENT COMPONENT ===');
    console.log('Total POs received:', purchaseOrders.length);
    console.log('Payment Status Check:', purchaseOrders.map(po => ({
        poNumber: po.poNumber,
        paymentStatus: po.paymentStatus,
        hasPaymentStatus: po.paymentStatus !== null && po.paymentStatus !== undefined
    })));





    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.id}`, {
            state: { from: 'procurement' }
        });
    };

    const getPaymentStatusBadge = (paymentStatus) => {
        const statusMap = {
            'REQUESTED': { label: 'Payment Requested', class: 'status-requested' },
            'APPROVED': { label: 'Payment Approved', class: 'status-approved' },
            'PARTIALLY_PAID': { label: 'Partially Paid', class: 'status-partial' },
            'PAID': { label: 'Fully Paid', class: 'status-paid' },
            'PAYMENT_FAILED': { label: 'Payment Failed', class: 'status-failed' }
        };

        const status = statusMap[paymentStatus] || { label: paymentStatus, class: 'status-default' };

        return (
            <span className={`payment-status-badge ${status.class}`}>
                {status.label}
            </span>
        );
    };

    const columns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            sortable: true,
            filterable: true,
            minWidth: '130px',
            render: (row) => row.poNumber || '-'
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            filterable: true,
            minWidth: '250px',
            render: (row) => row.requestOrder?.title || '-'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requestOrder.requesterName',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => row.requestOrder?.requesterName || '-'
        },
        {
            id: 'totalAmount',
            header: 'TOTAL AMOUNT',
            accessor: 'totalAmount',
            sortable: true,
            minWidth: '150px',
            render: (row) => `${row.currency || 'EGP'} ${parseFloat(row.totalAmount || 0).toFixed(2)}`
        },
        {
            id: 'paymentStatus',
            header: 'PAYMENT STATUS',
            accessor: 'paymentStatus',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => getPaymentStatusBadge(row.paymentStatus)
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'requestOrder.deadline',
            sortable: true,
            minWidth: '180px',
            render: (row) => {
                const deadline = row.requestOrder?.deadline;
                const formattedDate = purchaseOrderService.utils.formatDate(deadline);
                const isOverdue = deadline && new Date(deadline) < new Date();

                return (
                    <span style={{
                        color: isOverdue ? '#dc3545' : 'inherit',
                        fontWeight: isOverdue ? '600' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {isOverdue && <FiClock style={{ fontSize: '16px', color: '#dc3545' }} />}
                        {formattedDate}
                    </span>
                );
            }
        }
    ];

    const actions = [];

    const filterableColumns = [
        { header: 'PO Number', accessor: 'poNumber', filterType: 'text' },
        { header: 'Title', accessor: 'requestOrder.title', filterType: 'text' },
        { header: 'Requester', accessor: 'requestOrder.requesterName', filterType: 'select' },
        { header: 'Payment Status', accessor: 'paymentStatus', filterType: 'select' },
        { header: 'Total Amount', accessor: 'totalAmount', filterType: 'range' },
        { header: 'Deadline', accessor: 'requestOrder.deadline', filterType: 'date' }
    ];

    return (
        <div className="awaiting-payment-purchase-orders-container">
            <div className="purchase-orders-section">
                <DataTable
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={parentLoading}
                    emptyMessage="No purchase orders awaiting payment"
                    className="awaiting-payment-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    showExportButton={true}
                    exportFileName="awaiting-payment-purchase-orders"
                    exportButtonText="Export Awaiting Payment Orders"
                />
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default AwaitingPaymentPurchaseOrders;