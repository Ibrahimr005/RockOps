import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaList, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import MaintenanceRecordModal from './MaintenanceRecordModal';
import MaintenanceRecordViewModal from './MaintenanceRecordViewModal/MaintenanceRecordViewModal';
import '../../../styles/status-badges.scss';
import './MaintenanceRecords.scss';
import maintenanceService from "../../../services/maintenanceService.js";
import {FiPlus} from "react-icons/fi";

const MaintenanceRecords = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewingRecordId, setViewingRecordId] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        site: 'all',
        type: 'all',
        dateRange: 'all'
    });

    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadMaintenanceRecords();
    }, [filters]);

    const loadMaintenanceRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await maintenanceService.getAllRecords();
            const records = response.data || [];

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
        setViewingRecordId(record.id);
        setIsViewModalOpen(true);
    };

    const handleViewSteps = (record) => {
        navigate(`/maintenance/records/${record.id}?tab=steps`);
    };

    const handleViewDetails = (record) => {
        navigate(`/maintenance/records/${record.id}`);
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

    const handleCompleteRecord = async (record) => {
        try {
            setLoading(true);
            await maintenanceService.updateRecord(record.id, {
                status: 'COMPLETED',
                actualCompletionDate: new Date().toISOString()
            });
            showSuccess('Maintenance record marked as completed successfully');
            loadMaintenanceRecords();
        } catch (error) {
            console.error('Error completing maintenance record:', error);
            showError('Failed to complete maintenance record. Please try again.');
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
        const statusClass = status.toLowerCase().replace(/_/g, '-');
        return (
            <span className={`status-badge ${statusClass}`}>
                {status.replace(/_/g, ' ')}
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
                    {row.totalCost?.toFixed(2) || '0.00'}
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
            label: 'Quick View',
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
            className: 'primary',
            show: (row) => row.status !== 'COMPLETED'
        },
        {
            label: 'Mark as Final',
            icon: <FaCheckCircle />,
            onClick: (row) => {
                if (window.confirm(`Are you sure you want to mark the maintenance record for ${row.equipmentName} as completed?`)) {
                    handleCompleteRecord(row);
                }
            },
            className: 'success',
            show: (row) => row.status === 'ACTIVE'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => {
                if (window.confirm(`Are you sure you want to delete the maintenance record for ${row.equipmentName}?`)) {
                    handleDeleteRecord(row.id);
                }
            },
            className: 'danger',
            show: (row) => row.status !== 'COMPLETED'
        }
    ];

    const filterableColumns = [
        { header: 'Equipment', accessor: 'equipmentName', filterType: 'select' },
        { header: 'Status', accessor: 'status', filterType: 'select' },
        { header: 'Site', accessor: 'site', filterType: 'select' },
        { header: 'Responsible Person', accessor: 'currentResponsiblePerson', filterType: 'select' }
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
                <h1>Maintenance Records
                    <p className="maintenance-records-header__subtitle">
                        Track and manage all equipment maintenance activities
                    </p>
                </h1>
            </div>

            <DataTable
                data={maintenanceRecords}
                columns={columns}
                loading={loading}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No maintenance records found. Create your first maintenance record to get started."
                showAddButton={true}
                addButtonText="New Maintenance Record"
                onAddClick={() => handleOpenModal()}
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

            {isViewModalOpen && (
                <MaintenanceRecordViewModal
                    isOpen={isViewModalOpen}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setViewingRecordId(null);
                    }}
                    recordId={viewingRecordId}
                />
            )}
        </div>
    );
};

export default MaintenanceRecords;