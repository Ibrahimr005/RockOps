import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import ProcessDeliveryModal from '../ProcessDeliveryModal/ProcessDeliveryModal';
import PurchaseOrderIssuesView from '../PurchaseOrderIssuesView/PurchaseOrderIssuesView';
 import './DisputedPurchaseOrders.scss';

const DisputedPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [disputedOrders, setDisputedOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Process Delivery Modal states
    const [showProcessDeliveryModal, setShowProcessDeliveryModal] = useState(false);
    const [purchaseOrderToProcess, setPurchaseOrderToProcess] = useState(null);

    // View Issues Modal states
    const [showIssuesModal, setShowIssuesModal] = useState(false);
    const [purchaseOrderForIssues, setPurchaseOrderForIssues] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loadingIssues, setLoadingIssues] = useState(false);

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchDisputedPurchaseOrders();
        }
    }, [warehouseId]);

    // Function to fetch disputed purchase orders
    const fetchDisputedPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await purchaseOrderService.getAll();

            // Filter orders to show only DISPUTED orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'DISPUTED' && order.requestOrder?.requesterId === warehouseId
            );

            console.log("filtered disputed orders for warehouse:", filteredOrders);

            setDisputedOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching disputed purchase orders:', error);
            setDisputedOrders([]);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch disputed purchase orders.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Opens the delivery modal for continuing to receive items
     */
    const handleOpenProcessDeliveryModal = (purchaseOrder) => {
        setPurchaseOrderToProcess(purchaseOrder);
        setShowProcessDeliveryModal(true);
    };

    /**
     * Handles the delivery submission from the modal
     */
    const handleDeliverySubmit = async (deliveryData) => {
        const purchaseOrder = purchaseOrderToProcess;

        // Immediately close the modal for a better user experience
        handleProcessDeliveryModalClose();

        if (!purchaseOrder) {
            if (onShowSnackbar) {
                onShowSnackbar('Error: No purchase order selected for delivery.', 'error');
            }
            return;
        }

        try {
            await purchaseOrderService.processDelivery(purchaseOrder.id, deliveryData);

            // Refresh the list
            fetchDisputedPurchaseOrders();

            if (onShowSnackbar) {
                onShowSnackbar(`Delivery for PO ${purchaseOrder.poNumber} processed successfully!`, 'success');
            }
        } catch (error) {
            console.error('Error processing delivery:', error);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to process delivery. Please try again.', 'error');
            }
        }
    };

    // Handle closing process delivery modal
    const handleProcessDeliveryModalClose = () => {
        setShowProcessDeliveryModal(false);
        setPurchaseOrderToProcess(null);
    };

    /**
     * Opens the issues view modal
     */
    /**
     * Opens the issues view modal
     */
    /**
     * Opens the issues view modal
     */
    /**
     * Opens the issues view modal
     */
    const handleViewIssues = async (purchaseOrder) => {
        setPurchaseOrderForIssues(purchaseOrder);
        setShowIssuesModal(true);
        setLoadingIssues(true);

        try {
            const issuesData = await purchaseOrderService.getIssues(purchaseOrder.id);

            console.log('Raw issues data from API:', issuesData);

            // Handle different response formats
            let issuesArray = [];

            if (Array.isArray(issuesData)) {
                // Response is already an array
                issuesArray = issuesData;
            } else if (issuesData && issuesData.issues && Array.isArray(issuesData.issues)) {
                // Response has an 'issues' property that contains the array (YOUR CASE)
                issuesArray = issuesData.issues;
            } else if (issuesData && issuesData.data && Array.isArray(issuesData.data)) {
                // Response has a 'data' property that contains the array
                issuesArray = issuesData.data;
            } else if (issuesData && typeof issuesData === 'object') {
                // Response is a single object, wrap it in an array
                issuesArray = [issuesData];
            } else {
                // Unknown format or empty
                issuesArray = [];
            }

            console.log('Processed issues array:', issuesArray);
            console.log('Number of issues:', issuesArray.length);

            setIssues(issuesArray);

        } catch (error) {
            console.error('Error fetching issues:', error);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch issues.', 'error');
            }
            setIssues([]);
        } finally {
            setLoadingIssues(false);
        }
    };

    // Handle closing issues modal
    const handleCloseIssuesModal = () => {
        setShowIssuesModal(false);
        setPurchaseOrderForIssues(null);
        setIssues([]);
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

    // Calculate received progress for a PO
    const calculateProgress = (purchaseOrder) => {
        if (!purchaseOrder.purchaseOrderItems || purchaseOrder.purchaseOrderItems.length === 0) {
            return { received: 0, total: 0, percentage: 0 };
        }

        let totalOrdered = 0;
        let totalReceived = 0;

        purchaseOrder.purchaseOrderItems.forEach(item => {
            totalOrdered += item.quantity || 0;
            totalReceived += item.receivedQuantity || 0;
        });

        const percentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

        return { received: totalReceived, total: totalOrdered, percentage };
    };

    // Count unresolved issues for a PO (we'll need to add this to the backend response)
    const countUnresolvedIssues = (purchaseOrder) => {
        // This would ideally come from the backend
        // For now, we'll add it to the render
        return '?'; // Placeholder
    };

    // Column configuration for disputed purchase orders
    const disputedOrderColumns = [
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
            id: 'progress',
            header: 'RECEIVED',
            accessor: 'purchaseOrderItems',
            sortable: false,
            render: (row) => {
                const progress = calculateProgress(row);
                return (
                    <div className="progress-cell">
                        <span className="progress-text">
                            {progress.received} / {progress.total}
                        </span>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'issues',
            header: 'ISSUES',
            accessor: 'issues',
            sortable: false,
            render: (row) => (
                <div className="issues-badge-cell">
                    <span className="issues-badge unresolved">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Unresolved
                    </span>
                </div>
            )
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

    // Actions configuration - View Issues and Continue Receiving
    const actions = [
        {
            label: 'View Issues',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
            ),
            onClick: (row) => handleViewIssues(row),
            className: 'view-issues'
        },
        {
            label: 'Continue Receiving',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5"/>
                    <path d="M8 3H3v5"/>
                    <path d="M12 22v-8"/>
                    <path d="M16 18l-4 4-4-4"/>
                    <path d="M3 8l9-5 9 5"/>
                </svg>
            ),
            onClick: (row) => handleOpenProcessDeliveryModal(row),
            className: 'approve'
        }
    ];

    return (
        <div className="disputed-purchase-orders-container">
            {/* Info Banner */}
            <div className="disputed-info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div className="banner-text">
                    <strong>Purchase orders with reported issues.</strong>
                    <span>View issue details and resolution status. You can continue receiving remaining items while issues are being resolved by the procurement team.</span>
                </div>
            </div>

            <DataTable
                data={disputedOrders}
                columns={disputedOrderColumns}
                loading={isLoading}
                emptyMessage="No disputed purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                actionsColumnWidth="250px"
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />

            {/* Process Delivery Modal - for continuing to receive remaining items */}
            <ProcessDeliveryModal
                purchaseOrder={purchaseOrderToProcess}
                isOpen={showProcessDeliveryModal}
                onClose={handleProcessDeliveryModalClose}
                onSubmit={handleDeliverySubmit}
            />

            {/* Issues View Modal */}
            {showIssuesModal && (
                <div className="issues-modal-overlay" onClick={handleCloseIssuesModal}>
                    <div className="issues-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="issues-modal-header">
                            <div>
                                <h2>Purchase Order Issues</h2>
                                <div className="po-number">PO #{purchaseOrderForIssues?.poNumber}</div>
                            </div>
                            <button className="btn-close" onClick={handleCloseIssuesModal}>
                                ×
                            </button>
                        </div>
                        <div className="issues-modal-content">
                            {loadingIssues ? (
                                <div className="loading-issues">
                                    <div className="spinner"></div>
                                    <p>Loading issues...</p>
                                </div>
                            ) : (
                                <PurchaseOrderIssuesView
                                    purchaseOrder={purchaseOrderForIssues}
                                    issues={issues}
                                />
                            )}
                        </div>
                        <div className="issues-modal-footer">
                            <button className="btn-secondary" onClick={handleCloseIssuesModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisputedPurchaseOrders;