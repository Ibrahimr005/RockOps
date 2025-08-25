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
import { financeService } from '../../../../services/financeService.js';
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

            console.log('=== FETCHING INVOICES ===');

            const response = await financeService.invoices.getAll(0, 100); // page=0, size=100 to get more invoices

            console.log('Raw invoices response:', response);

            // Extract data from Axios response
            const data = response.data || response;

            console.log('Extracted invoices data:', data);

            // Handle both paginated and non-paginated responses
            let invoiceList = [];
            if (Array.isArray(data)) {
                invoiceList = data;
            } else if (data && Array.isArray(data.content)) {
                invoiceList = data.content;
            } else if (data && Array.isArray(data.data)) {
                invoiceList = data.data;
            }

            console.log('Final invoices list:', invoiceList);
            console.log('Invoices count:', invoiceList.length);

            setInvoices(invoiceList);

            if (invoiceList.length === 0) {
                showSuccess('No invoices found. You can create your first invoice using the "Create Invoice" button.');
            } else {
                console.log('Sample invoice:', invoiceList[0]);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showError('Could not fetch invoices: ' + error.message);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        try {
            if (!currentUser) {
                showError('User information not found. Please log in again.');
                return;
            }

            const invoiceData = {
                ...invoiceForm,
                totalAmount: parseFloat(invoiceForm.totalAmount),
                createdBy: currentUser.username || currentUser.name || currentUser.email
            };

            console.log('Creating invoice with data:', invoiceData);

            await financeService.invoices.create(invoiceData);

            showSuccess('Invoice created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error('Error creating invoice:', error);
            showError('Failed to create invoice: ' + error.message);
        }
    };

    const handleEditInvoice = async (e) => {
        e.preventDefault();
        try {
            if (!currentUser) {
                showError('User information not found. Please log in again.');
                return;
            }

            const invoiceData = {
                ...invoiceForm,
                totalAmount: parseFloat(invoiceForm.totalAmount),
                updatedBy: currentUser.username || currentUser.name || currentUser.email
            };

            console.log('Updating invoice with data:', invoiceData);

            await financeService.invoices.update(selectedInvoice.id, invoiceData);

            showSuccess('Invoice updated successfully');
            setShowEditModal(false);
            setSelectedInvoice(null);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error('Error updating invoice:', error);
            showError('Failed to update invoice: ' + error.message);
        }
    };

    const handleDeleteInvoice = async (invoice) => {
        if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
            try {
                console.log('Deleting invoice:', invoice.id);

                await financeService.invoices.delete(invoice.id);

                showSuccess('Invoice deleted successfully');
                fetchInvoices();
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