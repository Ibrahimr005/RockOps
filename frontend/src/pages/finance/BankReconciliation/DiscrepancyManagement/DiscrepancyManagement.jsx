import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaPlus, FaUser, FaCheck, FaTimes, FaEdit, FaFileExcel } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const DiscrepancyManagement = () => {
    const [discrepancies, setDiscrepancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('open');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    // Form data for add discrepancy
    const [formData, setFormData] = useState({
        description: '',
        reason: '',
        priority: 'MEDIUM',
        amount: '',
        notes: ''
    });

    // Assignment form data
    const [assignmentData, setAssignmentData] = useState({
        assignee: ''
    });

    // Resolution form data
    const [resolutionData, setResolutionData] = useState({
        resolution: '',
        resolvedBy: 'Current User'
    });

    const tabs = [
        { id: 'open', label: 'Open Discrepancies' },
        { id: 'high-priority', label: 'High Priority' },
        { id: 'assigned', label: 'Assigned to Me' },
        { id: 'unassigned', label: 'Unassigned' },
        { id: 'all', label: 'All Discrepancies' }
    ];

    useEffect(() => {
        fetchDiscrepancies();
    }, [activeTab]);

    const fetchDiscrepancies = async () => {
        try {
            setLoading(true);
            let response;

            switch (activeTab) {
                case 'open':
                    response = await financeService.bankReconciliation.discrepancies.getOpen();
                    break;
                case 'high-priority':
                    response = await financeService.bankReconciliation.discrepancies.getHighPriority();
                    break;
                case 'assigned':
                    response = await financeService.bankReconciliation.discrepancies.getAssignedTo('Current User');
                    break;
                case 'unassigned':
                    response = await financeService.bankReconciliation.discrepancies.getUnassigned();
                    break;
                case 'all':
                default:
                    response = await financeService.bankReconciliation.discrepancies.getAll();
                    break;
            }

            const data = response.data || response;
            setDiscrepancies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching discrepancies:', error);
            showError('Failed to load discrepancies: ' + error.message);
            setDiscrepancies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDiscrepancy = async () => {
        try {
            const discrepancyData = {
                ...formData,
                amount: parseFloat(formData.amount) || null
            };

            await financeService.bankReconciliation.discrepancies.create(discrepancyData);
            showSuccess('Discrepancy created successfully');
            setShowAddModal(false);
            resetForm();
            fetchDiscrepancies();
        } catch (error) {
            console.error('Error creating discrepancy:', error);
            showError('Failed to create discrepancy: ' + error.message);
        }
    };

    const handleAssignDiscrepancy = async () => {
        try {
            await financeService.bankReconciliation.discrepancies.assign(selectedDiscrepancy.id, assignmentData.assignee);
            showSuccess('Discrepancy assigned successfully');
            setShowAssignModal(false);
            setSelectedDiscrepancy(null);
            setAssignmentData({ assignee: '' });
            fetchDiscrepancies();
        } catch (error) {
            console.error('Error assigning discrepancy:', error);
            showError('Failed to assign discrepancy: ' + error.message);
        }
    };

    const handleResolveDiscrepancy = async () => {
        try {
            await financeService.bankReconciliation.discrepancies.resolve(
                selectedDiscrepancy.id,
                resolutionData.resolution,
                resolutionData.resolvedBy
            );
            showSuccess('Discrepancy resolved successfully');
            setShowResolveModal(false);
            setSelectedDiscrepancy(null);
            setResolutionData({ resolution: '', resolvedBy: 'Current User' });
            fetchDiscrepancies();
        } catch (error) {
            console.error('Error resolving discrepancy:', error);
            showError('Failed to resolve discrepancy: ' + error.message);
        }
    };

    const handleCloseDiscrepancy = async (discrepancy) => {
        if (window.confirm('Are you sure you want to close this discrepancy?')) {
            try {
                await financeService.bankReconciliation.discrepancies.close(discrepancy.id);
                showSuccess('Discrepancy closed successfully');
                fetchDiscrepancies();
            } catch (error) {
                console.error('Error closing discrepancy:', error);
                showError('Failed to close discrepancy: ' + error.message);
            }
        }
    };

    const handleUpdatePriority = async (discrepancy, newPriority) => {
        try {
            await financeService.bankReconciliation.discrepancies.updatePriority(discrepancy.id, newPriority);
            showSuccess('Priority updated successfully');
            fetchDiscrepancies();
        } catch (error) {
            console.error('Error updating priority:', error);
            showError('Failed to update priority: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            description: '',
            reason: '',
            priority: 'MEDIUM',
            amount: '',
            notes: ''
        });
    };

    const openAssignModal = (discrepancy) => {
        setSelectedDiscrepancy(discrepancy);
        setAssignmentData({ assignee: discrepancy.assignedTo || '' });
        setShowAssignModal(true);
    };

    const openResolveModal = (discrepancy) => {
        setSelectedDiscrepancy(discrepancy);
        setResolutionData({ resolution: '', resolvedBy: 'Current User' });
        setShowResolveModal(true);
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getPriorityBadge = (priority) => {
        const className = `bank-reconciliation-status-badge bank-reconciliation-status-${priority?.toLowerCase()}`;
        return <span className={className}>{priority}</span>;
    };

    const getStatusBadge = (status) => {
        const className = `bank-reconciliation-status-badge bank-reconciliation-status-${status?.toLowerCase()}`;
        return <span className={className}>{status}</span>;
    };

    const columns = [
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            filterable: true,
            render: (row, value) => (
                <div>
                    <div className="font-medium">{value || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{row.reason}</div>
                </div>
            )
        },
        {
            header: 'Priority',
            accessor: 'priority',
            sortable: true,
            filterable: true,
            filterType: 'select',
            align: 'center',
            render: (row, value) => getPriorityBadge(value)
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            align: 'center',
            render: (row, value) => getStatusBadge(value)
        },
        {
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            align: 'right',
            render: (row, value) => formatCurrency(value)
        },
        {
            header: 'Assigned To',
            accessor: 'assignedTo',
            sortable: true,
            filterable: true,
            render: (row, value) => value || 'Unassigned'
        },
        {
            header: 'Created Date',
            accessor: 'createdDate',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            header: 'Days Open',
            accessor: 'createdDate',
            sortable: true,
            align: 'center',
            render: (row, value) => {
                if (!value) return 'N/A';
                const days = Math.floor((new Date() - new Date(value)) / (1000 * 60 * 60 * 24));
                return days;
            }
        }
    ];

    const actions = [
        {
            label: 'Assign',
            icon: <FaUser />,
            onClick: (discrepancy) => openAssignModal(discrepancy),
            className: 'bank-reconciliation-btn-secondary',
            isDisabled: (discrepancy) => discrepancy.status === 'RESOLVED' || discrepancy.status === 'CLOSED'
        },
        {
            label: 'Resolve',
            icon: <FaCheck />,
            onClick: (discrepancy) => openResolveModal(discrepancy),
            className: 'bank-reconciliation-btn-success',
            isDisabled: (discrepancy) => discrepancy.status === 'RESOLVED' || discrepancy.status === 'CLOSED'
        },
        {
            label: 'Close',
            icon: <FaTimes />,
            onClick: (discrepancy) => handleCloseDiscrepancy(discrepancy),
            className: 'bank-reconciliation-btn-danger',
            isDisabled: (discrepancy) => discrepancy.status === 'CLOSED'
        }
    ];

    const filterableColumns = [
        { header: 'Description', accessor: 'description', filterType: 'text' },
        { header: 'Priority', accessor: 'priority', filterType: 'select' },
        { header: 'Status', accessor: 'status', filterType: 'select' },
        { header: 'Assigned To', accessor: 'assignedTo', filterType: 'text' }
    ];

    return (
        <div className="bank-reconciliation-card">
            <div className="bank-reconciliation-card-header">
                <h3 className="bank-reconciliation-card-title">
                    <FaExclamationTriangle />
                    Discrepancy Management
                </h3>
            </div>

            {/* Tab Navigation */}
            <div className="tabs-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <DataTable
                data={discrepancies}
                columns={columns}
                loading={loading}
                actions={actions}
                showAddButton={true}
                addButtonText="Add Discrepancy"
                addButtonIcon={<FaPlus />}
                onAddClick={() => setShowAddModal(true)}
                showExportButton={true}
                exportButtonText="Export Discrepancies"
                exportButtonIcon={<FaFileExcel />}
                exportFileName="discrepancies"
                tableTitle={`Discrepancies - ${activeTab.replace('-', ' ').toUpperCase()}`}
                emptyMessage="No discrepancies found"
                className="bank-reconciliation-table"
                filterableColumns={filterableColumns}
                defaultSortField="createdDate"
                defaultSortDirection="desc"
            />

            {/* Add Discrepancy Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Discrepancy</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form className="bank-reconciliation-form">
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Description *</label>
                                    <input
                                        type="text"
                                        className="bank-reconciliation-form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="Enter discrepancy description"
                                        required
                                    />
                                </div>
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Priority</label>
                                        <select
                                            className="bank-reconciliation-form-select"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                        </select>
                                    </div>
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="bank-reconciliation-form-input"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Reason *</label>
                                    <textarea
                                        className="bank-reconciliation-form-textarea"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                        placeholder="Describe the reason for this discrepancy"
                                        required
                                        rows="3"
                                    />
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Additional Notes</label>
                                    <textarea
                                        className="bank-reconciliation-form-textarea"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        placeholder="Enter any additional notes (optional)"
                                        rows="2"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-primary"
                                onClick={handleAddDiscrepancy}
                                disabled={!formData.description || !formData.reason}
                            >
                                Create Discrepancy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Discrepancy Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Assign Discrepancy</h3>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="bank-reconciliation-form">
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Discrepancy</label>
                                    <div style={{ padding: '10px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '15px' }}>
                                        <strong>{selectedDiscrepancy?.description}</strong>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '5px' }}>
                                            {selectedDiscrepancy?.reason}
                                        </div>
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Assign To *</label>
                                    <input
                                        type="text"
                                        className="bank-reconciliation-form-input"
                                        value={assignmentData.assignee}
                                        onChange={(e) => setAssignmentData({...assignmentData, assignee: e.target.value})}
                                        placeholder="Enter assignee name or email"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                                onClick={() => setShowAssignModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-primary"
                                onClick={handleAssignDiscrepancy}
                                disabled={!assignmentData.assignee}
                            >
                                Assign Discrepancy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Discrepancy Modal */}
            {showResolveModal && (
                <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Resolve Discrepancy</h3>
                            <button className="modal-close" onClick={() => setShowResolveModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="bank-reconciliation-form">
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Discrepancy</label>
                                    <div style={{ padding: '10px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '15px' }}>
                                        <strong>{selectedDiscrepancy?.description}</strong>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '5px' }}>
                                            {selectedDiscrepancy?.reason}
                                        </div>
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Resolution Details *</label>
                                    <textarea
                                        className="bank-reconciliation-form-textarea"
                                        value={resolutionData.resolution}
                                        onChange={(e) => setResolutionData({...resolutionData, resolution: e.target.value})}
                                        placeholder="Describe how this discrepancy was resolved"
                                        required
                                        rows="4"
                                    />
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Resolved By</label>
                                    <input
                                        type="text"
                                        className="bank-reconciliation-form-input"
                                        value={resolutionData.resolvedBy}
                                        onChange={(e) => setResolutionData({...resolutionData, resolvedBy: e.target.value})}
                                        placeholder="Enter resolver name"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                                onClick={() => setShowResolveModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-success"
                                onClick={handleResolveDiscrepancy}
                                disabled={!resolutionData.resolution}
                            >
                                Resolve Discrepancy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscrepancyManagement;