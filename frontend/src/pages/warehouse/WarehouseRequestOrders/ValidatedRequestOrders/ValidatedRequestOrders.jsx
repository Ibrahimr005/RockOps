import React, { useState, useEffect } from 'react';
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import { useNavigate } from 'react-router-dom';

const ValidatedRequestOrders = ({ warehouseId, refreshTrigger, onShowSnackbar, userRole }) => {
    const navigate = useNavigate();
    const [validatedOrders, setValidatedOrders] = useState([]);
    const [isLoadingValidated, setIsLoadingValidated] = useState(false);

    // Column configuration for validated request orders
    const validatedOrderColumns = [
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
            width: '200px',
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
            width: '200px',
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
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || 'N/A';
            }
        },
        {
            id: 'approvedBy',
            header: 'APPROVED BY',
            accessor: 'approvedBy',
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || row.validatedBy || 'N/A';
            }
        },
        {
            id: 'approvedAt',
            header: 'APPROVED AT',
            accessor: 'approvedAt',
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                const approvedDate = value || row.validatedDate || row.approvedDate;
                return approvedDate ? new Date(approvedDate).toLocaleDateString() : 'N/A';
            }
        }
    ];

    // Filterable columns configuration
    const validatedFilterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
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

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchValidatedOrders();
        }
    }, [warehouseId, refreshTrigger]);

    // Fetch validated request orders
    const fetchValidatedOrders = async () => {
        setIsLoadingValidated(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8080/api/v1/requestOrders/warehouse?warehouseId=${warehouseId}&status=APPROVED`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setValidatedOrders(data);
        } catch (error) {
            console.error('Error fetching validated orders:', error);
            setValidatedOrders([]);
            onShowSnackbar('Failed to fetch validated orders', 'error');
        } finally {
            setIsLoadingValidated(false);
        }
    };

    // Handle row click to navigate to detail page
    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    return (
        <div className="validated-request-orders-container">
            {/* Validated Orders Section */}
            <div className="request-orders-section">


                <div className="request-orders-table-card">
                    <DataTable
                        data={validatedOrders}
                        columns={validatedOrderColumns}
                        onRowClick={handleRowClick}
                        loading={isLoadingValidated}
                        emptyMessage="No validated request orders found"
                        className="request-orders-table"
                        itemsPerPageOptions={[5, 10, 15, 20]}
                        defaultItemsPerPage={10}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={validatedFilterableColumns}
                    />
                </div>
            </div>
        </div>
    );
};

export default ValidatedRequestOrders;