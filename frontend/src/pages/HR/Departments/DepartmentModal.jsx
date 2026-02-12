import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { departmentService } from '../../../services/hr/departmentService.js';
import {FaBuilding} from "react-icons/fa";
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';

const DepartmentModal = ({
                             isOpen,
                             onClose,
                             onSuccess,
                             department = null, // null for create, department object for edit
                             title = null // optional custom title
                         }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const isEdit = department !== null;
    const modalTitle = title || (isEdit ? 'Edit Department' : 'Add Department');

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Initialize form data when modal opens or department changes
    useEffect(() => {
        if (isOpen) {
            if (isEdit && department) {
                setFormData({
                    name: department.name || '',
                    description: department.description || ''
                });
            } else {
                setFormData({
                    name: '',
                    description: ''
                });
            }
            setError(null);
        }
    }, [isOpen, department, isEdit]);

    const handleInputChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Department name is required');
            showError('Department name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const departmentData = {
                name: formData.name.trim(),
                description: formData.description.trim() || null
            };

            if (isEdit) {
                await departmentService.update(department.id, departmentData);
                showSuccess('Department updated successfully');
            } else {
                await departmentService.create(departmentData);
                showSuccess('Department created successfully');
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error(`Error ${isEdit ? 'updating' : 'creating'} department:`, err);
            const errorMessage = err.response?.data?.error || err.message ||
                `Failed to ${isEdit ? 'update' : 'create'} department`;
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseAttempt = () => {
        if (!loading) {
            if (isFormDirty) {
                setShowDiscardDialog(true);
            } else {
                onClose();
            }
        }
    };

    const handleClose = () => {
        handleCloseAttempt();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            handleCloseAttempt();
        }
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-container modal-md">
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title modal-title-animated">
                        <FaBuilding/>
                        {modalTitle}
                    </h2>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        disabled={loading}
                        aria-label="Close modal"
                    >
                        <FiX />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="department-form">
                        <div className="modal-section">
                            <div className="departments-form-group">
                                <label htmlFor="department-name">
                                    Department Name <span style={{color: 'var(--color-danger)'}}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="department-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loading}
                                    placeholder="Enter department name"
                                    autoFocus={!isEdit}
                                />
                            </div>

                            <div className="departments-form-group">
                                <label htmlFor="department-description">
                                    Description
                                </label>
                                <textarea
                                    id="department-description"
                                    name="description"
                                    rows="4"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    placeholder="Enter department description (optional)"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="department-form"
                        className="btn-primary"
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Department' : 'Create Department')}
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

export default DepartmentModal;