// ========================================
// FILE: BulkBonusModal.jsx
// Bulk bonus creation modal - assign bonuses to multiple employees
// ========================================

import React, { useState, useEffect } from 'react';
import {
    FaTimes,
    FaUsers,
    FaSpinner,
    FaCheckCircle,
    FaDollarSign,
    FaCalendarAlt,
    FaSearch
} from 'react-icons/fa';
import { bonusService } from '../../../../../services/payroll/bonusService';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import '../CreateBonusModal/CreateBonusModal.scss';

const BulkBonusModal = ({ employees, bonusTypes, onClose, onSuccess }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // Form state
    const [form, setForm] = useState({
        bonusTypeId: '',
        amount: '',
        effectiveMonth: new Date().getMonth() + 1,
        effectiveYear: new Date().getFullYear(),
        reason: ''
    });

    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
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

    // Filter employees by search
    const filteredEmployees = employees.filter(emp => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (emp.firstName?.toLowerCase().includes(term)) ||
            (emp.lastName?.toLowerCase().includes(term)) ||
            (emp.employeeNumber?.toLowerCase().includes(term)) ||
            (`${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term))
        );
    });

    // Track dirty state
    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsFormDirty(true);
    };

    // Toggle employee selection
    const toggleEmployee = (employeeId) => {
        setSelectedEmployeeIds(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            }
            return [...prev, employeeId];
        });
        setIsFormDirty(true);
    };

    // Select/deselect all filtered
    const toggleSelectAll = () => {
        const filteredIds = filteredEmployees.map(e => e.id);
        const allSelected = filteredIds.every(id => selectedEmployeeIds.includes(id));

        if (allSelected) {
            setSelectedEmployeeIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedEmployeeIds(prev => [...new Set([...prev, ...filteredIds])]);
        }
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
        if (selectedEmployeeIds.length === 0) {
            showWarning('Please select at least one employee');
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
                employeeIds: selectedEmployeeIds,
                bonusTypeId: form.bonusTypeId,
                amount: parseFloat(form.amount),
                effectiveMonth: parseInt(form.effectiveMonth),
                effectiveYear: parseInt(form.effectiveYear),
                reason: form.reason || null
            };

            await bonusService.createBulkBonus(payload);
            showSuccess(`Bonuses created for ${selectedEmployeeIds.length} employees`);
            onSuccess();
        } catch (error) {
            console.error('Error creating bulk bonuses:', error);
            showError(error.response?.data?.message || error.message || 'Failed to create bulk bonuses');
        } finally {
            setSaving(false);
        }
    };

    const allFilteredSelected = filteredEmployees.length > 0 &&
        filteredEmployees.every(e => selectedEmployeeIds.includes(e.id));

    return (
        <>
            <div className="bonus-modal-overlay" onClick={handleOverlayClick}>
                <div className="bonus-modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="bonus-modal-header">
                        <h3><FaUsers /> Bulk Create Bonuses</h3>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="bonus-modal-body">
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
                                    <label>Amount per Employee <span className="required">*</span></label>
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

                        {/* Reason */}
                        <div className="form-group">
                            <label>Reason</label>
                            <input
                                type="text"
                                value={form.reason}
                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                placeholder="Reason for this bulk bonus..."
                            />
                        </div>

                        {/* Employee Selection */}
                        <div className="form-section employee-selection-section">
                            <h4>
                                <FaUsers /> Select Employees
                                <span className="selection-count">
                                    ({selectedEmployeeIds.length} selected)
                                </span>
                            </h4>

                            <div className="employee-search-bar">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="select-all-bar">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allFilteredSelected}
                                        onChange={toggleSelectAll}
                                    />
                                    <span>Select All ({filteredEmployees.length})</span>
                                </label>
                            </div>

                            <div className="employee-list">
                                {filteredEmployees.map((emp) => (
                                    <label key={emp.id} className={`employee-item ${selectedEmployeeIds.includes(emp.id) ? 'selected' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                        />
                                        <div className="employee-info">
                                            <span className="employee-name">{emp.firstName} {emp.lastName}</span>
                                            <span className="employee-details">
                                                {emp.employeeNumber && `${emp.employeeNumber} `}
                                                {emp.departmentName && `- ${emp.departmentName}`}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <div className="no-employees">No employees found</div>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        {selectedEmployeeIds.length > 0 && form.amount && (
                            <div className="bulk-summary">
                                <strong>Total:</strong> {selectedEmployeeIds.length} employees x ${parseFloat(form.amount || 0).toFixed(2)} = <strong>${(selectedEmployeeIds.length * parseFloat(form.amount || 0)).toFixed(2)}</strong>
                            </div>
                        )}
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
                                <><FaCheckCircle /> Create {selectedEmployeeIds.length} Bonuses</>
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

export default BulkBonusModal;
