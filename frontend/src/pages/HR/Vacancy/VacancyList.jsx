import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './VacancyList.scss';
import AddVacancyModal from './modals/AddVacancyModal.jsx';
import EditVacancyModal from './modals/EditVacancyModal.jsx';
import DataTable from '../../../components/common/DataTable/DataTable';
import { FaEdit, FaTrashAlt, FaEye } from "react-icons/fa";
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { vacancyService } from '../../../services/hr/vacancyService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';

const VacancyList = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State management - ensure arrays are properly initialized
    const [vacancies, setVacancies] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVacancy, setSelectedVacancy] = useState(null);

    // Memoized fetch functions to prevent unnecessary re-renders
    const fetchVacancies = useCallback(async () => {
        try {
            setLoading(true);
            setError(null); // Clear previous errors
            const response = await vacancyService.getAll();

            if (response && response.data) {
                // Ensure we always set an array
                const vacancyData = Array.isArray(response.data) ? response.data : [];
                setVacancies(vacancyData);
            } else {
                setVacancies([]);
                showError('No vacancy data received from server');
            }
        } catch (error) {
            console.error('Error fetching vacancies:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Failed to load vacancies';
            setError(errorMessage);
            showError(errorMessage);
            setVacancies([]); // Ensure we set empty array on error
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const fetchJobPositions = useCallback(async () => {
        try {
            const response = await jobPositionService.getAll();
            if (response && response.data) {
                // Ensure we always set an array
                const jobPositionData = Array.isArray(response.data) ? response.data : [];
                setJobPositions(jobPositionData);
            } else {
                setJobPositions([]);
            }
        } catch (error) {
            console.error('Error fetching job positions:', error);
            showError('Failed to load job positions');
            setJobPositions([]);
        }
    }, [showError]);

    // Load all necessary data when component mounts
    useEffect(() => {
        fetchVacancies();
        fetchJobPositions();
    }, [fetchVacancies, fetchJobPositions]);

    // Handle adding a new vacancy
    const handleAddVacancy = async (newVacancy) => {
        if (!newVacancy) {
            showError('Invalid vacancy data');
            return;
        }

        try {
            setLoading(true);
            console.log('Sending vacancy data:', newVacancy);

            const response = await vacancyService.create(newVacancy);

            if (response && response.data) {
                // Refresh the vacancy list
                await fetchVacancies();
                setShowAddModal(false);
                showSuccess('Vacancy created successfully!');
            } else {
                throw new Error('No response data received');
            }
        } catch (error) {
            console.error('Error adding vacancy:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Failed to create vacancy';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Handle editing a vacancy
    const handleEditVacancy = async (updatedVacancy) => {
        if (!updatedVacancy || !selectedVacancy?.id) {
            showError('Invalid vacancy data');
            return;
        }

        try {
            setLoading(true);
            const response = await vacancyService.update(selectedVacancy.id, updatedVacancy);

            if (response) {
                // Refresh the vacancy list
                await fetchVacancies();
                setShowEditModal(false);
                setSelectedVacancy(null);
                showSuccess('Vacancy updated successfully!');
            } else {
                throw new Error('No response received');
            }
        } catch (error) {
            console.error('Error updating vacancy:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Failed to update vacancy';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Delete a vacancy with better confirmation
    const handleDeleteVacancy = async (vacancyId) => {
        if (!vacancyId) {
            showError('Invalid vacancy ID');
            return;
        }

        const confirmed = window.confirm(
            'Are you sure you want to delete this vacancy? This action cannot be undone.'
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await vacancyService.delete(vacancyId);

            // Refresh the vacancy list
            await fetchVacancies();
            showSuccess('Vacancy deleted successfully!');
        } catch (error) {
            console.error('Error deleting vacancy:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Failed to delete vacancy';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Open edit modal with vacancy data
    const handleEditClick = useCallback((vacancy) => {
        if (!vacancy) {
            showError('Invalid vacancy selected');
            return;
        }
        setSelectedVacancy(vacancy);
        setShowEditModal(true);
    }, [showError]);

    // Navigate to vacancy details page
    const handleRowClick = useCallback((vacancy) => {
        if (!vacancy?.id) {
            showError('Invalid vacancy selected');
            return;
        }
        navigate(`/hr/vacancies/${vacancy.id}`);
    }, [navigate, showError]);

    // Utility functions
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }, []);

    const calculateRemainingDays = useCallback((closingDate) => {
        if (!closingDate) return 'N/A';

        try {
            const today = new Date();
            const closing = new Date(closingDate);

            if (isNaN(closing.getTime())) return 'Invalid Date';

            const diffTime = closing - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return 'Closed';
            if (diffDays === 0) return 'Today';
            return `${diffDays} days`;
        } catch (error) {
            console.error('Error calculating remaining days:', error);
            return 'N/A';
        }
    }, []);

    // Badge utility functions
    const getStatusBadgeClass = useCallback((status) => {
        const statusClasses = {
            'OPEN': 'status-badge-success',
            'CLOSED': 'status-badge-danger',
            'FILLED': 'status-badge-info'
        };
        return statusClasses[status] || 'status-badge-warning';
    }, []);

    const getPriorityBadgeClass = useCallback((priority) => {
        const priorityClasses = {
            'HIGH': 'priority-badge-high',
            'MEDIUM': 'priority-badge-medium',
            'LOW': 'priority-badge-low'
        };
        return priorityClasses[priority] || 'priority-badge-medium';
    }, []);

    // Memoized columns to prevent unnecessary re-renders
    const columns = React.useMemo(() => [
        {
            header: 'Title',
            accessor: 'title',
            render: (row) => (
                <div className="title-cell">
                    <strong>{row.title || 'N/A'}</strong>
                </div>
            )
        },
        {
            header: 'Position',
            accessor: 'jobPosition.positionName',
            render: (row) => row.jobPosition?.positionName || 'N/A'
        },
        {
            header: 'Department',
            accessor: 'jobPosition.department.name',
            render: (row) => row.jobPosition?.department?.name || 'N/A'
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className={`jv-status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status || 'UNKNOWN'}
                </span>
            )
        },
        {
            header: 'Priority',
            accessor: 'priority',
            render: (row) => (
                <span className={`priority-badge ${getPriorityBadgeClass(row.priority)}`}>
                    {row.priority || 'MEDIUM'}
                </span>
            )
        },
        {
            header: 'Posted',
            accessor: 'postingDate',
            render: (row) => formatDate(row.postingDate)
        },
        {
            header: 'Closing',
            accessor: 'closingDate',
            render: (row) => formatDate(row.closingDate)
        },
        {
            header: 'Remaining',
            accessor: 'closingDate',
            render: (row) => {
                const remaining = calculateRemainingDays(row.closingDate);
                const className = remaining === 'Closed' ? 'remaining-days-closed' :
                    remaining === 'Today' ? 'remaining-days-today' :
                        /^\d+ days$/.test(remaining) && parseInt(remaining) <= 7 ? 'remaining-days-urgent' :
                            'remaining-days-normal';
                return <span className={className}>{remaining}</span>;
            }
        },
        {
            header: 'Positions',
            accessor: 'numberOfPositions',
            render: (row) => (
                <div className="center-text">
                    {row.numberOfPositions || 1}
                </div>
            )
        }
    ], [formatDate, calculateRemainingDays, getStatusBadgeClass, getPriorityBadgeClass]);

    // Memoized actions to prevent unnecessary re-renders
    const actions = React.useMemo(() => [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleEditClick(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: (row) => handleDeleteVacancy(row.id),
            className: 'danger'
        }
    ], [handleEditClick]);

    // Memoized filterable columns
    const filterableColumns = React.useMemo(() => [
        { header: 'Title', accessor: 'title' },
        { header: 'Position', accessor: 'jobPosition.positionName' },
        { header: 'Department', accessor: 'jobPosition.department.name' }
    ], []);

    // Custom filters with proper event handling
    const customFilters = React.useMemo(() => [
        {
            label: 'Status',
            component: (
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="FILLED">Filled</option>
                </select>
            )
        },
        {
            label: 'Priority',
            component: (
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    aria-label="Filter by priority"
                >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            )
        }
    ], [statusFilter, priorityFilter]);

    // Memoized filtered data
    const filteredVacancies = React.useMemo(() => {
        // Ensure vacancies is always an array before filtering
        if (!Array.isArray(vacancies)) {
            return [];
        }

        return vacancies.filter(vacancy => {
            // Additional safety check for vacancy object
            if (!vacancy) return false;

            const statusMatch = !statusFilter || vacancy.status === statusFilter;
            const priorityMatch = !priorityFilter || vacancy.priority === priorityFilter;
            return statusMatch && priorityMatch;
        });
    }, [vacancies, statusFilter, priorityFilter]);

    // Modal close handlers
    const handleCloseAddModal = useCallback(() => {
        setShowAddModal(false);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setShowEditModal(false);
        setSelectedVacancy(null);
    }, []);

    // Error state rendering
    if (error && !loading) {
        return (
            <div className="vacancy-container">
                <div className="error-container">
                    <h2>Error Loading Vacancies</h2>
                    <p>{error}</p>
                    <button
                        onClick={fetchVacancies}
                        className="primary-button"
                        disabled={loading}
                    >
                        {loading ? 'Retrying...' : 'Try Again'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="vacancy-container">
            <div className="departments-header">
                <h1>
                    Job Vacancies
                    <p className="employees-header__subtitle">
                        Post open positions, manage applications, and track your recruitment process
                    </p>
                </h1>
                <button
                    className="primary-button"
                    onClick={() => setShowAddModal(true)}
                    disabled={loading}
                >
                    Post New Vacancy
                </button>
            </div>

            <DataTable
                data={filteredVacancies}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                customFilters={customFilters}
                onRowClick={handleRowClick}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50]}
                className="vacancy-data-table"
            />

            {/* Add Vacancy Modal */}
            {showAddModal && (
                <AddVacancyModal
                    onClose={handleCloseAddModal}
                    onSave={handleAddVacancy}
                    jobPositions={jobPositions}
                />
            )}

            {/* Edit Vacancy Modal */}
            {showEditModal && selectedVacancy && (
                <EditVacancyModal
                    vacancy={selectedVacancy}
                    onClose={handleCloseEditModal}
                    onSave={handleEditVacancy}
                    jobPositions={jobPositions}
                />
            )}
        </div>
    );
};

export default VacancyList;