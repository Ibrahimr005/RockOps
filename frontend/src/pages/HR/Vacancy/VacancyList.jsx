import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import './VacancyList.scss';
import AddVacancyModal from './modals/AddVacancyModal.jsx';
import EditVacancyModal from './modals/EditVacancyModal.jsx';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import {FaEdit, FaTrashAlt, FaUserPlus} from "react-icons/fa";
import {useSnackbar} from '../../../contexts/SnackbarContext';
import {vacancyService} from '../../../services/hr/vacancyService.js';
import {jobPositionService} from '../../../services/hr/jobPositionService.js';

const VacancyList = () => {
    const navigate = useNavigate();
    const {showSuccess, showError} = useSnackbar();

    // State management - ensure arrays are properly initialized
    const [vacancies, setVacancies] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState(''); // Add department filter state

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVacancy, setSelectedVacancy] = useState(null);

    // Reset all custom filters
    const handleResetFilters = useCallback(() => {
        setStatusFilter('');
        setPriorityFilter('');
        setDepartmentFilter('');
    }, []);

    // Memoized fetch functions to prevent unnecessary re-renders
    const fetchVacancies = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await vacancyService.getAll();

            if (response && response.data) {
                console.log(response.data)
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
            setVacancies([]);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const fetchJobPositions = useCallback(async () => {
        try {
            const response = await jobPositionService.getAll();
            if (response && response.data) {
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

    useEffect(() => {
        fetchVacancies();
        fetchJobPositions();
    }, [fetchVacancies, fetchJobPositions]);

    const handleAddVacancy = async (newVacancy) => {
        if (!newVacancy) {
            showError('Invalid vacancy data');
            return;
        }

        try {
            setLoading(true);
            console.log('Sending vacancy data:', newVacancy);
            console.log('JobPosition in request:', newVacancy.jobPosition);

            const response = await vacancyService.create(newVacancy);

            console.log('Full API response:', response);
            console.log('Response data:', response.data);

            if (response && response.data) {
                await fetchVacancies();
                setShowAddModal(false);
                showSuccess('Vacancy created successfully!');
            } else {
                throw new Error('No response data received');
            }
        } catch (error) {
            console.error('Error adding vacancy:', error);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);

            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Failed to create vacancy';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditVacancy = async (updatedVacancy) => {
        if (!updatedVacancy || !selectedVacancy?.id) {
            showError('Invalid vacancy data');
            return;
        }

        try {
            setLoading(true);
            const response = await vacancyService.update(selectedVacancy.id, updatedVacancy);

            if (response) {
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

    const handleEditClick = useCallback((vacancy) => {
        if (!vacancy) {
            showError('Invalid vacancy selected');
            return;
        }
        setSelectedVacancy(vacancy);
        setShowEditModal(true);
    }, [showError]);

    const handleRowClick = useCallback((vacancy) => {
        if (!vacancy?.id) {
            showError('Invalid vacancy selected');
            return;
        }
        navigate(`/hr/vacancies/${vacancy.id}`);
    }, [navigate, showError]);

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

    const getStatusBadgeClass = useCallback((status) => {
        const statusClasses = {
            'OPEN': 'success',
            'CLOSED': 'danger',
            'FILLED': 'info'
        };
        return statusClasses[status] || 'status-badge-warning';
    }, []);

    const getPriorityBadgeClass = useCallback((priority) => {
        const priorityClasses = {
            'HIGH': 'status-badge danger',
            'MEDIUM': 'status-badge medium',
            'LOW': 'status-badge low'
        };
        return priorityClasses[priority] || 'status-badge medium';
    }, []);

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
            accessor: 'departmentName', // Changed to use flattened property
            render: (row) => row.departmentName || 'N/A'
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status || 'UNKNOWN'}
                </span>
            )
        },
        {
            header: 'Priority',
            accessor: 'priorityNumeric',
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

    const actions = React.useMemo(() => [
        {
            label: 'Edit',
            icon: <FaEdit/>,
            onClick: (row) => handleEditClick(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt/>,
            onClick: (row) => handleDeleteVacancy(row.id),
            className: 'danger'
        }
    ], [handleEditClick]);

    const filterableColumns = React.useMemo(() => [
        {header: 'Title', accessor: 'title'},
        {header: 'Position', accessor: 'positionName'}, // Changed to use flattened property
        {
            header: 'Department',
            accessor: 'departmentName',
            filterType: 'select'
        },
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        },
        {
            header: 'Priority',
            accessor: 'priority',
            filterType: 'select'
        }

    ], []);

    // Get unique departments for the filter dropdown
    const uniqueDepartments = React.useMemo(() => {
        if (!Array.isArray(vacancies)) return [];

        const departments = vacancies
            .map(v => v.jobPosition?.departmentName)
            .filter(Boolean);

        return [...new Set(departments)].sort();
    }, [vacancies]);

    // Custom filters with proper event handling and reset capability

    // Memoized filtered data with department filtering
    const filteredVacancies = React.useMemo(() => {
        if (!Array.isArray(vacancies)) {
            return [];
        }

        const priorityMap = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1};

        return vacancies
            .map(vacancy => ({
                ...vacancy,
                // Flatten nested properties for easier filtering and searching
                positionName: vacancy.jobPosition?.positionName || 'N/A',
                departmentName: vacancy.jobPosition?.departmentName || 'N/A',
                priorityNumeric: priorityMap[vacancy.priority] || 0
            }))
            .filter(vacancy => {
                if (!vacancy) return false;

                const statusMatch = !statusFilter || vacancy.status === statusFilter;
                const priorityMatch = !priorityFilter || vacancy.priority === priorityFilter;
                const departmentMatch = !departmentFilter || vacancy.departmentName === departmentFilter;

                return statusMatch && priorityMatch && departmentMatch;
            });
    }, [vacancies, statusFilter, priorityFilter, departmentFilter]);

    const handleCloseAddModal = useCallback(() => {
        setShowAddModal(false);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setShowEditModal(false);
        setSelectedVacancy(null);
    }, []);

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

            <PageHeader
                title="Job Vacancies"
                subtitle="Post open positions, manage applications, and track your recruitment process"
            />

            <DataTable
                data={filteredVacancies}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                onRowClick={handleRowClick}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50]}
                className="vacancy-data-table"
                showAddButton={true}
                addButtonText="Post New Vacancy"
                addButtonIcon={<FaUserPlus/>}
                onAddClick={() => setShowAddModal(true)}
                showExportButton={true}
                exportFileName="vacancies"
                exportButtonText="Export Vacancies"
                onClearFilters={handleResetFilters} // Add reset handler
            />

            {showAddModal && (
                <AddVacancyModal
                    onClose={handleCloseAddModal}
                    onSave={handleAddVacancy}
                    jobPositions={jobPositions}
                />
            )}

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