// ========================================
// FILE: DeductionManagement.jsx
// Deduction Management Page - Complete Rewrite
// ========================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaPlus,
    FaEye,
    FaEdit,
    FaTimes,
    FaMinusCircle,
    FaCog,
    FaFileExport,
    FaList,
    FaChartBar,
    FaSpinner,
    FaCheckCircle,
    FaTimesCircle,
    FaUndo,
    FaDollarSign,
    FaUsers,
    FaMoneyBillWave,
    FaPercentage,
    FaUserMinus,
    FaCalendarAlt,
    FaSearch
} from 'react-icons/fa';
import { deductionService, DEDUCTION_CATEGORY_CONFIG } from '../../../services/payroll/deductionService';
import { employeeDeductionService } from '../../../services/payroll/employeeDeductionService';
import { employeeService } from '../../../services/hr/employeeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './DeductionManagement.scss';
import PageHeader from "../../../components/common/PageHeader/index.js";

const DeductionManagement = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();

    // ========================================
    // STATE
    // ========================================
    const [activeTab, setActiveTab] = useState('deductions');
    const [employeeDeductions, setEmployeeDeductions] = useState([]);
    const [deductionTypes, setDeductionTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [calculationMethods, setCalculationMethods] = useState([]);
    const [frequencies, setFrequencies] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingEmployeeDeductions, setLoadingEmployeeDeductions] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    // Modal states
    const [showCreateDeductionModal, setShowCreateDeductionModal] = useState(false);
    const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingEmployeeDeduction, setEditingEmployeeDeduction] = useState(null);

    // Employee search/filter for employee deductions
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

    // Form state for employee deduction creation
    const [deductionForm, setDeductionForm] = useState({
        employeeId: '',
        deductionTypeId: '',
        amount: '',
        percentage: '',
        calculationMethod: 'FIXED_AMOUNT',
        frequency: 'MONTHLY',
        effectiveStartDate: '',
        effectiveEndDate: '',
        description: '',
        customName: ''
    });

    // Type form state
    const [typeForm, setTypeForm] = useState({
        code: '',
        name: '',
        description: '',
        category: 'OTHER',
        isTaxable: false,
        showOnPayslip: true
    });

    // Confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // ========================================
    // DATA LOADING
    // ========================================
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load reference data in parallel
            const [typesRes, categoriesRes, methodsRes, freqRes, employeesRes] = await Promise.all([
                deductionService.getAllDeductionTypes(),
                deductionService.getDeductionCategories().catch(() => ({ data: [] })),
                deductionService.getCalculationMethods().catch(() => ({ data: [] })),
                deductionService.getFrequencies().catch(() => ({ data: [] })),
                employeeService.getAll()
            ]);

            setDeductionTypes(typesRes.data || []);
            setCategories(categoriesRes.data || []);
            setCalculationMethods(methodsRes.data || []);
            setFrequencies(freqRes.data || []);
            setEmployees(employeesRes.data || []);

        } catch (error) {
            console.error('Error loading data:', error);
            showError(error.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    // Load employee deductions when an employee is selected
    const loadEmployeeDeductions = useCallback(async (employeeId) => {
        if (!employeeId) {
            setEmployeeDeductions([]);
            return;
        }

        try {
            setLoadingEmployeeDeductions(true);
            const response = await employeeDeductionService.getDeductionsByEmployee(employeeId);
            setEmployeeDeductions(response.data || []);
        } catch (error) {
            console.error('Error loading employee deductions:', error);
            showError(error.response?.data?.message || 'Failed to load employee deductions');
            setEmployeeDeductions([]);
        } finally {
            setLoadingEmployeeDeductions(false);
        }
    }, [showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Load deductions when employee filter changes
    useEffect(() => {
        if (selectedEmployeeFilter) {
            loadEmployeeDeductions(selectedEmployeeFilter);
        } else {
            setEmployeeDeductions([]);
        }
    }, [selectedEmployeeFilter, loadEmployeeDeductions]);

    // ========================================
    // STATISTICS
    // ========================================
    const statistics = useMemo(() => {
        const typeStats = {
            total: deductionTypes.length,
            active: deductionTypes.filter(t => t.isActive !== false).length,
            inactive: deductionTypes.filter(t => t.isActive === false).length,
            byCategory: {}
        };

        deductionTypes.forEach(type => {
            const cat = type.category || 'OTHER';
            if (!typeStats.byCategory[cat]) {
                typeStats.byCategory[cat] = 0;
            }
            typeStats.byCategory[cat]++;
        });

        return typeStats;
    }, [deductionTypes]);

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // ========================================
    // DEDUCTION TYPE HANDLERS
    // ========================================
    const handleCreateType = () => {
        setEditingItem(null);
        setTypeForm({
            code: '',
            name: '',
            description: '',
            category: 'OTHER',
            isTaxable: false,
            showOnPayslip: true
        });
        setShowCreateTypeModal(true);
    };

    const handleEditType = (type) => {
        setEditingItem(type);
        setTypeForm({
            code: type.code || '',
            name: type.name || '',
            description: type.description || '',
            category: type.category || 'OTHER',
            isTaxable: type.isTaxable || false,
            showOnPayslip: type.showOnPayslip !== false
        });
        setShowCreateTypeModal(true);
    };

    const handleSaveType = async () => {
        if (!typeForm.code?.trim() || !typeForm.name?.trim()) {
            showWarning('Code and Name are required');
            return;
        }

        try {
            setProcessingId('saving-type');

            if (editingItem) {
                await deductionService.updateDeductionType(editingItem.id, typeForm);
                showSuccess('Deduction type updated successfully');
            } else {
                await deductionService.createDeductionType(typeForm);
                showSuccess('Deduction type created successfully');
            }

            setShowCreateTypeModal(false);
            setEditingItem(null);
            loadData();
        } catch (error) {
            console.error('Error saving deduction type:', error);
            showError(error.response?.data?.message || 'Failed to save deduction type');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeactivateType = (type) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Deactivate Deduction Type',
            message: `Are you sure you want to deactivate "${type.name}"? It will no longer be available for new deductions.`,
            onConfirm: async () => {
                try {
                    setProcessingId(type.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await deductionService.deactivateDeductionType(type.id);
                    showInfo('Deduction type deactivated');
                    loadData();
                } catch (error) {
                    console.error('Error deactivating type:', error);
                    showError(error.response?.data?.message || 'Failed to deactivate deduction type');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleReactivateType = async (type) => {
        try {
            setProcessingId(type.id);
            await deductionService.reactivateDeductionType(type.id);
            showSuccess('Deduction type reactivated');
            loadData();
        } catch (error) {
            console.error('Error reactivating type:', error);
            showError(error.response?.data?.message || 'Failed to reactivate deduction type');
        } finally {
            setProcessingId(null);
        }
    };

    // ========================================
    // EMPLOYEE DEDUCTION HANDLERS
    // ========================================
    const handleCreateEmployeeDeduction = () => {
        setEditingEmployeeDeduction(null);
        setDeductionForm({
            employeeId: selectedEmployeeFilter || '',
            deductionTypeId: '',
            amount: '',
            percentage: '',
            calculationMethod: 'FIXED_AMOUNT',
            frequency: 'MONTHLY',
            effectiveStartDate: new Date().toISOString().split('T')[0],
            effectiveEndDate: '',
            description: '',
            customName: ''
        });
        setShowCreateDeductionModal(true);
    };

    const handleEditEmployeeDeduction = (deduction) => {
        setEditingEmployeeDeduction(deduction);
        setDeductionForm({
            employeeId: deduction.employeeId || '',
            deductionTypeId: deduction.deductionTypeId || '',
            amount: deduction.amount || '',
            percentage: deduction.percentageValue || '',
            calculationMethod: deduction.calculationMethod || 'FIXED_AMOUNT',
            frequency: deduction.frequency || 'MONTHLY',
            effectiveStartDate: deduction.effectiveStartDate || '',
            effectiveEndDate: deduction.effectiveEndDate || '',
            description: deduction.description || '',
            customName: deduction.customName || ''
        });
        setShowCreateDeductionModal(true);
    };

    const handleSaveEmployeeDeduction = async () => {
        // Validation
        if (!deductionForm.employeeId) {
            showWarning('Please select an employee');
            return;
        }
        if (!deductionForm.deductionTypeId) {
            showWarning('Please select a deduction type');
            return;
        }
        if (!deductionForm.effectiveStartDate) {
            showWarning('Please enter an effective start date');
            return;
        }

        const isPercentage = deductionForm.calculationMethod.includes('PERCENTAGE');
        if (isPercentage && !deductionForm.percentage) {
            showWarning('Please enter a percentage value');
            return;
        }
        if (!isPercentage && !deductionForm.amount) {
            showWarning('Please enter an amount');
            return;
        }

        try {
            setProcessingId('saving-deduction');

            const payload = {
                employeeId: deductionForm.employeeId,
                deductionTypeId: deductionForm.deductionTypeId,
                amount: isPercentage ? 0 : parseFloat(deductionForm.amount),
                percentageValue: isPercentage ? parseFloat(deductionForm.percentage) : null,
                calculationMethod: deductionForm.calculationMethod,
                frequency: deductionForm.frequency,
                effectiveStartDate: deductionForm.effectiveStartDate,
                effectiveEndDate: deductionForm.effectiveEndDate || null,
                description: deductionForm.description,
                customName: deductionForm.customName
            };

            if (editingEmployeeDeduction) {
                await employeeDeductionService.updateDeduction(editingEmployeeDeduction.id, payload);
                showSuccess('Employee deduction updated successfully');
            } else {
                await employeeDeductionService.createDeduction(payload);
                showSuccess('Employee deduction created successfully');
            }

            setShowCreateDeductionModal(false);
            setEditingEmployeeDeduction(null);

            // Reload employee deductions
            if (selectedEmployeeFilter) {
                loadEmployeeDeductions(selectedEmployeeFilter);
            }
        } catch (error) {
            console.error('Error saving employee deduction:', error);
            showError(error.response?.data?.message || 'Failed to save employee deduction');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeactivateEmployeeDeduction = (deduction) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Deactivate Deduction',
            message: `Are you sure you want to deactivate this deduction? It will no longer be applied to the employee's payroll.`,
            onConfirm: async () => {
                try {
                    setProcessingId(deduction.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await employeeDeductionService.deactivateDeduction(deduction.id);
                    showInfo('Deduction deactivated');

                    if (selectedEmployeeFilter) {
                        loadEmployeeDeductions(selectedEmployeeFilter);
                    }
                } catch (error) {
                    console.error('Error deactivating deduction:', error);
                    showError(error.response?.data?.message || 'Failed to deactivate deduction');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleReactivateEmployeeDeduction = async (deduction) => {
        try {
            setProcessingId(deduction.id);
            await employeeDeductionService.reactivateDeduction(deduction.id);
            showSuccess('Deduction reactivated');

            if (selectedEmployeeFilter) {
                loadEmployeeDeductions(selectedEmployeeFilter);
            }
        } catch (error) {
            console.error('Error reactivating deduction:', error);
            showError(error.response?.data?.message || 'Failed to reactivate deduction');
        } finally {
            setProcessingId(null);
        }
    };

    // Get selected employee details
    const selectedEmployee = useMemo(() => {
        return employees.find(e => e.id === deductionForm.employeeId);
    }, [employees, deductionForm.employeeId]);

    // Filter employees based on search
    const filteredEmployees = useMemo(() => {
        if (!employeeSearchTerm) return employees;
        const term = employeeSearchTerm.toLowerCase();
        return employees.filter(e =>
            (e.firstName?.toLowerCase().includes(term)) ||
            (e.lastName?.toLowerCase().includes(term)) ||
            (e.employeeNumber?.toLowerCase().includes(term)) ||
            (`${e.firstName} ${e.lastName}`.toLowerCase().includes(term))
        );
    }, [employees, employeeSearchTerm]);

    // ========================================
    // CATEGORY BADGE RENDERER
    // ========================================
    const renderCategoryBadge = (category) => {
        const config = DEDUCTION_CATEGORY_CONFIG[category] || {
            label: category || 'Unknown',
            color: '#6b7280'
        };
        return (
            <span
                className="category-badge"
                style={{
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                    border: `1px solid ${config.color}40`
                }}
            >
                {config.label}
            </span>
        );
    };

    // ========================================
    // TABLE COLUMNS - EMPLOYEE DEDUCTIONS
    // ========================================
    const employeeDeductionColumns = [
        {
            accessor: 'deductionNumber',
            header: 'Number',
            sortable: true,
            render: (deduction) => (
                <span className="deduction-number">{deduction.deductionNumber || '-'}</span>
            )
        },
        {
            accessor: 'deductionTypeName',
            header: 'Type',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (deduction) => (
                <div className="type-name-cell">
                    <span className="type-name">{deduction.deductionTypeName || deduction.customName || '-'}</span>
                </div>
            )
        },
        {
            accessor: 'calculationMethod',
            header: 'Method',
            sortable: true,
            render: (deduction) => {
                const method = deduction.calculationMethod || 'FIXED_AMOUNT';
                const label = method.replace(/_/g, ' ').toLowerCase();
                return <span className="method-badge">{label}</span>;
            }
        },
        {
            accessor: 'amount',
            header: 'Amount',
            sortable: true,
            render: (deduction) => {
                const isPercentage = deduction.calculationMethod?.includes('PERCENTAGE');
                if (isPercentage && deduction.percentageValue) {
                    return <span className="amount-cell">{deduction.percentageValue}%</span>;
                }
                return <span className="amount-cell">{formatCurrency(deduction.amount)}</span>;
            }
        },
        {
            accessor: 'frequency',
            header: 'Frequency',
            sortable: true,
            render: (deduction) => (
                <span className="frequency-badge">
                    {(deduction.frequency || 'MONTHLY').replace(/_/g, ' ').toLowerCase()}
                </span>
            )
        },
        {
            accessor: 'effectiveStartDate',
            header: 'Start Date',
            sortable: true,
            render: (deduction) => formatDate(deduction.effectiveStartDate)
        },
        {
            accessor: 'effectiveEndDate',
            header: 'End Date',
            sortable: true,
            render: (deduction) => deduction.effectiveEndDate ? formatDate(deduction.effectiveEndDate) : <span className="ongoing-badge">Ongoing</span>
        },
        {
            accessor: 'isActive',
            header: 'Status',
            sortable: true,
            render: (deduction) => (
                <span className={`status-badge ${deduction.isActive !== false ? 'active' : 'inactive'}`}>
                    {deduction.isActive !== false ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    // ========================================
    // TABLE ACTIONS - EMPLOYEE DEDUCTIONS
    // ========================================
    const employeeDeductionActions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEditEmployeeDeduction,
            isVisible: (deduction) => deduction.isActive !== false,
            className: 'action-edit'
        },
        {
            label: 'Deactivate',
            icon: <FaTimesCircle />,
            onClick: handleDeactivateEmployeeDeduction,
            isVisible: (deduction) => deduction.isActive !== false,
            isDisabled: (deduction) => processingId === deduction.id,
            className: 'action-deactivate'
        },
        {
            label: 'Reactivate',
            icon: <FaUndo />,
            onClick: handleReactivateEmployeeDeduction,
            isVisible: (deduction) => deduction.isActive === false,
            isDisabled: (deduction) => processingId === deduction.id,
            className: 'action-reactivate'
        }
    ];

    // ========================================
    // TABLE COLUMNS - DEDUCTION TYPES
    // ========================================
    const typeColumns = [
        {
            accessor: 'code',
            header: 'Code',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (type) => (
                <span className="type-code">{type.code}</span>
            )
        },
        {
            accessor: 'name',
            header: 'Name',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (type) => (
                <div className="type-name-cell">
                    <span className="type-name">{type.name}</span>
                    {type.isSystemDefined && (
                        <span className="system-badge">System</span>
                    )}
                </div>
            )
        },
        {
            accessor: 'category',
            header: 'Category',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (type) => renderCategoryBadge(type.category)
        },
        {
            accessor: 'description',
            header: 'Description',
            render: (type) => (
                <span className="description-cell">
                    {type.description || '-'}
                </span>
            )
        },
        {
            accessor: 'isTaxable',
            header: 'Taxable',
            render: (type) => (
                <span className={`bool-badge ${type.isTaxable ? 'yes' : 'no'}`}>
                    {type.isTaxable ? 'Yes' : 'No'}
                </span>
            )
        },
        {
            accessor: 'showOnPayslip',
            header: 'On Payslip',
            render: (type) => (
                <span className={`bool-badge ${type.showOnPayslip !== false ? 'yes' : 'no'}`}>
                    {type.showOnPayslip !== false ? 'Yes' : 'No'}
                </span>
            )
        },
        {
            accessor: 'isActive',
            header: 'Status',
            sortable: true,
            render: (type) => (
                <span className={`status-badge ${type.isActive !== false ? 'active' : 'inactive'}`}>
                    {type.isActive !== false ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    // ========================================
    // TABLE ACTIONS - DEDUCTION TYPES
    // ========================================
    const typeActions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEditType,
            isVisible: (type) => !type.isSystemDefined,
            className: 'action-edit'
        },
        {
            label: 'Deactivate',
            icon: <FaTimesCircle />,
            onClick: handleDeactivateType,
            isVisible: (type) => type.isActive !== false && !type.isSystemDefined,
            isDisabled: (type) => processingId === type.id,
            className: 'action-deactivate'
        },
        {
            label: 'Reactivate',
            icon: <FaUndo />,
            onClick: handleReactivateType,
            isVisible: (type) => type.isActive === false,
            isDisabled: (type) => processingId === type.id,
            className: 'action-reactivate'
        }
    ];

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="deduction-management">
            {/* Header */}
            <PageHeader title={"Deduction Management"} subtitle={"Configure deduction types and manage employee deductions"}/>

            {/* Statistics Cards */}
            <div className="deduction-management-stats">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <FaList />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.total}</span>
                        <span className="stat-label">Deduction Types</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon active">
                        <FaCheckCircle />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.active}</span>
                        <span className="stat-label">Active Types</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon loan">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{statistics.byCategory['LOAN'] || 0}</span>
                        <span className="stat-label">Loan Types</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon other">
                        <FaCog />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{Object.keys(statistics.byCategory).length}</span>
                        <span className="stat-label">Categories</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'deductions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('deductions')}
                >
                    <FaList /> Deduction Types
                </button>
                <button
                    className={`tab-btn ${activeTab === 'employee-deductions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('employee-deductions')}
                >
                    <FaUserMinus /> Employee Deductions
                </button>
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    <FaChartBar /> Categories Overview
                </button>
            </div>

            {/* Tab Content */}
            <div className="">
                {activeTab === 'deductions' && (
                    <div className="table-container">
                        <DataTable
                            data={deductionTypes}
                            columns={typeColumns}
                            loading={loading}
                            emptyMessage="No deduction types found. Create your first deduction type to get started."

                            showSearch={true}
                            showFilters={true}
                            filterableColumns={typeColumns.filter(c => c.filterable)}

                            actions={typeActions}
                            actionsColumnWidth="150px"

                            showAddButton={true}
                            addButtonText="Add Type"
                            addButtonIcon={<FaPlus />}
                            onAddClick={handleCreateType}

                            showExportButton={true}
                            exportFileName="deduction-types"

                            defaultItemsPerPage={15}
                            itemsPerPageOptions={[10, 15, 25, 50]}
                            defaultSortField="name"
                            defaultSortDirection="asc"

                            className="deduction-types-table"
                        />
                    </div>
                )}

                {activeTab === 'employee-deductions' && (
                    <div className="employee-deductions-container">
                        {/* Employee Selector */}
                        <div className="employee-selector-section">
                            <div className="selector-header">
                                <h3><FaUsers /> Select Employee</h3>
                                <p>Choose an employee to view and manage their deductions</p>
                            </div>
                            <div className="selector-controls">
                                <div className="search-input-wrapper">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search employees by name or number..."
                                        value={employeeSearchTerm}
                                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                        className="employee-search-input"
                                    />
                                </div>
                                <select
                                    value={selectedEmployeeFilter}
                                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                                    className="employee-select"
                                >
                                    <option value="">-- Select Employee --</option>
                                    {filteredEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName} {emp.employeeNumber ? `(${emp.employeeNumber})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Employee Deductions Table */}
                        {selectedEmployeeFilter ? (
                            <div className="table-container">
                                <DataTable
                                    data={employeeDeductions}
                                    columns={employeeDeductionColumns}
                                    loading={loadingEmployeeDeductions}
                                    emptyMessage="No deductions found for this employee. Click 'Add Deduction' to create one."

                                    showSearch={true}
                                    showFilters={false}

                                    actions={employeeDeductionActions}
                                    actionsColumnWidth="150px"

                                    showAddButton={true}
                                    addButtonText="Add Deduction"
                                    addButtonIcon={<FaPlus />}
                                    onAddClick={handleCreateEmployeeDeduction}

                                    showExportButton={true}
                                    exportFileName={`employee-deductions-${selectedEmployeeFilter}`}

                                    defaultItemsPerPage={10}
                                    itemsPerPageOptions={[10, 25, 50]}
                                    defaultSortField="effectiveStartDate"
                                    defaultSortDirection="desc"

                                    className="employee-deductions-table"
                                />
                            </div>
                        ) : (
                            <div className="no-employee-selected">
                                <FaUserMinus className="placeholder-icon" />
                                <h4>No Employee Selected</h4>
                                <p>Please select an employee from the dropdown above to view and manage their deductions.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="categories-overview">
                        <div className="categories-grid">
                            {Object.entries(DEDUCTION_CATEGORY_CONFIG).map(([key, config]) => {
                                const count = statistics.byCategory[key] || 0;
                                return (
                                    <div key={key} className="category-card">
                                        <div
                                            className="category-icon"
                                            style={{ backgroundColor: config.color }}
                                        >
                                            <FaDollarSign />
                                        </div>
                                        <div className="category-info">
                                            <span className="category-name">{config.label}</span>
                                            <span className="category-count">{count} type{count !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Type Modal */}
            {showCreateTypeModal && (
                <div className="modal-overlay">
                    <div className="modal-content type-modal">
                        <div className="modal-header">
                            <h3>{editingItem ? 'Edit Deduction Type' : 'Create Deduction Type'}</h3>
                            <button
                                className="btn-close"
                                onClick={() => {
                                    setShowCreateTypeModal(false);
                                    setEditingItem(null);
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Code *</label>
                                    <input
                                        type="text"
                                        value={typeForm.code}
                                        onChange={(e) => setTypeForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g., LOAN_REPAY"
                                        maxLength={20}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        value={typeForm.name}
                                        onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Loan Repayment"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={typeForm.category}
                                    onChange={(e) => setTypeForm(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    {Object.entries(DEDUCTION_CATEGORY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={typeForm.description}
                                    onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Brief description of this deduction type..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-row checkboxes">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={typeForm.isTaxable}
                                        onChange={(e) => setTypeForm(prev => ({ ...prev, isTaxable: e.target.checked }))}
                                    />
                                    <span>Taxable</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={typeForm.showOnPayslip}
                                        onChange={(e) => setTypeForm(prev => ({ ...prev, showOnPayslip: e.target.checked }))}
                                    />
                                    <span>Show on Payslip</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowCreateTypeModal(false);
                                    setEditingItem(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleSaveType}
                                disabled={processingId === 'saving-type'}
                            >
                                {processingId === 'saving-type' ? (
                                    <>
                                        <FaSpinner className="spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle />
                                        {editingItem ? 'Update Type' : 'Create Type'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Employee Deduction Modal */}
            {showCreateDeductionModal && (
                <div className="modal-overlay">
                    <div className="modal-content employee-deduction-modal">
                        <div className="modal-header">
                            <h3>
                                <FaUserMinus />
                                {editingEmployeeDeduction ? 'Edit Employee Deduction' : 'Add Employee Deduction'}
                            </h3>
                            <button
                                className="btn-close"
                                onClick={() => {
                                    setShowCreateDeductionModal(false);
                                    setEditingEmployeeDeduction(null);
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Employee Selection */}
                            <div className="form-section">
                                <h4><FaUsers /> Employee Information</h4>
                                <div className="form-group">
                                    <label>Employee *</label>
                                    <select
                                        value={deductionForm.employeeId}
                                        onChange={(e) => setDeductionForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                        disabled={!!editingEmployeeDeduction}
                                    >
                                        <option value="">-- Select Employee --</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} {emp.employeeNumber ? `(${emp.employeeNumber})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Employee Preview */}
                                {selectedEmployee && (
                                    <div className="employee-preview">
                                        <div className="employee-info">
                                            <h5>{selectedEmployee.firstName} {selectedEmployee.lastName}</h5>
                                            {selectedEmployee.employeeNumber && (
                                                <p className="employee-number">{selectedEmployee.employeeNumber}</p>
                                            )}
                                            {selectedEmployee.departmentName && (
                                                <p>{selectedEmployee.departmentName}</p>
                                            )}
                                            {selectedEmployee.jobPositionName && (
                                                <p>{selectedEmployee.jobPositionName}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Deduction Details */}
                            <div className="form-section">
                                <h4><FaDollarSign /> Deduction Details</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Deduction Type *</label>
                                        <select
                                            value={deductionForm.deductionTypeId}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, deductionTypeId: e.target.value }))}
                                        >
                                            <option value="">-- Select Type --</option>
                                            {deductionTypes.filter(t => t.isActive !== false).map((type) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name} ({type.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Custom Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={deductionForm.customName}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, customName: e.target.value }))}
                                            placeholder="e.g., Personal Loan - Bank XYZ"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Calculation Method *</label>
                                        <select
                                            value={deductionForm.calculationMethod}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, calculationMethod: e.target.value }))}
                                        >
                                            <option value="FIXED_AMOUNT">Fixed Amount</option>
                                            <option value="PERCENTAGE_OF_GROSS">Percentage of Gross</option>
                                            <option value="PERCENTAGE_OF_BASIC">Percentage of Basic</option>
                                            <option value="PERCENTAGE_OF_NET">Percentage of Net</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Frequency *</label>
                                        <select
                                            value={deductionForm.frequency}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, frequency: e.target.value }))}
                                        >
                                            <option value="PER_PAYROLL">Per Payroll</option>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="QUARTERLY">Quarterly</option>
                                            <option value="SEMI_ANNUAL">Semi-Annual</option>
                                            <option value="ANNUAL">Annual</option>
                                            <option value="ONE_TIME">One Time</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Amount or Percentage based on calculation method */}
                                <div className="form-row">
                                    {deductionForm.calculationMethod.includes('PERCENTAGE') ? (
                                        <div className="form-group">
                                            <label>Percentage Value (%) *</label>
                                            <input
                                                type="number"
                                                value={deductionForm.percentage}
                                                onChange={(e) => setDeductionForm(prev => ({ ...prev, percentage: e.target.value }))}
                                                placeholder="e.g., 5"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                            />
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label>Amount *</label>
                                            <input
                                                type="number"
                                                value={deductionForm.amount}
                                                onChange={(e) => setDeductionForm(prev => ({ ...prev, amount: e.target.value }))}
                                                placeholder="e.g., 500.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Effective Period */}
                            <div className="form-section">
                                <h4><FaCalendarAlt /> Effective Period</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input
                                            type="date"
                                            value={deductionForm.effectiveStartDate}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, effectiveStartDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={deductionForm.effectiveEndDate}
                                            onChange={(e) => setDeductionForm(prev => ({ ...prev, effectiveEndDate: e.target.value }))}
                                        />
                                        <span className="field-hint">Leave empty for ongoing deduction</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    value={deductionForm.description}
                                    onChange={(e) => setDeductionForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Add any notes about this deduction..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowCreateDeductionModal(false);
                                    setEditingEmployeeDeduction(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleSaveEmployeeDeduction}
                                disabled={processingId === 'saving-deduction'}
                            >
                                {processingId === 'saving-deduction' ? (
                                    <>
                                        <FaSpinner className="spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle />
                                        {editingEmployeeDeduction ? 'Update Deduction' : 'Create Deduction'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default DeductionManagement;
