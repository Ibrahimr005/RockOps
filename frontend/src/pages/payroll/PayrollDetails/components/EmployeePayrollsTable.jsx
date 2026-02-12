// ========================================
// FILE: EmployeePayrollsTable.jsx
// Shared component - Employee payrolls table with payment type management
// ========================================

import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaClock, FaExclamationCircle, FaCreditCard, FaPlus, FaUniversity, FaWallet } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import './EmployeePayrollsTable.scss';

const EmployeePayrollsTable = ({ employeePayrolls, payroll, onRefresh, loading }) => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State for payment type modal
    const [paymentTypeModal, setPaymentTypeModal] = useState({
        isOpen: false,
        employee: null
    });
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [loadingPaymentTypes, setLoadingPaymentTypes] = useState(false);
    const [selectedPaymentType, setSelectedPaymentType] = useState(null);
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolderName: '',
        walletNumber: ''
    });
    const [savingPaymentType, setSavingPaymentType] = useState(false);

    // State for creating new payment type
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newPaymentType, setNewPaymentType] = useState({
        code: '',
        name: '',
        description: '',
        requiresBankDetails: false,
        requiresWalletDetails: false
    });
    const [creatingPaymentType, setCreatingPaymentType] = useState(false);

    // Scroll lock for inline modals
    useEffect(() => {
        if (paymentTypeModal.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [paymentTypeModal.isOpen]);

    // Fetch payment types when modal opens
    useEffect(() => {
        if (paymentTypeModal.isOpen) {
            fetchPaymentTypes();
        }
    }, [paymentTypeModal.isOpen]);

    const fetchPaymentTypes = async () => {
        try {
            setLoadingPaymentTypes(true);
            const response = await payrollService.getActivePaymentTypes();
            // Handle different response formats
            const types = Array.isArray(response) ? response :
                         (response?.data ? response.data :
                         (response?.content ? response.content : []));
            console.log('Payment types loaded:', types);
            setPaymentTypes(types);
        } catch (error) {
            console.error('Error fetching payment types:', error);
            showError('Failed to load payment types');
            setPaymentTypes([]);
        } finally {
            setLoadingPaymentTypes(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) {
            return '-';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Handle row click to view detailed snapshots for this specific payroll entry
    const handleRowClick = (row) => {
        if (payroll?.id && row?.employeeId) {
            navigate(`/payroll/cycles/${payroll.id}/employee/${row.employeeId}`);
        }
    };

    // Open payment type modal
    const openPaymentTypeModal = (e, row) => {
        e.stopPropagation(); // Prevent row click
        setPaymentTypeModal({
            isOpen: true,
            employee: row
        });
        setSelectedPaymentType(null);
        setBankDetails({
            bankName: row.bankName || '',
            bankAccountNumber: row.bankAccountNumber || '',
            bankAccountHolderName: '',
            walletNumber: row.walletNumber || ''
        });
    };

    // Close payment type modal
    const closePaymentTypeModal = () => {
        setPaymentTypeModal({
            isOpen: false,
            employee: null
        });
        setSelectedPaymentType(null);
        setBankDetails({
            bankName: '',
            bankAccountNumber: '',
            bankAccountHolderName: '',
            walletNumber: ''
        });
        setIsCreatingNew(false);
        setNewPaymentType({
            code: '',
            name: '',
            description: '',
            requiresBankDetails: false,
            requiresWalletDetails: false
        });
    };

    // Create new payment type
    const handleCreatePaymentType = async () => {
        if (!newPaymentType.code || !newPaymentType.name) {
            showError('Code and Name are required');
            return;
        }

        try {
            setCreatingPaymentType(true);
            const response = await payrollService.createPaymentType(newPaymentType);
            const createdType = response?.data || response;
            showSuccess(`Payment type "${createdType.name}" created successfully`);

            // Refresh payment types and select the new one
            await fetchPaymentTypes();
            setSelectedPaymentType(createdType);
            setIsCreatingNew(false);
            setNewPaymentType({
                code: '',
                name: '',
                description: '',
                requiresBankDetails: false,
                requiresWalletDetails: false
            });
        } catch (error) {
            console.error('Error creating payment type:', error);
            showError(error.message || 'Failed to create payment type');
        } finally {
            setCreatingPaymentType(false);
        }
    };

    // Save payment type
    const handleSavePaymentType = async () => {
        if (!selectedPaymentType) {
            showError('Please select a payment type');
            return;
        }

        try {
            setSavingPaymentType(true);
            await payrollService.updateEmployeePaymentType(
                paymentTypeModal.employee.employeeId,
                selectedPaymentType.id,
                bankDetails
            );
            showSuccess(`Payment type updated for ${paymentTypeModal.employee.employeeName}`);
            closePaymentTypeModal();
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error saving payment type:', error);
            showError(error.message || 'Failed to update payment type');
        } finally {
            setSavingPaymentType(false);
        }
    };

    // Check if selected payment type requires bank details
    const requiresBankDetails = selectedPaymentType?.requiresBankDetails || selectedPaymentType?.code === 'BANK_TRANSFER';
    const requiresWalletDetails = selectedPaymentType?.requiresWalletDetails || selectedPaymentType?.code === 'MOBILE_WALLET';

    const employeeColumns = [
        {
            id: 'employee',
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => (
                <div className="payroll-employee-cell">
                    <div className="employee-name">{row.employeeName}</div>
                    <div className="employee-details">
                        {row.jobPositionName} • {row.departmentName}
                    </div>
                </div>
            ),
        },
        {
            id: 'contractType',
            header: 'Type',
            accessor: 'contractType',
            sortable: true,
            filterable: true,
            render: (row) => (
                <span className={`contract-badge ${row.contractType?.toLowerCase()}`}>
                    {row.contractType}
                </span>
            ),
        },
        {
            id: 'paymentType',
            header: 'Payment Type',
            accessor: 'paymentTypeName',
            sortable: true,
            render: (row) => (
                <div className="payment-type-cell">
                    {row.paymentTypeName ? (
                        <span className="payment-type-badge has-type">
                            <FaCreditCard />
                            {row.paymentTypeName}
                        </span>
                    ) : (
                        <button
                            className="add-payment-type-btn"
                            onClick={(e) => openPaymentTypeModal(e, row)}
                            title="Add payment type"
                        >
                            <FaPlus />
                            <span>Add</span>
                        </button>
                    )}
                </div>
            ),
        },
        {
            id: 'baseSalary',
            header: 'Base Salary',
            accessor: 'monthlyBaseSalary',
            sortable: true,
            render: (row) => {
                if (row.contractType === 'MONTHLY') {
                    return formatCurrency(row.monthlyBaseSalary);
                } else if (row.contractType === 'DAILY') {
                    return formatCurrency(row.dailyRate) + '/day';
                } else if (row.contractType === 'HOURLY') {
                    return formatCurrency(row.hourlyRate) + '/hr';
                }
                return '-';
            },
        },
        {
            id: 'attendance',
            header: 'Attendance',
            accessor: 'attendedDays',
            render: (row) => (
                <div className="payroll-attendance-stats">
                    <div className="attendance-summary">
                        <span className="attended">{row.attendedDays || 0}</span>
                        <span className="separator">/</span>
                        <span className="total">{row.totalWorkingDays || 0}</span>
                    </div>
                    <div className="attendance-details">
                        {row.absentDays > 0 && (
                            <span className="absent-badge" title="Absent Days">
                                {row.absentDays} absent
                            </span>
                        )}
                        {row.lateDays > 0 && (
                            <span className="late-badge" title="Late Days">
                                {row.lateDays} late
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'gross',
            header: 'Gross Pay',
            accessor: 'grossPay',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) {
                    return <span className="not-calculated"><FaClock /> --</span>;
                }
                return <span className="gross-amount">{formatCurrency(row.grossPay)}</span>;
            },
        },
        {
            id: 'bonus',
            header: 'Bonus',
            accessor: 'bonusAmount',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) return <span className="not-calculated">--</span>;
                if (row.bonusAmount > 0) {
                    return <span className="bonus-amount has-bonus">+{formatCurrency(row.bonusAmount)}</span>;
                }
                return <span className="bonus-amount no-bonus">$0.00</span>;
            },
        },
        {
            id: 'deductions',
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) return <span className="not-calculated">--</span>;
                if (row.totalDeductions > 0) {
                    return <span className="deduction-amount has-deductions">-{formatCurrency(row.totalDeductions)}</span>;
                }
                return <span className="deduction-amount no-deductions">$0.00</span>;
            },
        },
        {
            id: 'net',
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) return <span className="not-calculated">--</span>;
                return <span className="net-amount">{formatCurrency(row.netPay)}</span>;
            },
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'calculatedAt',
            render: (row) => {
                if (row.calculatedAt) {
                    return <span className="status-badge calculated"><FaCheckCircle /> Calculated</span>;
                }
                const hasIssues = (row.absentDays > 5 || row.lateDays > 3);
                if (hasIssues) {
                    return <span className="status-badge pending-issues"><FaExclamationCircle /> Needs Review</span>;
                }
                return <span className="status-badge pending"><FaClock /> Pending</span>;
            },
        },
    ];

    if (loading) {
        return (
            <div className="table-loading">
                <FaClock className="spin" />
                <p>Loading employee payrolls...</p>
            </div>
        );
    }

    if (!employeePayrolls || employeePayrolls.length === 0) {
        return (
            <div className="table-empty">
                <FaExclamationCircle />
                <p>No employee payroll data available</p>
            </div>
        );
    }

    return (
        <div className="employee-payrolls-table">
            <div className="payroll-table-header">
                <h3>Employee Payrolls ({employeePayrolls.length})</h3>
                {!payroll?.attendanceFinalized && (
                    <div className="table-notice">
                        <FaClock />
                        <span>Calculations will be performed after attendance is finalized</span>
                    </div>
                )}
            </div>

            <DataTable
                data={Array.isArray(employeePayrolls) ? employeePayrolls : []}
                columns={employeeColumns}
                actions={[]}
                onRowClick={handleRowClick}
                showSearch={true}
                showFilters={false}
                showExportButton={true}
                exportButtonText="Export Excel"
                exportFileName={`payroll-${payroll?.month}-${payroll?.year}-employees`}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                className="clickable-rows"
            />

            {/* Payment Type Modal */}
            {paymentTypeModal.isOpen && (
                <div className="payment-type-modal-overlay" onClick={closePaymentTypeModal}>
                    <div className="payment-type-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <FaCreditCard />
                                Set Payment Type
                            </h3>
                            <button className="close-btn" onClick={closePaymentTypeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="employee-info">
                                <span className="label">Employee:</span>
                                <span className="value">{paymentTypeModal.employee?.employeeName}</span>
                            </div>

                            {/* Toggle between select and create */}
                            <div className="mode-toggle">
                                <button
                                    className={`toggle-btn ${!isCreatingNew ? 'active' : ''}`}
                                    onClick={() => setIsCreatingNew(false)}
                                >
                                    Select Existing
                                </button>
                                <button
                                    className={`toggle-btn ${isCreatingNew ? 'active' : ''}`}
                                    onClick={() => setIsCreatingNew(true)}
                                >
                                    <FaPlus /> Create New
                                </button>
                            </div>

                            {!isCreatingNew ? (
                                <>
                                    <div className="form-group">
                                        <label>Payment Type <span className="required">*</span></label>
                                        {loadingPaymentTypes ? (
                                            <div className="loading-types">Loading payment types...</div>
                                        ) : paymentTypes.length === 0 ? (
                                            <div className="no-payment-types">
                                                <FaExclamationCircle />
                                                <p>No payment types available.</p>
                                                <button
                                                    className="create-first-btn"
                                                    onClick={() => setIsCreatingNew(true)}
                                                >
                                                    <FaPlus /> Create First Payment Type
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="payment-type-options">
                                                {paymentTypes.map((type) => (
                                                    <div
                                                        key={type.id}
                                                        className={`payment-type-option ${selectedPaymentType?.id === type.id ? 'selected' : ''}`}
                                                        onClick={() => setSelectedPaymentType(type)}
                                                    >
                                                        <div className="option-icon">
                                                            {type.code === 'BANK_TRANSFER' ? <FaUniversity /> :
                                                             type.code === 'MOBILE_WALLET' ? <FaWallet /> :
                                                             <FaCreditCard />}
                                                        </div>
                                                        <div className="option-details">
                                                            <span className="option-name">{type.name}</span>
                                                            <span className="option-code">{type.code}</span>
                                                        </div>
                                                        {selectedPaymentType?.id === type.id && (
                                                            <FaCheckCircle className="selected-icon" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {requiresBankDetails && (
                                        <div className="bank-details-section">
                                            <h4><FaUniversity /> Bank Details</h4>
                                            <div className="form-group">
                                                <label>Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.bankName}
                                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                                    placeholder="Enter bank name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Account Number</label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.bankAccountNumber}
                                                    onChange={(e) => setBankDetails({ ...bankDetails, bankAccountNumber: e.target.value })}
                                                    placeholder="Enter account number"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Account Holder Name</label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.bankAccountHolderName}
                                                    onChange={(e) => setBankDetails({ ...bankDetails, bankAccountHolderName: e.target.value })}
                                                    placeholder="Enter account holder name"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {requiresWalletDetails && (
                                        <div className="wallet-details-section">
                                            <h4><FaWallet /> Wallet Details</h4>
                                            <div className="form-group">
                                                <label>Wallet Number</label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.walletNumber}
                                                    onChange={(e) => setBankDetails({ ...bankDetails, walletNumber: e.target.value })}
                                                    placeholder="Enter wallet number"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="create-payment-type-form">
                                    <div className="form-group">
                                        <label>Code <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={newPaymentType.code}
                                            onChange={(e) => setNewPaymentType({ ...newPaymentType, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g., BANK_TRANSFER"
                                            maxLength={50}
                                        />
                                        <span className="hint">Unique identifier (uppercase, no spaces)</span>
                                    </div>
                                    <div className="form-group">
                                        <label>Name <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={newPaymentType.name}
                                            onChange={(e) => setNewPaymentType({ ...newPaymentType, name: e.target.value })}
                                            placeholder="e.g., Bank Transfer"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            value={newPaymentType.description}
                                            onChange={(e) => setNewPaymentType({ ...newPaymentType, description: e.target.value })}
                                            placeholder="Brief description of this payment method"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="form-group checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={newPaymentType.requiresBankDetails}
                                                onChange={(e) => setNewPaymentType({ ...newPaymentType, requiresBankDetails: e.target.checked })}
                                            />
                                            <span>Requires Bank Details</span>
                                        </label>
                                        <span className="hint">Check if this payment method needs bank account information</span>
                                    </div>
                                    <div className="form-group checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={newPaymentType.requiresWalletDetails}
                                                onChange={(e) => setNewPaymentType({ ...newPaymentType, requiresWalletDetails: e.target.checked })}
                                            />
                                            <span>Requires Wallet Details</span>
                                        </label>
                                        <span className="hint">Check if this payment method needs mobile wallet number</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={closePaymentTypeModal}
                                disabled={savingPaymentType || creatingPaymentType}
                            >
                                Cancel
                            </button>
                            {isCreatingNew ? (
                                <button
                                    className="save-btn create-btn"
                                    onClick={handleCreatePaymentType}
                                    disabled={!newPaymentType.code || !newPaymentType.name || creatingPaymentType}
                                >
                                    {creatingPaymentType ? 'Creating...' : 'Create Payment Type'}
                                </button>
                            ) : (
                                <button
                                    className="save-btn"
                                    onClick={handleSavePaymentType}
                                    disabled={!selectedPaymentType || savingPaymentType}
                                >
                                    {savingPaymentType ? 'Saving...' : 'Save Payment Type'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePayrollsTable;
