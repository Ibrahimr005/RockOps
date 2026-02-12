// ========================================
// FILE: BonusTypeModal.jsx
// Create/Edit bonus type modal
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaTimes,
    FaGift,
    FaSpinner,
    FaCheckCircle
} from 'react-icons/fa';
import { bonusService } from '../../../../../services/payroll/bonusService';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import '../CreateBonusModal/CreateBonusModal.scss';

const BonusTypeModal = ({ bonusType, onClose, onSuccess }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();
    const isEditing = !!bonusType;

    // Form state
    const [form, setForm] = useState({
        code: '',
        name: '',
        description: ''
    });

    const [saving, setSaving] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Initialize form with existing data
    useEffect(() => {
        if (bonusType) {
            setForm({
                code: bonusType.code || '',
                name: bonusType.name || '',
                description: bonusType.description || ''
            });
        }
    }, [bonusType]);

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleCloseAttempt();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFormDirty]);

    // Track dirty state
    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsFormDirty(true);
    };

    // Close attempt with dirty check
    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    // Overlay click handler
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    // Validate form
    const validateForm = () => {
        if (!form.code.trim()) {
            showWarning('Code is required');
            return false;
        }
        if (!form.name.trim()) {
            showWarning('Name is required');
            return false;
        }
        return true;
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            const payload = {
                code: form.code.toUpperCase(),
                name: form.name,
                description: form.description || null
            };

            if (isEditing) {
                await bonusService.updateBonusType(bonusType.id, payload);
                showSuccess('Bonus type updated successfully');
            } else {
                await bonusService.createBonusType(payload);
                showSuccess('Bonus type created successfully');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving bonus type:', error);
            showError(error.response?.data?.message || error.message || 'Failed to save bonus type');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="bonus-modal-overlay" onClick={handleOverlayClick}>
                <div className="bonus-modal-content type-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="bonus-modal-header">
                        <h3><FaGift /> {isEditing ? 'Edit Bonus Type' : 'Create Bonus Type'}</h3>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="bonus-modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Code <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                                    placeholder="e.g., PERFORMANCE"
                                    maxLength={50}
                                />
                                <span className="field-hint">Unique identifier (uppercase)</span>
                            </div>
                            <div className="form-group">
                                <label>Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    placeholder="e.g., Performance Bonus"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                placeholder="Brief description of this bonus type..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="bonus-modal-footer">
                        <button className="btn-cancel" onClick={handleCloseAttempt}>
                            Cancel
                        </button>
                        <button
                            className="btn-save"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? (
                                <><FaSpinner className="spin" /> Saving...</>
                            ) : (
                                <><FaCheckCircle /> {isEditing ? 'Update Type' : 'Create Type'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close without saving?"
                confirmText="Discard"
                cancelText="Keep Editing"
                onConfirm={() => {
                    setShowDiscardDialog(false);
                    onClose();
                }}
                onCancel={() => setShowDiscardDialog(false)}
            />
        </>
    );
};

export default BonusTypeModal;
