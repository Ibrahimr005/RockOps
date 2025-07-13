// src/pages/finance/Payables/InvoiceManagement/InvoiceManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    FaPlus,
    FaEdit,
    FaEye,
    FaTrash,
    FaFileInvoiceDollar,
    FaSearch,
    FaFilter,
    FaDownload,
    FaExclamationTriangle,
    FaClock
} from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { useAuth } from "../../../../contexts/AuthContext";
import './InvoiceManagement.css';

const InvoiceManagement = () => {
    const { showSuccess, showError } = useSnackbar();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Invoice form state
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        vendorName: '',
        totalAmount: '',
        invoiceDate: '',
        dueDate: '',
        description: ''
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('Fetching invoices from: http://localhost:8080/api/v1/invoices');

            const response = await fetch('http://localhost:8080/api/v1/invoices', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched invoices:', data);

            // Handle both paginated and non-paginated responses
            const invoiceList = data.content || data || [];
            setInvoices(invoiceList);

            if (invoiceList.length === 0) {
                showSuccess('No invoices found. You can create your first invoice using the "Create Invoice" button.');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showError('Could not fetch invoices. Please try again.');
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            if (!currentUser) {
                showError('User information not found. Please log in again.');
                return;
            }

            const response = await fetch('http://localhost:8080/api/v1/invoices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...invoiceForm,
                    totalAmount: parseFloat(invoiceForm.totalAmount),
                    createdBy: currentUser.username || currentUser.name || currentUser.email
                }),
            });

            if (response.ok) {
                showSuccess('Invoice created successfully');
                setShowCreateModal(false);
                resetForm();
                fetchInvoices();
            } else {
                const errorText = await response.text();
                try {
                    const error = JSON.parse(errorText);
                    showError(error.error || 'Failed to create invoice');
                } catch (parseError) {
                    showError(`Failed to create invoice: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            showError('Failed to create invoice: ' + error.message);
        }
    };

    const handleEditInvoice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            if (!currentUser) {
                showError('User information not found. Please log in again.');
                return;
            }

            const response = await fetch(`http://localhost:8080/api/v1/invoices/${selectedInvoice.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...invoiceForm,
                    totalAmount: parseFloat(invoiceForm.totalAmount),
                    updatedBy: currentUser.username || currentUser.name || currentUser.email
                }),
            });

            if (response.ok) {
                showSuccess('Invoice updated successfully');
                setShowEditModal(false);
                setSelectedInvoice(null);
                resetForm();
                fetchInvoices();
            } else {
                const errorText = await response.text();
                try {
                    const error = JSON.parse(errorText);
                    showError(error.error || 'Failed to update invoice');
                } catch (parseError) {
                    showError(`Failed to update invoice: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('Error updating invoice:', error);
            showError('Failed to update invoice: ' + error.message);
        }
    };

    const handleDeleteInvoice = async (invoice) => {
        if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                    showError('Authentication token not found. Please log in again.');
                    return;
                }

                const response = await fetch(`http://localhost:8080/api/v1/invoices/${invoice.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    showSuccess('Invoice deleted successfully');
                    fetchInvoices();
                } else {
                    showError(`Failed to delete invoice: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error('Error deleting invoice:', error);
                showError('Failed to delete invoice: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setInvoiceForm({
            invoiceNumber: '',
            vendorName: '',
            totalAmount: '',
            invoiceDate: '',
            dueDate: '',
            description: ''
        });
    };

    const openEditModal = (invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceForm({
            invoiceNumber: invoice.invoiceNumber,
            vendorName: invoice.vendorName,
            totalAmount: invoice.totalAmount?.toString() || '',
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            description: invoice.description || ''
        });
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    // Safe filtering with null checks
    const filteredInvoices = invoices.filter(invoice => {
        if (!invoice) return false;

        const invoiceNumber = invoice.invoiceNumber || '';
        const vendorName = invoice.vendorName || '';
        const searchLower = searchTerm.toLowerCase();

        return invoiceNumber.toLowerCase().includes(searchLower) ||
            vendorName.toLowerCase().includes(searchLower);
    });

    // Table columns configuration
    const columns = [
        {
            id: 'invoiceNumber',
            header: 'Invoice #',
            accessor: 'invoiceNumber',
            sortable: true
        },
        {
            id: 'vendorName',
            header: 'Vendor',
            accessor: 'vendorName',
            sortable: true
        },
        {
            id: 'totalAmount',
            header: 'Total Amount',
            accessor: 'totalAmount',
            sortable: true,
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'remainingBalance',
            header: 'Remaining',
            accessor: 'remainingBalance',
            sortable: true,
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'invoiceDate',
            header: 'Invoice Date',
            accessor: 'invoiceDate',
            sortable: true,
            render: (row, value) => {
                try {
                    return value ? new Date(value).toLocaleDateString() : 'N/A';
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'dueDate',
            header: 'Due Date',
            accessor: 'dueDate',
            sortable: true,
            render: (row, value) => {
                try {
                    const date = value ? new Date(value).toLocaleDateString() : 'N/A';
                    const isOverdue = value && new Date(value) < new Date();
                    return (
                        <span className={isOverdue ? 'overdue-date' : ''}>
                            {isOverdue && <FaExclamationTriangle className="overdue-icon" />}
                            {date}
                        </span>
                    );
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'pending'}`}>
                    {value?.replace('_', ' ') || 'Pending'}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'Created By',
            accessor: 'createdBy',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'pending'}`}>
                    {value?.replace('_', ' ') || 'Pending'}
                </span>
            )
        },
    ];

    // Table actions
    const actions = [
        // {
        //     label: 'View',
        //     icon: <FaEye />,
        //     onClick: (invoice) => {
        //         showSuccess(`Viewing invoice ${invoice.invoiceNumber}`);
        //     },
        //     className: 'view'
        // },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: openEditModal,
            className: 'edit',
            isDisabled: (invoice) => invoice.status === 'FULLY_PAID' || invoice.status === 'CANCELLED'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: handleDeleteInvoice,
            className: 'danger',
            isDisabled: (invoice) => invoice.status === 'FULLY_PAID' || invoice.status === 'PARTIALLY_PAID'
        }
    ];

    // Filter options for the DataTable
    const filterableColumns = [
        {
            accessor: 'vendorName',
            header: 'Vendor',
            filterType: 'text'
        },
        {
            accessor: 'status',
            header: 'Status',
            filterType: 'select'
        }
    ];

    if (loading) {
        return (
            <div className="invoice-management">
                <div className="loading-container">Loading invoices...</div>
            </div>
        );
    }

    return (
        <div className="invoice-management">
            {/* Header */}
            <div className="payables-card-header">
                <h3 className="payables-card-title">
                    <FaFileInvoiceDollar />
                    Invoice Management
                </h3>
                <div className="payables-card-actions">
                    {/*<button*/}
                    {/*    className="payables-btn payables-btn-secondary"*/}
                    {/*    onClick={fetchInvoices}*/}
                    {/*    disabled={loading}*/}
                    {/*>*/}
                    {/*    <FaDownload />*/}
                    {/*    Refresh*/}
                    {/*</button>*/}
                    <button
                        className="payables-btn payables-btn-primary"
                        onClick={openCreateModal}
                    >
                        <FaPlus />
                        Create Invoice
                    </button>
                </div>
            </div>

            {/*/!* Search Filter *!/*/}
            {/*<div className="invoice-filters">*/}
            {/*    <div className="invoice-filters__group invoice-filters__search">*/}
            {/*        <label className="invoice-filters__label">Search:</label>*/}
            {/*        <div className="invoice-filters__search-wrapper">*/}
            {/*            <FaSearch className="invoice-filters__search-icon" />*/}
            {/*            <input*/}
            {/*                type="text"*/}
            {/*                placeholder="Search by invoice number or vendor"*/}
            {/*                value={searchTerm}*/}
            {/*                onChange={(e) => setSearchTerm(e.target.value)}*/}
            {/*                className="invoice-filters__search-input"*/}
            {/*            />*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/* Quick Stats */}
            <div className="invoice-stats">
                <div className="stat-item-invoice">
                    <FaFileInvoiceDollar className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{invoices.length}</span>
                        <span className="stat-label">Total Invoices</span>
                    </div>
                </div>
                <div className="stat-item-overdue">
                    <FaExclamationTriangle className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">
                            {invoices.filter(inv => inv.status === 'OVERDUE').length}
                        </span>
                        <span className="stat-label">Overdue</span>
                    </div>
                </div>
                <div className="stat-item-pending">
                    <FaClock className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">
                            {invoices.filter(inv => inv.status === 'PENDING').length}
                        </span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="payables-table">
                <DataTable
                    data={filteredInvoices}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 20, 50]}
                    emptyMessage="No invoices found. Click 'Create Invoice' to add your first invoice."
                    className="invoice-table"
                />
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Invoice</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateInvoice} className="modal-content">
                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Invoice Number *</label>
                                    <input
                                        type="text"
                                        className="payables-form-input"
                                        value={invoiceForm.invoiceNumber}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Vendor Name *</label>
                                    <input
                                        type="text"
                                        className="payables-form-input"
                                        value={invoiceForm.vendorName}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, vendorName: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Total Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="payables-form-input"
                                        value={invoiceForm.totalAmount}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, totalAmount: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Invoice Date *</label>
                                    <input
                                        type="date"
                                        className="payables-form-input"
                                        value={invoiceForm.invoiceDate}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="payables-form-group">
                                <label className="payables-form-label">Due Date *</label>
                                <input
                                    type="date"
                                    className="payables-form-input"
                                    value={invoiceForm.dueDate}
                                    onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="payables-form-group">
                                <label className="payables-form-label">Description</label>
                                <textarea
                                    className="payables-form-textarea"
                                    value={invoiceForm.description}
                                    onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="payables-btn payables-btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="payables-btn payables-btn-primary"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Invoice Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit Invoice</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleEditInvoice} className="modal-content">
                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Invoice Number *</label>
                                    <input
                                        type="text"
                                        className="payables-form-input"
                                        value={invoiceForm.invoiceNumber}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Vendor Name *</label>
                                    <input
                                        type="text"
                                        className="payables-form-input"
                                        value={invoiceForm.vendorName}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, vendorName: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Total Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="payables-form-input"
                                        value={invoiceForm.totalAmount}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, totalAmount: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Invoice Date *</label>
                                    <input
                                        type="date"
                                        className="payables-form-input"
                                        value={invoiceForm.invoiceDate}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="payables-form-group">
                                <label className="payables-form-label">Due Date *</label>
                                <input
                                    type="date"
                                    className="payables-form-input"
                                    value={invoiceForm.dueDate}
                                    onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="payables-form-group">
                                <label className="payables-form-label">Description</label>
                                <textarea
                                    className="payables-form-textarea"
                                    value={invoiceForm.description}
                                    onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="payables-btn payables-btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="payables-btn payables-btn-primary"
                                >
                                    Update Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagement;