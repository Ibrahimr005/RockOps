import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VacancyList.scss';
import AddVacancyModal from './modals/AddVacancyModal.jsx';
import EditVacancyModal from './modals/EditVacancyModal.jsx';
import DataTable from '../../../components/common/DataTable/DataTable';
import {FaEdit, FaTrashAlt, FaEye} from "react-icons/fa";
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { vacancyService } from '../../../services/hr/vacancyService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';

const VacancyList = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();
    const [vacancies, setVacancies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVacancy, setSelectedVacancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jobPositions, setJobPositions] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    // Fetch vacancies data from the API
    const fetchVacancies = async () => {
        try {
            setLoading(true);
            const response = await vacancyService.getAll();
            const data = response.data;
            setVacancies(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching vacancies:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load vacancies';
            setError(errorMessage);
            showError('Failed to load vacancies. Please try again.');
            setLoading(false);
        }
    };

    // Fetch job positions for the dropdown
    const fetchJobPositions = async () => {
        try {
            const response = await jobPositionService.getAll();
            setJobPositions(response.data);
        } catch (error) {
            console.error('Error fetching job positions:', error);
            showError('Failed to load job positions');
        }
    };

    // Load all necessary data when component mounts
    useEffect(() => {
        fetchVacancies();
        fetchJobPositions();
    }, []);

    // Handle adding a new vacancy
    const handleAddVacancy = async (newVacancy) => {
        try {
            setLoading(true);
            console.log('Sending vacancy data:', newVacancy); // Debug log
            const response = await vacancyService.create(newVacancy);

            // Refresh the vacancy list
            await fetchVacancies();
            setShowAddModal(false);
            showSuccess('Vacancy created successfully!');

        } catch (error) {
            console.error('Error adding vacancy:', error);
            console.error('Error response:', error.response); // Additional debug info
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create vacancy';
            setError(errorMessage);
            showError('Failed to create vacancy. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle editing a vacancy
    const handleEditVacancy = async (updatedVacancy) => {
        try {
            setLoading(true);
            const response = await vacancyService.update(selectedVacancy.id, updatedVacancy);

            // Refresh the vacancy list
            await fetchVacancies();
            setShowEditModal(false);
            setSelectedVacancy(null);
            showSuccess('Vacancy updated successfully!');

        } catch (error) {
            console.error('Error updating vacancy:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update vacancy';
            setError(errorMessage);
            showError('Failed to update vacancy. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Delete a vacancy
    const handleDeleteVacancy = async (vacancyId) => {
        if (!window.confirm('Are you sure you want to delete this vacancy?')) {
            return;
        }

        try {
            setLoading(true);
            await vacancyService.delete(vacancyId);

            // Refresh the vacancy list
            await fetchVacancies();
            showSuccess('Vacancy deleted successfully!');

        } catch (error) {
            console.error('Error deleting vacancy:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete vacancy';
            setError(errorMessage);
            showError('Failed to delete vacancy. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Open edit modal with vacancy data
    const handleEditClick = (vacancy) => {
        setSelectedVacancy(vacancy);
        setShowEditModal(true);
    };

    // Navigate to vacancy details page
    const handleRowClick = (vacancy) => {
        navigate(`/hr/vacancies/${vacancy.id}`);
    };

    // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Calculate remaining days
    const calculateRemainingDays = (closingDate) => {
        if (!closingDate) return 'N/A';
        const today = new Date();
        const closing = new Date(closingDate);
        const diffTime = closing - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Closed';
        if (diffDays === 0) return 'Today';
        return `${diffDays} days`;
    };

    // Get status badge class based on status
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'OPEN':
                return 'status-badge-success';
            case 'CLOSED':
                return 'status-badge-danger';
            case 'FILLED':
                return 'status-badge-info';
            default:
                return 'status-badge-warning';
        }
    };

    // Get priority badge class based on priority
    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'HIGH':
                return 'priority-badge-high';
            case 'MEDIUM':
                return 'priority-badge-medium';
            case 'LOW':
                return 'priority-badge-low';
            default:
                return 'priority-badge-medium';
        }
    };

    // Define columns for DataTable
    const columns = [
        {
            header: 'Title',
            accessor: 'title',
            render: (row) => (
                <div className="title-cell">
                    <strong>{row.title}</strong>
                </div>
            )
        },
        {
            header: 'Position',
            accessor: 'jobPosition.positionName',
            render: (row) => row.jobPosition ? row.jobPosition.positionName : 'N/A'
        },
        {
            header: 'Department',
            accessor: 'jobPosition.department.name',
            render: (row) => {
                if (row.jobPosition && row.jobPosition.department) {
                    return row.jobPosition.department.name || 'N/A';
                }
                return 'N/A';
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className={`jv-status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status}
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
                                parseInt(remaining) <= 7 ? 'remaining-days-urgent' : 'remaining-days-normal';
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
    ];

    // Define actions for DataTable
    const actions = [

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
    ];

    // Define filterable columns
    const filterableColumns = [
        { header: 'Title', accessor: 'title' },
        { header: 'Position', accessor: 'jobPosition.positionName' },
        { header: 'Department', accessor: 'jobPosition.department.name' }
    ];

    // Custom filters for status and priority
    const customFilters = [
        {
            label: 'Status',
            component: (
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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
                >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            )
        }
    ];

    // Filter data based on custom filters
    const filteredVacancies = vacancies.filter(vacancy => {
        const statusMatch = !statusFilter || vacancy.status === statusFilter;
        const priorityMatch = !priorityFilter || vacancy.priority === priorityFilter;
        return statusMatch && priorityMatch;
    });

    if (error) {
        return (
            <div className="vacancy-container">
                <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchVacancies}>Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vacancy-container">
            <div className="departments-header">
                <h1>Job Vacancies
                    <p className="employees-header__subtitle">
                        Post open positions, manage applications, and track your recruitment process
                    </p>
                </h1>
                <button
                    className="primary-button"
                    onClick={() => setShowAddModal(true)}
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

            {showAddModal && (
                <AddVacancyModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddVacancy}
                    jobPositions={jobPositions}
                />
            )}

            {showEditModal && selectedVacancy && (
                <EditVacancyModal
                    vacancy={selectedVacancy}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedVacancy(null);
                    }}
                    onSave={handleEditVacancy}
                    jobPositions={jobPositions}
                />
            )}
        </div>
    );
};

export default VacancyList;