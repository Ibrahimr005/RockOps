import React, { useState, useEffect } from 'react';
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import { FaPlus } from 'react-icons/fa';
import "./PendingRequestOrders.scss";
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import RequestOrderViewModal from '../RequestOrderViewModal/RequestOrderViewModal';
import RequestOrderFormModal from '../RequestOrderFormModal/RequestOrderFormModal'; // NEW IMPORT

const PendingRequestOrders = React.forwardRef(({ warehouseId, refreshTrigger, onShowSnackbar, userRole }, ref) => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);

    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);

    // Form modal states
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);

    // Data for form modal
    const [itemTypes, setItemTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);

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
            render: (row, value) => value || 'N/A'
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
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
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
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
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
            render: (row, value) => value || 'N/A'
        }
    ];

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
            fetchItemTypes();
            fetchEmployees();
            fetchParentCategories();
        }
    }, [warehouseId, refreshTrigger]);

    const fetchRequestOrderDetails = async (id) => {
        try {
            const details = await requestOrderService.getById(id);
            return details;
        } catch (error) {
            console.error('Error fetching request order details:', error);
            onShowSnackbar('Failed to load request order details.', 'error');
            return null;
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(data);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(data);
        } catch (error) {
            console.error('Error fetching item types:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await warehouseService.getEmployees(warehouseId);
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
        }
    };

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

    const handleEditRequest = async (request) => {
        try {
            const requestDetails = await requestOrderService.getById(request.id);

            const deadline = requestDetails.deadline
                ? new Date(requestDetails.deadline).toISOString().slice(0, 16)
                : '';

            const items = requestDetails.requestItems && requestDetails.requestItems.length > 0
                ? requestDetails.requestItems.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemType?.id || item.itemTypeId,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '',
                    itemCategoryId: ''
                }))
                : [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }];

            setInitialFormData({
                title: requestDetails.title || '',
                description: requestDetails.description || '',
                deadline: deadline,
                employeeRequestedBy: requestDetails.employeeRequestedBy || '',
                items: items
            });

            setIsEditMode(true);
            setShowFormModal(true);

        } catch (error) {
            console.error('Error fetching request details:', error);
            onShowSnackbar('Failed to load request details. Please try again.', 'error');
        }
    };

    const handleDeleteRequest = async (request) => {
        if (!window.confirm('Are you sure you want to delete this request?')) {
            return;
        }

        try {
            console.log('Delete request:', request);
            fetchPendingOrders();
            onShowSnackbar('Delete functionality to be implemented', 'info');
        } catch (error) {
            console.error('Error deleting request:', error);
            onShowSnackbar('Failed to delete request. Please try again.', 'error');
        }
    };

    const handleRowClick = async (row) => {
        const details = await fetchRequestOrderDetails(row.id);
        if (details) {
            setSelectedRequestOrder(details);
            setShowViewModal(true);
        }
    };

    const handleAddRequest = () => {
        setInitialFormData(null);
        setIsEditMode(false);
        setShowFormModal(true);
    };

    const openRestockModal = (restockItems) => {
        const now = new Date();
        const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const deadlineString = deadline.toISOString().slice(0, 16);

        const formattedRestockItems = restockItems.map(item => ({
            ...item,
            parentCategoryId: '',
            itemCategoryId: ''
        }));

        setInitialFormData({
            title: 'Restock Request - Low Stock Items',
            description: `Automatic restock request for ${restockItems.length} item(s) below minimum quantity threshold.`,
            deadline: deadlineString,
            employeeRequestedBy: '',
            items: formattedRestockItems
        });

        setIsEditMode(false);
        setShowFormModal(true);
    };

    const handleFormSubmit = async (formData) => {
        let username = "system";
        const userInfoString = localStorage.getItem('userInfo');

        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo.username) {
                    username = userInfo.username;
                }
            } catch (error) {
                console.error("Error parsing user info:", error);
            }
        }

        const requestPayload = {
            title: formData.title,
            description: formData.description,
            createdBy: username,
            status: 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: warehouseId,
            deadline: formData.deadline,
            employeeRequestedBy: formData.employeeRequestedBy,
            items: formData.items.map(item => ({
                ...(item.id && { id: item.id }),
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || ''
            }))
        };

        try {
            if (isEditMode && selectedRequestOrder) {
                await requestOrderService.update(selectedRequestOrder.id, requestPayload);
            } else {
                await requestOrderService.create(requestPayload);
            }

            fetchPendingOrders();
            onShowSnackbar(isEditMode ? 'Request Order updated successfully!' : 'Request Order created successfully!', 'success');
        } catch (error) {
            console.error('Error saving request order:', error);
            onShowSnackbar(`Error: ${error.message}`, 'error');
        }
    };

    return (
        <div className="pending-request-orders-container">
            <div className="request-orders-section">
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

            {/* Form Modal */}
            <RequestOrderFormModal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                onSubmit={handleFormSubmit}
                isEditMode={isEditMode}
                initialFormData={initialFormData}
                warehouseId={warehouseId}
                itemTypes={itemTypes}
                employees={employees}
                parentCategories={parentCategories}
                onShowSnackbar={onShowSnackbar}
            />

            {/* View Modal */}
            <RequestOrderViewModal
                requestOrder={selectedRequestOrder}
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedRequestOrder(null);
                }}
            />
        </div>
    );
});

export default PendingRequestOrders;