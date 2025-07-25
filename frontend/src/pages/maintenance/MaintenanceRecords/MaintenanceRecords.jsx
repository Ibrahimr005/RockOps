import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaFilter, FaSearch, FaList } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import MaintenanceRecordModal from './MaintenanceRecordModal';
import './MaintenanceRecords.scss';
import maintenanceService from "../../../services/maintenanceService.js";

const MaintenanceRecords = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        site: 'all',
        type: 'all',
        dateRange: 'all'
    });

    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Mock data - replace with actual API calls

    useEffect(() => {
        loadMaintenanceRecords();
    }, [filters]);

    const loadMaintenanceRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await maintenanceService.getAllRecords();
            const records = response.data || [];
            console.log(records)
            
            // Transform data for display
            const transformedRecords = records.map(record => ({
                id: record.id,
                equipmentId: record.equipmentId,
                equipmentName: record.equipmentName || record.equipmentInfo || 'Unknown Equipment',
                equipmentModel: record.equipmentModel || 'N/A',
                equipmentSerialNumber: record.equipmentSerialNumber || 'N/A',
                initialIssueDescription: record.initialIssueDescription,
                status: record.status,
                currentResponsiblePerson: record.currentResponsiblePerson,
                currentResponsiblePhone: record.currentResponsiblePhone,
                currentResponsibleEmail: record.currentResponsibleEmail,
                site: record.site || 'N/A',
                totalCost: record.totalCost || 0,
                creationDate: record.creationDate,
                expectedCompletionDate: record.expectedCompletionDate,
                actualCompletionDate: record.actualCompletionDate,
                isOverdue: record.isOverdue,
                durationInDays: record.durationInDays,
                totalSteps: record.totalSteps || 0,
                completedSteps: record.completedSteps || 0,
                activeSteps: record.activeSteps || 0
            }));
            
            setMaintenanceRecords(transformedRecords);
        } catch (error) {
            console.error('Error loading maintenance records:', error);
            setError('Failed to load maintenance records. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setEditingRecord(record);
        } else {
            setEditingRecord(null);
        }
        setIsModalOpen(true);
    };

    const handleViewRecord = (record) => {
        setSelectedRecord(record);
        navigate(`/maintenance/records/${record.id}`);
    };

    const handleViewSteps = (record) => {
        navigate(`/maintenance/records/${record.id}?tab=steps`);
    };

    const handleDeleteRecord = async (id) => {
        try {
            setLoading(true);
            await maintenanceService.deleteRecord(id);
            showSuccess('Maintenance record deleted successfully');
            loadMaintenanceRecords();
        } catch (error) {
            console.error('Error deleting maintenance record:', error);
            let errorMessage = 'Failed to delete maintenance record. Please try again.';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (formData) => {
        try {
            setLoading(true);
            
            if (editingRecord) {
                await maintenanceService.updateRecord(editingRecord.id, formData);
                showSuccess('Maintenance record updated successfully');
            } else {
                await maintenanceService.createRecord(formData);
                showSuccess('Maintenance record created successfully');
            }
            
            setEditingRecord(null);
            setIsModalOpen(false);
            loadMaintenanceRecords();
        } catch (error) {
            console.error('Error saving maintenance record:', error);
            showError('Failed to save maintenance record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'var(--color-success)';
            case 'ACTIVE': return 'var(--color-primary)';
            case 'OVERDUE': return 'var(--color-danger)';
            case 'SCHEDULED': return 'var(--color-warning)';
            case 'ON_HOLD': return 'var(--color-info)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getStatusBadge = (status) => {
        const color = getStatusColor(status);
        return (
            <span 
                className="status-badge"
                style={{ 
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}`
                }}
            >
                {status}
            </span>
        );
    };

    const columns = [
        {
            header: 'Equipment',
            accessor: 'equipmentName',
            sortable: true,
            render: (row) => (
                <div className="equipment-info">
                    <div className="equipment-name">{row.equipmentName}</div>
                    <div className="equipment-details">
                        {row.equipmentModel} • {row.equipmentSerialNumber}
                    </div>
                </div>
            )
        },
        {
            header: 'Issue Description',
            accessor: 'initialIssueDescription',
            sortable: true,
            render: (row) => (
                <div className="issue-description">
                    {row.initialIssueDescription.length > 50 
                        ? `${row.initialIssueDescription.substring(0, 50)}...`
                        : row.initialIssueDescription
                    }
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => getStatusBadge(row.status)
        },
        {
            header: 'Responsible Contact',
            accessor: 'currentResponsiblePerson',
            sortable: true,
            render: (row) => (
                <div className="responsible-person">
                    <div className="person-name">{row.currentResponsiblePerson || 'Not assigned'}</div>
                    <div className="person-phone">{row.currentResponsiblePhone || ''}</div>
                </div>
            )
        },
        {
            header: 'Site',
            accessor: 'site',
            sortable: true
        },
        {
            header: 'Cost',
            accessor: 'totalCost',
            sortable: true,
            render: (row) => (
                <div className="cost-info">
                    ${row.totalCost?.toFixed(2) || '0.00'}
                </div>
            )
        },
        {
            header: 'Dates',
            accessor: 'creationDate',
            sortable: true,
            render: (row) => (
                <div className="date-info">
                    <div className="creation-date">
                        Created: {new Date(row.creationDate).toLocaleDateString()}
                    </div>
                    <div className="completion-date">
                        {row.actualCompletionDate 
                            ? `Completed: ${new Date(row.actualCompletionDate).toLocaleDateString()}`
                            : `Expected: ${new Date(row.expectedCompletionDate).toLocaleDateString()}`
                        }
                    </div>
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: <FaEye />,
            onClick: (row) => handleViewRecord(row),
            className: 'primary'
        },
        {
            label: 'View Steps',
            icon: <FaList />,
            onClick: (row) => handleViewSteps(row),
            className: 'info'
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => {
                if (window.confirm(`Are you sure you want to delete the maintenance record for ${row.equipmentName}?`)) {
                    handleDeleteRecord(row.id);
                }
            },
            className: 'danger'
        }
    ];

    const filterableColumns = [
        { header: 'Equipment', accessor: 'equipmentName' },
        { header: 'Status', accessor: 'status' },
        { header: 'Site', accessor: 'site' },
        { header: 'Responsible Person', accessor: 'currentResponsiblePerson' }
    ];

    if (error) {
        return (
            <div className="maintenance-records-error">
                <div className="error-message">
                    <h3>Error Loading Maintenance Records</h3>
                    <p>{error}</p>
                    <button onClick={loadMaintenanceRecords} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-records">
            <div className="maintenance-records-header">
                <div className="header-left">
                    <h1>Maintenance Records</h1>
                    <p>Track and manage all equipment maintenance activities</p>
                </div>
                <div className="header-right">
                    <button 
                        className="btn btn-primary"
                        onClick={() => handleOpenModal()}
                    >
                        <FaPlus /> New Maintenance Record
                    </button>
                </div>
            </div>

            <DataTable
                data={maintenanceRecords}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Maintenance Records"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No maintenance records found. Create your first maintenance record to get started."
            />

            {isModalOpen && (
                <MaintenanceRecordModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingRecord(null);
                    }}
                    onSubmit={handleSubmit}
                    editingRecord={editingRecord}
                />
            )}
        </div>
    );
};

export default MaintenanceRecords; 