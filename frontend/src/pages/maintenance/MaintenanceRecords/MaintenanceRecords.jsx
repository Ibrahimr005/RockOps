import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaList, FaCheckCircle, FaPlus, FaSearch, FaEllipsisV, FaUser, FaMapMarkerAlt, FaDollarSign, FaClock, FaTools, FaExclamationCircle, FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import MaintenanceRecordModal from './MaintenanceRecordModal';
import MaintenanceRecordViewModal from './MaintenanceRecordViewModal/MaintenanceRecordViewModal';
import TicketTypeSelectionModal from './TicketTypeSelectionModal';
import DirectPurchaseModal from './DirectPurchaseModal';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner/LoadingSpinner';
import '../../../styles/status-badges.scss';
import './MaintenanceRecords.scss';
import maintenanceService from "../../../services/maintenanceService.js";
import directPurchaseService from "../../../services/directPurchaseService.js";
import {FiPlus} from "react-icons/fi";
import { ROLES } from '../../../utils/roles';

const MaintenanceRecords = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isTicketTypeSelectionOpen, setIsTicketTypeSelectionOpen] = useState(false);
    const [isDirectPurchaseModalOpen, setIsDirectPurchaseModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewingRecordId, setViewingRecordId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        site: 'all',
        type: 'all',
        ticketType: 'all', // Filter by ticket type: 'all', 'MAINTENANCE', 'DIRECT_PURCHASE'
        dateRange: 'all'
    });
    
    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        title: '',
        message: '',
        onConfirm: null,
        recordToDelete: null
    });

    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();
    const { showSuccess: showToastSuccess, showError: showToastError } = useNotification();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Helper function to check if user has maintenance team access
    const hasMaintenanceAccess = (user) => {
        if (!user) return false;
        
        // Handle both 'role' (singular) and 'roles' (plural) properties
        const userRoles = user.roles || (user.role ? [user.role] : []);
        
        const maintenanceRoles = [
            ROLES.ADMIN, 
            ROLES.MAINTENANCE_MANAGER, 
            ROLES.MAINTENANCE_EMPLOYEE, 
            ROLES.EQUIPMENT_MANAGER
        ];
        return userRoles.some(role => maintenanceRoles.includes(role));
    };

    // Helper function to check if user is admin or maintenance manager (full permissions)
    const isAdminOrManager = (user) => {
        if (!user) return false;
        
        // Handle both 'role' (singular) and 'roles' (plural) properties
        const userRoles = user.roles || (user.role ? [user.role] : []);
        
        const managerRoles = [ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER];
        return userRoles.some(role => managerRoles.includes(role));
    };

    useEffect(() => {
        loadMaintenanceRecords();
    }, [filters]);

    const loadMaintenanceRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load both maintenance records and direct purchase tickets
            const [maintenanceResponse, directPurchaseResponse] = await Promise.all([
                maintenanceService.getAllRecords(),
                directPurchaseService.getAllTickets()
            ]);

            const maintenanceRecords = maintenanceResponse.data || [];
            const directPurchaseTickets = directPurchaseResponse.data || [];

            // Transform maintenance records
            const transformedMaintenanceRecords = maintenanceRecords.map(record => {
                const isCompleted = record.status === 'COMPLETED' && record.actualCompletionDate;
                const totalCost = record.totalCost || 0;
                const expectedTotalCost = record.expectedTotalCost || totalCost;
                const actualTotalCost = record.actualTotalCost || (isCompleted ? totalCost : 0);

                return {
                    id: record.id,
                    ticketType: 'MAINTENANCE',
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
                    totalCost: totalCost,
                    expectedTotalCost: expectedTotalCost,
                    actualTotalCost: actualTotalCost,
                    costDifference: actualTotalCost - expectedTotalCost,
                    isActualCost: isCompleted,
                    creationDate: record.creationDate,
                    issueDate: record.issueDate, // Add issueDate for modal pre-population
                    sparePartName: record.sparePartName, // Add sparePartName for modal pre-population
                    expectedCompletionDate: record.expectedCompletionDate,
                    actualCompletionDate: record.actualCompletionDate,
                    isOverdue: record.isOverdue,
                    durationInDays: record.durationInDays,
                    totalSteps: record.totalSteps || 0,
                    completedSteps: record.completedSteps || 0,
                    activeSteps: record.activeSteps || 0
                };
            });

            // Transform direct purchase tickets
            const transformedDirectPurchaseTickets = directPurchaseTickets.map(ticket => {
                const isCompleted = ticket.status === 'COMPLETED' && ticket.actualCompletionDate;
                const expectedTotalCost = ticket.totalExpectedCost || 0;
                const actualTotalCost = ticket.totalActualCost || 0;

                return {
                    id: ticket.id,
                    ticketType: 'DIRECT_PURCHASE',
                    equipmentId: ticket.equipmentId,
                    equipmentName: ticket.equipmentName || 'Unknown Equipment',
                    equipmentModel: 'N/A',
                    equipmentSerialNumber: 'N/A',
                    initialIssueDescription: ticket.description || 'Direct purchase from merchant',
                    status: ticket.status,
                    currentResponsiblePerson: ticket.responsiblePerson || 'Not assigned',
                    currentResponsiblePhone: ticket.phoneNumber || '',
                    currentResponsibleEmail: '',
                    site: ticket.site || 'N/A',
                    totalCost: isCompleted ? actualTotalCost : expectedTotalCost,
                    expectedTotalCost: expectedTotalCost,
                    actualTotalCost: actualTotalCost,
                    costDifference: actualTotalCost - expectedTotalCost,
                    isActualCost: isCompleted,
                    creationDate: ticket.creationDate,
                    expectedCompletionDate: ticket.expectedCompletionDate,
                    actualCompletionDate: ticket.actualCompletionDate,
                    isOverdue: ticket.isOverdue || false,
                    durationInDays: ticket.durationInDays || 0,
                    totalSteps: ticket.totalSteps || 2,
                    completedSteps: ticket.completedSteps || 0,
                    activeSteps: ticket.activeSteps || 0,
                    merchantName: ticket.merchantName
                };
            });

            // Combine both arrays
            const transformedRecords = [...transformedMaintenanceRecords, ...transformedDirectPurchaseTickets];

            setMaintenanceRecords(transformedRecords);
        } catch (error) {
            console.error('Error loading maintenance records:', error);
            setError('Failed to load maintenance records. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNewTicket = () => {
        // Open ticket type selection modal
        setIsTicketTypeSelectionOpen(true);
    };

    const handleSelectMaintenanceTicket = () => {
        setIsTicketTypeSelectionOpen(false);
        setEditingRecord(null);
        setIsModalOpen(true);
    };

    const handleSelectDirectPurchaseTicket = () => {
        setIsTicketTypeSelectionOpen(false);
        setIsDirectPurchaseModalOpen(true);
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
        if (record.ticketType === 'DIRECT_PURCHASE') {
            // Navigate directly to direct purchase detail view
            navigate(`/maintenance/direct-purchase/${record.id}`);
        } else {
            // Show maintenance record view modal
            setViewingRecordId(record.id);
            setIsViewModalOpen(true);
        }
    };

    const handleViewSteps = (record) => {
        if (record.ticketType === 'DIRECT_PURCHASE') {
            navigate(`/maintenance/direct-purchase/${record.id}`);
        } else {
            navigate(`/maintenance/records/${record.id}?tab=steps`);
        }
    };

    const handleViewDetails = (record) => {
        if (record.ticketType === 'DIRECT_PURCHASE') {
            navigate(`/maintenance/direct-purchase/${record.id}`);
        } else {
            navigate(`/maintenance/records/${record.id}`);
        }
    };

    const showDeleteConfirmation = (row) => {
        const isDirectPurchase = row.ticketType === 'DIRECT_PURCHASE';
        setConfirmDialog({
            isVisible: true,
            title: isDirectPurchase ? 'Delete Direct Purchase Ticket' : 'Delete Maintenance Record',
            message: `Are you sure you want to delete the ${isDirectPurchase ? 'direct purchase ticket' : 'maintenance record'} for "${row.equipmentName}"? This action cannot be undone.`,
            onConfirm: () => handleDeleteRecord(row.id, isDirectPurchase),
            recordToDelete: row
        });
    };

    const handleDeleteRecord = async (id, isDirectPurchase = false) => {
        // Close the dialog first
        setConfirmDialog({ ...confirmDialog, isVisible: false });
        
        try {
            setLoading(true);
            if (isDirectPurchase) {
                await directPurchaseService.deleteTicket(id);
                showSuccess('Direct purchase ticket deleted successfully');
            } else {
                await maintenanceService.deleteRecord(id);
                showSuccess('Maintenance record deleted successfully');
            }
            loadMaintenanceRecords();
        } catch (error) {
            console.error(`Error deleting ${isDirectPurchase ? 'direct purchase ticket' : 'maintenance record'}:`, error);
            let errorMessage = `Failed to delete ${isDirectPurchase ? 'direct purchase ticket' : 'maintenance record'}. Please try again.`;

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

    const handleDirectPurchaseSubmit = async (formData) => {
        try {
            setLoading(true);
            const response = await directPurchaseService.createTicket(formData);

            // Show toast notification with action to view the ticket
            showToastSuccess(
                'Direct Purchase Created!',
                'Ticket created successfully with 2 auto-generated steps',
                {
                    action: {
                        label: 'View Ticket',
                        onClick: () => navigate(`/maintenance/direct-purchase/${response.data.id}`)
                    },
                    duration: 6000
                }
            );

            // Also show old snackbar for backward compatibility
            showSuccess('Direct purchase ticket created successfully with 2 auto-generated steps');
            setIsDirectPurchaseModalOpen(false);
            loadMaintenanceRecords(); // Reload to show the new ticket
        } catch (error) {
            console.error('Error creating direct purchase ticket:', error);
            showToastError('Creation Failed', 'Failed to create direct purchase ticket. Please try again.');
            showError('Failed to create direct purchase ticket. Please try again.');
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredRecords = maintenanceRecords.filter(record => {
        // Filter by ticket type
        if (filters.ticketType !== 'all' && record.ticketType !== filters.ticketType) {
            return false;
        }

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                record.equipmentName?.toLowerCase().includes(search) ||
                record.initialIssueDescription?.toLowerCase().includes(search) ||
                record.status?.toLowerCase().includes(search) ||
                record.site?.toLowerCase().includes(search) ||
                record.currentResponsiblePerson?.toLowerCase().includes(search)
            );
        }

        return true;
    });

    const columns = [
        {
            header: 'Equipment',
            accessor: 'equipmentName',
            sortable: true,
            render: (row) => (
                <div className="equipment-info">
                    <div className="equipment-name">{row.equipmentName}</div>

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
            label: 'Add Step',
            icon: <FaPlus />,
            onClick: (row) => navigate(`/maintenance/records/${row.id}?tab=steps`, {
                state: { openStepModal: true }
            }),
            className: 'info',
            show: (row) => row.status !== 'COMPLETED'
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary',
            show: (row) => {
                // Admin and Maintenance Manager can edit any record (including completed)
                if (isAdminOrManager(currentUser)) {
                    return true;
                }
                // Other maintenance team members can only edit non-completed records
                return row.status !== 'COMPLETED' && hasMaintenanceAccess(currentUser);
            }
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => showDeleteConfirmation(row),
            className: 'danger',
            show: (row) => isAdminOrManager(currentUser) // Only Admin and Maintenance Manager can delete
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

            {/* Header with Search, Filter and Add Button */}
            <div className="records-header">
                <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filters-container">
                    <select
                        className="filter-select"
                        value={filters.ticketType}
                        onChange={(e) => setFilters(prev => ({ ...prev, ticketType: e.target.value }))}
                    >
                        <option value="all">All Ticket Types</option>
                        <option value="MAINTENANCE">Maintenance Only</option>
                        <option value="DIRECT_PURCHASE">Direct Purchase Only</option>
                    </select>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleOpenNewTicket}
                >
                    <FaPlus /> New Ticket
                </button>
            </div>

            {/* Records Container */}
            <div className="records-container">
                {loading ? (
                    <LoadingSpinner message="Loading maintenance records..." fullPage />
                ) : filteredRecords.length === 0 ? (
                    <div className="empty-state">
                        <FaTools className="empty-icon" />
                        <h3>No Maintenance Records Found</h3>
                        <p>Get started by creating your first maintenance ticket</p>
                        {hasMaintenanceAccess(currentUser) && (
                            <button className="btn-primary" onClick={() => setIsTicketTypeSelectionOpen(true)}>
                                <FaPlus /> Create New Ticket
                            </button>
                        )}
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div
                            key={record.id}
                            className={`record-card ${record.status.toLowerCase()}`}
                            onClick={() => handleViewSteps(record)}
                        >
                            {/* Card Header */}
                            <div className="record-card-header">
                                <div className="header-left">
                                    <h3 className="equipment-name">{record.equipmentName}</h3>
                                    <div className="badges-container">
                                        {record.ticketType === 'DIRECT_PURCHASE' ? (
                                            <span className="ticket-type-badge direct-purchase-badge">
                                                <FaShoppingCart /> Direct Purchase
                                            </span>
                                        ) : (
                                            <span className="ticket-type-badge maintenance-badge">
                                                <FaTools /> Maintenance
                                            </span>
                                        )}
                                        {getStatusBadge(record.status)}
                                    </div>
                                </div>
                                <div className="header-right">
                                    <div className="menu-container">
                                        <button
                                            className="menu-trigger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === record.id ? null : record.id);
                                            }}
                                        >
                                            <FaEllipsisV />
                                        </button>
                                        {activeMenuId === record.id && (
                                            <>
                                                <div
                                                    className="menu-backdrop"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(null);
                                                    }}
                                                />
                                                <div className="menu-dropdown">
                                                    <button
                                                        className="menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewRecord(record);
                                                        }}
                                                    >
                                                        <FaEye /> Quick View
                                                    </button>
                                                    <button
                                                        className="menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewSteps(record);
                                                        }}
                                                    >
                                                        <FaList /> View Steps
                                                    </button>
                                                    {record.status !== 'COMPLETED' && (
                                                        <button
                                                            className="menu-item"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/maintenance/records/${record.id}?tab=steps`, {
                                                                    state: { openStepModal: true }
                                                                });
                                                            }}
                                                        >
                                                            <FaPlus /> Add Step
                                                        </button>
                                                    )}
                                                    {(isAdminOrManager(currentUser) || (record.status !== 'COMPLETED' && hasMaintenanceAccess(currentUser))) && (
                                                        <button
                                                            className="menu-item"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenModal(record);
                                                            }}
                                                        >
                                                            <FaEdit /> Edit
                                                        </button>
                                                    )}
                                                    {isAdminOrManager(currentUser) && (
                                                        <button
                                                            className="menu-item danger"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                showDeleteConfirmation(record);
                                                            }}
                                                        >
                                                            <FaTrash /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="record-card-body">
                                {/* Issue Description */}
                                <div className="info-row description-row">
                                    <FaExclamationCircle className="info-icon" />
                                    <div className="info-content">
                                        <div className="info-label">Issue</div>
                                        <div className="info-value">{record.initialIssueDescription}</div>
                                    </div>
                                </div>

                                {/* Responsible Person */}
                                <div className="info-row">
                                    <FaUser className="info-icon" />
                                    <div className="info-content">
                                        <div className="info-label">Responsible</div>
                                        <div className="info-value">
                                            {record.currentResponsiblePerson || 'Not assigned'}
                                            {record.currentResponsiblePhone && (
                                                <span className="phone-number"> • {record.currentResponsiblePhone}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Site */}
                                {record.site && record.site !== 'N/A' && (
                                    <div className="info-row">
                                        <FaMapMarkerAlt className="info-icon" />
                                        <div className="info-content">
                                            <div className="info-label">Site</div>
                                            <div className="info-value">{record.site}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Cost Information */}
                                <div className="info-row cost-row">
                                    <FaDollarSign className="info-icon" />
                                    <div className="info-content">
                                        <div className="info-label">Cost</div>
                                        <div className="cost-details">
                                            <div className="cost-item primary">
                                                <span className="cost-type">
                                                    {record.isActualCost ? 'Actual Cost' : 'Expected Cost'}
                                                </span>
                                                <span className="cost-amount">
                                                    {formatCurrency(record.isActualCost ? record.actualTotalCost : record.expectedTotalCost)}
                                                </span>
                                            </div>
                                            {record.isActualCost && Math.abs(record.costDifference) > 0.01 && (
                                                <div className={`cost-item difference ${record.costDifference > 0 ? 'over-budget' : 'under-budget'}`}>
                                                    <span className="cost-type">
                                                        {record.costDifference > 0 ? 'Over Budget' : 'Under Budget'}
                                                    </span>
                                                    <span className="cost-amount">
                                                        {record.costDifference > 0 ? '+' : ''}{formatCurrency(record.costDifference)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress & Dates */}
                                <div className="info-row">
                                    <FaClock className="info-icon" />
                                    <div className="info-content">
                                        <div className="info-label">Timeline</div>
                                        <div className="timeline-info">
                                            <div className="date-item">
                                                Created: {formatDate(record.creationDate)}
                                            </div>
                                            <div className="date-item">
                                                {record.actualCompletionDate
                                                    ? `Completed: ${formatDate(record.actualCompletionDate)}`
                                                    : `Expected: ${formatDate(record.expectedCompletionDate)}`
                                                }
                                            </div>
                                            {record.totalSteps > 0 && (
                                                <div className="progress-indicator">
                                                    Steps: {record.completedSteps}/{record.totalSteps} completed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

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

            <TicketTypeSelectionModal
                isOpen={isTicketTypeSelectionOpen}
                onClose={() => setIsTicketTypeSelectionOpen(false)}
                onSelectMaintenanceTicket={handleSelectMaintenanceTicket}
                onSelectDirectPurchaseTicket={handleSelectDirectPurchaseTicket}
            />

            <DirectPurchaseModal
                isOpen={isDirectPurchaseModalOpen}
                onClose={() => setIsDirectPurchaseModalOpen(false)}
                onSubmit={handleDirectPurchaseSubmit}
            />

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type="danger"
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isVisible: false })}
                isLoading={loading}
            />
        </div>
    );
};

export default MaintenanceRecords;