// ========================================
// FILE: CreateBonusModal.jsx
// Create single bonus modal - follows CreateLoanModal pattern
// ========================================

import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes,
    FaGift,
    FaSpinner,
    FaCheckCircle,
    FaUser,
    FaDollarSign,
    FaCalendarAlt
} from 'react-icons/fa';
import { bonusService } from '../../../../../services/payroll/bonusService';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './CreateBonusModal.scss';

const CreateBonusModal = ({ employees, bonusTypes, onClose, onSuccess }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // Form state
    const [form, setForm] = useState({
        employeeId: '',
        bonusTypeId: '',
        amount: '',
        effectiveMonth: new Date().getMonth() + 1,
        effectiveYear: new Date().getFullYear(),
        reason: '',
        notes: ''
    });

    const [saving, setSaving] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

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

    // Track form dirty state
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

    // Form validation
    const validateForm = () => {
        if (!form.employeeId) {
            showWarning('Please select an employee');
            return false;
        }
        if (!form.bonusTypeId) {
            showWarning('Please select a bonus type');
            return false;
        }
        if (!form.amount || parseFloat(form.amount) <= 0) {
            showWarning('Please enter a valid amount');
            return false;
        }
        if (!form.effectiveMonth || !form.effectiveYear) {
            showWarning('Please select the effective period');
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
                employeeId: form.employeeId,
                bonusTypeId: form.bonusTypeId,
                amount: parseFloat(form.amount),
                effectiveMonth: parseInt(form.effectiveMonth),
                effectiveYear: parseInt(form.effectiveYear),
                reason: form.reason || null,
                notes: form.notes || null
            };

            await bonusService.createBonus(payload);
            showSuccess('Bonus created successfully');
            onSuccess();
        } catch (error) {
            console.error('Error creating bonus:', error);
            showError(error.response?.data?.message || error.message || 'Failed to create bonus');
        } finally {
            setSaving(false);
        }
    };

    // Get selected employee details
    const selectedEmployee = employees.find(e => e.id === form.employeeId);

    return (
        <>
            <div className="bonus-modal-overlay" onClick={handleOverlayClick}>
                <div className="bonus-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="bonus-modal-header">
                        <h3><FaGift /> Create Bonus</h3>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="bonus-modal-body">
                        {/* Employee Selection */}
                        <div className="form-section">
                            <h4><FaUser /> Employee</h4>
                            <div className="form-group">
                                <label>Employee <span className="required">*</span></label>
                                <select
                                    value={form.employeeId}
                                    onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                                >
                                    <option value="">-- Select Employee --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName} {emp.employeeNumber ? `(${emp.employeeNumber})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedEmployee && (
                                <div className="employee-preview">
                                    <span className="employee-name">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                                    {selectedEmployee.departmentName && (
                                        <span className="employee-dept">{selectedEmployee.departmentName}</span>
                                    )}
                                    {selectedEmployee.jobPositionName && (
                                        <span className="employee-pos">{selectedEmployee.jobPositionName}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bonus Details */}
                        <div className="form-section">
                            <h4><FaDollarSign /> Bonus Details</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Bonus Type <span className="required">*</span></label>
                                    <select
                                        value={form.bonusTypeId}
                                        onChange={(e) => handleFieldChange('bonusTypeId', e.target.value)}
                                    >
                                        <option value="">-- Select Type --</option>
                                        {bonusTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} ({type.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Amount <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => handleFieldChange('amount', e.target.value)}
                                        placeholder="e.g., 500.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Effective Period */}
                        <div className="form-section">
                            <h4><FaCalendarAlt /> Effective Period</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Month <span className="required">*</span></label>
                                    <select
                                        value={form.effectiveMonth}
                                        onChange={(e) => handleFieldChange('effectiveMonth', e.target.value)}
                                    >
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Year <span className="required">*</span></label>
                                    <select
                                        value={form.effectiveYear}
                                        onChange={(e) => handleFieldChange('effectiveYear', e.target.value)}
                                    >
                                        {[...Array(5)].map((_, i) => {
                                            const year = new Date().getFullYear() - 1 + i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Reason & Notes */}
                        <div className="form-group">
                            <label>Reason</label>
                            <input
                                type="text"
                                value={form.reason}
                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                placeholder="Reason for this bonus..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                placeholder="Additional notes..."
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
                                <><FaSpinner className="spin" /> Creating...</>
                            ) : (
                                <><FaCheckCircle /> Create Bonus</>
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

export default CreateBonusModal;
