// IncomingRequestOrders.jsx (updated version - only showing changes)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import { offerService } from '../../../../services/procurement/offerService.js';
import RequestOrderModal from "../../../../components/procurement/RequestOrderModal/RequestOrderModal.jsx";
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
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedRowForApproval, setSelectedRowForApproval] = useState(null);
    const [isApproving, setIsApproving] = useState(false);



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

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
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
        setIsEditMode(true);
        setSelectedOrder(row);
        setShowRequestModal(true);
    };



    const handleCloseRequestModal = () => {
        setShowRequestModal(false);
        setIsEditMode(false);
        setSelectedOrder(null);
    };

    const handleRequestModalSuccess = (message) => {
        showSuccessNotification(message);
        if (onDataChange) {
            onDataChange();
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
            minWidth: '200px'  // Changed from 250px
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requesterName',
            sortable: true,
            filterable: true,
            minWidth: '180px'  // Changed from 250px
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'deadline',
            sortable: true,
            minWidth: '150px',  // Changed from 250px
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
            minWidth: '150px'  // Changed from 250px
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '150px',  // Changed from 250px
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
                showExportButton={true}
                exportFileName="incoming-request-orders"
                exportButtonText="Export Request Orders"
                addButtonProps={{
                    title: "Create new request order"
                }}
            />

            {/* Request Order Modal */}
            <RequestOrderModal
                isOpen={showRequestModal}
                onClose={handleCloseRequestModal}
                onSuccess={handleRequestModalSuccess}
                onError={showErrorNotification}
                isEditMode={isEditMode}
                existingOrder={selectedOrder}
                userType="PROCUREMENT"
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


        </div>
    );
};

export default IncomingRequestOrders;