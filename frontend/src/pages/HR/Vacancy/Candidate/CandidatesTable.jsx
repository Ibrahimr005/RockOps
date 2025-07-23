import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CandidatesTable.scss';
import AddCandidateModal from './AddCandidateModal';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { candidateService } from '../../../../services/hr/candidateService.js';
import { vacancyService } from "../../../../services/hr/vacancyService.js";
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { FaFilePdf, FaUserCheck, FaTrashAlt } from 'react-icons/fa';

const CandidatesTable = ({ vacancyId }) => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [vacancyStats, setVacancyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
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

    // Handle hiring a candidate
    const handleHireCandidate = (candidate) => {
        const isVacancyFull = vacancyStats?.isFull && candidate.candidateStatus !== 'POTENTIAL';

        if (isVacancyFull) {
            showError('Cannot hire candidate. Vacancy is full and candidate is not in potential list.');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Hire Candidate',
            message: `Are you sure you want to hire "${candidate.firstName} ${candidate.lastName}"? This will convert them to an employee and update the vacancy position count.`,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    // First hire the candidate (this updates the vacancy position count)
                    await vacancyService.hireCandidate(candidate.id);

                    // Then convert to employee
                    const employeeDataResponse = await candidateService.convertToEmployee(candidate.id);
                    sessionStorage.setItem('prepopulatedEmployeeData', JSON.stringify(employeeDataResponse.data));

                    showSuccess('Candidate hired successfully! Redirecting to employee creation...');
                    navigate('/hr/employees/add');

                } catch (error) {
                    console.error('Error hiring candidate:', error);
                    const errorMessage = error.response?.data?.error ||
                        error.response?.data?.message ||
                        error.message ||
                        'Failed to hire candidate';
                    showError(`Failed to hire candidate: ${errorMessage}`);
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    // Update candidate status
    const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
        try {
            setActionLoading(true);
            await candidateService.updateStatus(candidateId, newStatus);
            await fetchCandidatesAndStats();
            showSuccess('Candidate status updated successfully');
        } catch (error) {
            console.error('Error updating candidate status:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update candidate status';
            showError(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle dialog cancel
    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    // Format date
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

    // Get candidate status badge
    const getCandidateStatusBadge = (status) => {
        const statusColors = {
            'APPLIED': 'info',
            'UNDER_REVIEW': 'warning',
            'INTERVIEWED': 'primary',
            'HIRED': 'success',
            'REJECTED': 'danger',
            'POTENTIAL': 'secondary',
            'WITHDRAWN': 'secondary'
        };

        const colorClass = statusColors[status] || 'info';

        return (
            <span className={`status-badge status-badge--${colorClass}`}>
                {status?.replace('_', ' ') || 'APPLIED'}
            </span>
        );
    };

    // Define columns for DataTable
    const columns = [
        {
            header: 'Name',
            accessor: 'firstName',
            render: (row) => `${row.firstName} ${row.lastName}`
        },
        {
            header: 'Status',
            accessor: 'candidateStatus',
            render: (row) => getCandidateStatusBadge(row.candidateStatus)
        },
        {
            header: 'Email',
            accessor: 'email'
        },
        {
            header: 'Phone',
            accessor: 'phoneNumber',
            render: (row) => row.phoneNumber || 'N/A'
        },
        {
            header: 'Current Position',
            accessor: 'currentPosition',
            render: (row) => row.currentPosition || 'N/A'
        },
        {
            header: 'Current Company',
            accessor: 'currentCompany',
            render: (row) => row.currentCompany || 'N/A'
        },
        {
            header: 'Applied',
            accessor: 'applicationDate',
            render: (row) => formatDate(row.applicationDate)
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'View Resume',
            icon: <FaFilePdf />,
            onClick: (row) => window.open(row.resumeUrl, '_blank'),
            isDisabled: (row) => !row.resumeUrl,
            className: 'view-resume-btn'
        },
        {
            label: 'Hire',
            icon: <FaUserCheck />,
            onClick: (row) => handleHireCandidate(row),
            isDisabled: (row) => row.candidateStatus === 'HIRED' || (vacancyStats?.isFull && row.candidateStatus !== 'POTENTIAL'),
            className: 'hire-btn'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: (row) => handleDeleteCandidate(row),
            className: 'delete-btn'
        }
    ];

    if (!vacancyId) {
        return (
            <div className="candidates-section">
                <div className="error-alert">
                    <strong>Error:</strong> No vacancy ID provided
                </div>
            </div>
        );
    }

    return (
        <div className="candidates-section">
            {/* Error Display */}
            {error && (
                <div className="error-alert" style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    border: '1px solid #f5c6cb'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Vacancy Statistics */}
            {vacancyStats && (
                <div className="vacancy-stats">
                    <div className="vacancy-stats-grid">
                        <div className="vacancy-stat-card">
                            <div className="vacancy-stat-number">{vacancyStats.remainingPositions}</div>
                            <div className="vacancy-stat-label">Remaining Positions</div>
                        </div>
                        <div className="vacancy-stat-card">
                            <div className="vacancy-stat-number">{vacancyStats.hiredCount}</div>
                            <div className="vacancy-stat-label">Hired</div>
                        </div>
                        <div className="vacancy-stat-card">
                            <div className="vacancy-stat-number">{vacancyStats.totalPositions}</div>
                            <div className="vacancy-stat-label">Total Positions</div>
                        </div>
                        <div className="vacancy-stat-card">
                            <div className="vacancy-stat-number">{Math.round(vacancyStats.filledPercentage)}%</div>
                            <div className="vacancy-stat-label">Filled</div>
                        </div>
                        <div className="vacancy-stat-card">
                            <div className={`vacancy-stat-number ${calculateRemainingDays(vacancyStats.closingDate) === 'Closed' ? 'remaining-days-closed' :
                                calculateRemainingDays(vacancyStats.closingDate) === 'Today' ? 'remaining-days-today' :
                                    parseInt(calculateRemainingDays(vacancyStats.closingDate)) <= 7 ? 'remaining-days-urgent' : 'remaining-days-normal'}`}>
                                {calculateRemainingDays(vacancyStats.closingDate)}
                            </div>
                            <div className="vacancy-stat-label">Time Remaining</div>
                        </div>
                    </div>
                    {vacancyStats.isFull && (
                        <div className="vacancy-full-alert">
                            <i className="fas fa-exclamation-circle"></i>
                            This vacancy is full. New candidates will be moved to the potential list.
                        </div>
                    )}
                </div>
            )}

            <div className="departments-header">
                <h2>Candidates</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddModal(true)}
                    disabled={loading || actionLoading}
                >
                    {actionLoading ? 'Processing...' : loading ? 'Loading...' : 'Add Candidate'}
                </button>
            </div>

            <DataTable
                data={candidates}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle="Candidates List"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.accessor !== 'candidateStatus')}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
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