import React, { useState, useEffect } from 'react';
import { FaTimes, FaEye, FaTools, FaUser, FaCalendarAlt, FaDollarSign, FaInfoCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import maintenanceService from '../../../../services/maintenanceService.js';
import './MaintenanceRecordViewModal.scss';

const MaintenanceRecordViewModal = ({ isOpen, onClose, recordId }) => {
    const navigate = useNavigate();
    const [maintenanceRecord, setMaintenanceRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { showError } = useSnackbar();

    useEffect(() => {
        if (isOpen && recordId) {
            loadMaintenanceRecord();
        }
    }, [isOpen, recordId]);

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

    const handleViewFullDetails = () => {
        onClose();
        navigate(`/maintenance/records/${recordId}`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return '#10b981';
            case 'ACTIVE': return '#3b82f6';
            case 'OVERDUE': return '#ef4444';
            case 'SCHEDULED': return '#f59e0b';
            case 'ON_HOLD': return '#6366f1';
            default: return '#6b7280';
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
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    if (!isOpen) return null;

    return (
        <div className="maintenance-modal-overlay" onClick={onClose}>
            <div className="maintenance-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="maintenance-modal-header">
                    <div className="header-content">
                        <div className="header-title">
                            <FaEye className="header-icon" />
                            <h2>Maintenance Record Overview</h2>
                        </div>
                        {maintenanceRecord && (
                            <div className="header-status">
                                {getStatusBadge(maintenanceRecord.status)}
                            </div>
                        )}
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn-secondary"
                            onClick={handleViewFullDetails}
                            title="View full details with steps"
                        >
                            <FaExternalLinkAlt />
                            Full Details
                        </button>
                        <button className="btn-close" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="maintenance-modal-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading record details...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p className="error-message">{error}</p>
                            <button onClick={loadMaintenanceRecord} className="btn-retry">
                                Try Again
                            </button>
                        </div>
                    ) : maintenanceRecord ? (
                        <div className="content-grid">
                            {/* Equipment Information */}
                            <div className="info-card">
                                <div className="card-header">
                                    <FaTools className="card-icon" />
                                    <h3>Equipment Information</h3>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Equipment Name</label>
                                        <span>{maintenanceRecord.equipmentName || maintenanceRecord.equipmentInfo || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Equipment Model</label>
                                        <span>{maintenanceRecord.equipmentModel || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Serial Number</label>
                                        <span>{maintenanceRecord.equipmentSerialNumber || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Equipment Type</label>
                                        <span>{maintenanceRecord.equipmentType || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Site</label>
                                        <span>{maintenanceRecord.site || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Issue Details */}
                            <div className="info-card">
                                <div className="card-header">
                                    <FaInfoCircle className="card-icon" />
                                    <h3>Issue Details</h3>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Initial Issue Description</label>
                                        <span>{maintenanceRecord.initialIssueDescription}</span>
                                    </div>
                                    {maintenanceRecord.finalDescription && (
                                        <div className="info-row">
                                            <label>Final Description</label>
                                            <span>{maintenanceRecord.finalDescription}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="info-card">
                                <div className="card-header">
                                    <FaCalendarAlt className="card-icon" />
                                    <h3>Timeline</h3>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Creation Date</label>
                                        <span>{formatDate(maintenanceRecord.creationDate)}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Expected Completion</label>
                                        <span>{formatDate(maintenanceRecord.expectedCompletionDate)}</span>
                                    </div>
                                    {maintenanceRecord.actualCompletionDate && (
                                        <div className="info-row">
                                            <label>Actual Completion</label>
                                            <span>{formatDate(maintenanceRecord.actualCompletionDate)}</span>
                                        </div>
                                    )}
                                    <div className="info-row">
                                        <label>Duration</label>
                                        <span>{maintenanceRecord.durationInDays || 0} days</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Status */}
                            <div className="info-card">
                                <div className="card-header">
                                    <FaUser className="card-icon" />
                                    <h3>Current Status</h3>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Current Responsible Person</label>
                                        <span>{maintenanceRecord.currentResponsiblePerson || 'Not assigned'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Contact Phone</label>
                                        <span>{maintenanceRecord.currentResponsiblePhone || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Contact Email</label>
                                        <span>{maintenanceRecord.currentResponsibleEmail || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Total Steps</label>
                                        <span>{maintenanceRecord.totalSteps || 0}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Completed Steps</label>
                                        <span>{maintenanceRecord.completedSteps || 0}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Active Steps</label>
                                        <span>{maintenanceRecord.activeSteps || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="info-card">
                                <div className="card-header">
                                    <FaDollarSign className="card-icon" />
                                    <h3>Financial Information</h3>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Total Cost</label>
                                        <span className="cost-value">{formatCurrency(maintenanceRecord.totalCost)}</span>
                                    </div>
                                    {maintenanceRecord.isOverdue && (
                                        <div className="info-row">
                                            <label>Status</label>
                                            <span className="overdue-status">Overdue</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="maintenance-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="btn-primary" onClick={handleViewFullDetails}>
                        <FaExternalLinkAlt />
                        View Full Details & Steps
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceRecordViewModal;