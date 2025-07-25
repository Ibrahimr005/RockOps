import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VacancyDetails.scss';
import CandidatesTable from "../Candidate/CandidatesTable.jsx";
import { vacancyService } from '../../../../services/vacancyService';


const VacancyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vacancy, setVacancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'candidates'

    // Fetch vacancy details
    useEffect(() => {
        const fetchVacancyDetails = async () => {
            try {
                setLoading(true);
                const response = await vacancyService.getById(id);
                const data = response.data;
                setVacancy(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching vacancy details:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        if (id) {
            fetchVacancyDetails();
        }
    }, [id]);

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

    // Handle back button click
    const handleBackClick = () => {
        navigate('/vacancies');
    };

    // Handle edit button click
    const handleEditClick = () => {
        navigate(`/vacancies/edit/${id}`);
    };

    if (loading) {
        return (
            <div className="vacancy-details-container">
                <div className="loading-container">
                    <div className="loader"></div>
                    <p>Loading vacancy details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="vacancy-details-container">
                <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={() => navigate('/vacancies')}>Back to Vacancies</button>
                </div>
            </div>
        );
    }

    if (!vacancy) {
        return (
            <div className="vacancy-details-container">
                <div className="error-container">
                    <p>Vacancy not found</p>
                    <button onClick={() => navigate('/vacancies')}>Back to Vacancies</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vacancy-details-container">
            <div className="details-header">
                <h1>{vacancy.title}</h1>
                <div className="header-badges">
                    <span className={`status-badge ${getStatusBadgeClass(vacancy.status)}`}>
                        {vacancy.status}
                    </span>
                    <span className={`priority-badge ${getPriorityBadgeClass(vacancy.priority)}`}>
                        {vacancy.priority || 'MEDIUM'} Priority
                    </span>
                </div>
            </div>

            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <i className="fas fa-info-circle"></i> Details
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('candidates')}
                    >
                        <i className="fas fa-users"></i> Candidates
                    </button>
                </div>
            </div>

            {activeTab === 'details' ? (
                <div className="vacancy-details-content">
                    <div className="vacancy-details-section vacancy-overview-section">
                        <div className="vacancy-info-grid">
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Position</span>
                                <span className="vacancy-info-value">{vacancy.jobPosition ? vacancy.jobPosition.positionName : 'General Position'}</span>
                            </div>
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Department</span>
                                <span className="vacancy-info-value">{vacancy.jobPosition ? vacancy.jobPosition.department.name : 'N/A'}</span>
                            </div>
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Posted Date</span>
                                <span className="vacancy-info-value">{formatDate(vacancy.postingDate)}</span>
                            </div>
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Closing Date</span>
                                <span className="vacancy-info-value">{formatDate(vacancy.closingDate)}</span>
                            </div>
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Remaining Time</span>
                                <span className={`vacancy-info-value ${calculateRemainingDays(vacancy.closingDate) === 'Closed' ? 'vacancy-closed' : 
                                    calculateRemainingDays(vacancy.closingDate) === 'Today' ? 'vacancy-today' : 
                                    parseInt(calculateRemainingDays(vacancy.closingDate)) <= 7 ? 'vacancy-urgent' : 'vacancy-normal'}`}>
                                    {calculateRemainingDays(vacancy.closingDate)}
                                </span>
                            </div>
                            <div className="vacancy-info-card">
                                <span className="vacancy-info-label">Positions</span>
                                <span className="vacancy-info-value">{vacancy.numberOfPositions || 1}</span>
                            </div>
                        </div>
                    </div>

                    <div className="vacancy-details-section vacancy-description-section">
                        <h2>Description</h2>
                        <div className="vacancy-content-card">
                            <p>{vacancy.description || 'No description provided.'}</p>
                        </div>
                    </div>

                    <div className="vacancy-details-section vacancy-requirements-section">
                        <h2>Requirements</h2>
                        <div className="vacancy-content-card">
                            <p>{vacancy.requirements || 'No specific requirements provided.'}</p>
                        </div>
                    </div>

                    <div className="vacancy-details-section vacancy-responsibilities-section">
                        <h2>Responsibilities</h2>
                        <div className="vacancy-content-card">
                            <p>{vacancy.responsibilities || 'No specific responsibilities provided.'}</p>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="candidates-content">
                    <CandidatesTable vacancyId={id} />
                </div>
            )}
        </div>
    );
};

export default VacancyDetails;