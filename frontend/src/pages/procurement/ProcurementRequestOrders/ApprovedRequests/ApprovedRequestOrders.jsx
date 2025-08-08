import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import RequestOrderViewModal from '../RequestOrderViewModal/RequestOrderViewModal.jsx';
import './ApprovedRequestOrders.scss';
import { offerService } from '../../../../services/procurement/offerService.js';

const ApprovedRequestOrders = ({ onDataChange, requestOrders, loading }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // View modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    const handleViewClick = (row, e) => {
        e.stopPropagation();
        setSelectedRequestOrder(row);
        setShowViewModal(true);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedRequestOrder(null);
    };

    const handleViewOfferClick = async (row, e) => {
        e.stopPropagation();
        try {
            // Fetch the offer associated with this request order
            const offers = await offerService.getByRequestId(row.id);

            if (offers && Array.isArray(offers) && offers.length > 0) {
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

    // Define actions for DataTable
    const actions = [
        {
            label: 'View',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            ),
            onClick: (row) => handleViewClick(row, { stopPropagation: () => {} }),
            className: 'view'
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
                actions={actions}
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

            {/* Request Order View Modal */}
            <RequestOrderViewModal
                requestOrder={selectedRequestOrder}
                isOpen={showViewModal}
                onClose={handleCloseViewModal}
            />
        </div>
    );
};

export default ApprovedRequestOrders;