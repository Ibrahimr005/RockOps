import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaTools, FaUser, FaCalendarAlt, FaDollarSign, FaMapMarkerAlt, FaInfoCircle } from 'react-icons/fa';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import MaintenanceSteps from '../MaintenanceSteps/MaintenanceSteps';
import './MaintenanceRecordDetail.scss';
import maintenanceService from "../../../services/maintenanceService.js";

const MaintenanceRecordDetail = () => {
    const { recordId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [maintenanceRecord, setMaintenanceRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const { showError } = useSnackbar();

    useEffect(() => {
        if (recordId) {
            loadMaintenanceRecord();
        }
    }, [recordId]);

    useEffect(() => {
        // Check for tab parameter in URL
        const urlParams = new URLSearchParams(location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'steps') {
            setActiveTab('steps');
        }
    }, [location.search]);

    const loadMaintenanceRecord = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await maintenanceService.getRecordById(recordId);
            setMaintenanceRecord(response.data);
        } catch (error) {
            console.error('Error loading maintenance record:', error);
            setError('Failed to load maintenance record. Please try again.');
            showError('Failed to load maintenance record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStepUpdate = () => {
        loadMaintenanceRecord();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'var(--color-success)';
            case 'ACTIVE': return 'var(--color-primary)';
            case 'OVERDUE': return 'var(--color-danger)';
            case 'SCHEDULED': return 'var(--color-warning)';
            case 'ON_HOLD': return 'var(--color-info)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getStatusBadge = (status) => {
        const color = getStatusColor(status);
        return (
            <span 
                className="status-badge"
                style={{ 
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}`
                }}
            >
                {status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="maintenance-record-detail-loading">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    if (error || !maintenanceRecord) {
        return (
            <div className="maintenance-record-detail-error">
                <div className="error-message">
                    <h3>Error Loading Maintenance Record</h3>
                    <p>{error || 'Maintenance record not found'}</p>
                    <button onClick={() => navigate('/maintenance/records')} className="back-btn">
                        <FaArrowLeft /> Back to Records
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-record-detail">
            <div className="detail-header">
                <div className="header-left">
                    <button 
                        className="back-button"
                        onClick={() => navigate('/maintenance/records')}
                    >
                        <FaArrowLeft /> Back to Records
                    </button>
                    <h1>Maintenance Record Details</h1>
                </div>
                <div className="header-right">
                    {getStatusBadge(maintenanceRecord.status)}
                </div>
            </div>

            <div className="detail-content">
                <div className="content-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <FaInfoCircle /> Overview
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'steps' ? 'active' : ''}`}
                        onClick={() => setActiveTab('steps')}
                    >
                        <FaTools /> Maintenance Steps ({maintenanceRecord.totalSteps || 0})
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <div className="overview-tab">
                            <div className="overview-grid">
                                <div className="overview-section">
                                    <h3>Equipment Information</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Equipment Name</label>
                                            <span>{maintenanceRecord.equipmentName || maintenanceRecord.equipmentInfo || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Equipment Model</label>
                                            <span>{maintenanceRecord.equipmentModel || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Serial Number</label>
                                            <span>{maintenanceRecord.equipmentSerialNumber || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Equipment Type</label>
                                            <span>{maintenanceRecord.equipmentType || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Site</label>
                                            <span>{maintenanceRecord.site || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="overview-section">
                                    <h3>Issue Details</h3>
                                    <div className="info-grid">
                                        <div className="info-item full-width">
                                            <label>Initial Issue Description</label>
                                            <span>{maintenanceRecord.initialIssueDescription}</span>
                                        </div>
                                        {maintenanceRecord.finalDescription && (
                                            <div className="info-item full-width">
                                                <label>Final Description</label>
                                                <span>{maintenanceRecord.finalDescription}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="overview-section">
                                    <h3>Timeline</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Creation Date</label>
                                            <span>{formatDate(maintenanceRecord.creationDate)}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Expected Completion</label>
                                            <span>{formatDate(maintenanceRecord.expectedCompletionDate)}</span>
                                        </div>
                                        {maintenanceRecord.actualCompletionDate && (
                                            <div className="info-item">
                                                <label>Actual Completion</label>
                                                <span>{formatDate(maintenanceRecord.actualCompletionDate)}</span>
                                            </div>
                                        )}
                                        <div className="info-item">
                                            <label>Duration</label>
                                            <span>{maintenanceRecord.durationInDays || 0} days</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="overview-section">
                                    <h3>Current Status</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Current Responsible Person</label>
                                            <span>{maintenanceRecord.currentResponsiblePerson || 'Not assigned'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Contact Phone</label>
                                            <span>{maintenanceRecord.currentResponsiblePhone || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Contact Email</label>
                                            <span>{maintenanceRecord.currentResponsibleEmail || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Total Steps</label>
                                            <span>{maintenanceRecord.totalSteps || 0}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Completed Steps</label>
                                            <span>{maintenanceRecord.completedSteps || 0}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Active Steps</label>
                                            <span>{maintenanceRecord.activeSteps || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="overview-section">
                                    <h3>Financial Information</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Total Cost</label>
                                            <span className="cost">{formatCurrency(maintenanceRecord.totalCost)}</span>
                                        </div>
                                        {maintenanceRecord.isOverdue && (
                                            <div className="info-item">
                                                <label>Status</label>
                                                <span className="overdue">Overdue</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'steps' && (
                        <div className="steps-tab">
                            <MaintenanceSteps 
                                recordId={recordId} 
                                onStepUpdate={handleStepUpdate}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MaintenanceRecordDetail; 