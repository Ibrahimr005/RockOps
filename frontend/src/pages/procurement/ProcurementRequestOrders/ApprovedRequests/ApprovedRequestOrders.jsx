import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import './ApprovedRequestOrders.scss';

const ApprovedRequestOrders = ({ onDataChange, requestOrders, loading }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    const handleViewOfferClick = async (row) => {
        try {
            // Fetch the offer associated with this request order
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/offers/by-request/${row.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch offer details');
            }

            const offers = await response.json();

            if (offers && offers.length > 0) {
                // Navigate to the first offer associated with this request
                navigate(`/procurement/offers/${offers[0].id}`);
            } else {
                setNotificationMessage('No offers found for this request');
                setShowNotification(true);
                setNotificationType('error');
            }
        } catch (err) {
            console.error('Error fetching offer:', err);
            setNotificationMessage(`Error: ${err.message}`);
            setShowNotification(true);
            setNotificationType('error');
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
            minWidth: '200px'
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
            minWidth: '200px',
            render: (row) => (
                <span className="pro-roa-date-cell">
                    {row.deadline ? new Date(row.deadline).toLocaleDateString() : '-'}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => row.createdBy || '-'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '200px',
            render: (row) => (
                <span className="pro-roa-date-cell">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            )
        },
        {
            id: 'approvedAt',
            header: 'APPROVED AT',
            accessor: 'approvedAt',
            sortable: true,
            minWidth: '200px',
            render: (row) => (
                <span className="pro-roa-date-cell">
                    {row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : '-'}
                </span>
            )
        },
        {
            id: 'approvedBy',
            header: 'APPROVED BY',
            accessor: 'approvedBy',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => row.approvedBy || '-'
        }
    ];

    // Define actions for DataTable (commented out as per original)
    const actions = [
        {
            label: 'View Offer',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            ),
            onClick: (row) => handleViewOfferClick(row),
            className: 'view-action'
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
        },
        {
            header: 'Approved By',
            accessor: 'approvedBy',
            filterType: 'select'
        }
    ];

    return (
        <div className="pro-roa-approved-requests-container">
            <DataTable
                data={requestOrders || []}
                columns={columns}
                actions={[]} // Empty actions array since original had actions commented out
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No approved requests found"
                className="pro-roa-approved-requests-table"
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

export default ApprovedRequestOrders;