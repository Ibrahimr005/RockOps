import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaTools, FaFilter, FaTimes, FaEye, FaList, FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import MaintenanceCard from '../../../components/maintenance/MaintenanceCard/MaintenanceCard';
import MaintenanceRecordModal from './MaintenanceRecordModal';
import MaintenanceRecordViewModal from './MaintenanceRecordViewModal/MaintenanceRecordViewModal';
import TicketTypeSelectionModal from './TicketTypeSelectionModal';
import DirectPurchaseWizardModal from '../DirectPurchaseDetail/DirectPurchaseWizardModal';
import DelegateModal from './DelegateModal';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner/LoadingSpinner';
import '../../../styles/status-badges.scss';
import './MaintenanceRecords.scss';
import maintenanceService from "../../../services/maintenanceService.js";
import directPurchaseService from "../../../services/directPurchaseService.js";
import { ROLES } from '../../../utils/roles';

const MaintenanceRecords = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isTicketTypeSelectionOpen, setIsTicketTypeSelectionOpen] = useState(false);
    const [isDirectPurchaseModalOpen, setIsDirectPurchaseModalOpen] = useState(false);
    const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewingRecordId, setViewingRecordId] = useState(null);
    const [delegatingRecord, setDelegatingRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [viewingRecordType, setViewingRecordType] = useState('MAINTENANCE');
    const [filters, setFilters] = useState({
        status: 'all',
        ticketType: 'all', // Filter by ticket type: 'all', 'MAINTENANCE', 'DIRECT_PURCHASE'
        dateFilterType: 'all', // 'all', 'before', 'after', 'on', 'between'
        dateValue: '',
        dateStart: '',
        dateEnd: ''
    });
    const [showFilters, setShowFilters] = useState(false);

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
            // Handle errors individually so that if one fails, we still show the other
            let maintenanceRecords = [];
            let directPurchaseTickets = [];
            let hasError = false;
            let errorMessages = [];

            // Try to load maintenance records
            try {
                const maintenanceResponse = await maintenanceService.getAllRecords();
                maintenanceRecords = maintenanceResponse.data || [];
            } catch (maintenanceError) {
                console.error('Error loading maintenance records:', maintenanceError);
                hasError = true;
                errorMessages.push('Failed to load maintenance records');
            }

            // Try to load direct purchase tickets
            try {
                const directPurchaseResponse = await directPurchaseService.getAllTickets();
                directPurchaseTickets = directPurchaseResponse.data || [];
                console.log(directPurchaseTickets);
            } catch (directPurchaseError) {
                console.error('Error loading direct purchase tickets:', directPurchaseError);
                hasError = true;
                errorMessages.push('Failed to load direct purchase tickets');
            }

            // If both failed, show error
            if (hasError && maintenanceRecords.length === 0 && directPurchaseTickets.length === 0) {
                setError(errorMessages.join('. ') + '. Please try again.');
                setMaintenanceRecords([]);
                return;
            }

            // Show warning if partial load
            if (hasError) {
                showWarning(errorMessages.join('. ') + '. Showing available data.');
            }

            // Transform maintenance records
            const transformedMaintenanceRecords = maintenanceRecords.map(record => {
                const isCompleted = record.status === 'COMPLETED' && record.actualCompletionDate;

                // Calculate expected total cost and actual cost so far based on steps
                const expectedTotalCost = record.steps && record.steps.length > 0
                    ? record.steps.reduce((sum, step) => sum + (step.expectedCost || 0), 0)
                    : (record.totalCost || 0);

                const actualTotalCost = record.steps && record.steps.length > 0
                    ? record.steps.reduce((sum, step) => {
                        // Only sum actualCost for completed steps
                        if (step.isCompleted && step.actualCost != null) {
                            return sum + step.actualCost;
                        }
                        return sum;
                    }, 0)
                    : (isCompleted ? (record.totalCost || 0) : 0);

                // Get current step info
                const currentStep = record.steps && record.steps.length > 0
                    ? record.steps.find(step => !step.isCompleted)
                    : null;

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
                    totalCost: isCompleted ? actualTotalCost : expectedTotalCost,
                    expectedTotalCost: expectedTotalCost,
                    actualTotalCost: actualTotalCost,
                    costDifference: actualTotalCost - expectedTotalCost,
                    isActualCost: isCompleted,
                    creationDate: record.creationDate,
                    issueDate: record.issueDate,
                    sparePartName: record.sparePartName,
                    expectedCompletionDate: record.expectedCompletionDate,
                    actualCompletionDate: record.actualCompletionDate,
                    isOverdue: record.isOverdue,
                    durationInDays: record.durationInDays,
                    totalSteps: record.totalSteps || 0,
                    completedSteps: record.completedSteps || 0,
                    activeSteps: record.activeSteps || 0,
                    currentStep: currentStep,
                    steps: record.steps || []
                };
            });

            // Transform direct purchase tickets
            const transformedDirectPurchaseTickets = directPurchaseTickets.map(ticket => {
                const isCompleted = ticket.status === 'COMPLETED';
                const expectedTotalCost = ticket.expectedTotalCost || ticket.totalExpectedCost || 0;
                const actualTotalCost = ticket.totalActualCost || 0;

                // Count completed steps for new workflow
                let completedSteps = 0;
                if (ticket.step1Completed) completedSteps++;
                if (ticket.step2Completed) completedSteps++;
                if (ticket.step3Completed) completedSteps++;
                if (ticket.step4Completed) completedSteps++;

                // For new workflow: totalSteps = completed + 1 (current step), not all 4
                // Only show steps that have been started (completed or in-progress)
                let totalVisibleSteps = completedSteps;
                if (!isCompleted && ticket.currentStep) {
                    totalVisibleSteps++; // Add current in-progress step
                }

                return {
                    id: ticket.id,
                    ticketType: 'DIRECT_PURCHASE',
                    equipmentId: ticket.equipmentId,
                    equipmentName: ticket.equipmentName || 'Unknown Equipment',
                    equipmentModel: ticket.equipmentModel || 'N/A',
                    equipmentSerialNumber: ticket.equipmentSerialNumber || 'N/A',
                    initialIssueDescription: ticket.title || ticket.description || ticket.sparePart || 'Direct purchase',
                    status: ticket.status,
                    currentResponsiblePerson: ticket.responsiblePersonName || 'Not assigned',
                    currentResponsiblePhone: ticket.responsiblePersonPhone || '',
                    currentResponsibleEmail: ticket.responsiblePersonEmail || '',
                    site: ticket.site || 'N/A',
                    totalCost: isCompleted ? actualTotalCost : (expectedTotalCost || ticket.expectedCost),
                    expectedTotalCost: expectedTotalCost,
                    expectedCost: ticket.expectedCost,
                    actualTotalCost: actualTotalCost,
                    costDifference: actualTotalCost - expectedTotalCost,
                    isActualCost: isCompleted,
                    creationDate: ticket.createdAt,
                    issueDate: ticket.createdAt,
                    expectedCompletionDate: ticket.expectedEndDate || null,
                    actualCompletionDate: ticket.completedAt || null,
                    isOverdue: false,
                    durationInDays: 0,
                    totalSteps: ticket.isLegacyTicket ? (ticket.totalSteps || 2) : totalVisibleSteps,
                    completedSteps: ticket.isLegacyTicket ? (ticket.completedSteps || 0) : completedSteps,
                    activeSteps: 0,
                    merchantName: ticket.merchantName,
                    isLegacyTicket: ticket.isLegacyTicket,
                    currentStep: ticket.currentStepDisplay ? { description: ticket.currentStepDisplay } : null,
                    steps: []
                };
            });

            // Combine both arrays
            const transformedRecords = [...transformedMaintenanceRecords, ...transformedDirectPurchaseTickets];

            setMaintenanceRecords(transformedRecords);
        } catch (error) {
            // This catch block handles unexpected errors during transformation/processing
            console.error('Unexpected error processing maintenance records:', error);
            setError('An unexpected error occurred while processing records. Please refresh the page.');
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

    const handleWizardComplete = () => {
        loadMaintenanceRecords(); // Reload the list after wizard completes
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
        // Show view modal for both types
        setViewingRecordId(record.id);
        // We need to pass the type to the modal, but the modal currently only takes ID.
        // We'll update the state to include the type or update the modal to accept it.
        // For now, let's assume we can pass an object or use a separate state.
        setViewingRecordType(record.ticketType);
        setIsViewModalOpen(true);
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


    const handleOpenDelegateModal = (record) => {
        setDelegatingRecord(record);
        setIsDelegateModalOpen(true);
        setActiveMenuId(null); // Close the action menu
    };

    const handleDelegateSubmit = async (recordId, newResponsibleUserId) => {
        try {
            // Check if it's a direct purchase ticket
            const isDirectPurchase = delegatingRecord?.ticketType === 'DIRECT_PURCHASE';

            if (isDirectPurchase) {
                // Use the specialized delegate endpoint which bypasses full DTO validation
                await directPurchaseService.delegateTicket(recordId, newResponsibleUserId);
                showSuccess('Direct purchase ticket delegated successfully');
            } else {
                // Fetch the full record first
                const recordResponse = await maintenanceService.getRecordById(recordId);
                const fullRecord = recordResponse.data;

                // Update only the responsibleUserId while keeping all other fields
                const updateData = {
                    equipmentId: fullRecord.equipmentId,
                    issueDate: fullRecord.issueDate,
                    sparePartName: fullRecord.sparePartName,
                    initialIssueDescription: fullRecord.initialIssueDescription,
                    expectedCompletionDate: fullRecord.expectedCompletionDate,
                    estimatedCost: fullRecord.estimatedCost || fullRecord.totalCost,
                    responsibleUserId: newResponsibleUserId
                };

                await maintenanceService.updateRecord(recordId, updateData);
                showSuccess('Maintenance record delegated successfully');
            }

            await loadMaintenanceRecords();
        } catch (error) {
            console.error('Error delegating record:', error);
            showError(`Failed to delegate ${delegatingRecord?.ticketType === 'DIRECT_PURCHASE' ? 'ticket' : 'record'}`);
            throw error; // Re-throw to let modal handle it
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

        // Filter by status
        if (filters.status !== 'all') {
            // Handle OVERDUE and SCHEDULED as special cases
            if (filters.status === 'OVERDUE') {
                if (!record.isOverdue) return false;
            } else if (filters.status === 'SCHEDULED') {
                // SCHEDULED means ACTIVE but not yet started (future expected date)
                const expectedDate = new Date(record.expectedCompletionDate);
                const now = new Date();
                if (record.status !== 'ACTIVE' || expectedDate < now) return false;
            } else {
                if (record.status !== filters.status) return false;
            }
        }

        // Filter by date
        if (filters.dateFilterType !== 'all') {
            const recordDate = new Date(record.creationDate);
            recordDate.setHours(0, 0, 0, 0); // Normalize to start of day

            switch (filters.dateFilterType) {
                case 'before':
                    if (filters.dateValue) {
                        const beforeDate = new Date(filters.dateValue);
                        beforeDate.setHours(0, 0, 0, 0);
                        if (recordDate >= beforeDate) return false;
                    }
                    break;
                case 'after':
                    if (filters.dateValue) {
                        const afterDate = new Date(filters.dateValue);
                        afterDate.setHours(0, 0, 0, 0);
                        if (recordDate <= afterDate) return false;
                    }
                    break;
                case 'on':
                    if (filters.dateValue) {
                        const onDate = new Date(filters.dateValue);
                        onDate.setHours(0, 0, 0, 0);
                        if (recordDate.getTime() !== onDate.getTime()) return false;
                    }
                    break;
                case 'between':
                    if (filters.dateStart && filters.dateEnd) {
                        const startDate = new Date(filters.dateStart);
                        const endDate = new Date(filters.dateEnd);
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(23, 59, 59, 999);
                        if (recordDate < startDate || recordDate > endDate) return false;
                    }
                    break;
                default:
                    break;
            }
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

    const clearAllFilters = () => {
        setFilters({
            status: 'all',
            ticketType: 'all',
            dateFilterType: 'all',
            dateValue: '',
            dateStart: '',
            dateEnd: ''
        });
        setSearchTerm('');
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.ticketType !== 'all') count++;
        if (filters.dateFilterType !== 'all') count++;
        if (searchTerm) count++;
        return count;
    };

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
            <PageHeader
                title="Maintenance Records"
                subtitle="Track and manage all equipment maintenance activities"
                actionButton={{
                    text: 'New Ticket',
                    icon: <FaPlus />,
                    onClick: handleOpenNewTicket
                }}
                filterButton={{
                    onClick: () => setShowFilters(!showFilters),
                    isActive: showFilters,
                    activeCount: getActiveFilterCount()
                }}
            />

            {/* Enhanced Filters Panel */}
            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-panel-header">
                        <h3>Filters</h3>
                        {getActiveFilterCount() > 0 && (
                            <button className="clear-filters-btn" onClick={clearAllFilters}>
                                <FaTimes /> Clear All
                            </button>
                        )}
                    </div>
                    <div className="filters-grid">
                        {/* Search Filter */}
                        <div className="filter-group filter-group-full">
                            <label className="filter-label">Search</label>
                            <div className="search-input-wrapper">
                                <FaSearch className="search-icon-filter" />
                                <input
                                    type="text"
                                    placeholder="Search records..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="filter-input"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Status</label>
                            <select
                                className="filter-select"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="all">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="ON_HOLD">On Hold</option>
                            </select>
                        </div>

                        {/* Ticket Type Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Ticket Type</label>
                            <select
                                className="filter-select"
                                value={filters.ticketType}
                                onChange={(e) => setFilters(prev => ({ ...prev, ticketType: e.target.value }))}
                            >
                                <option value="all">All Types</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="DIRECT_PURCHASE">Direct Purchase</option>
                            </select>
                        </div>

                        {/* Date Filter Type */}
                        <div className="filter-group">
                            <label className="filter-label">Date Filter</label>
                            <select
                                className="filter-select"
                                value={filters.dateFilterType}
                                onChange={(e) => {
                                    setFilters(prev => ({
                                        ...prev,
                                        dateFilterType: e.target.value,
                                        dateValue: '',
                                        dateStart: '',
                                        dateEnd: ''
                                    }));
                                }}
                            >
                                <option value="all">All Dates</option>
                                <option value="before">Before Date</option>
                                <option value="after">After Date</option>
                                <option value="on">On Date</option>
                                <option value="between">Between Dates</option>
                            </select>
                        </div>

                        {/* Date Inputs based on filter type */}
                        {filters.dateFilterType === 'before' && (
                            <div className="filter-group">
                                <label className="filter-label">Before Date</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={filters.dateValue}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateValue: e.target.value }))}
                                />
                            </div>
                        )}

                        {filters.dateFilterType === 'after' && (
                            <div className="filter-group">
                                <label className="filter-label">After Date</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={filters.dateValue}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateValue: e.target.value }))}
                                />
                            </div>
                        )}

                        {filters.dateFilterType === 'on' && (
                            <div className="filter-group">
                                <label className="filter-label">On Date</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={filters.dateValue}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateValue: e.target.value }))}
                                />
                            </div>
                        )}

                        {filters.dateFilterType === 'between' && (
                            <>
                                <div className="filter-group">
                                    <label className="filter-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={filters.dateStart}
                                        onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                                    />
                                </div>
                                <div className="filter-group">
                                    <label className="filter-label">End Date</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={filters.dateEnd}
                                        onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Records Container - Grid Layout */}
            <div className="records-container">
                {loading ? (
                    <LoadingSpinner message="Loading maintenance records..." fullPage />
                ) : error ? (
                    <div className="error-state">
                        <div className="error-icon">⚠</div>
                        <h3>Unable to Load Maintenance Records</h3>
                        <p>{error}</p>
                        <button className="btn-primary" onClick={() => loadMaintenanceRecords()}>
                            Try Again
                        </button>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="empty-state">
                        <FaTools className="empty-icon" />
                        <h3>No Maintenance Records Found</h3>
                        <p>
                            {getActiveFilterCount() > 0
                                ? 'No records match your current filters. Try adjusting or clearing filters.'
                                : 'Get started by creating your first maintenance ticket'}
                        </p>
                        {hasMaintenanceAccess(currentUser) && (
                            <button className="btn-primary" onClick={() => setIsTicketTypeSelectionOpen(true)}>
                                <FaPlus /> Create New Ticket
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="results-header">
                            <div className="results-count">
                                Showing <span className="count-number">{filteredRecords.length}</span> {filteredRecords.length === 1 ? 'record' : 'records'}
                                {getActiveFilterCount() > 0 && (
                                    <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-tertiary)' }}>
                                        (filtered from {maintenanceRecords.length} total)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="records-grid">
                            {filteredRecords.map((record) => (
                                <MaintenanceCard
                                    key={record.id}
                                    record={record}
                                    onViewRecord={handleViewRecord}
                                    onViewSteps={handleViewSteps}
                                    onAddStep={(record) => navigate(`/maintenance/records/${record.id}?tab=steps`, {
                                        state: { openStepModal: true }
                                    })}
                                    onEdit={handleOpenModal}
                                    onDelete={showDeleteConfirmation}
                                    onDelegate={handleOpenDelegateModal}
                                    activeMenuId={activeMenuId}
                                    setActiveMenuId={setActiveMenuId}
                                    canEdit={isAdminOrManager(currentUser) || (record.status !== 'COMPLETED' && hasMaintenanceAccess(currentUser))}
                                    canDelete={isAdminOrManager(currentUser)}
                                    canDelegate={isAdminOrManager(currentUser)}
                                    formatCurrency={formatCurrency}
                                    formatDate={formatDate}
                                    getStatusBadge={getStatusBadge}
                                />
                            ))}
                        </div>
                    </>
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
                    ticketType={viewingRecordType}
                />
            )}

            <TicketTypeSelectionModal
                isOpen={isTicketTypeSelectionOpen}
                onClose={() => setIsTicketTypeSelectionOpen(false)}
                onSelectMaintenanceTicket={handleSelectMaintenanceTicket}
                onSelectDirectPurchaseTicket={handleSelectDirectPurchaseTicket}
            />

            <DirectPurchaseWizardModal
                isOpen={isDirectPurchaseModalOpen}
                ticketId={null}
                initialStep={1}
                onClose={() => setIsDirectPurchaseModalOpen(false)}
                onComplete={handleWizardComplete}
            />

            <DelegateModal
                isOpen={isDelegateModalOpen}
                onClose={() => {
                    setIsDelegateModalOpen(false);
                    setDelegatingRecord(null);
                }}
                onSubmit={handleDelegateSubmit}
                record={delegatingRecord}
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
