import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2';
import { logisticsService } from '../../../../services/procurement/logisticsService';

const CompletedLogistics = ({ onCountChange }) => {
    const navigate = useNavigate();
    const [logistics, setLogistics] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchLogistics();
    }, []);

    const fetchLogistics = async () => {
        setLoading(true);
        try {
            const data = await logisticsService.getCompleted();
            console.log('Completed logistics response:', data);
            setLogistics(data);
            if (onCountChange) {
                onCountChange(data.length);
            }
        } catch (error) {
            console.error('Error fetching completed logistics:', error);
            showErrorNotification('Failed to load completed logistics');
        } finally {
            setLoading(false);
        }
    };

    const showErrorNotification = (message) => {
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/logistics/${row.id}`);
    };

    const getPaymentStatusIcon = (paymentStatus) => {
        switch (paymentStatus) {
            case 'PAID':
                return <FiCheckCircle size={14} />;
            case 'REJECTED':
                return <FiXCircle size={14} />;
            default:
                return null;
        }
    };

    const formatPaymentStatus = (status) => {
        if (!status) return 'Unknown';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
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
            id: 'completedDate',
            header: 'COMPLETED AT',
            accessor: 'approvedAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="logistics-date">
                    {row.approvedAt
                        ? new Date(row.approvedAt).toLocaleDateString('en-GB')
                        : row.rejectedAt
                            ? new Date(row.rejectedAt).toLocaleDateString('en-GB')
                            : '-'
                    }
                </span>
            )
        },
        {
            id: 'paymentStatus',
            header: 'PAYMENT STATUS',
            accessor: 'paymentStatus',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className={`logistics-table-payment-status logistics-table-payment-status--${row.paymentStatus?.toLowerCase() || 'unknown'}`}>
            {formatPaymentStatus(row.paymentStatus)}
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
            header: 'Payment Status',
            accessor: 'paymentStatus',
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
                emptyMessage="No completed logistics found"
                className="logistics-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 20, 50, 100]}
                showExportButton={true}
                exportFileName={`completed-logistics-${new Date().toISOString().split('T')[0]}`}
                exportButtonText="Export Completed"
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

export default CompletedLogistics;