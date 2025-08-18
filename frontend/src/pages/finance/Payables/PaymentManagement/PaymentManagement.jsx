// src/pages/finance/Payables/PaymentManagement/PaymentManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    FaPlus,
    FaEye,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaCheckCircle,
    FaCreditCard,
    FaSearch,
    FaDownload,
    FaCalendarAlt,
    FaExclamationCircle
} from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { useAuth } from "../../../../contexts/AuthContext";
import { financeService } from '../../../../services/financeService.js';
import './PaymentManagement.css';

const PaymentManagement = () => {
    const { showSuccess, showError } = useSnackbar();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [validationResult, setValidationResult] = useState(null);

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        notes: ''
    });

    // Payment methods options
    const paymentMethods = [
        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
        { value: 'CHECK', label: 'Check' },
        { value: 'CREDIT_CARD', label: 'Credit Card' },
        { value: 'CASH', label: 'Cash' },
        { value: 'WIRE_TRANSFER', label: 'Wire Transfer' }
    ];

    useEffect(() => {
        fetchPayments();
        fetchUnpaidInvoices();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING PAYMENTS ===');

            const response = await financeService.payments.getAll(0, 100); // page=0, size=100

            console.log('Raw payments response:', response);

            // Extract data from Axios response
            const data = response.data || response;

            console.log('Extracted payments data:', data);

            // Handle paginated response
            const paymentList = data.content || data || [];

            console.log('Final payments list:', paymentList);
            console.log('Payments count:', paymentList.length);

            setPayments(paymentList);
        } catch (error) {
            console.error('Error fetching payments:', error);
            showError('Could not fetch payments: ' + error.message);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnpaidInvoices = async () => {
        try {
            console.log('=== FETCHING UNPAID INVOICES ===');

            const response = await financeService.invoices.getUnpaid();

            console.log('Raw unpaid invoices response:', response);

            // Extract data from Axios response
            const data = response.data || response;

            console.log('Extracted unpaid invoices data:', data);

            setUnpaidInvoices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching unpaid invoices:', error);
            showError('Could not fetch unpaid invoices: ' + error.message);
            setUnpaidInvoices([]);
        }
    };

    const validatePaymentAmount = async (invoiceId, amount) => {
        if (!invoiceId || !amount || amount <= 0) {
            setValidationResult(null);
            return;
        }

        try {
            console.log('=== VALIDATING PAYMENT ===');
            console.log('Invoice ID:', invoiceId, 'Amount:', amount);

            const response = await financeService.payments.validate(invoiceId, amount);

            console.log('Raw validation response:', response);

            // Extract data from Axios response
            const result = response.data || response;

            console.log('Validation result:', result);

            setValidationResult(result);
        } catch (error) {
            console.error('Error validating payment:', error);
            setValidationResult(null);
        }
    };

    const handleCreatePayment = async (e) => {
        e.preventDefault();

        if (!validationResult || !validationResult.valid) {
            showError('Please fix validation errors before submitting');
            return;
        }

        try {
            if (!currentUser) {
                showError('User information not found. Please log in again.');
                return;
            }

            const paymentData = {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount),
                createdBy: currentUser.username || currentUser.name || currentUser.email
            };

            console.log('Creating payment with data:', paymentData);

            await financeService.payments.create(paymentData);

            showSuccess('Payment created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchPayments();
            fetchUnpaidInvoices(); // Refresh to update remaining balances
        } catch (error) {
            console.error('Error creating payment:', error);
            showError('Failed to create payment: ' + error.message);
        }
    };

    const resetForm = () => {
        setPaymentForm({
            invoiceId: '',
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: '',
            notes: ''
        });
        setSelectedInvoice(null);
        setValidationResult(null);
    };

    const handleInvoiceChange = (invoiceId) => {
        const invoice = unpaidInvoices.find(inv => inv.id === invoiceId);
        setSelectedInvoice(invoice);
        setPaymentForm({
            ...paymentForm,
            invoiceId: invoiceId,
            amount: invoice ? invoice.remainingBalance.toString() : ''
        });

        if (invoice) {
            validatePaymentAmount(invoiceId, invoice.remainingBalance);
        }
    };

    const handleAmountChange = (amount) => {
        setPaymentForm({...paymentForm, amount});
        if (paymentForm.invoiceId && amount) {
            validatePaymentAmount(paymentForm.invoiceId, parseFloat(amount));
        }
    };

    // Safe filtering for payments
    const filteredPayments = payments.filter(payment => {
        if (!payment) return false;
        return true; // Add search filtering here if needed
    });

    // Table columns configuration
    const columns = [
        {
            id: 'amount',
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'paymentDate',
            header: 'Payment Date',
            accessor: 'paymentDate',
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
            id: 'invoiceNumber',
            header: 'Invoice #',
            accessor: 'invoice.invoiceNumber',
            sortable: true
        },
        {
            id: 'vendorName',
            header: 'Vendor',
            accessor: 'invoice.vendorName',
            sortable: true
        },
        {
            id: 'paymentMethod',
            header: 'Payment Method',
            accessor: 'paymentMethod',
            render: (row, value) => (
                <span className="payment-method-badge">
                    {value?.replace('_', ' ') || 'N/A'}
                </span>
            )
        },
        {
            id: 'referenceNumber',
            header: 'Reference',
            accessor: 'referenceNumber'
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'processed'}`}>
                    {value?.replace('_', ' ') || 'Processed'}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'Created By',
            accessor: 'createdBy',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'processed'}`}>
                    {value?.replace('_', ' ') || 'Processed'}
                </span>
            )
        }
    ];

    // Table actions
    const actions = [
        // {
        //     label: 'View',
        //     icon: <FaEye />,
        //     onClick: (payment) => {
        //         showSuccess(`Viewing payment ${payment.id}`);
        //     },
        //     className: 'view'
        // }
    ];

    // Filter options for the DataTable
    const filterableColumns = [
        {
            accessor: 'invoice.vendorName',
            header: 'Vendor',
            filterType: 'text'
        },
        {
            accessor: 'paymentMethod',
            header: 'Payment Method',
            filterType: 'select'
        },
        {
            accessor: 'status',
            header: 'Status',
            filterType: 'select'
        }
    ];

    const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const paymentsThisMonth = payments.filter(payment => {
        try {
            const paymentDate = new Date(payment.paymentDate);
            const now = new Date();
            return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
        } catch (e) {
            return false;
        }
    });
    const totalThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    if (loading) {
        return (
            <div className="payment-management">
                <div className="loading-container">Loading payments...</div>
            </div>
        );
    }

    return (
        <div className="payment-management">
            {/* Header */}
            <div className="payables-card-header">
                <h3 className="payables-card-title">
                    <FaMoneyBillWave />
                    Payment Management
                </h3>
                <div className="payables-card-actions">
                    {/*<button*/}
                    {/*    className="payables-btn payables-btn-secondary"*/}
                    {/*    onClick={() => {*/}
                    {/*        fetchPayments();*/}
                    {/*        fetchUnpaidInvoices();*/}
                    {/*    }}*/}
                    {/*    disabled={loading}*/}
                    {/*>*/}
                    {/*    <FaDownload />*/}
                    {/*    Refresh*/}
                    {/*</button>*/}
                    <button
                        className="payables-btn payables-btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <FaPlus />
                        Create Payment
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="payment-stats">
                <div className="payment-stat-item">
                    <FaMoneyBillWave className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{payments.length}</span>
                        <span className="stat-label">Total Payments</span>
                    </div>
                </div>
                <div className="payment-stat-item">
                    <FaCheckCircle className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">${totalPayments.toLocaleString()}</span>
                        <span className="stat-label">Total Amount</span>
                    </div>
                </div>
                <div className="payment-stat-item">
                    <FaCalendarAlt className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{paymentsThisMonth.length}</span>
                        <span className="stat-label">This Month</span>
                    </div>
                </div>
                <div className="payment-stat-item">
                    <FaCreditCard className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">${totalThisMonth.toLocaleString()}</span>
                        <span className="stat-label">Month Total</span>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="payables-table">
                <DataTable
                    data={filteredPayments}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 20, 50]}
                    emptyMessage="No payments found. Click 'Create Payment' to add your first payment."
                    className="payment-table"
                />
            </div>

            {/* Create Payment Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal payment-modal">
                        <div className="modal-header">
                            <h3>Create New Payment</h3>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreatePayment} className="modal-body">
                            {/* Invoice Selection */}
                            <div className="payables-form-group">
                                <label className="payables-form-label">Select Invoice *</label>
                                <select
                                    className="payables-form-select"
                                    value={paymentForm.invoiceId}
                                    onChange={(e) => handleInvoiceChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select an invoice...</option>
                                    {unpaidInvoices.map(invoice => (
                                        <option key={invoice.id} value={invoice.id}>
                                            {invoice.invoiceNumber} - {invoice.vendorName}
                                            (Remaining: ${invoice.remainingBalance?.toLocaleString() || '0'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Invoice Details */}
                            {selectedInvoice && (
                                <div className="invoice-details">
                                    <h4>Invoice Details</h4>
                                    <div className="invoice-info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Invoice #:</span>
                                            <span className="info-value">{selectedInvoice.invoiceNumber}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Vendor:</span>
                                            <span className="info-value">{selectedInvoice.vendorName}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Total Amount:</span>
                                            <span className="info-value">${selectedInvoice.totalAmount?.toLocaleString()}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Remaining:</span>
                                            <span className="info-value remaining">${selectedInvoice.remainingBalance?.toLocaleString()}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Due Date:</span>
                                            <span className="info-value">
                                                {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Overdue:</span>
                                            <span className={`info-value ${selectedInvoice.overdue ? 'overdue' : ''}`}>
                                                {selectedInvoice.overdue ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Details */}
                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Payment Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={`payables-form-input ${validationResult && !validationResult.valid ? 'error' : ''}`}
                                        value={paymentForm.amount}
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        required
                                        max={selectedInvoice?.remainingBalance || undefined}
                                    />
                                    {validationResult && !validationResult.valid && (
                                        <div className="validation-error">
                                            <FaExclamationCircle />
                                            {validationResult.message}
                                        </div>
                                    )}
                                    {validationResult && validationResult.valid && (
                                        <div className="validation-success">
                                            <FaCheckCircle />
                                            Valid payment amount
                                        </div>
                                    )}
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Payment Date *</label>
                                    <input
                                        type="date"
                                        className="payables-form-input"
                                        value={paymentForm.paymentDate}
                                        onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="payables-form-row">
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Payment Method *</label>
                                    <select
                                        className="payables-form-select"
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                        required
                                    >
                                        {paymentMethods.map(method => (
                                            <option key={method.value} value={method.value}>
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="payables-form-group">
                                    <label className="payables-form-label">Reference Number</label>
                                    <input
                                        type="text"
                                        className="payables-form-input"
                                        value={paymentForm.referenceNumber}
                                        onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                                        placeholder="Check #, Transaction ID, etc."
                                    />
                                </div>
                            </div>

                            <div className="payables-form-group">
                                <label className="payables-form-label">Notes</label>
                                <textarea
                                    className="payables-form-textarea"
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                                    rows="3"
                                    placeholder="Additional payment notes..."
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="payables-btn payables-btn-secondary"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="payables-btn payables-btn-primary"
                                    disabled={!validationResult || !validationResult.valid}
                                >
                                    Create Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentManagement;