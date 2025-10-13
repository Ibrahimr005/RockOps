import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VacancyDetails.scss';
import CandidatesTable from "../Candidate/CandidatesTable.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { vacancyService } from '../../../../services/hr/vacancyService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { FaArrowLeft, FaEdit, FaTrash, FaUsers, FaBriefcase, FaCalendar, FaClock, FaBuilding } from 'react-icons/fa';
import {FiBriefcase, FiEdit, FiHome, FiTrash} from "react-icons/fi";
import IntroCard from "../../../../components/common/IntroCard/IntroCard.jsx";

const VacancyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vacancy, setVacancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });
    const [actionLoading, setActionLoading] = useState(false);
    const { showSuccess, showError } = useSnackbar();

    // Fetch vacancy details
    useEffect(() => {
        const fetchVacancyDetails = async () => {
            try {
                setLoading(true);
                const response = await vacancyService.getById(id);
                setVacancy(response.data);
                console.log('Vacancy Data:', response.data);
            } catch (error) {
                console.error('Error fetching vacancy details:', error);
                setError(error.message);
                showError('Failed to load vacancy details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVacancyDetails();
        }
    }, [id, showError]);

    // Format date for display
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
                return 'active';
            case 'CLOSED':
                return 'danger';
            case 'FILLED':
                return 'completed';
            default:
                return 'pending';
        }
    };

    // Get priority badge class based on priority
    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'HIGH':
                return 'high';
            case 'MEDIUM':
                return 'medium';
            case 'LOW':
                return 'low';
            default:
                return 'medium';
        }
    };

    // Handle back button click
    const handleBackClick = () => {
        navigate('/hr/vacancies');
    };

    // Handle edit button click
    const handleEditClick = () => {
        navigate(`/hr/vacancies/edit/${id}`);
    };

    // Handle delete vacancy
    const handleDeleteVacancy = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Delete Vacancy',
            message: `Are you sure you want to delete the vacancy "${vacancy.title}"? This action cannot be undone and will also remove all associated candidates.`,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await vacancyService.delete(id);
                    showSuccess('Vacancy deleted successfully');
                    navigate('/hr/vacancies');
                } catch (error) {
                    console.error('Error deleting vacancy:', error);
                    showError('Failed to delete vacancy');
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    // Handle move candidates to potential
    const handleMoveToPotential = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Move Candidates to Potential List',
            message: 'Are you sure you want to move all candidates for this vacancy to the potential candidates list? This action will mark them as potential hires for future positions.',
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await vacancyService.moveToPotential(id);
                    showSuccess('Candidates moved to potential list successfully');
                    window.location.reload();
                } catch (error) {
                    console.error('Error moving candidates to potential:', error);
                    showError('Failed to move candidates to potential list');
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    // Handle dialog cancel
    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    if (loading) {
        return (
            <div className="vacancy-details-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading vacancy details...</p>
                </div>
            </div>
        );
    }

    if (error || !vacancy) {
        return (
            <div className="vacancy-details-page">
                <div className="error-state">
                    <h3>Error Loading Vacancy</h3>
                    <p>{error || 'Vacancy not found'}</p>
                    <button className="btn btn-primary" onClick={handleBackClick}>
                        <FaArrowLeft />
                        Back to Vacancies
                    </button>
                </div>
            </div>
        );
    }

    const getBreadcrumbs = () => {
        return [
            {
                label: 'Home',
                icon: <FiHome />,
                onClick: () => navigate('/')
            },
            {
                label: 'HR',
                onClick: () => navigate('/hr')
            },
            {
                label: 'Vacancies',
                icon: <FiBriefcase />,
                onClick: () => navigate('/hr/vacancies')
            },
            {
                label: vacancy.title
            }
        ];
    };

    const getVacancyStats = () => {
        return [
            {
                value: vacancy.status,
                label: 'Status'
            },
            {
                value: `${vacancy.priority || 'MEDIUM'} `,
                label: 'Priority Level'
            },
            {
                value: vacancy.numberOfPositions || '0',
                label: 'Number of Positions'
            }
        ];
    };

    const getActionButtons = () => {
        return [
            {
                text: 'Edit Vacancy',
                icon: <FiEdit />,
                onClick: handleEditClick,
                className: 'secondary'
            },
            {
                text: 'Delete',
                icon: <FiTrash />,
                onClick: handleDeleteVacancy,
                className: 'danger'
            }
        ];
    };
    return (
        <div className="vacancy-details-page">
            {/* Header Section */}
            <IntroCard
                title={vacancy.title}
                label="VACANCY DETAILS"
                breadcrumbs={getBreadcrumbs()}
                icon={<FiBriefcase />}
                stats={getVacancyStats()}
                actionButtons={getActionButtons()}
            />
            {/* Main Content */}
            <div className="vacancy-content">
                {/* Vacancy Details Section */}
                <div className="vacancy-details-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <FaBriefcase />
                            Vacancy Information
                        </h2>
                    </div>

                    <div className="vacancy-info-grid">
                        <div className="info-card">
                            <div className="info-icon">
                                <FaBriefcase />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Position</span>
                                <span className="info-value">
                                    {vacancy.jobPosition ? vacancy.jobPosition.positionName : 'General Position'}
                                </span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <FaBuilding />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Department</span>
                                <span className="info-value">
                                    {vacancy.jobPosition ? vacancy.jobPosition.departmentName : 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <FaCalendar />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Posted Date</span>
                                <span className="info-value">{formatDate(vacancy.postingDate)}</span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <FaCalendar />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Closing Date</span>
                                <span className="info-value">{formatDate(vacancy.closingDate)}</span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <FaClock />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Remaining Time</span>
                                <span className={`info-value status-indicator ${
                                    calculateRemainingDays(vacancy.closingDate) === 'Closed' ? 'closed' :
                                        calculateRemainingDays(vacancy.closingDate) === 'Today' ? 'urgent' :
                                            parseInt(calculateRemainingDays(vacancy.closingDate)) <= 7 ? 'warning' : 'normal'
                                }`}>
                                    {calculateRemainingDays(vacancy.closingDate)}
                                </span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <FaUsers />
                            </div>
                            <div className="info-content">
                                <span className="info-label">Positions Available</span>
                                <span className="info-value">{vacancy.numberOfPositions || 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Cards */}
                    <div className="content-cards">
                        <div className="content-card">
                            <h3 className="card-title">Description</h3>
                            <div className="card-content">
                                <p>{vacancy.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        <div className="content-card">
                            <h3 className="card-title">Requirements</h3>
                            <div className="card-content">
                                <p>{vacancy.requirements || 'No specific requirements provided.'}</p>
                            </div>
                        </div>

                        <div className="content-card">
                            <h3 className="card-title">Responsibilities</h3>
                            <div className="card-content">
                                <p>{vacancy.responsibilities || 'No specific responsibilities provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Candidates Section */}
                <div className="candidates-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <FaUsers />
                            Candidates
                        </h2>
                    </div>
                    <CandidatesTable vacancyId={id} />
                </div>
            </div>

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

export default VacancyDetails;