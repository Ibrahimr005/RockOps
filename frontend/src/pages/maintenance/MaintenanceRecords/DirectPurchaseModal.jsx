import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaShoppingCart } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService.js';
import { siteService } from '../../../services/siteService.js';
import { merchantService } from '../../../services/merchant/merchantService';
import maintenanceService from '../../../services/maintenanceService';
import { authService } from '../../../services/authService.js';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './DirectPurchaseModal.scss';

const DirectPurchaseModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        siteId: '',
        equipmentId: '',
        merchantId: '',
        responsibleUserId: '',
        sparePart: '',
        expectedPartsCost: '',
        expectedTransportationCost: '',
        description: ''
    });

    const [equipmentList, setEquipmentList] = useState([]);
    const [siteList, setSiteList] = useState([]);
    const [merchantList, setMerchantList] = useState([]);
    const [maintenanceUsers, setMaintenanceUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadEquipment();
            loadSites();
            loadMerchants();
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

    useEffect(() => {
        // Reset form when modal is opened
        if (isOpen && currentUser) {
            setFormData({
                siteId: '',
                equipmentId: '',
                merchantId: '',
                responsibleUserId: currentUser.id || '',
                sparePart: '',
                expectedPartsCost: '',
                expectedTransportationCost: '',
                description: ''
            });
            setErrors({});
        }
    }, [isOpen, currentUser]);

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

    const loadMerchants = async () => {
        try {
            const response = await merchantService.getAllMerchants();
            setMerchantList(response.data || []);
        } catch (error) {
            console.error('Error loading merchants:', error);
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

        if (!formData.merchantId) {
            newErrors.merchantId = 'Merchant is required';
        }

        // responsibleUserId is optional - defaults to current user on backend

        if (!formData.sparePart || !formData.sparePart.trim()) {
            newErrors.sparePart = 'Spare part name is required';
        }

        if (!formData.expectedPartsCost) {
            newErrors.expectedPartsCost = 'Expected parts cost is required';
        } else if (isNaN(formData.expectedPartsCost) || parseFloat(formData.expectedPartsCost) < 0) {
            newErrors.expectedPartsCost = 'Cost must be a non-negative number';
        }

        if (!formData.expectedTransportationCost) {
            newErrors.expectedTransportationCost = 'Expected transportation cost is required';
        } else if (isNaN(formData.expectedTransportationCost) || parseFloat(formData.expectedTransportationCost) < 0) {
            newErrors.expectedTransportationCost = 'Cost must be a non-negative number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            const submitData = {
                equipmentId: formData.equipmentId,
                merchantId: formData.merchantId,
                responsibleUserId: formData.responsibleUserId,
                sparePart: formData.sparePart.trim(),
                expectedPartsCost: parseFloat(formData.expectedPartsCost),
                expectedTransportationCost: parseFloat(formData.expectedTransportationCost),
                description: formData.description || null
            };
            onSubmit(submitData);
        }
    };

    const getSelectedEquipment = () => {
        return equipmentList.find(eq => eq.id === formData.equipmentId);
    };

    const getTotalExpectedCost = () => {
        const partsCost = parseFloat(formData.expectedPartsCost) || 0;
        const transportCost = parseFloat(formData.expectedTransportationCost) || 0;
        return partsCost + transportCost;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg direct-purchase-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaShoppingCart />
                        New Direct Purchase Ticket
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="direct-purchase-form" id="direct-purchase-form">
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
                            <h3>Spare Part Details</h3>
                            <div className="form-group">
                                <label htmlFor="sparePart">Spare Part Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="sparePart"
                                    name="sparePart"
                                    value={formData.sparePart}
                                    onChange={handleInputChange}
                                    placeholder="Enter spare part name..."
                                    maxLength={255}
                                    className={errors.sparePart ? 'error' : ''}
                                />
                                {errors.sparePart && <span className="error-message">{errors.sparePart}</span>}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Merchant & Assignment</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="merchantId">Merchant <span className="required">*</span></label>
                                    <select
                                        id="merchantId"
                                        name="merchantId"
                                        value={formData.merchantId}
                                        onChange={handleInputChange}
                                        className={errors.merchantId ? 'error' : ''}
                                    >
                                        <option value="">Select Merchant</option>
                                        {merchantList.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.merchantId && <span className="error-message">{errors.merchantId}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="responsibleUserId">Assign To <span className="required">*</span></label>
                                    <select
                                        id="responsibleUserId"
                                        name="responsibleUserId"
                                        value={formData.responsibleUserId}
                                        onChange={handleInputChange}
                                        className={errors.responsibleUserId ? 'error' : ''}
                                    >
                                        <option value="">Select User</option>
                                        {maintenanceUsers.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName} - {user.role}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.responsibleUserId && <span className="error-message">{errors.responsibleUserId}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Cost Estimation</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="expectedPartsCost">Expected Parts Cost <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        id="expectedPartsCost"
                                        name="expectedPartsCost"
                                        value={formData.expectedPartsCost}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={errors.expectedPartsCost ? 'error' : ''}
                                    />
                                    {errors.expectedPartsCost && <span className="error-message">{errors.expectedPartsCost}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="expectedTransportationCost">Expected Transportation Cost <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        id="expectedTransportationCost"
                                        name="expectedTransportationCost"
                                        value={formData.expectedTransportationCost}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={errors.expectedTransportationCost ? 'error' : ''}
                                    />
                                    {errors.expectedTransportationCost && <span className="error-message">{errors.expectedTransportationCost}</span>}
                                </div>
                            </div>

                            {(formData.expectedPartsCost || formData.expectedTransportationCost) && (
                                <div className="total-cost-display">
                                    <strong>Total Expected Cost:</strong>
                                    <span className="total-amount">${getTotalExpectedCost().toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="form-section">
                            <h3>Additional Information</h3>
                            <div className="form-group">
                                <label htmlFor="description">Description (Optional)</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Enter any additional notes or details..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="direct-purchase-form">
                        <FaSave />
                        Create Ticket
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DirectPurchaseModal;
