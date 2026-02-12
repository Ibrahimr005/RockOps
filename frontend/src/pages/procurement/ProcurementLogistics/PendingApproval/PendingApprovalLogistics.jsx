import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import Snackbar from '../../../../components/common/Snackbar/Snackbar';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import CreateLogisticsModal from '../CreateLogisticsModal/CreateLogisticsModal';
import { logisticsService } from '../../../../services/procurement/logisticsService';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';

const PendingApprovalLogistics = ({ onCountChange }) => {
    const navigate = useNavigate();
    const [logistics, setLogistics] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLogistics, setSelectedLogistics] = useState(null);
    const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);

    // Delete state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [logisticsToDelete, setLogisticsToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Notification state
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchLogistics();
    }, []);

    const fetchLogistics = async () => {
        setLoading(true);
        try {
            const data = await logisticsService.getPendingApproval();
            setLogistics(data);
            if (onCountChange) {
                onCountChange(data.length);
            }
        } catch (error) {
            console.error('Error fetching pending logistics:', error);
            showErrorNotification('Failed to load pending logistics');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailablePurchaseOrders = async () => {
        try {
            console.log('Fetching purchase orders...');
            const allPOs = await purchaseOrderService.getAll();
            console.log('All POs with items:', allPOs);

            const filtered = allPOs.filter(po => {
                const items = po.purchaseOrderItems || [];
                console.log(`PO ${po.poNumber}: has ${items.length} items, will ${items.length > 0 ? 'INCLUDE' : 'EXCLUDE'}`);
                return items.length > 0;
            });

            console.log('Filtered POs with items:', filtered);

            const transformedPOs = filtered.map(po => ({
                ...po,
                items: po.purchaseOrderItems.map(item => ({
                    id: item.id,
                    itemTypeName: item.itemType?.name || 'Unknown',
                    quantity: item.quantity,
                    measuringUnit: item.itemType?.measuringUnit || '',
                    currency: po.currency || 'EGP',
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    merchantName: item.merchant?.name || '',
                    itemType: item.itemType
                })),
                merchantName: po.requestOrder?.requesterName || 'N/A'
            }));

            console.log('Transformed POs ready for modal:', transformedPOs);
            setAvailablePurchaseOrders(transformedPOs);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            showErrorNotification('Failed to load purchase orders');
        }
    };

    const showErrorNotification = (message) => {
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
    };

    const showSuccessNotification = (message) => {
        setNotificationMessage(String(message || 'Operation successful'));
        setNotificationType('success');
        setShowNotification(true);
    };

    const handleAddLogistics = async () => {
        await fetchAvailablePurchaseOrders();
        setShowCreateModal(true);
    };

    const handleEdit = async (logistics) => {
        await fetchAvailablePurchaseOrders();
        setSelectedLogistics(logistics);
        setShowEditModal(true);
    };

    const handleDeleteClick = (logistics) => {
        setLogisticsToDelete(logistics);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!logisticsToDelete) return;

        setIsDeleting(true);
        try {
            await logisticsService.delete(logisticsToDelete.id);
            showSuccessNotification('Logistics deleted successfully');
            fetchLogistics();
            setShowDeleteDialog(false);
            setLogisticsToDelete(null);
        } catch (error) {
            console.error('Error deleting logistics:', error);
            showErrorNotification(error.message || 'Failed to delete logistics');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteDialog(false);
        setLogisticsToDelete(null);
    };

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedLogistics(null);
    };

    const handleCreateSuccess = (message) => {
        showSuccessNotification(message);
        fetchLogistics();
    };

    const handleEditSuccess = (message) => {
        showSuccessNotification(message);
        fetchLogistics();
        handleCloseEditModal();
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/logistics/${row.id}`);
    };

    const columns = [
        {
            id: 'logisticsNumber',
            header: 'LOGISTICS #',
            accessor: 'logisticsNumber',
            sortable: true,
            filterable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="logistics-number">
                    {row.logisticsNumber}
                </span>
            )
        },
        {
            id: 'merchantName',
            header: 'SERVICE',
            accessor: 'merchantName',
            sortable: true,
            filterable: true,
            minWidth: '200px'
        },
        {
            id: 'driverName',
            header: 'DRIVER',
            accessor: 'driverName',
            sortable: true,
            filterable: true,
            minWidth: '150px'
        },
        {
            id: 'totalCost',
            header: 'COST',
            accessor: 'totalCost',
            sortable: true,
            minWidth: '120px',
            render: (row) => (
                <span className="logistics-cost">
                    {row.currency} {parseFloat(row.totalCost).toFixed(2)}
                </span>
            )
        },
        {
            id: 'purchaseOrderCount',
            header: 'POs',
            accessor: 'purchaseOrderCount',
            sortable: true,
            minWidth: '80px',
            render: (row) => (
                <span className="po-count-badge">
                    {row.purchaseOrderCount}
                </span>
            )
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="logistics-date">
                    {new Date(row.createdAt).toLocaleDateString('en-GB')}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '150px'
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FiEdit />,
            onClick: (row) => handleEdit(row),
            className: 'edit'
        },
        {
            label: 'Delete',
            icon: <FiTrash />,
            onClick: (row) => handleDeleteClick(row),
            className: 'delete'
        }
    ];

    const filterableColumns = [
        {
            header: 'Logistics #',
            accessor: 'logisticsNumber',
            filterType: 'text'
        },
        {
            header: 'Service',
            accessor: 'merchantName',
            filterType: 'select'
        },
        {
            header: 'Driver',
            accessor: 'driverName',
            filterType: 'select'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        }
    ];

    return (
        <>
            <DataTable
                data={logistics}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No pending logistics entries"
                className="logistics-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 20, 50, 100]}
                showAddButton={true}
                addButtonText="Create Logistics"
                addButtonIcon={<FiPlus />}
                onAddClick={handleAddLogistics}
                showExportButton={true}
                exportFileName={`pending-logistics-${new Date().toISOString().split('T')[0]}`}
                exportButtonText="Export Logistics"
            />

            {/* Create Modal */}
            <CreateLogisticsModal
                isOpen={showCreateModal}
                onClose={handleCloseCreateModal}
                onSuccess={handleCreateSuccess}
                onError={showErrorNotification}
                availablePurchaseOrders={availablePurchaseOrders}
            />

            {/* Edit Modal */}
            {selectedLogistics && (
                <CreateLogisticsModal
                    isOpen={showEditModal}
                    onClose={handleCloseEditModal}
                    onSuccess={handleEditSuccess}
                    onError={showErrorNotification}
                    availablePurchaseOrders={availablePurchaseOrders}
                    existingLogistics={selectedLogistics}
                    isEditMode={true}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDeleteDialog}
                type="danger"
                title="Delete Logistics?"
                message={`Are you sure you want to delete logistics "${logisticsToDelete?.logisticsNumber}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                size="medium"
                isLoading={isDeleting}
            />

            <Snackbar
                type={notificationType}
                message={notificationMessage}
                show={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </>
    );
};

export default PendingApprovalLogistics;