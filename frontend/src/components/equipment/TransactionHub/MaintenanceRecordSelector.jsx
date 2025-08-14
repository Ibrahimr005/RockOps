import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, User, AlertCircle, CheckCircle } from 'lucide-react';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { employeeService } from '../../../services/hr/employeeService';

const MaintenanceRecordSelector = ({
    equipmentId,
    transactionItems = [],
    selectedMaintenanceId,
    onMaintenanceSelect,
    maintenanceOption,
    onMaintenanceOptionChange,
    newMaintenanceData,
    onNewMaintenanceDataChange
}) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [error, setError] = useState('');

    // New maintenance creation form state
    const [newMaintenance, setNewMaintenance] = useState({
        technicianId: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        maintenanceTypeId: '',
        description: '',
        status: 'IN_PROGRESS'
    });

    useEffect(() => {
        fetchMaintenanceRecords();
        fetchMaintenanceTypes();
        fetchTechnicians();
    }, [equipmentId]);

    useEffect(() => {
        // Update parent with new maintenance data
        if (onNewMaintenanceDataChange) {
            onNewMaintenanceDataChange(newMaintenance);
        }
    }, [newMaintenance, onNewMaintenanceDataChange]);

    const fetchMaintenanceRecords = async () => {
        try {
            setLoading(true);
            const response = await inSiteMaintenanceService.getByEquipmentId(equipmentId);
            const records = response.data || [];
            
            // Filter for active/recent maintenance records
            const activeRecords = records.filter(record => 
                record.status === 'IN_PROGRESS' || 
                record.status === 'PENDING' ||
                (record.status === 'COMPLETED' && isRecent(record.maintenanceDate))
            );
            
            setMaintenanceRecords(activeRecords);
        } catch (error) {
            console.error('Failed to fetch maintenance records:', error);
            setError('Failed to load maintenance records');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaintenanceTypes = async () => {
        try {
            const response = await maintenanceTypeService.getAllMaintenanceTypes();
            setMaintenanceTypes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch maintenance types:', error);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const response = await employeeService.getTechnicians();
            setTechnicians(response.data || []);
        } catch (error) {
            console.error('Failed to fetch technicians:', error);
        }
    };

    const isRecent = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7; // Consider records from last 7 days as recent
    };

    const filteredRecords = maintenanceRecords.filter(record => {
        if (!searchTerm) return true;
        return (
            record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.maintenanceType?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.technician?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const handleMaintenanceOptionChange = (option) => {
        onMaintenanceOptionChange(option);
        if (option !== 'existing') {
            onMaintenanceSelect(null);
        }
        if (option !== 'create') {
            onNewMaintenanceDataChange(null);
        }
    };

    const handleNewMaintenanceChange = (field, value) => {
        setNewMaintenance(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const generateMaintenanceDescription = () => {
        if (transactionItems.length === 0) return '';
        
        const itemNames = transactionItems
            .map(item => item.itemType?.name)
            .filter(Boolean)
            .slice(0, 3);
        
        let description = `Maintenance using: ${itemNames.join(', ')}`;
        if (transactionItems.length > 3) {
            description += ` and ${transactionItems.length - 3} more items`;
        }
        
        return description;
    };

    const renderMaintenanceOption = (option, title, description, IconComponent) => (
        <label className={`maintenance-selector-option ${maintenanceOption === option ? 'selected' : ''}`}>
            <input
                type="radio"
                value={option}
                checked={maintenanceOption === option}
                onChange={(e) => handleMaintenanceOptionChange(e.target.value)}
            />
            <div className="maintenance-selector-option-card">
                <IconComponent className="maintenance-selector-option-icon" />
                <div className="maintenance-selector-option-info">
                    <h4>{title}</h4>
                    <p>{description}</p>
                </div>
            </div>
        </label>
    );

    return (
        <div className="maintenance-selector-container">
            <div className="maintenance-selector-header">
                <h4>Maintenance Record Linking</h4>
                <p>How would you like to handle the maintenance record for these items?</p>
            </div>

            <div className="maintenance-selector-options">
                {renderMaintenanceOption(
                    'none',
                    'No Maintenance Record',
                    'Items are not related to any specific maintenance activity',
                    AlertCircle
                )}

                {renderMaintenanceOption(
                    'existing',
                    'Link to Existing Record',
                    'Connect items to an existing maintenance record',
                    CheckCircle
                )}

                {renderMaintenanceOption(
                    'create',
                    'Create New Record',
                    'Create a new maintenance record for these items',
                    Plus
                )}
            </div>

            {/* Existing Maintenance Records Selection */}
            {maintenanceOption === 'existing' && (
                <div className="maintenance-selector-existing">
                    <div className="maintenance-selector-search">
                        <div className="maintenance-selector-search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search maintenance records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="maintenance-selector-loading">
                            Loading maintenance records...
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="maintenance-selector-empty">
                            <AlertCircle className="maintenance-selector-empty-icon" />
                            <h4>No Suitable Records Found</h4>
                            <p>No active or recent maintenance records found for this equipment.</p>
                            <button
                                className="maintenance-selector-empty-action"
                                onClick={() => handleMaintenanceOptionChange('create')}
                            >
                                <Plus size={16} />
                                Create New Record Instead
                            </button>
                        </div>
                    ) : (
                        <div className="maintenance-selector-records">
                            {filteredRecords.map(record => (
                                <div
                                    key={record.id}
                                    className={`maintenance-selector-record ${
                                        selectedMaintenanceId === record.id ? 'selected' : ''
                                    }`}
                                    onClick={() => onMaintenanceSelect(record.id)}
                                >
                                    <div className="maintenance-selector-record-header">
                                        <div className="maintenance-selector-record-info">
                                            <h4>{record.description || 'No description'}</h4>
                                            <span className="maintenance-selector-record-type">
                                                {record.maintenanceType?.name || 'Unknown Type'}
                                            </span>
                                        </div>
                                        <span className={`maintenance-selector-record-status ${record.status?.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                    
                                    <div className="maintenance-selector-record-details">
                                        <div className="maintenance-selector-record-meta">
                                            <span className="maintenance-selector-record-technician">
                                                <User size={14} />
                                                {record.technician?.fullName || 'Unknown Technician'}
                                            </span>
                                            <span className="maintenance-selector-record-date">
                                                <Calendar size={14} />
                                                {new Date(record.maintenanceDate).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* New Maintenance Record Creation */}
            {maintenanceOption === 'create' && (
                <div className="maintenance-selector-create">
                    <div className="maintenance-selector-create-header">
                        <h4>Create New Maintenance Record</h4>
                        <p>A new maintenance record will be created with the following details:</p>
                    </div>

                    <div className="maintenance-selector-create-form">
                        <div className="maintenance-selector-form-group">
                            <label>Technician *</label>
                            <select
                                value={newMaintenance.technicianId}
                                onChange={(e) => handleNewMaintenanceChange('technicianId', e.target.value)}
                                className="maintenance-selector-form-select"
                                required
                            >
                                <option value="">Select technician...</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.fullName} - {tech.jobPosition?.title || 'Technician'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="maintenance-selector-form-group">
                            <label>Maintenance Type *</label>
                            <select
                                value={newMaintenance.maintenanceTypeId}
                                onChange={(e) => handleNewMaintenanceChange('maintenanceTypeId', e.target.value)}
                                className="maintenance-selector-form-select"
                                required
                            >
                                <option value="">Select maintenance type...</option>
                                {maintenanceTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="maintenance-selector-form-group">
                            <label>Maintenance Date *</label>
                            <input
                                type="date"
                                value={newMaintenance.maintenanceDate}
                                onChange={(e) => handleNewMaintenanceChange('maintenanceDate', e.target.value)}
                                className="maintenance-selector-form-input"
                                required
                            />
                        </div>

                        <div className="maintenance-selector-form-group">
                            <label>Status</label>
                            <select
                                value={newMaintenance.status}
                                onChange={(e) => handleNewMaintenanceChange('status', e.target.value)}
                                className="maintenance-selector-form-select"
                            >
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>

                        <div className="maintenance-selector-form-group">
                            <label>Description</label>
                            <textarea
                                value={newMaintenance.description}
                                onChange={(e) => handleNewMaintenanceChange('description', e.target.value)}
                                placeholder={generateMaintenanceDescription()}
                                className="maintenance-selector-form-textarea"
                                rows={3}
                            />
                            {!newMaintenance.description && (
                                <button
                                    type="button"
                                    className="maintenance-selector-auto-fill"
                                    onClick={() => handleNewMaintenanceChange('description', generateMaintenanceDescription())}
                                >
                                    Use auto-generated description
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="maintenance-selector-create-preview">
                        <h5>Items to be linked:</h5>
                        <div className="maintenance-selector-items-preview">
                            {transactionItems.map((item, index) => (
                                <div key={index} className="maintenance-selector-item-preview">
                                    <span className="maintenance-selector-item-name">
                                        {item.itemType?.name || 'Unknown Item'}
                                    </span>
                                    <span className="maintenance-selector-item-quantity">
                                        {item.quantity} {item.itemType?.unit || 'units'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="maintenance-selector-error">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default MaintenanceRecordSelector; 