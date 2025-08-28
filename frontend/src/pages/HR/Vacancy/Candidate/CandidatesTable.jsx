import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CandidatesTable.scss';
import AddCandidateModal from './AddCandidateModal';
import CandidateDetailsModal from './CandidateDetailsModal';
import EditCandidateModal from './EditCandidateModal';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { candidateService } from '../../../../services/hr/candidateService.js';
import { vacancyService } from "../../../../services/hr/vacancyService.js";
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { FaFilePdf, FaUserCheck, FaTrashAlt, FaUserPlus, FaEye, FaEdit, FaClock } from 'react-icons/fa';

const CandidatesTable = ({ vacancyId }) => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [vacancyStats, setVacancyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });
    const [actionLoading, setActionLoading] = useState(false);

    const { showSuccess, showError } = useSnackbar();

    // Fetch candidates and vacancy stats
    useEffect(() => {
        if (vacancyId) {
            fetchCandidatesAndStats();
        }
    }, [vacancyId]);

    const fetchCandidatesAndStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch candidates and vacancy stats in parallel
            const [candidatesResponse, statsResponse] = await Promise.all([
                candidateService.getByVacancy(vacancyId),
                vacancyService.getStatistics(vacancyId)
            ]);

            setCandidates(candidatesResponse.data || []);
            setVacancyStats(statsResponse.data);

        } catch (error) {
            console.error('Error fetching data:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch data';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Handle adding a new candidate
    const handleAddCandidate = async (formData) => {
        try {
            setActionLoading(true);
            setError(null);

            console.log('Submitting candidate data:', formData);

            const response = await candidateService.create(formData);
            console.log('Candidate created successfully:', response);

            await fetchCandidatesAndStats();
            setShowAddModal(false);
            showSuccess('Candidate added successfully');

        } catch (error) {
            console.error('Error adding candidate:', error);
            console.error('Error details:', error.response?.data || error.message);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to add candidate';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle editing a candidate
    const handleEditCandidate = async (formData) => {
        try {
            setActionLoading(true);
            setError(null);

            const response = await candidateService.update(selectedCandidate.id, formData);
            console.log('Candidate updated successfully:', response);

            await fetchCandidatesAndStats();
            setShowEditModal(false);
            setSelectedCandidate(null);
            showSuccess('Candidate updated successfully');

        } catch (error) {
            console.error('Error updating candidate:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to update candidate';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle deleting a candidate
    const handleDeleteCandidate = (candidate) => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Delete Candidate',
            message: `Are you sure you want to delete candidate "${candidate.firstName} ${candidate.lastName}"? This action cannot be undone.`,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await candidateService.delete(candidate.id);
                    await fetchCandidatesAndStats();
                    showSuccess('Candidate deleted successfully');
                } catch (error) {
                    console.error('Error deleting candidate:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete candidate';
                    showError(errorMessage);
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    // Handle hiring a candidate - NEW IMPLEMENTATION
    const handleHireCandidate = (candidate) => {
        const isVacancyFull = vacancyStats?.isFull && candidate.candidateStatus !== 'POTENTIAL';

        if (isVacancyFull) {
            showError('Cannot hire candidate. Vacancy is full and candidate is not in potential list.');
            return;
        }

        // Check if already hired or pending
        if (candidate.candidateStatus === 'HIRED') {
            showError('Candidate is already hired.');
            return;
        }

        if (candidate.candidateStatus === 'PENDING_HIRE') {
            showError('Candidate is already pending hire. Complete the employee form to finalize hiring.');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Set Candidate to Pending Hire',
            message: `Are you sure you want to mark "${candidate.firstName} ${candidate.lastName}" as pending hire?`,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    // Skip status update for now, go directly to employee form
                    const employeeDataResponse = await candidateService.convertToEmployee(candidate.id);
                    sessionStorage.setItem('prepopulatedEmployeeData', JSON.stringify(employeeDataResponse.data));

                    showSuccess('Redirecting to employee form to complete hiring process.');
                    navigate('/hr/employees/add');

                } catch (error) {
                    console.error('Error preparing candidate data:', error);
                    showError('Failed to prepare candidate data for hiring');
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    // Handle viewing candidate details
    const handleViewDetails = (candidate) => {
        setSelectedCandidate(candidate);
        setShowDetailsModal(true);
    };

    // Handle editing candidate
    const handleEditClick = (candidate) => {
        setSelectedCandidate(candidate);
        setShowEditModal(true);
    };

    // Handle dialog cancel
    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    // Handle add button click from DataTable
    const handleAddButtonClick = () => {
        setShowAddModal(true);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Get status badge class and text
    const getStatusDisplay = (status) => {
        const statusMap = {
            'APPLIED': { text: 'Applied', class: 'info' },
            'UNDER_REVIEW': { text: 'Under Review', class: 'under-review' },
            'INTERVIEWED': { text: 'Interviewed', class: 'under-review' }, // Similar to under review
            'PENDING_HIRE': { text: 'Pending Hire', class: 'pending' },
            'HIRED': { text: 'Hired', class: 'completed' }, // or 'active' - both work for hired status
            'REJECTED': { text: 'Rejected', class: 'rejected' },
            'POTENTIAL': { text: 'Potential', class: 'draft' }, // or 'inactive' for potential candidates
            'WITHDRAWN': { text: 'Withdrawn', class: 'cancelled' }
        };

        return statusMap[status] || { text: status || 'N/A', class: 'draft' };
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'fullName',
            header: 'Full Name',
            accessor: 'firstName',
            sortable: true,
            filterable: true,
            render: (row) => `${row.firstName} ${row.lastName}`,
            onRowClick: (row) => handleViewDetails(row)
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
            id: 'phoneNumber',
            header: 'Phone',
            accessor: 'phoneNumber',
            sortable: true,
            filterable: true,
            render: (row) => row.phoneNumber || 'N/A'
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
            id: 'candidateStatus',
            header: 'Status',
            accessor: 'candidateStatus',
            sortable: true,
            filterable: true,
            render: (row) => {
                const status = getStatusDisplay(row.candidateStatus);
                return (
                    <span className={`status-badge ${status.class}`}>
                        {status.text}
                    </span>
                );
            }
        },
        {
            id: 'applicationDate',
            header: 'Applied',
            accessor: 'applicationDate',
            sortable: true,
            filterable: false,
            render: (row) => formatDate(row.applicationDate)
        }
    ];

    // Define actions for DataTable
    const actions = [

        {
            id: 'edit',
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleEditClick(row),
            isDisabled: (row) => row.candidateStatus === 'HIRED',
            className: 'edit-btn'
        },
        {
            id: 'view-resume',
            label: 'View Resume',
            icon: <FaFilePdf />,
            onClick: (row) => window.open(row.resumeUrl, '_blank'),
            isDisabled: (row) => !row.resumeUrl,
            className: 'view-resume-btn'
        },
        {
            id: 'hire',
            label: (row) => {
                if (row.candidateStatus === 'PENDING_HIRE') return 'Complete Hiring';
                if (row.candidateStatus === 'HIRED') return 'Hired';
                return 'Hire';
            },
            icon: (row) => {
                if (row.candidateStatus === 'PENDING_HIRE') return <FaClock />;
                return <FaUserCheck />;
            },
            onClick: (row) => handleHireCandidate(row),
            isDisabled: (row) => {
                // Only disable if already hired - show button for other cases
                return row.candidateStatus === 'HIRED';
            },
            className: (row) => {
                if (row.candidateStatus === 'PENDING_HIRE') return 'candidates-table__pending-hire-btn';
                if (row.candidateStatus === 'HIRED') return 'candidates-table__hired-btn';
                return 'hire-btn';
            }
        },
        {
            id: 'delete',
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: (row) => handleDeleteCandidate(row),
            isDisabled: (row) => row.candidateStatus === 'HIRED',
            className: 'delete-btn'
        }
    ];

    if (!vacancyId) {
        return (
            <div className="candidates-section">
                <div className="error-alert">
                    <h3>No Vacancy Selected</h3>
                    <p>Please select a vacancy to view candidates.</p>
                </div>
            </div>
        );
    }

    if (error && !loading) {
        return (
            <div className="candidates-section">
                <div className="error-alert">
                    <h3>Error Loading Candidates</h3>
                    <p>{error}</p>
                    <button className="retry-button" onClick={fetchCandidatesAndStats}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="candidates-section">
            {/*{vacancyStats && (*/}
            {/*    <div className="stats-cards">*/}
            {/*        <div className="stat-item">*/}
            {/*            <span className="label">Total Candidates:</span>*/}
            {/*            <span className="value">{vacancyStats.totalCandidates}</span>*/}
            {/*        </div>*/}
            {/*        <div className="stat-item">*/}
            {/*            <span className="label">Hired:</span>*/}
            {/*            <span className="value">{vacancyStats.hiredCount}/{vacancyStats.positionsNeeded}</span>*/}
            {/*        </div>*/}
            {/*        {vacancyStats.isFull && (*/}
            {/*            <div className="vacancy-full-notice">*/}
            {/*                <span className="warning-icon">⚠️</span>*/}
            {/*                <span>*/}
            {/*                    This vacancy is full. New candidates will be moved to the potential list.*/}
            {/*                </span>*/}
            {/*            </div>*/}
            {/*        )}*/}
            {/*    </div>*/}
            {/*)}*/}

            <DataTable
                data={candidates}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle="Candidates"
                showSearch={true}
                showFilters={true}
                showExport={true}
                exportFileName={`Vacancy_${vacancyId}_Candidates`}
                filterableColumns={columns.filter(col => col.filterable)}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultSortField="applicationDate"
                defaultSortDirection="desc"
                emptyStateMessage="No candidates found for this vacancy"
                noResultsMessage="No candidates match your search criteria"
                className="candidates-datatable"
                // Add button configuration
                showAddButton={true}
                addButtonText="Add Candidate"
                addButtonIcon={<FaUserPlus />}
                onAddClick={handleAddButtonClick}
                addButtonDisabled={loading || actionLoading}
                // Enable row click for details view
                onRowClick={handleViewDetails}
            />

            {/* Add Candidate Modal */}
            {showAddModal && (
                <AddCandidateModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddCandidate}
                    vacancyId={vacancyId}
                    isLoading={actionLoading}
                />
            )}

            {/* Candidate Details Modal */}
            {showDetailsModal && selectedCandidate && (
                <CandidateDetailsModal
                    candidate={selectedCandidate}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedCandidate(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        setShowEditModal(true);
                    }}
                    onHire={() => {
                        setShowDetailsModal(false);
                        handleHireCandidate(selectedCandidate);
                    }}
                    onDelete={() => {
                        setShowDetailsModal(false);
                        handleDeleteCandidate(selectedCandidate);
                    }}
                    vacancyStats={vacancyStats}
                />
            )}

            {/* Edit Candidate Modal */}
            {showEditModal && selectedCandidate && (
                <EditCandidateModal
                    candidate={selectedCandidate}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedCandidate(null);
                    }}
                    onSave={handleEditCandidate}
                    isLoading={actionLoading}
                />
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Yes, Proceed"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleDialogCancel}
                isLoading={actionLoading}
                size="medium"
            />
        </div>
    );
};

export default CandidatesTable;