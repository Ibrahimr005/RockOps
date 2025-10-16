import React, { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import PurchaseOrderApprovalModal from '../PurchaseOrderApproveModal/PurchaseOrderApprovalModal';
import ReportIssueModal from '../ReportIssueModal/ReportIssueModal'; // NEW

const PendingPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [purchaseOrderToApprove, setPurchaseOrderToApprove] = useState(null);

    // NEW: Report Issue states
    const [showReportIssueModal, setShowReportIssueModal] = useState(false);
    const [purchaseOrderToReport, setPurchaseOrderToReport] = useState(null);

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPendingPurchaseOrders();
        }
    }, [warehouseId]);

    // Function to fetch pending purchase orders
    const fetchPendingPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await purchaseOrderService.getAll();

            console.log("all orders:", JSON.stringify(allOrders, null, 2));

            // Filter orders to show only PENDING orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'PENDING' && order.requestOrder.requesterId === warehouseId
            );

            console.log("filtered orders:", JSON.stringify(filteredOrders, null, 2));

            setPendingOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching pending purchase orders:', error);
            setPendingOrders([]);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch pending purchase orders.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle approve purchase order - now opens approval modal
    const handleApprovePurchaseOrder = (purchaseOrder) => {
        setPurchaseOrderToApprove(purchaseOrder);
        setShowApprovalModal(true);
    };

    // NEW: Handle report issue
    const handleReportIssue = (purchaseOrder) => {
        setPurchaseOrderToReport(purchaseOrder);
        setShowReportIssueModal(true);
    };

    // Handle approval from modal
    const handleApprovalConfirm = async (updatedPurchaseOrder) => {
        try {
            // Show success message
            if (onShowSnackbar) {
                const status = updatedPurchaseOrder.status;
                let message = '';

                if (status === 'COMPLETED') {
                    message = `All items received! Purchase order ${updatedPurchaseOrder.poNumber} is now complete.`;
                } else if (status === 'PARTIAL') {
                    message = `Items received! Purchase order ${updatedPurchaseOrder.poNumber} is now partially fulfilled.`;
                } else {
                    message = `Purchase order ${updatedPurchaseOrder.poNumber} updated successfully!`;
                }

                onShowSnackbar(message, 'success');
            }

            // Refresh the data to update the list
            await fetchPendingPurchaseOrders();

        } catch (error) {
            console.error('Error after receiving items:', error);
            if (onShowSnackbar) {
                onShowSnackbar('An error occurred after receiving items.', 'error');
            }
        }
    };

    // NEW: Handle issue report submission
    const handleIssueReportSubmit = async () => {
        try {
            if (onShowSnackbar) {
                onShowSnackbar(`Issue reported for purchase order ${purchaseOrderToReport.poNumber}`, 'success');
            }

            // Refresh the data
            await fetchPendingPurchaseOrders();

        } catch (error) {
            console.error('Error reporting issue:', error);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to report issue.', 'error');
            }
        }
    };

    // Handle closing approval modal
    const handleApprovalModalClose = () => {
        setShowApprovalModal(false);
        setPurchaseOrderToApprove(null);
    };

    // NEW: Handle closing report issue modal
    const handleReportIssueModalClose = () => {
        setShowReportIssueModal(false);
        setPurchaseOrderToReport(null);
    };

    // Handle row click to show purchase order details
    const handleRowClick = (purchaseOrder) => {
        setSelectedPurchaseOrder(purchaseOrder);
        setShowModal(true);
    };

    // Handle closing modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPurchaseOrder(null);
    };

    // Column configuration for pending purchase orders
    const pendingOrderColumns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            sortable: true,
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'totalAmount',
            header: 'TOTAL',
            accessor: 'totalAmount',
            sortable: true,
            render: (row, value) => value ? `$${value.toFixed(2)}` : 'N/A'
        }
    ];

    // Filterable columns configuration
    const filterableColumns = [
        {
            accessor: 'poNumber',
            header: 'PO Number',
            filterType: 'text'
        },
        {
            accessor: 'requestOrder.title',
            header: 'Title',
            filterType: 'text'
        },
        {
            accessor: 'totalAmount',
            header: 'Total Amount',
            filterType: 'number'
        }
    ];

    // Actions configuration - UPDATED with Report Issue
    const actions = [
        {
            label: 'Receive',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleApprovePurchaseOrder(row),
            className: 'approve'
        },
        {
            label: 'Report Issue',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            ),
            onClick: (row) => handleReportIssue(row),
            className: 'danger'
        }
    ];

    return (
        <div className="pending-purchase-orders-container">
            <DataTable
                data={pendingOrders}
                columns={pendingOrderColumns}
                loading={isLoading}
                emptyMessage="No pending purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                actionsColumnWidth="150px" // Increased width for two buttons
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />

            {/* Purchase Order Approval Modal */}
            <PurchaseOrderApprovalModal
                purchaseOrder={purchaseOrderToApprove}
                isOpen={showApprovalModal}
                onClose={handleApprovalModalClose}
                onApprove={handleApprovalConfirm}
            />

            {/* NEW: Report Issue Modal */}
            <ReportIssueModal
                purchaseOrder={purchaseOrderToReport}
                isOpen={showReportIssueModal}
                onClose={handleReportIssueModalClose}
                onSubmit={handleIssueReportSubmit}
            />
        </div>
    );
};

export default PendingPurchaseOrders;