import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaShoppingCart } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService';
import { authService } from '../../../services/authService';
import { siteService } from '../../../services/siteService';
import maintenanceService from '../../../services/maintenanceService';

const Step1CreationForm = ({ ticketData, onSave, onComplete, isLoading }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        siteId: '',
        equipmentId: '',
        responsibleUserId: '',
        expectedCost: '',
        expectedEndDate: '',
        items: []
    });

    const [siteList, setSiteList] = useState([]);
    const [allEquipment, setAllEquipment] = useState([]);
    const [filteredEquipment, setFilteredEquipment] = useState([]);
    const [maintenanceUsers, setMaintenanceUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadSites();
        loadEquipment();
        loadMaintenanceUsers();
        loadCurrentUser();
    }, []);

    useEffect(() => {
        // If ticketData exists (editing), populate form
        if (ticketData) {
            setFormData({
                title: ticketData.title || '',
                description: ticketData.description || '',
                siteId: ticketData.siteId || '',
                equipmentId: ticketData.equipmentId || '',
                responsibleUserId: ticketData.responsibleUserId || '',
                expectedCost: ticketData.expectedCost || '',
                expectedEndDate: ticketData.expectedEndDate || '',
                items: ticketData.items || []
            });
        }
    }, [ticketData]);

    useEffect(() => {
        // Filter equipment when site changes
        if (formData.siteId === 'none') {
            // Show equipment not assigned to any site
            setFilteredEquipment(allEquipment.filter(eq => !eq.siteId || eq.siteId === null));
        } else if (formData.siteId) {
            // Show equipment for selected site
            setFilteredEquipment(allEquipment.filter(eq => eq.siteId === formData.siteId));
        } else {
            // Show all equipment
            setFilteredEquipment(allEquipment);
        }
    }, [formData.siteId, allEquipment]);

    useEffect(() => {
        // Auto-set responsible user to current user if not set
        if (currentUser && !formData.responsibleUserId) {
            setFormData(prev => ({
                ...prev,
                responsibleUserId: currentUser.id
            }));
        }
    }, [currentUser, formData.responsibleUserId]);

    const loadSites = async () => {
        try {
            const response = await siteService.getAllSites();
            setSiteList(response.data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        }
    };

    const loadEquipment = async () => {
        try {
            const response = await equipmentService.getAllEquipment();
            setAllEquipment(response.data || []);
            setFilteredEquipment(response.data || []);
        } catch (error) {
            console.error('Error loading equipment:', error);
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

        let processedValue = value;
        if (name === 'expectedCost') {
            processedValue = value === '' ? '' : parseFloat(value) || '';
        } else if (name === 'siteId' && value) {
            // Clear equipment selection when site changes
            setFormData(prev => ({
                ...prev,
                equipmentId: '',
                [name]: value
            }));

            if (errors[name]) {
                setErrors(prev => ({
                    ...prev,
                    [name]: ''
                }));
            }
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];

        if (field === 'quantity') {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value === '' ? '' : parseInt(value) || ''
            };
        } else {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };
        }

        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const addNewItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { itemName: '', quantity: 1 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.title || !formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.description || !formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        if (!formData.equipmentId) {
            newErrors.equipmentId = 'Equipment is required';
        }
        if (formData.items.length === 0) {
            newErrors.items = 'At least one item is required';
        }

        // Validate each item
        formData.items.forEach((item, index) => {
            if (!item.itemName || !item.itemName.trim()) {
                newErrors[`item_${index}_name`] = 'Item name is required';
            }
            if (item.quantity <= 0) {
                newErrors[`item_${index}_qty`] = 'Quantity must be greater than 0';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (validate()) {
            onSave(formData);
        }
    };

    const handleComplete = async () => {
        if (validate()) {
            onComplete(formData);
        }
    };

    const getEquipmentDisplay = (eq) => {
        return `${eq.name} - ${eq.model} (${eq.serialNumber || 'N/A'})`;
    };

    return (
        <div className="step-form step1-form">
            <div className="form-grid">
                {/* Title */}
                <div className="form-group full-width">
                    <label className="required">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Brief title for this purchase"
                        className={errors.title ? 'error' : ''}
                    />
                    {errors.title && <span className="error-message">{errors.title}</span>}
                </div>

                {/* Description */}
                <div className="form-group full-width">
                    <label className="required">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Detailed description of what needs to be purchased"
                        rows="4"
                        className={errors.description ? 'error' : ''}
                    />
                    {errors.description && <span className="error-message">{errors.description}</span>}
                </div>

                {/* Site */}
                <div className="form-group">
                    <label>Site</label>
                    <select
                        name="siteId"
                        value={formData.siteId}
                        onChange={handleInputChange}
                        className={errors.siteId ? 'error' : ''}
                    >
                        <option value="">All sites...</option>
                        <option value="none">Equipment not assigned to a site</option>
                        {siteList.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name}
                            </option>
                        ))}
                    </select>
                    {errors.siteId && <span className="error-message">{errors.siteId}</span>}
                    <small className="field-hint">Filter equipment by site</small>
                </div>

                {/* Equipment */}
                <div className="form-group">
                    <label className="required">Equipment</label>
                    <select
                        name="equipmentId"
                        value={formData.equipmentId}
                        onChange={handleInputChange}
                        className={errors.equipmentId ? 'error' : ''}
                    >
                        <option value="">Select equipment...</option>
                        {filteredEquipment.map(eq => (
                            <option key={eq.id} value={eq.id}>
                                {getEquipmentDisplay(eq)}
                            </option>
                        ))}
                    </select>
                    {errors.equipmentId && <span className="error-message">{errors.equipmentId}</span>}
                    {filteredEquipment.length === 0 && formData.siteId && (
                        <small className="field-hint" style={{ color: 'var(--color-warning)' }}>
                            No equipment found for selected site
                        </small>
                    )}
                </div>

                {/* Responsible User */}
                <div className="form-group">
                    <label>Responsible Person</label>
                    <select
                        name="responsibleUserId"
                        value={formData.responsibleUserId}
                        onChange={handleInputChange}
                    >
                        <option value="">Select person...</option>
                        {maintenanceUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                            </option>
                        ))}
                    </select>
                    <small className="field-hint">Defaults to you if not selected</small>
                </div>

                {/* Expected Cost */}
                <div className="form-group">
                    <label>Expected Cost</label>
                    <input
                        type="number"
                        name="expectedCost"
                        value={formData.expectedCost === '' || formData.expectedCost === null ? '' : formData.expectedCost}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={errors.expectedCost ? 'error' : ''}
                        onWheel={(e) => e.target.blur()}
                    />
                    {errors.expectedCost && <span className="error-message">{errors.expectedCost}</span>}
                    <small className="field-hint">Optional - estimated total cost</small>
                </div>

                {/* Expected End Date */}
                <div className="form-group">
                    <label>Expected End Date</label>
                    <input
                        type="date"
                        name="expectedEndDate"
                        value={formData.expectedEndDate}
                        onChange={handleInputChange}
                        className={errors.expectedEndDate ? 'error' : ''}
                    />
                    {errors.expectedEndDate && <span className="error-message">{errors.expectedEndDate}</span>}
                    <small className="field-hint">Optional - target completion date</small>
                </div>
            </div>

            {/* Items Section */}
            <div className="items-section">
                <h4>Items to Purchase</h4>
                {errors.items && <span className="error-message">{errors.items}</span>}

                {formData.items.length === 0 ? (
                    /* Initial State - Show inline add form */
                    <div className="initial-item-form">
                        <p className="field-hint" style={{ marginBottom: '0.75rem' }}>Add your first item to get started</p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={addNewItem}
                        >
                            <FaPlus /> Add First Item
                        </button>
                    </div>
                ) : (
                    /* Show Items Table */
                    <>
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60%' }}>Item Name *</th>
                                    <th style={{ width: '25%' }}>Quantity *</th>
                                    <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                className={`cost-input ${errors[`item_${index}_name`] ? 'error' : ''}`}
                                                value={item.itemName}
                                                onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                placeholder="Enter item name"
                                            />
                                            {errors[`item_${index}_name`] && (
                                                <span className="error-message" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                                                    {errors[`item_${index}_name`]}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className={`cost-input ${errors[`item_${index}_qty`] ? 'error' : ''}`}
                                                value={item.quantity === '' || item.quantity === null ? '' : item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                placeholder="Qty"
                                                min="1"
                                                onWheel={(e) => e.target.blur()}
                                            />
                                            {errors[`item_${index}_qty`] && (
                                                <span className="error-message" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                                                    {errors[`item_${index}_qty`]}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="btn-icon btn-danger"
                                                onClick={() => removeItem(index)}
                                                title="Remove item"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Add More Items Button */}
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addNewItem}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 'var(--bold-font-weight)',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <FaPlus /> Add Another Item
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    Save Draft
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleComplete}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Complete Step 1'}
                </button>
            </div>
        </div>
    );
};

export default Step1CreationForm;
