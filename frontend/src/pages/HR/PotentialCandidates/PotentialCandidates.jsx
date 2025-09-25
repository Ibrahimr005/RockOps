import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PotentialCandidates.scss';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import AddToVacancyModal from './components/AddToVacancyModal';
import { candidateService } from '../../../services/hr/candidateService.js';
import { vacancyService } from '../../../services/hr/vacancyService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import {
    FaUsers,
    FaStar,
    FaPlus,
    FaTrashAlt,
    FaEye,
    FaSearch,
    FaFilter,
    FaBriefcase,
    FaChartBar
} from 'react-icons/fa';

const PotentialCandidates = () => {
    const navigate = useNavigate();
    const [potentialCandidates, setPotentialCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCandidates, setSelectedCandidates] = useState([]);
    const [showAddToVacancyModal, setShowAddToVacancyModal] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        searchTerm: '',
        minRating: null,
        maxRating: null,
        hasRating: null
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });
    const [actionLoading, setActionLoading] = useState(false);

    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        loadPotentialCandidates();
    }, []);

    const loadPotentialCandidates = async () => {
        try {
            setLoading(true);
            let response;

            if (hasActiveFilters()) {
                response = await candidateService.searchPotentialCandidates(
                    searchFilters.searchTerm || null,
                    searchFilters.minRating,
                    searchFilters.maxRating,
                    searchFilters.hasRating
                );
            } else {
                response = await vacancyService.getPotentialCandidates();
            }
console.log(response.data);
            setPotentialCandidates(response.data || []);
        } catch (error) {
            console.error('Error loading potential candidates:', error);
            setError('Failed to load potential candidates');
            showError('Failed to load potential candidates');
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = () => {
        return searchFilters.searchTerm ||
            searchFilters.minRating !== null ||
            searchFilters.maxRating !== null ||
            searchFilters.hasRating !== null;
    };

    const handleSearch = async () => {
        await loadPotentialCandidates();
    };

    const clearFilters = async () => {
        setSearchFilters({
            searchTerm: '',
            minRating: null,
            maxRating: null,
            hasRating: null
        });
        // Reload without filters
        setTimeout(loadPotentialCandidates, 100);
    };

    const handleAddToVacancy = () => {
        if (selectedCandidates.length === 0) {
            showError('Please select candidates to add to vacancy');
            return;
        }
        setShowAddToVacancyModal(true);
    };

    const handleAddCandidatesToVacancy = async (vacancyId) => {
        setActionLoading(true);
        try {
            await candidateService.addPotentialCandidatesToVacancy(vacancyId, selectedCandidates);
            showSuccess(`${selectedCandidates.length} candidates added to vacancy successfully`);
            setSelectedCandidates([]);
            setShowAddToVacancyModal(false);
            await loadPotentialCandidates();
        } catch (error) {
            console.error('Error adding candidates to vacancy:', error);
            showError('Failed to add candidates to vacancy');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCandidate = (candidate) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Remove Potential Candidate',
            message: `Are you sure you want to permanently remove ${candidate.firstName} ${candidate.lastName} from the system? This action cannot be undone.`,
            onConfirm: () => confirmDeleteCandidate(candidate)
        });
    };

    const confirmDeleteCandidate = async (candidate) => {
        setActionLoading(true);
        try {
            await candidateService.delete(candidate.id);
            showSuccess('Candidate removed successfully');
            await loadPotentialCandidates();
        } catch (error) {
            console.error('Error removing candidate:', error);
            showError('Failed to remove candidate');
        } finally {
            setActionLoading(false);
            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
        }
    };

    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderRating = (rating) => {
        if (!rating) {
            return <span className="rating-placeholder">—</span>;
        }

        const stars = [];
        const ratingValue = parseInt(rating);

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <FaStar
                    key={i}
                    className={`rating-star ${i <= ratingValue ? 'filled' : 'empty'}`}
                />
            );
        }

        return (
            <div className="rating-display">
                <div className="stars">{stars}</div>
                <span className="rating-value">({ratingValue})</span>
            </div>
        );
    };

    const renderContextInfo = (candidate) => {
        const context = [];
        if (candidate.lastVacancyTitle) {
            context.push(`Last: ${candidate.lastVacancyTitle}`);
        }
        if (candidate.rejectionReason) {
            context.push(candidate.rejectionReason);
        }
        return context.length > 0 ? context.join(' | ') : 'N/A';
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'fullName',
            header: 'Full Name',
            accessor: 'firstName',
            sortable: true,
            filterable: true,
            render: (row) => `${row.firstName} ${row.lastName}`
        },
        {
            id: 'email',
            header: 'Email',
            accessor: 'email',
            sortable: true,
            filterable: true,
            render: (row) => row.email || 'N/A'
        },
        {
            id: 'currentPosition',
            header: 'Current Position',
            accessor: 'currentPosition',
            sortable: true,
            filterable: true,
            render: (row) => row.currentPosition || 'N/A'
        },
        {
            id: 'rating',
            header: 'Rating',
            accessor: 'rating',
            sortable: true,
            filterable: false,
            render: (row) => renderRating(row.rating)
        },
        {
            id: 'lastVacancy',
            header: 'Last Applied',
            accessor: 'lastVacancyTitle',
            sortable: true,
            filterable: true,
            render: (row) => row.lastVacancyTitle || 'N/A'
        },
        {
            id: 'movedDate',
            header: 'Moved to Potential',
            accessor: 'movedToPotentialDate',
            sortable: true,
            filterable: false,
            render: (row) => formatDate(row.movedToPotentialDate)
        },
        {
            id: 'context',
            header: 'Context',
            accessor: 'rejectionReason',
            sortable: false,
            filterable: false,
            render: (row) => (
                <span className="context-info" title={renderContextInfo(row)}>
                    {renderContextInfo(row)}
                </span>
            )
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            id: 'delete',
            label: 'Remove',
            icon: <FaTrashAlt />,
            onClick: (row) => handleDeleteCandidate(row),
            className: 'delete-btn'
        }
    ];

    if (loading) return <div className="loading">Loading potential candidates...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="potential-candidates">
            {/* Header */}
            <div className="departments-header">

                    <h1>
                        Potential Candidates
                        <p className="employees-header__subtitle">
                            Manage candidates who have been moved to the potential list from closed vacancies or rejected applications
                        </p>
                    </h1>


            </div>

            {/* Statistics Cards */}
            <div className="statistics-section">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaUsers />
                        </div>
                        <div className="stat-content">
                            <span className="stat-number">{potentialCandidates.length}</span>
                            <span className="stat-label">Total Potential</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaStar />
                        </div>
                        <div className="stat-content">
                            <span className="stat-number">
                                {potentialCandidates.filter(c => c.rating).length}
                            </span>
                            <span className="stat-label">With Rating</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaChartBar />
                        </div>
                        <div className="stat-content">
                            <span className="stat-number">
                                {potentialCandidates.length > 0 ?
                                    Math.round(potentialCandidates
                                            .filter(c => c.rating)
                                            .reduce((sum, c) => sum + c.rating, 0) /
                                        potentialCandidates.filter(c => c.rating).length * 10) / 10 : 0}
                            </span>
                            <span className="stat-label">Avg Rating</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaBriefcase />
                        </div>
                        <div className="stat-content">
                            <span className="stat-number">
                                {potentialCandidates.filter(c =>
                                    c.rejectionReason && c.rejectionReason.includes('closed')).length}
                            </span>
                            <span className="stat-label">From Closed Vacancies</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="filters-section">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Search</label>
                        <input
                            type="text"
                            placeholder="Search by name, email, position..."
                            value={searchFilters.searchTerm}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Min Rating</label>
                        <select
                            value={searchFilters.minRating || ''}
                            onChange={(e) => setSearchFilters(prev => ({
                                ...prev,
                                minRating: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            className="filter-select"
                        >
                            <option value="">Any</option>
                            <option value="1">1+</option>
                            <option value="2">2+</option>
                            <option value="3">3+</option>
                            <option value="4">4+</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Has Rating</label>
                        <select
                            value={searchFilters.hasRating === null ? '' : searchFilters.hasRating.toString()}
                            onChange={(e) => setSearchFilters(prev => ({
                                ...prev,
                                hasRating: e.target.value === '' ? null : e.target.value === 'true'
                            }))}
                            className="filter-select"
                        >
                            <option value="">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="filter-actions">
                        <button onClick={handleSearch} className="btn btn-primary">
                            <FaSearch /> Search
                        </button>
                        <button onClick={clearFilters} className="btn btn-secondary">
                            <FaFilter /> Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedCandidates.length > 0 && (
                <div className="bulk-actions">
                    <span className="selected-count">
                        {selectedCandidates.length} candidate(s) selected
                    </span>
                    <button
                        onClick={handleAddToVacancy}
                        className="btn btn-success"
                        disabled={actionLoading}
                    >
                        <FaPlus /> Add to Vacancy
                    </button>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={potentialCandidates}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle=""
                showSearch={false} // We have custom search
                showFilters={false} // We have custom filters
                showExport={true}
                exportFileName="Potential_Candidates"
                filterableColumns={[]}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultSortField="movedToPotentialDate"
                defaultSortDirection="desc"
                emptyStateMessage="No potential candidates found"
                noResultsMessage="No candidates match your search criteria"
                className=""
                // Selection functionality
                selectable={true}
                selectedRows={selectedCandidates}
                onSelectionChange={setSelectedCandidates}
                getRowId={(row) => row.id}
            />

            {/* Add to Vacancy Modal */}
            {showAddToVacancyModal && (
                <AddToVacancyModal
                    onClose={() => setShowAddToVacancyModal(false)}
                    onConfirm={handleAddCandidatesToVacancy}
                    candidateCount={selectedCandidates.length}
                    isLoading={actionLoading}
                />
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Yes, Remove"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleDialogCancel}
                isLoading={actionLoading}
                size="medium"
            />
        </div>
    );
};

export default PotentialCandidates;