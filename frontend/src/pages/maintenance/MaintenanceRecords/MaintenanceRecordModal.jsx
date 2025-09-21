import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTools, FaUser } from 'react-icons/fa';
import contactService from '../../../services/contactService.js';
import { equipmentService } from '../../../services/equipmentService.js';
import './MaintenanceRecordModal.scss';

const MaintenanceRecordModal = ({ isOpen, onClose, onSubmit, editingRecord }) => {
    const [formData, setFormData] = useState({
        equipmentId: '',
        initialIssueDescription: '',
        expectedCompletionDate: '',
        estimatedCost: ''
    });

    const [equipmentList, setEquipmentList] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadEquipment();
        }
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

    useEffect(() => {
        if (editingRecord) {
            setFormData({
                equipmentId: editingRecord.equipmentId || '',
                initialIssueDescription: editingRecord.initialIssueDescription || '',
                expectedCompletionDate: editingRecord.expectedCompletionDate ?
                    editingRecord.expectedCompletionDate.split('T')[0] : '',
                estimatedCost: editingRecord.totalCost || editingRecord.estimatedCost || '' // Fix this line
            });
        } else {
            setFormData({
                equipmentId: '',
                initialIssueDescription: '',
                expectedCompletionDate: '',
                estimatedCost: ''
            });
        }
        setErrors({});
    }, [editingRecord, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.equipmentId) {
            newErrors.equipmentId = 'Equipment is required';
        }

        if (!formData.initialIssueDescription.trim()) {
            newErrors.initialIssueDescription = 'Issue description is required';
        }

        if (!formData.expectedCompletionDate) {
            newErrors.expectedCompletionDate = 'Expected completion date is required';
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
                expectedCompletionDate: formData.expectedCompletionDate + 'T17:00:00',
                totalCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0, // Map to totalCost
                estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0 // Keep both for compatibility
            };
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
        <div className="maintenance-record-modal-overlay" onClick={onClose}>
            <div className="maintenance-record-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FaTools />
                        {editingRecord ? 'Edit Maintenance Record' : 'New Maintenance Record'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="maintenance-record-form">
                    <div className="form-section">
                        <h3>Equipment Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="equipmentId">Equipment *</label>
                                <select
                                    id="equipmentId"
                                    name="equipmentId"
                                    value={formData.equipmentId}
                                    onChange={handleInputChange}
                                    className={errors.equipmentId ? 'error' : ''}
                                    disabled={loading}
                                >
                                    <option value="">Select Equipment</option>
                                    {equipmentList.map(equipment => (
                                        <option key={equipment.id} value={equipment.id}>
                                            {equipment.name} - {equipment.model}
                                        </option>
                                    ))}
                                </select>
                                {errors.equipmentId && <span className="error-message">{errors.equipmentId}</span>}
                                {loading && <span className="loading-message">Loading equipment...</span>}
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
                    </div>

                    <div className="form-section">
                        <h3>Issue Details</h3>
                        <div className="form-group">
                            <label htmlFor="initialIssueDescription">Issue Description *</label>
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
                                <label htmlFor="expectedCompletionDate">Expected Completion Date *</label>
                                <input
                                    type="date"
                                    id="expectedCompletionDate"
                                    name="expectedCompletionDate"
                                    value={formData.expectedCompletionDate}
                                    onChange={handleInputChange}
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
                                    placeholder="0.00"  // Remove $ from here
                                    step="0.01"
                                    min="0"
                                    className={errors.estimatedCost ? 'error' : ''}
                                />
                                {errors.estimatedCost && <span className="error-message">{errors.estimatedCost}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <FaSave />
                            {editingRecord ? 'Update Record' : 'Create Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaintenanceRecordModal; 