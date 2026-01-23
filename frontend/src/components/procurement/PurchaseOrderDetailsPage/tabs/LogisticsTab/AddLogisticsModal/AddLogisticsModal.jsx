import React, { useState, useEffect } from 'react';
import { FiX, FiTruck, FiDollarSign, FiUser, FiPhone, FiFileText } from 'react-icons/fi';
import './AddLogisticsModal.scss';

const AddLogisticsModal = ({ isVisible, onClose, onSave, logistics, deliverySessions, mode = 'add', preSelectedDeliveryId = null }) => {
    const [formData, setFormData] = useState({
        deliverySessionId: '',
        deliveryFee: '',
        currency: 'EGP',
        carrierCompany: '',
        driverName: '',
        driverPhone: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (logistics && mode === 'edit') {
            setFormData({
                deliverySessionId: logistics.deliverySessionId || '',
                deliveryFee: logistics.deliveryFee || '',
                currency: logistics.currency || 'EGP',
                carrierCompany: logistics.carrierCompany || '',
                driverName: logistics.driverName || '',
                driverPhone: logistics.driverPhone || '',
                notes: logistics.notes || ''
            });
        } else {
            setFormData({
                deliverySessionId: preSelectedDeliveryId || '',
                deliveryFee: '',
                currency: 'EGP',
                carrierCompany: '',
                driverName: '',
                driverPhone: '',
                notes: ''
            });
        }
        setErrors({});
    }, [logistics, mode, isVisible, preSelectedDeliveryId]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.deliveryFee || parseFloat(formData.deliveryFee) <= 0) {
            newErrors.deliveryFee = 'Delivery fee is required and must be greater than 0';
        }

        if (!formData.currency) {
            newErrors.currency = 'Currency is required';
        }

        if (!formData.carrierCompany || formData.carrierCompany.trim() === '') {
            newErrors.carrierCompany = 'Carrier company is required';
        }

        if (!formData.driverName || formData.driverName.trim() === '') {
            newErrors.driverName = 'Driver name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSaving(true);

        try {
            const dataToSave = {
                ...formData,
                deliveryFee: parseFloat(formData.deliveryFee),
                deliverySessionId: formData.deliverySessionId || null
            };

            await onSave(dataToSave);
            handleClose();
        } catch (error) {
            console.error('Error saving logistics:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setFormData({
            deliverySessionId: '',
            deliveryFee: '',
            currency: 'EGP',
            carrierCompany: '',
            driverName: '',
            driverPhone: '',
            notes: ''
        });
        setErrors({});
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    if (!isVisible) return null;

    const isDeliveryLocked = !!preSelectedDeliveryId;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content modal-lg add-logistics-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FiTruck />
                        {mode === 'edit' ? 'Edit Logistics Entry' : 'Add Logistics Entry'}
                    </h2>
                    <button className="btn-close" onClick={handleClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Link to Delivery (Optional) - Only show if not pre-selected */}
                        {!isDeliveryLocked && (
                            <div className="form-group">
                                <label>Link to Delivery (Optional)</label>
                                <select
                                    name="deliverySessionId"
                                    value={formData.deliverySessionId}
                                    onChange={handleChange}
                                >
                                    <option value="">Standalone (Not linked to any delivery)</option>
                                    {deliverySessions?.map(session => (
                                        <option key={session.id} value={session.id}>
                                            Delivery on {new Date(session.processedAt).toLocaleDateString()} - {session.merchantName}
                                        </option>
                                    ))}
                                </select>
                                <span className="form-hint">
                                    Leave empty if this logistics entry is not related to a specific delivery
                                </span>
                            </div>
                        )}

                        {/* Delivery Fee and Currency */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Delivery Fee <span className="required">*</span></label>
                                <input
                                    type="number"
                                    name="deliveryFee"
                                    value={formData.deliveryFee}
                                    onChange={handleChange}
                                    placeholder="Enter delivery fee"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                                {errors.deliveryFee && (
                                    <span className="form-error">{errors.deliveryFee}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Currency <span className="required">*</span></label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="EGP">EGP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                                {errors.currency && (
                                    <span className="form-error">{errors.currency}</span>
                                )}
                            </div>
                        </div>

                        {/* Carrier Company */}
                        <div className="form-group">
                            <label>Carrier Company <span className="required">*</span></label>
                            <input
                                type="text"
                                name="carrierCompany"
                                value={formData.carrierCompany}
                                onChange={handleChange}
                                placeholder="Enter carrier company name"
                                required
                            />
                            {errors.carrierCompany && (
                                <span className="form-error">{errors.carrierCompany}</span>
                            )}
                        </div>

                        {/* Driver Info */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Driver Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="driverName"
                                    value={formData.driverName}
                                    onChange={handleChange}
                                    placeholder="Enter driver name"
                                    required
                                />
                                {errors.driverName && (
                                    <span className="form-error">{errors.driverName}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Driver Phone</label>
                                <input
                                    type="tel"
                                    name="driverPhone"
                                    value={formData.driverPhone}
                                    onChange={handleChange}
                                    placeholder="Enter driver phone"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Enter any additional notes..."
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="modal-btn-secondary"
                            onClick={handleClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : mode === 'edit' ? 'Update Logistics' : 'Add Logistics'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddLogisticsModal;