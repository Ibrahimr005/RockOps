import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CandidatesTable.scss';
import AddCandidateModal from './AddCandidateModal';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { candidateService } from '../../../../services/hr/candidateService.js';
import { FaFilePdf, FaUserCheck, FaTrashAlt } from 'react-icons/fa';
import {vacancyService} from "../../../../services/hr/vacancyService.js";

const CandidatesTable = ({ vacancyId }) => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [vacancyStats, setVacancyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch candidates for the vacancy
    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                setLoading(true);
                const response = await candidateService.getByVacancy(vacancyId);
                setCandidates(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching candidates:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        const fetchVacancyStats = async () => {
            try {

                const response = await vacancyService.getStatistics();
                setVacancyStats(response.data);
                setLoading(false);

            } catch (error) {
                setError(error.message);
                setLoading(false);
                console.error('Error fetching vacancy stats:', error);
            }
        };

        if (vacancyId) {
            fetchCandidates();
            fetchVacancyStats();
        }
    }, [vacancyId]);

    // Handle adding a new candidate
    const handleAddCandidate = async (formData) => {
        try {
            setLoading(true);
            setError(null); // Clear any previous errors
            
            console.log('Submitting candidate data:', formData); // Debug log
            
            const response = await candidateService.create(formData);
            console.log('Candidate created successfully:', response); // Debug log
            
            await refreshData();
            setShowAddModal(false);
        } catch (error) {
            console.error('Error adding candidate:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            // Set a more descriptive error message
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message || 
                                'Failed to add candidate';
            setError(errorMessage);
        } finally {
            setLoading(false); // Always reset loading state
        }
    };

    // Handle deleting a candidate
    const handleDeleteCandidate = async (candidateId) => {
        if (!window.confirm('Are you sure you want to delete this candidate?')) {
            return;
        }

        try {
            setLoading(true);
            await candidateService.delete(candidateId);
            await refreshData();
        } catch (error) {
            console.error('Error deleting candidate:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle hiring a candidate
    const handleHireCandidate = async (candidateId) => {
        if (!window.confirm('Are you sure you want to hire this candidate?')) {
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // First hire the candidate (this updates the vacancy position count)
            const hireResponse = await fetch(`http://localhost:8080/api/v1/vacancies/hire-candidate/${candidateId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!hireResponse.ok) {
                const errorData = await hireResponse.json();
                throw new Error(errorData.error || 'Failed to hire candidate');
            }

            // Then convert to employee
            const employeeData = await candidateService.convertToEmployee(candidateId);
            sessionStorage.setItem('prepopulatedEmployeeData', JSON.stringify(employeeData.data));
            navigate('/employees/add');
        } catch (error) {
            console.error('Error hiring candidate:', error);
            setError(error.message);
            alert(`Failed to hire candidate: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Update candidate status
    const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/candidates/${candidateId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            await refreshData();
        } catch (error) {
            console.error('Error updating candidate status:', error);
            setError(error.message);
        }
    };

    // Refresh both candidates and vacancy stats
    const refreshData = async () => {
        try {
            const response = await candidateService.getByVacancy(vacancyId);
            setCandidates(response.data);

            const token = localStorage.getItem('token');
            const statsResponse = await fetch(`http://localhost:8080/api/v1/vacancies/${vacancyId}/statistics`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setVacancyStats(statsData);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
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
            onClick: (row) => handleHireCandidate(row.id),
            isDisabled: (row) => row.candidateStatus === 'HIRED' || (vacancyStats?.isFull && row.candidateStatus !== 'POTENTIAL'),
            className: 'hire-btn'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: (row) => handleDeleteCandidate(row.id),
            className: 'delete-btn'
        }
    ];

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
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Add Candidate'}
                </button>
            </div>

            <DataTable
                data={candidates || []} // Ensure data is always an array
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

            {showAddModal && (
                <AddCandidateModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddCandidate}
                    vacancyId={vacancyId}
                />
            )}
        </div>
    );
};

export default CandidatesTable;