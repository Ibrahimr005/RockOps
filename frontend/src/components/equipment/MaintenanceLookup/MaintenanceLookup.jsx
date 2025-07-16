import React, { useState, useEffect } from 'react';
import { equipmentService } from '../../../services/equipmentService';
import { employeeService } from '../../../services/employeeService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import './MaintenanceLookup.scss';

const MaintenanceLookup = ({
    equipmentId,
    onMaintenanceSelected,
    onCancel,
    selectedMaintenanceId = null
}) => {
    const [searchCriteria, setSearchCriteria] = useState({
        startDate: '',
        endDate: '',
        technicianId: '',
        maintenanceTypeId: '',
        status: '',
        description: ''
    });
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    useEffect(() => {
        fetchInitialData();
        fetchMaintenanceForLinking();
    }, [equipmentId]);

    const fetchInitialData = async () => {
        try {
            const [technicianResponse, maintenanceTypeResponse] = await Promise.all([
                employeeService.getTechnicians(),
                maintenanceTypeService.getAllMaintenanceTypes()
            ]);
            setTechnicians(technicianResponse.data);
            setMaintenanceTypes(maintenanceTypeResponse.data);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchMaintenanceForLinking = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await equipmentService.getMaintenanceRecordsForLinking(equipmentId);
            setMaintenanceRecords(response.data);
        } catch (error) {
            setError('Failed to fetch maintenance records');
            console.error('Error fetching maintenance records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await equipmentService.searchMaintenanceRecords(equipmentId, searchCriteria);
            setMaintenanceRecords(response.data);
        } catch (error) {
            setError('Failed to search maintenance records');
            console.error('Error searching maintenance records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCriteriaChange = (field, value) => {
        setSearchCriteria(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleMaintenanceSelect = (maintenance) => {
        onMaintenanceSelected(maintenance);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTechnicianName = (technicianId) => {
        const technician = technicians.find(t => t.id === technicianId);
        return technician ? technician.fullName : 'Unknown';
    };

    const getMaintenanceTypeName = (maintenanceTypeId) => {
        const maintenanceType = maintenanceTypes.find(mt => mt.id === maintenanceTypeId);
        return maintenanceType ? maintenanceType.name : 'Unknown';
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'status-completed';
            case 'in_progress': return 'status-in-progress';
            case 'pending': return 'status-pending';
            case 'canceled': return 'status-canceled';
            default: return 'status-default';
        }
    };

    return (
        <div className="maintenance-lookup">
            <div className="maintenance-lookup-header">
                <h3>Select Maintenance Record</h3>
                <p>Choose an existing maintenance record to link with this transaction</p>
            </div>

            <div className="search-section">
                <div className="search-filters">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                value={searchCriteria.startDate}
                                onChange={(e) => handleCriteriaChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                value={searchCriteria.endDate}
                                onChange={(e) => handleCriteriaChange('endDate', e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Technician</label>
                            <select
                                value={searchCriteria.technicianId}
                                onChange={(e) => handleCriteriaChange('technicianId', e.target.value)}
                            >
                                <option value="">All Technicians</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filter-actions">
                        <button
                            type="button"
                            className="toggle-filters-btn"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        >
                            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                        </button>
                        <button
                            type="button"
                            className="search-btn"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {showAdvancedFilters && (
                        <div className="advanced-filters">
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Maintenance Type</label>
                                    <select
                                        value={searchCriteria.maintenanceTypeId}
                                        onChange={(e) => handleCriteriaChange('maintenanceTypeId', e.target.value)}
                                    >
                                        <option value="">All Types</option>
                                        {maintenanceTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Status</label>
                                    <select
                                        value={searchCriteria.status}
                                        onChange={(e) => handleCriteriaChange('status', e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELED">Canceled</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Description Contains</label>
                                    <input
                                        type="text"
                                        value={searchCriteria.description}
                                        onChange={(e) => handleCriteriaChange('description', e.target.value)}
                                        placeholder="Search in descriptions..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <div className="maintenance-list">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <span>Loading maintenance records...</span>
                    </div>
                ) : maintenanceRecords.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M16 16l-4-4-4 4" />
                                <path d="M12 8v8" />
                            </svg>
                        </div>
                        <h4>No maintenance records found</h4>
                        <p>Try adjusting your search criteria or create a new maintenance record.</p>
                    </div>
                ) : (
                    <div className="maintenance-records">
                        {maintenanceRecords.map(maintenance => (
                            <div
                                key={maintenance.id}
                                className={`maintenance-record ${selectedMaintenanceId === maintenance.id ? 'selected' : ''}`}
                                onClick={() => handleMaintenanceSelect(maintenance)}
                            >
                                <div className="maintenance-record-header">
                                    <div className="maintenance-info">
                                        <h4>{getMaintenanceTypeName(maintenance.maintenanceTypeId)}</h4>
                                        <span className={`status-badge ${getStatusBadgeClass(maintenance.status)}`}>
                                            {maintenance.status}
                                        </span>
                                    </div>
                                    <div className="maintenance-date">
                                        {formatDate(maintenance.maintenanceDate)}
                                    </div>
                                </div>
                                <div className="maintenance-record-details">
                                    <div className="detail-item">
                                        <span className="label">Technician:</span>
                                        <span className="value">{getTechnicianName(maintenance.technicianId)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Description:</span>
                                        <span className="value">{maintenance.description || 'No description'}</span>
                                    </div>
                                    {maintenance.linkedTransactionCount > 0 && (
                                        <div className="detail-item">
                                            <span className="label">Linked Transactions:</span>
                                            <span className="value">{maintenance.linkedTransactionCount}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="maintenance-record-footer">
                                    <span className="created-date">
                                        Created: {formatDateTime(maintenance.createdAt)}
                                    </span>
                                    {selectedMaintenanceId === maintenance.id && (
                                        <div className="selected-indicator">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 12l2 2 4-4" />
                                                <circle cx="12" cy="12" r="10" />
                                            </svg>
                                            <span>Selected</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="maintenance-lookup-actions">
                <button
                    type="button"
                    className="cancel-btn"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="confirm-btn"
                    onClick={() => {
                        const selectedMaintenance = maintenanceRecords.find(m => m.id === selectedMaintenanceId);
                        if (selectedMaintenance) {
                            onMaintenanceSelected(selectedMaintenance);
                        }
                    }}
                    disabled={!selectedMaintenanceId}
                >
                    Link Selected Maintenance
                </button>
            </div>
        </div>
    );
};

export default MaintenanceLookup; 