import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { siteService } from '../../../../services/siteService.js';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService.js';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService.js';
import { employeeService } from '../../../../services/hr/employeeService.js';
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import { offerService } from '../../../../services/procurement/offerService.js';
import RequestOrderViewModal from "../RequestOrderViewModal/RequestOrderViewModal.jsx";
import IncomingRequestOrderFormModal from '../RequestOrderFormModal/RequestOrderFormModal.jsx'; // NEW IMPORT
import './IncomingRequestOrders.scss';

const IncomingRequestOrders = ({
                                   onDataChange,
                                   requestOrders,
                                   loading
                               }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Modal states
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [initialFormData, setInitialFormData] = useState(null);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedRowForApproval, setSelectedRowForApproval] = useState(null);
    const [isApproving, setIsApproving] = useState(false);

    // View modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);

    // Data for form modal
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setSites([]);
            setItemTypes([]);
            setEmployees([]);
            setParentCategories([]);

            await Promise.all([
                fetchSites(),
                fetchItemTypes(),
                fetchEmployees(),
                fetchParentCategories()
            ]);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setSites([]);
            setItemTypes([]);
            setEmployees([]);
            setParentCategories([]);
            showErrorNotification('Failed to load initial data');
        }
    };

    const fetchSites = async () => {
        try {
            const response = await siteService.getAllSites();
            const data = response.data || response;
            setSites(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching sites:', err);
            setSites([]);
            showErrorNotification('Failed to load sites');
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching item types:', err);
            setItemTypes([]);
            showErrorNotification('Failed to load item types');
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            const employeesData = response.data || response;
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setEmployees([]);
            showErrorNotification('Failed to load employees');
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            setParentCategories([]);
        }
    };

    const showErrorNotification = (message) => {
        console.error('Error notification:', message);
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
    };

    const showSuccessNotification = (message) => {
        console.log('Success notification:', message);
        setNotificationMessage(String(message || 'Operation successful'));
        setNotificationType('success');
        setShowNotification(true);
    };

    const handleRowClick = (row) => {
        setSelectedRequestOrder(row);
        setShowViewModal(true);
    };

    const handleApproveClick = async (row, e) => {
        e.stopPropagation();
        setSelectedRowForApproval(row);
        setShowConfirmDialog(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedRowForApproval) return;

        setIsApproving(true);

        try {
            await requestOrderService.updateStatus(selectedRowForApproval.id, 'APPROVED');

            const offerData = {
                requestOrderId: selectedRowForApproval.id,
                title: `Procurement Offer for: ${selectedRowForApproval.title}`,
                description: `This procurement offer responds to the request "${selectedRowForApproval.title}".
        Original request description: ${selectedRowForApproval.description}`,
                status: 'UNSTARTED',
                validUntil: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                offerItems: []
            };

            const createdOffer = await offerService.create(offerData);
            console.log('📦 CREATED OFFER:', createdOffer);

            showSuccessNotification('Request Order approved successfully! Redirecting to offers...');

            if (onDataChange) {
                onDataChange();
            }

            setTimeout(() => {
                navigate('/procurement/offers', {
                    state: {
                        newOffer: createdOffer,
                        activeTab: 'unstarted'
                    }
                });
            }, 0);

        } catch (err) {
            console.error('Error approving request order:', err);
            showErrorNotification(`${err.message || 'Failed to accept request order'}`);
        } finally {
            setIsApproving(false);
            setShowConfirmDialog(false);
            setSelectedRowForApproval(null);
        }
    };

    const handleCancelApproval = () => {
        setShowConfirmDialog(false);
        setSelectedRowForApproval(null);
        setIsApproving(false);
    };

    const handleEditClick = (row, e) => {
        e.stopPropagation();
        handleOpenEditModal(row);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedRequestOrder(null);
    };

    const handleAddClick = () => {
        setIsEditMode(false);
        setCurrentOrderId(null);
        setInitialFormData(null);
        setShowFormModal(true);
    };

    const getUserInfo = () => {
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
        return username;
    };

    const handleFormSubmit = async (formData) => {
        const username = getUserInfo();

        if (!formData.title || !formData.description || !formData.requesterId || !formData.deadline) {
            showErrorNotification('Please fill in all required fields');
            return;
        }

        if (!formData.items.some(item => item.itemTypeId && item.quantity)) {
            showErrorNotification('Please add at least one item with type and quantity');
            return;
        }

        const requestPayload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            createdBy: isEditMode ? undefined : username,
            updatedBy: isEditMode ? username : undefined,
            status: formData.status || 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: formData.requesterId,
            employeeRequestedBy: formData.employeeRequestedBy || null,
            deadline: formData.deadline,
            items: formData.items
                .filter(item => item.itemTypeId && item.quantity)
                .map(item => ({
                    ...(item.id && { id: item.id }),
                    itemTypeId: item.itemTypeId,
                    quantity: parseFloat(item.quantity),
                    comment: (item.comment || '').trim()
                }))
        };

        console.log(isEditMode ? 'Updating' : 'Creating', 'request with payload:', JSON.stringify(requestPayload, null, 2));

        try {
            if (isEditMode && currentOrderId) {
                await requestOrderService.update(currentOrderId, requestPayload);
            } else {
                await requestOrderService.create(requestPayload);
            }

            if (onDataChange) {
                onDataChange();
            }

            showSuccessNotification(isEditMode ? 'Request Order updated successfully' : 'Request Order created successfully');
        } catch (err) {
            console.error('Full error object:', err);

            let errorMessage = isEditMode ? 'Failed to update request order' : 'Failed to create request order';

            if (err.response) {
                console.error('Server error details:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data
                });

                if (err.response.data) {
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (err.response.data.message) {
                        errorMessage = err.response.data.message;
                    } else if (err.response.data.error) {
                        errorMessage = err.response.data.error;
                    } else {
                        errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
                    }
                } else {
                    errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
                }
            } else if (err.request) {
                console.error('Network error - no response received:', err.request);
                errorMessage = 'Network error - please check your connection and try again';
            } else {
                console.error('Request setup error:', err.message);
                errorMessage = err.message || 'Unknown error occurred';
            }

            showErrorNotification(`${errorMessage}`);
        }
    };

    const handleOpenEditModal = async (order) => {
        try {
            setIsEditMode(true);
            setCurrentOrderId(order.id);

            const deadline = order.deadline
                ? new Date(order.deadline).toISOString().slice(0, 16)
                : '';

            let itemsToSet = [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }];

            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToSet = order.items.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemTypeId,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '',
                    itemCategoryId: ''
                }));
            } else if (order.requestItems && Array.isArray(order.requestItems) && order.requestItems.length > 0) {
                itemsToSet = order.requestItems.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemTypeId || item.itemType?.id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '',
                    itemCategoryId: ''
                }));
            }

            setInitialFormData({
                title: order.title || '',
                description: order.description || '',
                siteId: order.siteId || '',
                requesterId: order.requesterId || '',
                requesterName: order.requesterName || '',
                status: order.status || 'PENDING',
                deadline: deadline,
                employeeRequestedBy: order.employeeRequestedBy || '',
                items: itemsToSet
            });

            setShowFormModal(true);
        } catch (error) {
            console.error('Error opening edit modal:', error);
            showErrorNotification('Failed to open edit modal');
        }
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requesterName',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'deadline',
            sortable: true,
            minWidth: '250px',
            render: (row) => (
                <span className="pro-roi-date-cell">
                    {new Date(row.deadline).toLocaleDateString()}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '250px',
            render: (row) => (
                <span className="pro-roi-date-cell">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'Approve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleApproveClick(row, { stopPropagation: () => {} }),
            className: 'approve'
        },
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            onClick: (row) => handleEditClick(row, { stopPropagation: () => {} }),
            className: 'edit'
        }
    ];

    const filterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Requester',
            accessor: 'requesterName',
            filterType: 'select'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        }
    ];

    return (
        <div className="pro-roi-incoming-requests-container">
            <DataTable
                data={requestOrders || []}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No incoming requests found"
                className="pro-roi-incoming-requests-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showAddButton={true}
                addButtonText="Add Request Order"
                addButtonIcon={<FaPlus />}
                onAddClick={handleAddClick}
                showExportButton={true}
                exportFileName="incoming-request-orders"
                exportButtonText="Export Request Orders"
                addButtonProps={{
                    title: "Create new request order"
                }}
            />

            {/* Form Modal */}
            <IncomingRequestOrderFormModal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                onSubmit={handleFormSubmit}
                isEditMode={isEditMode}
                initialFormData={initialFormData}
                sites={sites}
                itemTypes={itemTypes}
                employees={employees}
                parentCategories={parentCategories}
                onShowSnackbar={showErrorNotification}
            />

            {/* Confirmation Dialog for Approval */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="success"
                title="Approve Request Order"
                message={`Are you sure you want to approve "${selectedRowForApproval?.title}"? This will create a new procurement offer.`}
                confirmText="Approve & Create Offer"
                cancelText="Cancel"
                onConfirm={handleConfirmApproval}
                onCancel={handleCancelApproval}
                isLoading={isApproving}
                size="large"
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />

            {/* Request Order View Modal */}
            <RequestOrderViewModal
                requestOrder={selectedRequestOrder}
                isOpen={showViewModal}
                onClose={handleCloseViewModal}
            />
        </div>
    );
};

export default IncomingRequestOrders;