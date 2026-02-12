import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaSave, FaTools, FaUser } from 'react-icons/fa';
import contactService from '../../../services/contactService.js';
import { equipmentService } from '../../../services/equipmentService.js';
import { siteService } from '../../../services/siteService.js';
import maintenanceService from '../../../services/maintenanceService.js';
import { authService } from '../../../services/authService.js';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './MaintenanceRecordModal.scss';

const MaintenanceRecordModal = ({ isOpen, onClose, onSubmit, editingRecord }) => {
    const { t } = useTranslation();
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
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
                estimatedCost: editingRecord.totalCost ? formatNumberWithCommas(editingRecord.totalCost) : (editingRecord.estimatedCost ? formatNumberWithCommas(editingRecord.estimatedCost) : ''),
                responsibleUserId: editingRecord.responsibleUserId || editingRecord.responsibleUser?.id || editingRecord.assignedUser?.id || editingRecord.userId || ''
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
        setIsFormDirty(true);
        const { name, value } = e.target;

        // If site changes, clear equipment selection
        if (name === 'siteId') {
            setFormData(prev => ({
                ...prev,
                siteId: value,
                equipmentId: ''
            }));
        } else if (name === 'estimatedCost') {
            // Remove existing commas to validate number
            const rawValue = value.replace(/,/g, '');

            // Allow numbers and one decimal point
            if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                // If it's a valid number part, format it with commas
                // We only format the integer part to avoid messing up typing decimals
                const parts = rawValue.split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                setFormData(prev => ({
                    ...prev,
                    [name]: parts.join('.')
                }));
            }
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
            return equipmentList;
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

        const costValue = formData.estimatedCost ? formData.estimatedCost.toString().replace(/,/g, '') : '';
        if (!costValue || costValue === '' || costValue === '0') {
            newErrors.estimatedCost = 'Estimated cost is required';
        } else if (isNaN(costValue)) {
            newErrors.estimatedCost = 'Cost must be a valid number';
        } else if (parseFloat(costValue) <= 0) {
            newErrors.estimatedCost = 'Cost must be greater than zero';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            const submitData = {
                ...formData,
                issueDate: formData.issueDate + 'T00:00:00',
                expectedCompletionDate: formData.expectedCompletionDate + 'T17:00:00',
                totalCost: formData.estimatedCost ? parseFloat(formData.estimatedCost.toString().replace(/,/g, '')) : 0,
                estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost.toString().replace(/,/g, '')) : 0
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
        <>
            <div className="modal-backdrop">
                <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            <FaTools />
                            {editingRecord ? 'Edit Maintenance Record' : 'New Maintenance Record'}
                        </div>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FaTimes />
                        </button>
                    </div>
                <div className="modal-body">
                    {editingRecord && editingRecord.status === 'REJECTED' && editingRecord.rejectionReason && (
                        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff5f5', border: '1px solid #fc8181', borderRadius: '4px', color: '#c53030' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Rejection Reason:</div>
                            {editingRecord.rejectionReason}
                        </div>
                    )}

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
                                        <option value="">All Sites</option>
                                        {siteList.map(site => (
                                            <option key={site.id} value={site.id}>
                                                {site.name}
                                            </option>
                                        ))}
                                        <option value="NONE">None (Equipment without site)</option>
                                    </select>
                                    <span className="field-hint">
                                        Filter equipment by site, or select "All Sites" to see everything
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
                                        disabled={loading}
                                    >
                                        <option value="">
                                            Select Equipment
                                        </option>
                                        {getFilteredEquipment().map(equipment => (
                                            <option key={equipment.id} value={equipment.id}>
                                                {equipment.name} - {equipment.model}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.equipmentId && <span className="error-message">{errors.equipmentId}</span>}
                                </div>
                            </div>

                            {formData.equipmentId && (
                                <div className="equipment-details">
                                    <div className="equipment-details-content">
                                        <div className="equipment-info">
                                            <div className="equipment-main-header">
                                                <strong>{getSelectedEquipment()?.name}</strong>
                                                <span className="model-badge">Model: {getSelectedEquipment()?.model}</span>
                                            </div>

                                            <div className="equipment-meta-grid">
                                                <div className="meta-item">
                                                    <span className="meta-label">Type</span>
                                                    <span className="meta-value">{getSelectedEquipment()?.typeName || getSelectedEquipment()?.type?.name || 'N/A'}</span>
                                                </div>

                                                <div className="meta-item">
                                                    <span className="meta-label">Brand</span>
                                                    <span className="meta-value">{getSelectedEquipment()?.brandName || getSelectedEquipment()?.brand?.name || 'N/A'}</span>
                                                </div>

                                                <div className="meta-item">
                                                    <span className="meta-label">Site</span>
                                                    <span className="meta-value">{getSelectedEquipment()?.siteName || getSelectedEquipment()?.site?.name || 'Unassigned'}</span>
                                                </div>

                                                <div className="meta-item">
                                                    <span className="meta-label">Main Driver</span>
                                                    <span className={`meta-value ${!getSelectedEquipment()?.mainDriverName ? 'empty' : ''}`}>
                                                        {getSelectedEquipment()?.mainDriverName || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="equipment-image-container">
                                            {getSelectedEquipment()?.imageUrl ? (
                                                <img
                                                    src={getSelectedEquipment().imageUrl}
                                                    alt={getSelectedEquipment().name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : null}
                                            <div className="no-image-placeholder" style={{ display: getSelectedEquipment()?.imageUrl ? 'none' : 'block' }}>
                                                No Image
                                            </div>
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
                                    <label htmlFor="estimatedCost">Estimated Cost / Budget Request <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="estimatedCost"
                                        name="estimatedCost"
                                        value={formData.estimatedCost}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className={errors.estimatedCost ? 'error' : ''}
                                        onFocus={(e) => {
                                            if (e.target.value === '0' || e.target.value === 0) {
                                                handleInputChange({ target: { name: 'estimatedCost', value: '' } });
                                            }
                                        }}
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
                                                {user.firstName} {user.lastName} - {t(`roles.${user.role}`, user.role)}
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
                    <button type="button" className="btn-cancel" onClick={handleCloseAttempt}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="maintenance-record-form">

                        {editingRecord ? 'Update Record' : 'Create Record'}
                    </button>
                </div>
            </div>
        </div>
        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        </>
    );
};

export default MaintenanceRecordModal; 