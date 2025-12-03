import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTools, FaUser } from 'react-icons/fa';
import contactService from '../../../services/contactService.js';
import { equipmentService } from '../../../services/equipmentService.js';
import { siteService } from '../../../services/siteService.js';
import maintenanceService from '../../../services/maintenanceService.js';
import { authService } from '../../../services/authService.js';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './MaintenanceRecordModal.scss';

const MaintenanceRecordModal = ({ isOpen, onClose, onSubmit, editingRecord }) => {
    const [formData, setFormData] = useState({
        siteId: '',
        equipmentId: '',
        issueDate: '',
        sparePartName: '',
        initialIssueDescription: '',
        expectedCompletionDate: '',
        estimatedCost: '',
        responsibleUserId: ''
    });

    const [equipmentList, setEquipmentList] = useState([]);
    const [siteList, setSiteList] = useState([]);
    const [maintenanceUsers, setMaintenanceUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadEquipment();
            loadSites();
            loadMaintenanceUsers();
            loadCurrentUser();
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll when modal is closed
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const response = await equipmentService.getAllEquipment();
            setEquipmentList(response.data || []);
        } catch (error) {
            console.error('Error loading equipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSites = async () => {
        try {
            const response = await siteService.getAllSites();
            setSiteList(response.data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        }
    };

    const loadMaintenanceUsers = async () => {
        try {
            const response = await maintenanceService.getMaintenanceTeamUsers();
            setMaintenanceUsers(response.data || []);
        } catch (error) {
            console.error('Error loading maintenance users:', error);
        }
    };

    const loadCurrentUser = async () => {
        try {
            const response = await authService.getCurrentUser();
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    };

    useEffect(() => {
        if (editingRecord) {
            // Get siteId from equipment if editing
            const equipment = equipmentList.find(eq => eq.id === editingRecord.equipmentId);
            const siteId = equipment?.siteId ? equipment.siteId : (equipment ? 'NONE' : '');

            setFormData({
                siteId: siteId,
                equipmentId: editingRecord.equipmentId || '',
                issueDate: editingRecord.issueDate ?
                    editingRecord.issueDate.split('T')[0] : '',
                sparePartName: editingRecord.sparePartName || '',
                initialIssueDescription: editingRecord.initialIssueDescription || '',
                expectedCompletionDate: editingRecord.expectedCompletionDate ?
                    editingRecord.expectedCompletionDate.split('T')[0] : '',
                estimatedCost: editingRecord.totalCost || editingRecord.estimatedCost || '',
                responsibleUserId: editingRecord.responsibleUserId || ''
            });
        } else if (currentUser) {
            setFormData({
                siteId: '',
                equipmentId: '',
                issueDate: new Date().toISOString().split('T')[0],
                sparePartName: '',
                initialIssueDescription: '',
                expectedCompletionDate: '',
                estimatedCost: '',
                responsibleUserId: currentUser.id || ''
            });
        }
        setErrors({});
    }, [editingRecord, isOpen, currentUser, equipmentList]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // If site changes, clear equipment selection
        if (name === 'siteId') {
            setFormData(prev => ({
                ...prev,
                siteId: value,
                equipmentId: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Filter equipment based on selected site
    const getFilteredEquipment = () => {
        if (!formData.siteId) {
            return [];
        }

        if (formData.siteId === 'NONE') {
            // Show equipment with no site assigned
            return equipmentList.filter(eq =>
                !eq.siteId || eq.siteId === null || eq.siteId === ''
            );
        }

        // Show equipment from selected site
        return equipmentList.filter(eq => eq.siteId === formData.siteId);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.equipmentId) {
            newErrors.equipmentId = 'Equipment is required';
        }

        if (!formData.issueDate) {
            newErrors.issueDate = 'Issue date is required';
        }

        if (!formData.sparePartName || !formData.sparePartName.trim()) {
            newErrors.sparePartName = 'Spare part name / item to maintain is required';
        }

        if (!formData.initialIssueDescription.trim()) {
            newErrors.initialIssueDescription = 'Issue description is required';
        }

        if (!formData.expectedCompletionDate) {
            newErrors.expectedCompletionDate = 'Expected completion date is required';
        }

        // Validate expected completion date >= issue date
        if (formData.issueDate && formData.expectedCompletionDate) {
            const issueDate = new Date(formData.issueDate);
            const expectedDate = new Date(formData.expectedCompletionDate);
            if (expectedDate < issueDate) {
                newErrors.expectedCompletionDate = 'Expected completion date must be on or after the issue date';
            }
        }

        if (formData.estimatedCost && isNaN(formData.estimatedCost)) {
            newErrors.estimatedCost = 'Cost must be a valid number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            const submitData = {
                ...formData,
                issueDate: formData.issueDate + 'T00:00:00',
                expectedCompletionDate: formData.expectedCompletionDate + 'T17:00:00',
                totalCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
                estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0
            };
            console.log('Submitting maintenance record:', submitData);
            onSubmit(submitData);
        }
    };

    const getSelectedEquipment = () => {
        return equipmentList.find(eq => eq.id === formData.equipmentId);
    };

    const formatNumberWithCommas = (number) => {
        if (number === undefined || number === null || number === '') return '';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaTools />
                        {editingRecord ? 'Edit Maintenance Record' : 'New Maintenance Record'}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className="modal-body">

                <form onSubmit={handleSubmit} className="maintenance-record-form" id="maintenance-record-form">
                    <div className="form-section">
                        <h3>Equipment Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="siteId">Site (for filtering)</label>
                                <select
                                    id="siteId"
                                    name="siteId"
                                    value={formData.siteId}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Site First</option>
                                    {siteList.map(site => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                    <option value="NONE">None (Equipment without site)</option>
                                </select>
                                <span className="field-hint">
                                    Select a site to filter equipment, or "None" for equipment without a site
                                </span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="equipmentId">Equipment <span className="required">*</span></label>
                                <select
                                    id="equipmentId"
                                    name="equipmentId"
                                    value={formData.equipmentId}
                                    onChange={handleInputChange}
                                    className={errors.equipmentId ? 'error' : ''}
                                    disabled={!formData.siteId || loading}
                                >
                                    <option value="">
                                        {!formData.siteId ? 'Select Site First' : 'Select Equipment'}
                                    </option>
                                    {getFilteredEquipment().map(equipment => (
                                        <option key={equipment.id} value={equipment.id}>
                                            {equipment.name} - {equipment.model}
                                        </option>
                                    ))}
                                </select>
                                {errors.equipmentId && <span className="error-message">{errors.equipmentId}</span>}
                                {!formData.siteId && <span className="field-hint">Please select a site first</span>}
                            </div>
                        </div>

                        {formData.equipmentId && (
                            <div className="equipment-details">
                                <div className="equipment-info">
                                    <strong>Selected Equipment:</strong>
                                    <div>{getSelectedEquipment()?.name}</div>
                                    <div className="equipment-subtitle">
                                        {getSelectedEquipment()?.model} • {getSelectedEquipment()?.type?.name}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h3>Issue Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="issueDate">Issue Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    id="issueDate"
                                    name="issueDate"
                                    value={formData.issueDate}
                                    onChange={handleInputChange}
                                    placeholder="dd-mm-yyyy"
                                    className={errors.issueDate ? 'error' : ''}
                                />
                                {errors.issueDate && <span className="error-message">{errors.issueDate}</span>}
                            </div>

                            {editingRecord && editingRecord.creationDate && (
                                <div className="form-group">
                                    <label>Created On</label>
                                    <input
                                        type="text"
                                        value={new Date(editingRecord.creationDate).toLocaleString()}
                                        readOnly
                                        className="readonly-field"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="sparePartName">Spare Part Name / Item to Maintain <span className="required">*</span></label>
                            <input
                                type="text"
                                id="sparePartName"
                                name="sparePartName"
                                value={formData.sparePartName}
                                onChange={handleInputChange}
                                placeholder="Enter the spare part or item that needs maintenance..."
                                maxLength={255}
                                className={errors.sparePartName ? 'error' : ''}
                            />
                            {errors.sparePartName && <span className="error-message">{errors.sparePartName}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="initialIssueDescription">Issue Description <span className="required">*</span></label>
                            <textarea
                                id="initialIssueDescription"
                                name="initialIssueDescription"
                                value={formData.initialIssueDescription}
                                onChange={handleInputChange}
                                placeholder="Describe the issue or maintenance requirement..."
                                rows={4}
                                className={errors.initialIssueDescription ? 'error' : ''}
                            />
                            {errors.initialIssueDescription && <span className="error-message">{errors.initialIssueDescription}</span>}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Schedule & Cost</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="expectedCompletionDate">Expected Completion Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    id="expectedCompletionDate"
                                    name="expectedCompletionDate"
                                    value={formData.expectedCompletionDate}
                                    onChange={handleInputChange}
                                    placeholder="dd-mm-yyyy"
                                    className={errors.expectedCompletionDate ? 'error' : ''}
                                />
                                {errors.expectedCompletionDate && <span className="error-message">{errors.expectedCompletionDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="estimatedCost">Estimated Cost</label>
                                <input
                                    type="number"
                                    id="estimatedCost"
                                    name="estimatedCost"
                                    value={formData.estimatedCost}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className={errors.estimatedCost ? 'error' : ''}
                                />
                                {errors.estimatedCost && <span className="error-message">{errors.estimatedCost}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Responsible Person</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="responsibleUserId">Assign To</label>
                                <select
                                    id="responsibleUserId"
                                    name="responsibleUserId"
                                    value={formData.responsibleUserId}
                                    onChange={handleInputChange}
                                    className={errors.responsibleUserId ? 'error' : ''}
                                >
                                    <option value="">Select User (Optional)</option>
                                    {maintenanceUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName} - {user.role}
                                        </option>
                                    ))}
                                </select>
                                {errors.responsibleUserId && <span className="error-message">{errors.responsibleUserId}</span>}
                                <span className="field-hint">
                                    Assign this maintenance record to a user (Admin, Maintenance Manager, or Maintenance Employee)
                                </span>
                            </div>
                        </div>
                    </div>

                </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="maintenance-record-form">
                        <FaSave />
                        {editingRecord ? 'Update Record' : 'Create Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceRecordModal; 