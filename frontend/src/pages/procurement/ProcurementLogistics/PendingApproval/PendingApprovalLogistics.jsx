import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2';
import CreateLogisticsModal from '../CreateLogisticsModal/CreateLogisticsModal';
import { logisticsService } from '../../../../services/procurement/logisticsService';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';

const PendingApprovalLogistics = ({ onCountChange }) => {
    const navigate = useNavigate();
    const [logistics, setLogistics] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);

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

            // Filter POs that have items
            const filtered = allPOs.filter(po => {
                const items = po.purchaseOrderItems || [];
                console.log(`PO ${po.poNumber}: has ${items.length} items, will ${items.length > 0 ? 'INCLUDE' : 'EXCLUDE'}`);
                return items.length > 0;
            });

            console.log('Filtered POs with items:', filtered);

            // Transform items to match modal expectations
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
                    itemType: item.itemType  // ✅ ADD THIS LINE - include the full itemType object
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

    const handleCloseModal = () => {
        setShowCreateModal(false);
    };

    const handleModalSuccess = (message) => {
        showSuccessNotification(message);
        fetchLogistics(); // Refresh the list
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
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '150px'
        },
        {
            id: 'createdAt',
            header: 'DATE',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="logistics-date">
                    {new Date(row.createdAt).toLocaleDateString('en-GB')}
                </span>
            )
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

            <CreateLogisticsModal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                onSuccess={handleModalSuccess}
                onError={showErrorNotification}
                availablePurchaseOrders={availablePurchaseOrders}
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </>
    );
};

export default PendingApprovalLogistics;