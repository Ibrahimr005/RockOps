import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import './IncomingRequestOrders.scss';

const IncomingRequestOrders = ({ onEditRequest, onDataChange, requestOrders, loading }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    const handleApproveClick = async (row, e) => {
        e.stopPropagation(); // Prevent row click

        if (window.confirm('Are you sure you want to approve this request and create an offer?')) {
            try {
                // Step 1: Update the request order status
                const token = localStorage.getItem('token');
                const updateResponse = await fetch(`http://localhost:8080/api/v1/requestOrders/${row.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'APPROVED' })
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update request order status');
                }

                // Step 2: Create a new offer based on this request order
                const offerData = {
                    requestOrderId: row.id,
                    title: `Procurement Offer for: ${row.title}`,
                    description: `This procurement offer responds to the request "${row.title}".
            Original request description: ${row.description}`,
                    status: 'UNSTARTED',
                    validUntil: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    offerItems: []
                };

                const createOfferResponse = await fetch('http://localhost:8080/api/v1/offers', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(offerData)
                });

                if (!createOfferResponse.ok) {
                    setNotificationMessage('Failed to accept request order');
                    setShowNotification(true);
                    setNotificationType("error");
                    return;
                }

                // Success notification
                setNotificationMessage('Request Order accepted successfully, Visit Offers to start on the offer.');
                setShowNotification(true);
                setNotificationType("success");

                // Refresh the request orders list in parent
                if (onDataChange) {
                    onDataChange();
                }
            } catch (err) {
                console.error('Error approving request order:', err);
                setNotificationMessage(`Error: ${err.message}`);
                setShowNotification(true);
                setNotificationType("error");
            }
        }
    };

    const handleEditClick = (row, e) => {
        e.stopPropagation(); // Prevent row click

        if (onEditRequest) {
            onEditRequest(row);
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
                <span className="date-cell">
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
                <span className="date-cell">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            )
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'Approve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleApproveClick(row, { stopPropagation: () => {} }),
            className: 'approve-action'
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
            className: 'edit-action'
        }
    ];

    // Define filterable columns
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
        <div className="incoming-requests-container">
            <DataTable
                data={requestOrders || []}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No incoming requests found"
                className="incoming-requests-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
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