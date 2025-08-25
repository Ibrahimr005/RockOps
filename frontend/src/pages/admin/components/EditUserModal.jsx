import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FaTimes} from 'react-icons/fa';
import './EditUserModal.css';
import {useSnackbar} from '../../../contexts/SnackbarContext';

import {ROLES} from '../../../utils/roles.js'

const EditUserModal = ({user, mode = 'edit', onCancel, onSave}) => {
    const {t} = useTranslation();
    const {showSnackbar} = useSnackbar();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        role: 'USER'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form data when the component mounts or user changes
    useEffect(() => {
        if (user && mode === 'edit') {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                username: user.username || '',
                role: user.role || 'USER',
                password: ''
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                username: '',
                password: '',
                role: 'USER'
            });
        }
    }, [user, mode]);

    const handleFormChange = (e) => {
        const {name, value} = e.target;

        // Convert username to lowercase automatically
        const processedValue = name === 'username' ? value.toLowerCase() : value;

        setFormData({
            ...formData,
            [name]: processedValue
        });
    };

    // Enhanced error message extraction for snackbar
    const extractUserFriendlyError = (error) => {
        if (error.response?.data?.message) {
            const message = error.response.data.message.toLowerCase();

            // Check for username conflicts
            if (message.includes('username') && (message.includes('already exists') || message.includes('duplicate'))) {
                return t('admin.usernameAlreadyExists', 'Username already exists. Please choose a different one.');
            }

            // Check for other common validation errors
            if (message.includes('email') && (message.includes('already exists') || message.includes('duplicate'))) {
                return t('admin.emailAlreadyExists', 'Email already exists. Please choose a different one.');
            }

            if (message.includes('required')) {
                return t('admin.requiredFieldsMissing', 'Please fill in all required fields.');
            }

            if (message.includes('invalid')) {
                return t('admin.invalidData', 'Please check your input data.');
            }

            // Return the original message if it's already user-friendly
            return error.response.data.message;
        }

        // Fallback for generic errors
        return t('admin.genericError', 'An error occurred. Please try again.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Check if password is required for new users
            if (mode === 'add' && !formData.password) {
                showSnackbar(t('auth.passwordRequired'), 'error');
                setIsSubmitting(false);
                return;
            }

            // Prepare the data according to mode
            let dataToSave;

            if (mode === 'edit') {
                dataToSave = {
                    role: formData.role
                };
            } else {
                dataToSave = {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    username: formData.username,
                    password: formData.password,
                    role: formData.role
                };
            }

            await onSave(dataToSave);

            // Show success message
            const successMessage = mode === 'edit'
                ? t('admin.userUpdatedSuccessfully', 'User updated successfully')
                : t('admin.userCreatedSuccessfully', 'User created successfully');
            showSnackbar(successMessage, 'success');

        } catch (err) {
            // Extract user-friendly error message and show in snackbar
            const errorMessage = extractUserFriendlyError(err);
            showSnackbar(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get all role values from the translation keys
    const getRoleOptions = () => {
        const roles = Object.values(ROLES);

        return roles.map(role => (
            <option key={role} value={role}>
                {t(`roles.${role}`)}
            </option>
        ));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{mode === 'edit' ? t('admin.editUser') : t('admin.addUser')}</h2>
                    <button className="btn-close" onClick={onCancel} disabled={isSubmitting}>
                        <FaTimes/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="edit-form">
                    {mode === 'add' && (
                        <>
                            <div className="form-group">
                                <label>{t('admin.firstName')}</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleFormChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder={t('admin.firstName')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('admin.lastName')}</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleFormChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder={t('admin.lastName')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('auth.username')}</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleFormChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder={t('auth.username')}
                                    style={{ textTransform: 'lowercase' }}
                                />
                                <div className="form-help-text">
                                    {t('admin.usernameAutoLowercase', 'Username will be automatically converted to lowercase')}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('auth.password')}</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleFormChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder={t('auth.password')}
                                />
                            </div>
                        </>
                    )}

                    {mode === 'edit' && (
                        <div className="user-info-display">
                            <div className="info-row">
                                <span className="info-label">{t('auth.username')}:</span>
                                <span className="info-value">{user.username}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">{t('admin.firstName')}:</span>
                                <span className="info-value">{user.firstName}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">{t('admin.lastName')}:</span>
                                <span className="info-value">{user.lastName}</span>
                            </div>
                            <div className="form-note">
                                {t('admin.roleUpdateOnly')}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>{t('admin.role')}</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleFormChange}
                            required
                            disabled={isSubmitting}
                        >
                            {getRoleOptions()}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="save-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ?
                                t('common.saving', 'Saving...') :
                                (mode === 'edit' ? t('common.save') : t('admin.addUser'))
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;