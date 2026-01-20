import React, { useState, useEffect } from 'react';
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import "./PendingRequestOrders.scss";
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import RequestOrderModal from '../../../../components/procurement/RequestOrderModal/RequestOrderModal';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";

const PendingRequestOrders = React.forwardRef(({ warehouseId, refreshTrigger, onShowSnackbar, userRole }, ref) => {
    const navigate = useNavigate();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);

    // Notification states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);

    // Request Order Modal states
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    React.useImperativeHandle(ref, () => ({
        handleAddRequest: () => {
            handleAddRequest();
        },
        openRestockModal: (restockItems) => {
            openRestockModal(restockItems);
        }
    }));

    // Column configuration for pending request orders
    const pendingOrderColumns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            width: '200px',
            minWidth: '150px',
            sortable: true,
            filterable: true,
            render: (row, value) => {
                return value || 'N/A';
            }
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'deadline',
            width: '140px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value ? new Date(value).toLocaleDateString() : 'N/A';
            }
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            width: '140px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value ? new Date(value).toLocaleDateString() : 'N/A';
            }
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            width: '150px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || 'N/A';
            }
        }
    ];

    // Actions configuration for pending orders - edit and delete
    const pendingOrderActions = [
        {
            label: 'Edit Request',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            ),
            onClick: (row) => handleEditRequest(row),
            className: 'request-edit-button'
        },
        {
            label: 'Delete Request',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2 0,0,1-2,2H7a2,2 0,0,1-2-2V6m3,0V4a2,2 0,0,1,2-2h4a2,2 0,0,1,2,2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            ),
            onClick: (row) => handleDeleteRequest(row),
            className: 'request-delete-button'
        }
    ];

    // Filterable columns configuration
    const pendingFilterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        }
    ];

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPendingOrders();
        }
    }, [warehouseId, refreshTrigger]);

    const fetchRequestOrderDetails = async (id) => {
        try {
            const details = await requestOrderService.getById(id);
            return details;
        } catch (error) {
            console.error('Error fetching request order details:', error);
            showErrorNotification('Failed to load request order details.');
            return null;
        }
    };

    // Fetch pending request orders
    const fetchPendingOrders = async () => {
        setIsLoadingPending(true);
        try {
            const data = await requestOrderService.getByWarehouseAndStatus(warehouseId, 'PENDING');
            setPendingOrders(data);
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            setPendingOrders([]);
        } finally {
            setIsLoadingPending(false);
        }
    };

    const showErrorNotification = (message) => {
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
        if (onShowSnackbar) {
            onShowSnackbar(message, 'error');
        }
    };

    const showSuccessNotification = (message) => {
        setNotificationMessage(String(message || 'Operation successful'));
        setNotificationType('success');
        setShowNotification(true);
        if (onShowSnackbar) {
            onShowSnackbar(message, 'success');
        }
    };

    // Handle edit request
    const handleEditRequest = async (request) => {
        try {
            const requestDetails = await requestOrderService.getById(request.id);
            setIsEditMode(true);
            setSelectedOrder(requestDetails);
            setShowRequestModal(true);
        } catch (error) {
            console.error('Error fetching request details:', error);
            showErrorNotification('Failed to load request details. Please try again.');
        }
    };

    // Handle delete request
    const handleDeleteRequest = async (request) => {
        if (!window.confirm('Are you sure you want to delete this request?')) {
            return;
        }

        try {
            // TODO: Implement delete API call when backend endpoint is available
            console.log('Delete request:', request);

            // For now, just refresh the table
            fetchPendingOrders();

            showSuccessNotification('Delete functionality to be implemented');

        } catch (error) {
            console.error('Error deleting request:', error);
            showErrorNotification('Failed to delete request. Please try again.');
        }
    };

    // Handle row click to navigate to detail page
    const handleRowClick = (row) => {
        navigate(`/warehouses/${warehouseId}/request-orders/${row.id}`);
        // or
        // navigate(`/warehouse/request-orders/${row.id}`);
    };

    // Handle add button click from DataTable
    const handleAddRequest = () => {
        setIsEditMode(false);
        setSelectedOrder(null);
        setShowRequestModal(true);
    };

    const openRestockModal = (restockItems) => {
        const now = new Date();
        // Set deadline to 7 days from now
        const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const deadlineString = deadline.toISOString().slice(0, 16);

        // Create a pre-populated order with restock items
        const restockOrder = {
            title: 'Restock Request - Low Stock Items',
            description: `Automatic restock request for ${restockItems.length} item(s) below minimum quantity threshold.`,
            deadline: deadlineString,
            employeeRequestedBy: '',
            requesterId: warehouseId,
            siteId: null, // Will be auto-fetched from warehouse
            items: restockItems.map(item => ({
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || '',
                parentCategoryId: '',
                itemCategoryId: ''
            }))
        };

        setIsEditMode(false); // This is a new request, not editing
        setSelectedOrder(restockOrder);
        setShowRequestModal(true);
    };

    const handleCloseRequestModal = () => {
        setShowRequestModal(false);
        setIsEditMode(false);
        setSelectedOrder(null);
    };

    const handleRequestModalSuccess = (message) => {
        showSuccessNotification(message);
        fetchPendingOrders(); // Refresh the pending orders list
    };

    return (
        <div className="pending-request-orders-container">
            {/* Pending Orders Section */}
            <div className="request-orders-section">
                <div className="table-header-section"></div>

                <div className="request-orders-table-card">
                    <DataTable
                        data={pendingOrders}
                        columns={pendingOrderColumns}
                        actions={pendingOrderActions}
                        onRowClick={handleRowClick}
                        loading={isLoadingPending}
                        emptyMessage="No pending request orders found"
                        className="request-orders-table"
                        itemsPerPageOptions={[5, 10, 15, 20]}
                        defaultItemsPerPage={10}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={pendingFilterableColumns}
                        actionsColumnWidth="120px"
                        showAddButton={true}
                        addButtonText="Add Request"
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleAddRequest}
                    />
                </div>
            </div>

            {/* Request Order Modal */}
            <RequestOrderModal
                isOpen={showRequestModal}
                onClose={handleCloseRequestModal}
                onSuccess={handleRequestModalSuccess}
                onError={showErrorNotification}
                isEditMode={isEditMode}
                existingOrder={selectedOrder}
                userType="WAREHOUSE"
                currentWarehouseId={warehouseId}
                currentSiteId={null} // Will be auto-fetched from warehouse
            />


            {/* Snackbar Notification */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
});

export default PendingRequestOrders;