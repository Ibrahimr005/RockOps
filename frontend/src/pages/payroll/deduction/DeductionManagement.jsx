// ==================== DEDUCTION MANAGEMENT MAIN PAGE ====================
// frontend/src/pages/payroll/DeductionManagement/DeductionManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaPlus,
    FaEye,
    FaEdit,
    FaTimes,
    FaMinusCircle,
    FaUsers,
    FaCog,
    FaFileExport,
    FaList,
    FaUserCheck,
    FaChartBar,
    FaExclamationTriangle
} from 'react-icons/fa';
import { deductionService } from '../../../services/payroll/deductionService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import ManualDeductionModal from './components/ManualDeductionModal';
import BulkDeductionModal from './components/BulkDeductionModal';
import AddDeductionTypeModal from './components/AddDeductionTypeModal';
import './DeductionManagement.scss';

const DeductionManagement = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // Main state
    const [activeTab, setActiveTab] = useState('manual');
    const [deductions, setDeductions] = useState([]);
    const [deductionTypes, setDeductionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeductions, setSelectedDeductions] = useState([]);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [editingDeduction, setEditingDeduction] = useState(null);
    const [editingDeductionType, setEditingDeductionType] = useState(null);

    // Statistics state
    const [statistics, setStatistics] = useState({
        totalDeductions: 0,
        activeDeductions: 0,
        totalAmount: 0,
        affectedEmployees: 0
    });

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // Load data based on active tab
    useEffect(() => {
        loadData();
    }, [activeTab]);

    /**
     * Load data based on active tab
     */
    const loadData = async () => {
        try {
            setLoading(true);

            switch (activeTab) {
                case 'manual':
                    await loadManualDeductions();
                    break;
                case 'types':
                    await loadDeductionTypes();
                    break;
                case 'summary':
                    await loadStatistics();
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Load manual deductions
     */
    const loadManualDeductions = async () => {
        try {
            const response = await deductionService.getAllManualDeductions(0, 100);
            const deductionsData = response.data.content || response.data || [];
            setDeductions(deductionsData);

            // Calculate statistics
            const stats = deductionsData.reduce((acc, deduction) => {
                acc.totalDeductions++;
                if (deduction.isActive) {
                    acc.activeDeductions++;
                }
                if (deduction.customAmount) {
                    acc.totalAmount += deduction.customAmount;
                }
                return acc;
            }, {
                totalDeductions: 0,
                activeDeductions: 0,
                totalAmount: 0,
                affectedEmployees: new Set(deductionsData.map(d => d.employeeId)).size
            });

            setStatistics(stats);
        } catch (error) {
            console.error('Error loading manual deductions:', error);
            setDeductions([]);
        }
    };

    /**
     * Load deduction types
     */
    const loadDeductionTypes = async () => {
        try {
            const response = await deductionService.getAllDeductionTypes();
            setDeductionTypes(response.data || []);
        } catch (error) {
            console.error('Error loading deduction types:', error);
            setDeductionTypes([]);
        }
    };

    /**
     * Load statistics
     */
    const loadStatistics = async () => {
        try {
            const response = await deductionService.getDeductionStatistics();
            setStatistics(response.data || {});
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    };

    // ==================== EVENT HANDLERS ====================

    /**
     * Handle viewing a deduction
     */
    const handleViewDeduction = (deduction) => {
        navigate(`/payroll/deductions/${deduction.id}`);
    };

    /**
     * Handle editing a deduction
     */
    const handleEditDeduction = (deduction) => {
        setEditingDeduction(deduction);
        setShowCreateModal(true);
    };

    /**
     * Handle deactivating a deduction
     */
    const handleDeactivateDeduction = async (deduction) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Deactivate Deduction',
            message: `Are you sure you want to deactivate the deduction for ${deduction.employeeName}? This will stop future deductions.`,
            onConfirm: async () => {
                try {
                    await deductionService.deactivateManualDeduction(deduction.id);
                    showSuccess('Deduction deactivated successfully');
                    loadData();
                } catch (error) {
                    console.error('Error deactivating deduction:', error);
                    showError('Failed to deactivate deduction');
                }
                setConfirmDialog(prev => ({ ...prev, isVisible: false }));
            }
        });
    };

    /**
     * Handle editing a deduction type
     */
    const handleEditDeductionType = (deductionType) => {
        setEditingDeductionType(deductionType);
        setShowAddTypeModal(true);
    };

    /**
     * Handle deactivating a deduction type
     */
    const handleDeactivateDeductionType = async (deductionType) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Deactivate Deduction Type',
            message: `Are you sure you want to deactivate "${deductionType.name || deductionType.typeName}"? This will prevent it from being used in new deductions.`,
            onConfirm: async () => {
                try {
                    await deductionService.deactivateDeductionType(deductionType.id);
                    showSuccess('Deduction type deactivated successfully');
                    loadData();
                } catch (error) {
                    console.error('Error deactivating deduction type:', error);
                    showError('Failed to deactivate deduction type');
                }
                setConfirmDialog(prev => ({ ...prev, isVisible: false }));
            }
        });
    };
    const handleDeleteDeduction = async (deduction) => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Delete Deduction',
            message: `Are you sure you want to permanently delete this deduction? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await deductionService.deleteManualDeduction(deduction.id);
                    showSuccess('Deduction deleted successfully');
                    loadData();
                } catch (error) {
                    console.error('Error deleting deduction:', error);
                    showError('Failed to delete deduction');
                }
                setConfirmDialog(prev => ({ ...prev, isVisible: false }));
            }
        });
    };

    /**
     * Handle bulk actions
     */
    const handleBulkActions = () => {
        if (selectedDeductions.length === 0) {
            showError('Please select at least one deduction');
            return;
        }
        setShowBulkModal(true);
    };

    /**
     * Handle export
     */
    const handleExport = async () => {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            const response = await deductionService.exportEmployeeDeductions(
                thirtyDaysAgo.toISOString().split('T')[0],
                today.toISOString().split('T')[0]
            );

            // Create blob and download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `deductions-export-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSuccess('Deductions exported successfully');
        } catch (error) {
            console.error('Error exporting deductions:', error);
            showError('Failed to export deductions');
        }
    };

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Format currency
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    /**
     * Format date
     */
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    /**
     * Get status badge
     */
    const getStatusBadge = (deduction) => {
        const isActive = deduction.isActive;
        const effectiveTo = deduction.effectiveTo ? new Date(deduction.effectiveTo) : null;
        const now = new Date();

        let status = 'Active';
        let className = 'status-badge status-badge--success';

        if (!isActive) {
            status = 'Inactive';
            className = 'status-badge status-badge--secondary';
        } else if (effectiveTo && effectiveTo < now) {
            status = 'Expired';
            className = 'status-badge status-badge--warning';
        }

        return <span className={className}>{status}</span>;
    };

    // ==================== TABLE DEFINITIONS ====================

    /**
     * Manual deductions actions
     */
    const manualDeductionActions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            className: 'view',
            onClick: handleViewDeduction
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            className: 'edit',
            onClick: handleEditDeduction,
            isDisabled: (deduction) => !deduction.isActive
        },
        {
            label: 'Deactivate',
            icon: <FaTimes />,
            className: 'warning',
            onClick: handleDeactivateDeduction,
            isDisabled: (deduction) => !deduction.isActive
        },
        {
            label: 'Delete',
            icon: <FaTimes />,
            className: 'danger',
            onClick: handleDeleteDeduction
        }
    ];

    /**
     * Deduction types actions
     */
    const deductionTypeActions = [
        {
            label: 'Edit Type',
            icon: <FaEdit />,
            className: 'edit',
            onClick: handleEditDeductionType
        },
        {
            label: 'Deactivate',
            icon: <FaTimes />,
            className: 'warning',
            onClick: handleDeactivateDeductionType,
            isDisabled: (deductionType) => !deductionType.isActive
        }
    ];
    const manualDeductionColumns = [
        {
            key: 'select',
            title: '',
            width: '50px',
            render: (deduction) => (
                <input
                    type="checkbox"
                    checked={selectedDeductions.includes(deduction.id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedDeductions(prev => [...prev, deduction.id]);
                        } else {
                            setSelectedDeductions(prev => prev.filter(id => id !== deduction.id));
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            )
        },
        {
            key: 'employeeName',
            title: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (deduction) => (
                <div className="employee-info">
                    <div className="employee-name">{deduction.employeeName || 'N/A'}</div>
                    <div className="employee-id">ID: {deduction.employeeId || 'N/A'}</div>
                </div>
            )
        },
        {
            key: 'deductionType',
            title: 'Deduction Type',
            accessor: 'deductionTypeName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (deduction) => (
                <div className="deduction-type-info">
                    <div className="type-name">{deduction.deductionTypeName || 'N/A'}</div>
                    <div className="type-category">{deduction.deductionTypeCategory || 'N/A'}</div>
                </div>
            )
        },
        {
            key: 'amount',
            title: 'Amount',
            accessor: 'customAmount',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (deduction) => (
                <div className="deduction-amount">
                    {deduction.customAmount ? formatCurrency(deduction.customAmount) : ''}
                    {deduction.customPercentage ? `${deduction.customPercentage}%` : ''}
                    {!deduction.customAmount && !deduction.customPercentage ? 'N/A' : ''}
                </div>
            )
        },
        {
            key: 'effectivePeriod',
            title: 'Effective Period',
            accessor: 'effectiveFrom',
            sortable: true,
            render: (deduction) => (
                <div className="effective-period">
                    <div>From: {formatDate(deduction.effectiveFrom)}</div>
                    {deduction.effectiveTo && (
                        <div>To: {formatDate(deduction.effectiveTo)}</div>
                    )}
                </div>
            )
        },
        {
            key: 'status',
            title: 'Status',
            accessor: 'isActive',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (deduction) => getStatusBadge(deduction)
        },
        {
            key: 'createdAt',
            title: 'Created',
            accessor: 'createdAt',
            sortable: true,
            render: (deduction) => formatDate(deduction.createdAt)
        }
    ];

    /**
     * Deduction types columns
     */
    const deductionTypeColumns = [
        {
            key: 'typeName',
            title: 'Type Name',
            accessor: 'name', // Backend returns 'name' field
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (type) => (
                <div className="type-name-info">
                    <div className="type-name">{type.name || type.typeName}</div>
                    <div className="type-flags">
                        {type.isPreTax && <span className="type-flag pre-tax">Pre-Tax</span>}
                        {type.isMandatory && <span className="type-flag mandatory">Mandatory</span>}
                    </div>
                </div>
            )
        },
        {
            key: 'category',
            title: 'Category',
            accessor: 'category',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (type) => (
                <span className="category-badge">
                    {type.category}
                </span>
            )
        },
        {
            key: 'description',
            title: 'Description',
            accessor: 'description',
            render: (type) => (
                <div className="description-text">
                    {type.description || 'No description'}
                </div>
            )
        },
        {
            key: 'allowedAmounts',
            title: 'Allowed Amounts',
            render: (type) => (
                <div className="allowed-amounts">
                    {type.allowCustomAmount && <span className="amount-type">Fixed</span>}
                    {type.allowCustomPercentage && <span className="amount-type">Percentage</span>}
                    {!type.allowCustomAmount && !type.allowCustomPercentage && <span className="amount-type disabled">None</span>}
                </div>
            )
        },
        {
            key: 'isActive',
            title: 'Status',
            accessor: 'isActive',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (type) => (
                <span className={`status-badge ${type.isActive ? 'status-badge--success' : 'status-badge--secondary'}`}>
                    {type.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    // Tab configuration
    const tabs = [
        {
            id: 'manual',
            label: 'Manual Deductions',
            icon: <FaList />,
            count: statistics.totalDeductions
        },
        {
            id: 'types',
            label: 'Deduction Types',
            icon: <FaCog />,
            count: deductionTypes.length
        },
        {
            id: 'summary',
            label: 'Summary & Reports',
            icon: <FaChartBar />
        }
    ];

    // Statistics for IntroCard
    const introStats = [
        {
            value: statistics.totalDeductions || 0,
            label: 'Total Deductions'
        },
        {
            value: statistics.activeDeductions || 0,
            label: 'Active'
        },
        {
            value: formatCurrency(statistics.totalAmount || 0),
            label: 'Total Amount'
        },
        {
            value: statistics.affectedEmployees || 0,
            label: 'Employees'
        }
    ];

    /**
     * Render tab content
     */
    const renderTabContent = () => {
        switch (activeTab) {
            case 'manual':
                return (
                    <DataTable
                        columns={manualDeductionColumns}
                        data={deductions}
                        loading={loading}
                        emptyMessage="No manual deductions found. Create your first deduction to get started."
                        className="deduction-table"

                        // Actions configuration
                        actions={manualDeductionActions}
                        actionsColumnWidth="180px"
                        onRowClick={handleViewDeduction}

                        // Search and filters
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={manualDeductionColumns.filter(col => col.filterable)}

                        // Add button
                        showAddButton={true}
                        addButtonText="Add Deduction"
                        addButtonIcon={<FaPlus />}
                        onAddClick={() => setShowCreateModal(true)}

                        // Table configuration
                        tableTitle="Manual Deductions"
                        defaultItemsPerPage={20}
                        itemsPerPageOptions={[10, 20, 50, 100]}
                        defaultSortField="createdAt"
                        defaultSortDirection="desc"

                        // Export functionality
                        showExportButton={true}
                        exportFileName="manual-deductions"
                        exportButtonText="Export Deductions"
                        customExportFunction={handleExport}
                    />
                );

            case 'types':
                return (
                    <DataTable
                        columns={deductionTypeColumns}
                        data={deductionTypes}
                        loading={loading}
                        emptyMessage="No deduction types found. Create deduction types to organize deductions."
                        className="deduction-types-table"

                        // Actions configuration
                        actions={deductionTypeActions}
                        actionsColumnWidth="140px"
                        onRowClick={handleEditDeductionType}

                        // Search and filters
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={deductionTypeColumns.filter(col => col.filterable)}

                        // Add button
                        showAddButton={true}
                        addButtonText="Add Type"
                        addButtonIcon={<FaPlus />}
                        onAddClick={() => setShowAddTypeModal(true)}

                        // Table configuration
                        tableTitle="Deduction Types"
                        defaultItemsPerPage={20}
                        itemsPerPageOptions={[10, 20, 50, 100]}
                        defaultSortField="name"
                        defaultSortDirection="asc"
                    />
                );

            case 'summary':
                return (
                    <div className="summary-content">
                        <div className="summary-cards">
                            <div className="summary-card">
                                <div className="summary-card-header">
                                    <h3>Deduction Overview</h3>
                                    <FaChartBar />
                                </div>
                                <div className="summary-card-content">
                                    <div className="stat-item">
                                        <span className="stat-label">Total Deductions:</span>
                                        <span className="stat-value">{statistics.totalDeductions || 0}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Active Deductions:</span>
                                        <span className="stat-value">{statistics.activeDeductions || 0}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Total Amount:</span>
                                        <span className="stat-value">{formatCurrency(statistics.totalAmount || 0)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Affected Employees:</span>
                                        <span className="stat-value">{statistics.affectedEmployees || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-card-header">
                                    <h3>Quick Actions</h3>
                                    <FaUsers />
                                </div>
                                <div className="summary-card-content">
                                    <button
                                        className="action-btn"
                                        onClick={() => navigate('/payroll/deductions/employee-summary')}
                                    >
                                        <FaUserCheck />
                                        Employee Summary
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={handleExport}
                                    >
                                        <FaFileExport />
                                        Export Report
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => navigate('/payroll/deductions/types')}
                                    >
                                        <FaCog />
                                        Manage Types
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="deduction-management">
            {/* IntroCard */}
            <IntroCard
                title="Deduction Management"
                label="PAYROLL CENTER"
                icon={<FaMinusCircle />}
                stats={introStats}
                className="mb-4"
            />

            {/* Tabs Navigation */}
            <div className="tabs-container">
                <div className="tabs-header">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className="tab-count">({tab.count})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Bulk Actions for Manual Deductions Tab */}
                {activeTab === 'manual' && selectedDeductions.length > 0 && (
                    <div className="bulk-actions-floating">
                        <button
                            className="btn btn-secondary bulk-action-btn"
                            onClick={handleBulkActions}
                        >
                            <FaUsers /> Bulk Actions ({selectedDeductions.length})
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="tab-content">
                    {renderTabContent()}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <ManualDeductionModal
                    deduction={editingDeduction}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingDeduction(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingDeduction(null);
                        loadData();
                    }}
                />
            )}

            {showBulkModal && (
                <BulkDeductionModal
                    deductionIds={selectedDeductions}
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={() => {
                        setShowBulkModal(false);
                        setSelectedDeductions([]);
                        loadData();
                    }}
                />
            )}

            {showAddTypeModal && (
                <AddDeductionTypeModal
                    deductionType={editingDeductionType}
                    onClose={() => {
                        setShowAddTypeModal(false);
                        setEditingDeductionType(null);
                    }}
                    onSuccess={() => {
                        setShowAddTypeModal(false);
                        setEditingDeductionType(null);
                        loadData();
                    }}
                />
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