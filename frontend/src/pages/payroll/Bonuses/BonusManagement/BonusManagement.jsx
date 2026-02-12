// ========================================
// FILE: BonusManagement.jsx
// Bonus Management Page - Two tabs: Bonuses + Bonus Types
// ========================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FaPlus,
    FaEdit,
    FaEye,
    FaTimes,
    FaGift,
    FaCheckCircle,
    FaTimesCircle,
    FaList,
    FaMoneyBillWave,
    FaClock,
    FaBan,
    FaUsers,
    FaSpinner
} from 'react-icons/fa';
import { bonusService, BONUS_STATUS, BONUS_STATUS_CONFIG } from '../../../../services/payroll/bonusService';
import { employeeService } from '../../../../services/hr/employeeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import PageHeader from '../../../../components/common/PageHeader/index.js';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import CreateBonusModal from '../components/CreateBonusModal/CreateBonusModal.jsx';
import BulkBonusModal from '../components/BulkBonusModal/BulkBonusModal.jsx';
import BonusTypeModal from '../components/BonusTypeModal/BonusTypeModal.jsx';
import './BonusManagement.scss';

const BonusManagement = () => {
    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();

    // ========================================
    // STATE
    // ========================================
    const [activeTab, setActiveTab] = useState('bonuses');
    const [bonuses, setBonuses] = useState([]);
    const [bonusTypes, setBonusTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // Modal states
    const [showCreateBonusModal, setShowCreateBonusModal] = useState(false);
    const [showBulkBonusModal, setShowBulkBonusModal] = useState(false);
    const [showBonusTypeModal, setShowBonusTypeModal] = useState(false);
    const [editingBonusType, setEditingBonusType] = useState(null);

    // Rejection modal
    const [rejectModal, setRejectModal] = useState({ open: false, bonusId: null, reason: '' });

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

            const [bonusesRes, typesRes, employeesRes] = await Promise.all([
                bonusService.getAllBonuses().catch(() => ({ data: [] })),
                bonusService.getAllBonusTypes().catch(() => ({ data: [] })),
                employeeService.getAll().catch(() => ({ data: [] }))
            ]);

            setBonuses(bonusesRes.data || bonusesRes || []);
            setBonusTypes(typesRes.data || typesRes || []);
            setEmployees(employeesRes.data || employeesRes || []);

        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load bonus data');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Scroll lock for rejection modal
    useEffect(() => {
        if (rejectModal.open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [rejectModal.open]);

    // ========================================
    // STATISTICS
    // ========================================
    const statistics = useMemo(() => {
        return bonusService.calculateStatistics(bonuses);
    }, [bonuses]);

    const typeStatistics = useMemo(() => {
        return {
            total: bonusTypes.length,
            active: bonusTypes.filter(t => t.isActive !== false && t.active !== false).length,
            inactive: bonusTypes.filter(t => t.isActive === false || t.active === false).length
        };
    }, [bonusTypes]);

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

    const getMonthName = (month) => {
        if (!month) return '-';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[month - 1] || '-';
    };

    // ========================================
    // BONUS HANDLERS
    // ========================================
    const handleApproveBonus = (bonus) => {
        setConfirmDialog({
            isVisible: true,
            type: 'info',
            title: 'Approve Bonus',
            message: `Are you sure you want to approve the bonus of ${formatCurrency(bonus.amount)} for ${bonus.employeeName}?`,
            onConfirm: async () => {
                try {
                    setProcessingId(bonus.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await bonusService.approveBonus(bonus.id);
                    showSuccess(`Bonus approved for ${bonus.employeeName}`);
                    loadData();
                } catch (error) {
                    console.error('Error approving bonus:', error);
                    showError(error.response?.data?.message || error.message || 'Failed to approve bonus');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleRejectBonus = (bonus) => {
        setRejectModal({ open: true, bonusId: bonus.id, reason: '' });
    };

    const handleSubmitRejection = async () => {
        if (!rejectModal.reason.trim()) {
            showWarning('Please provide a reason for rejection');
            return;
        }

        try {
            setProcessingId(rejectModal.bonusId);
            await bonusService.rejectBonus(rejectModal.bonusId, rejectModal.reason);
            showSuccess('Bonus rejected successfully');
            setRejectModal({ open: false, bonusId: null, reason: '' });
            loadData();
        } catch (error) {
            console.error('Error rejecting bonus:', error);
            showError(error.response?.data?.message || error.message || 'Failed to reject bonus');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelBonus = (bonus) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Cancel Bonus',
            message: `Are you sure you want to cancel the bonus of ${formatCurrency(bonus.amount)} for ${bonus.employeeName}? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    setProcessingId(bonus.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await bonusService.cancelBonus(bonus.id);
                    showInfo('Bonus cancelled successfully');
                    loadData();
                } catch (error) {
                    console.error('Error cancelling bonus:', error);
                    showError(error.response?.data?.message || error.message || 'Failed to cancel bonus');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    // ========================================
    // BONUS TYPE HANDLERS
    // ========================================
    const handleCreateBonusType = () => {
        setEditingBonusType(null);
        setShowBonusTypeModal(true);
    };

    const handleEditBonusType = (type) => {
        setEditingBonusType(type);
        setShowBonusTypeModal(true);
    };

    const handleDeactivateBonusType = (type) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Deactivate Bonus Type',
            message: `Are you sure you want to deactivate "${type.name}"? It will no longer be available for new bonuses.`,
            onConfirm: async () => {
                try {
                    setProcessingId(type.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    await bonusService.deactivateBonusType(type.id);
                    showInfo('Bonus type deactivated');
                    loadData();
                } catch (error) {
                    console.error('Error deactivating bonus type:', error);
                    showError(error.response?.data?.message || error.message || 'Failed to deactivate bonus type');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    // ========================================
    // TABLE COLUMNS - BONUSES
    // ========================================
    const bonusColumns = [
        {
            accessor: 'bonusNumber',
            header: 'Bonus #',
            sortable: true,
            render: (row) => (
                <span className="bonus-number">{row.bonusNumber || '-'}</span>
            )
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row) => (
                <div className="bonus-employee-cell">
                    <span className="employee-name">{row.employeeName}</span>
                </div>
            )
        },
        {
            accessor: 'bonusTypeName',
            header: 'Bonus Type',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row) => (
                <span className="bonus-type-badge">{row.bonusTypeName || '-'}</span>
            )
        },
        {
            accessor: 'amount',
            header: 'Amount',
            sortable: true,
            render: (row) => (
                <span className="bonus-amount">{formatCurrency(row.amount)}</span>
            )
        },
        {
            accessor: 'effectiveMonth',
            header: 'Period',
            sortable: true,
            render: (row) => (
                <span>{getMonthName(row.effectiveMonth)} {row.effectiveYear}</span>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => {
                const config = BONUS_STATUS_CONFIG[row.status] || { label: row.statusDisplayName || row.status, color: '#6b7280', bgColor: '#f3f4f6' };
                return (
                    <span
                        className="bonus-status-badge"
                        style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                            border: `1px solid ${config.color}40`
                        }}
                    >
                        {config.label}
                    </span>
                );
            }
        },
        {
            accessor: 'createdAt',
            header: 'Created',
            sortable: true,
            render: (row) => formatDate(row.createdAt)
        }
    ];

    // ========================================
    // TABLE ACTIONS - BONUSES
    // ========================================
    const bonusActions = [
        {
            label: 'Approve',
            icon: <FaCheckCircle />,
            onClick: handleApproveBonus,
            isVisible: (bonus) => bonusService.isPendingHRApproval(bonus),
            isDisabled: (bonus) => processingId === bonus.id,
            className: 'action-approve'
        },
        {
            label: 'Reject',
            icon: <FaTimesCircle />,
            onClick: handleRejectBonus,
            isVisible: (bonus) => bonusService.isPendingHRApproval(bonus),
            isDisabled: (bonus) => processingId === bonus.id,
            className: 'action-reject'
        },
        {
            label: 'Cancel',
            icon: <FaBan />,
            onClick: handleCancelBonus,
            isVisible: (bonus) => bonusService.canEditBonus(bonus),
            isDisabled: (bonus) => processingId === bonus.id,
            className: 'action-cancel'
        }
    ];

    // ========================================
    // TABLE COLUMNS - BONUS TYPES
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
                <span className="type-name">{type.name}</span>
            )
        },
        {
            accessor: 'description',
            header: 'Description',
            render: (type) => (
                <span className="description-cell">{type.description || '-'}</span>
            )
        },
        {
            accessor: 'isActive',
            header: 'Status',
            sortable: true,
            render: (type) => (
                <span className={`status-badge ${(type.isActive !== false && type.active !== false) ? 'active' : 'inactive'}`}>
                    {(type.isActive !== false && type.active !== false) ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    // ========================================
    // TABLE ACTIONS - BONUS TYPES
    // ========================================
    const typeActions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEditBonusType,
            className: 'action-edit'
        },
        {
            label: 'Deactivate',
            icon: <FaTimesCircle />,
            onClick: handleDeactivateBonusType,
            isVisible: (type) => type.isActive !== false && type.active !== false,
            isDisabled: (type) => processingId === type.id,
            className: 'action-deactivate'
        }
    ];

    // ========================================
    // MODAL CALLBACKS
    // ========================================
    const handleBonusCreated = () => {
        setShowCreateBonusModal(false);
        loadData();
    };

    const handleBulkBonusCreated = () => {
        setShowBulkBonusModal(false);
        loadData();
    };

    const handleBonusTypeSaved = () => {
        setShowBonusTypeModal(false);
        setEditingBonusType(null);
        loadData();
    };

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="bonus-management">
            {/* Header */}
            <PageHeader title="Bonus Management" subtitle="Manage employee bonuses and bonus types" />

            {/* Statistics Cards */}
            {activeTab === 'bonuses' ? (
                <StatisticsCards
                    cards={[
                        { icon: <FaGift />, label: "Total Bonuses", value: statistics.total, variant: "total" },
                        { icon: <FaClock />, label: "Pending HR", value: statistics.pendingHR, variant: "warning" },
                        { icon: <FaCheckCircle />, label: "Approved", value: statistics.approved, variant: "success" },
                        { icon: <FaMoneyBillWave />, label: "Total Amount", value: formatCurrency(statistics.totalAmount), variant: "info" },
                    ]}
                    columns={4}
                />
            ) : (
                <StatisticsCards
                    cards={[
                        { icon: <FaList />, label: "Total Types", value: typeStatistics.total, variant: "total" },
                        { icon: <FaCheckCircle />, label: "Active Types", value: typeStatistics.active, variant: "active" },
                        { icon: <FaTimesCircle />, label: "Inactive Types", value: typeStatistics.inactive, variant: "danger" },
                    ]}
                    columns={3}
                />
            )}

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'bonuses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bonuses')}
                >
                    <FaGift /> Bonuses
                </button>
                <button
                    className={`tab-btn ${activeTab === 'bonus-types' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bonus-types')}
                >
                    <FaList /> Bonus Types
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'bonuses' && (
                    <div className="table-container">
                        <DataTable
                            data={Array.isArray(bonuses) ? bonuses : []}
                            columns={bonusColumns}
                            loading={loading}
                            emptyMessage="No bonuses found. Create your first bonus to get started."

                            showSearch={true}
                            showFilters={true}
                            filterableColumns={bonusColumns.filter(c => c.filterable)}

                            actions={bonusActions}
                            actionsColumnWidth="180px"

                            showAddButton={true}
                            addButtonText="Create Bonus"
                            addButtonIcon={<FaPlus />}
                            onAddClick={() => setShowCreateBonusModal(true)}

                            showExportButton={true}
                            exportFileName="bonuses"

                            defaultItemsPerPage={15}
                            itemsPerPageOptions={[10, 15, 25, 50]}
                            defaultSortField="createdAt"
                            defaultSortDirection="desc"

                            className="bonuses-table"

                            additionalHeaderContent={
                                <button
                                    className="btn-bulk-bonus"
                                    onClick={() => setShowBulkBonusModal(true)}
                                >
                                    <FaUsers /> Bulk Bonus
                                </button>
                            }
                        />
                    </div>
                )}

                {activeTab === 'bonus-types' && (
                    <div className="table-container">
                        <DataTable
                            data={Array.isArray(bonusTypes) ? bonusTypes : []}
                            columns={typeColumns}
                            loading={loading}
                            emptyMessage="No bonus types found. Create your first bonus type to get started."

                            showSearch={true}
                            showFilters={true}
                            filterableColumns={typeColumns.filter(c => c.filterable)}

                            actions={typeActions}
                            actionsColumnWidth="150px"

                            showAddButton={true}
                            addButtonText="Add Type"
                            addButtonIcon={<FaPlus />}
                            onAddClick={handleCreateBonusType}

                            showExportButton={true}
                            exportFileName="bonus-types"

                            defaultItemsPerPage={15}
                            itemsPerPageOptions={[10, 15, 25, 50]}
                            defaultSortField="name"
                            defaultSortDirection="asc"

                            className="bonus-types-table"
                        />
                    </div>
                )}
            </div>

            {/* Create Bonus Modal */}
            {showCreateBonusModal && (
                <CreateBonusModal
                    employees={employees}
                    bonusTypes={bonusTypes.filter(t => t.isActive !== false && t.active !== false)}
                    onClose={() => setShowCreateBonusModal(false)}
                    onSuccess={handleBonusCreated}
                />
            )}

            {/* Bulk Bonus Modal */}
            {showBulkBonusModal && (
                <BulkBonusModal
                    employees={employees}
                    bonusTypes={bonusTypes.filter(t => t.isActive !== false && t.active !== false)}
                    onClose={() => setShowBulkBonusModal(false)}
                    onSuccess={handleBulkBonusCreated}
                />
            )}

            {/* Bonus Type Modal */}
            {showBonusTypeModal && (
                <BonusTypeModal
                    bonusType={editingBonusType}
                    onClose={() => {
                        setShowBonusTypeModal(false);
                        setEditingBonusType(null);
                    }}
                    onSuccess={handleBonusTypeSaved}
                />
            )}

            {/* Rejection Modal */}
            {rejectModal.open && (
                <div className="modal-overlay" onClick={() => setRejectModal({ open: false, bonusId: null, reason: '' })}>
                    <div className="modal-content reject-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FaTimesCircle /> Reject Bonus</h3>
                            <button className="btn-close" onClick={() => setRejectModal({ open: false, bonusId: null, reason: '' })}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Rejection Reason <span className="required">*</span></label>
                                <textarea
                                    value={rejectModal.reason}
                                    onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Please provide the reason for rejecting this bonus..."
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setRejectModal({ open: false, bonusId: null, reason: '' })}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-reject"
                                onClick={handleSubmitRejection}
                                disabled={!rejectModal.reason.trim() || processingId === rejectModal.bonusId}
                            >
                                {processingId === rejectModal.bonusId ? (
                                    <><FaSpinner className="spin" /> Rejecting...</>
                                ) : (
                                    <><FaTimesCircle /> Reject Bonus</>
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

export default BonusManagement;
