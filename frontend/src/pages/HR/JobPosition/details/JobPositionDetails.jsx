import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiEdit, FiArrowLeft, FiUser, FiUsers, FiTrendingUp, FiInfo } from 'react-icons/fi';
import EditPositionForm from '../components/EditPositionForm.jsx';
import PositionOverview from './components/PositionOverview.jsx';
import PositionEmployees from './components/PositionEmployees.jsx';
import PositionPromotions from './components/PositionPromotions.jsx';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../../services/hr/jobPositionService.js';
import './JobPositionDetails.scss';

const JobPositionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Tab configuration
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: <FiInfo />,
            component: PositionOverview
        },
        {
            id: 'employees',
            label: 'Employees',
            icon: <FiUsers />,
            component: PositionEmployees
        },
        {
            id: 'promotions',
            label: 'Promotions',
            icon: <FiTrendingUp />,
            component: PositionPromotions
        }
    ];

    useEffect(() => {
        if (id) {
            fetchPositionDetails();
        }
    }, [id]);

    const fetchPositionDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobPositionService.getById(id);
            setPosition(response.data);
        } catch (err) {
            console.error('Error fetching position details:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load position details';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPosition = async (formData) => {
        try {
            setError(null);
            await jobPositionService.update(id, formData);
            await fetchPositionDetails();
            setShowEditForm(false);
            showSuccess('Job position updated successfully!');
        } catch (err) {
            console.error('Error updating position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update position';
            setError(errorMessage);
            showError(errorMessage);
            throw err;
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    if (loading) {
        return (
            <div className="position-details-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading position details...</p>
                </div>
            </div>
        );
    }

    if (error || !position) {
        return (
            <div className="position-details-container">
                <div className="error-container">
                    <h2>Error Loading Position</h2>
                    <p>{error || 'Position not found'}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/hr/positions')}
                    >
                        <FiArrowLeft /> Back to Positions
                    </button>
                </div>
            </div>
        );
    }

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="position-details-container">
            {/* Header Section */}
            <div className="position-header">
                <div className="position-header-content">
                    <button
                        className="back-button"
                        onClick={() => navigate('/hr/positions')}
                    >
                        <FiArrowLeft /> Back to Positions
                    </button>
                    <div className="position-title">
                        <h1>{position.positionName}</h1>
                        <p className="position-subtitle">
                            {position.department} • {position.contractType?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
                <div className="position-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowEditForm(true)}
                    >
                        <FiEdit /> Edit Position
                    </button>
                </div>
            </div>

            {/* Position Summary Card */}
            <div className="position-summary-card">
                <div className="summary-grid">
                    <div className="summary-item">
                        <div className="summary-icon">
                            <FiUser />
                        </div>
                        <div className="summary-content">
                            <span className="summary-label">Experience Level</span>
                            <span className="summary-value">
                                {position.experienceLevel?.replace('_', ' ').toLowerCase()
                                    .replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-icon">
                            <FiUsers />
                        </div>
                        <div className="summary-content">
                            <span className="summary-label">Reporting To</span>
                            <span className="summary-value">{position.head || 'Direct Report'}</span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-icon">
                            <FiTrendingUp />
                        </div>
                        <div className="summary-content">
                            <span className="summary-label">Status</span>
                            <span className={`status-badge ${position.active ? 'active' : 'inactive'}`}>
                                {position.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-container">
                <div className="tabs-header">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {ActiveComponent && (
                        <ActiveComponent
                            position={position}
                            positionId={id}
                            onRefresh={fetchPositionDetails}
                        />
                    )}
                </div>
            </div>

            {/* Edit Position Modal */}
            {showEditForm && position && (
                <EditPositionForm
                    isOpen={showEditForm}
                    onClose={() => {
                        setShowEditForm(false);
                        setError(null);
                    }}
                    onSubmit={handleEditPosition}
                    position={position}
                />
            )}
        </div>
    );
};

export default JobPositionDetails;