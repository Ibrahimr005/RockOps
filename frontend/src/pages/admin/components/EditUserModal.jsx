import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FaTimes} from 'react-icons/fa';
import './EditUserModal.css';

const EditUserModal = ({user, mode = 'edit', onCancel, onSave}) => {
    const {t} = useTranslation();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        role: 'USER'
    });

    // Initialize form data when the component mounts or user changes
    useEffect(() => {
        if (user && mode === 'edit') {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                username: user.username || '',
                role: user.role || 'USER',
                // Don't set password for edit mode
                password: ''
            });
        } else {
            // Reset form for add mode
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
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Check if password is required for new users
        if (mode === 'add' && !formData.password) {
            alert(t('auth.passwordRequired'));
            return;
        }

        // Prepare the data according to mode
        let dataToSave;

        if (mode === 'edit') {
            // For edit mode, we only need the role according to controller
            dataToSave = {
                role: formData.role
            };
        } else {
            // For add mode, match the RegisterRequest format
            dataToSave = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                username: formData.username,
                password: formData.password,
                role: formData.role
            };
        }

        onSave(dataToSave);
    };

    // Get all role values from the translation keys
    const getRoleOptions = () => {
        const roles = [
            'ADMIN',
            'USER',
            'SITE_ADMIN',
            'PROCUREMENT',
            'WAREHOUSE_MANAGER',
            'SECRETARY',
            'EQUIPMENT_MANAGER',
            'HR_MANAGER',
            'HR_EMPLOYEE',
            'FINANCE_EMPLOYEE',
            'FINANCE_MANAGER',
            'MAINTENANCE_EMPLOYEE',
            'MAINTENANCE_MANAGER',
        ];

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
                    <button className="close-button" onClick={onCancel}>
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
                                    placeholder={t('auth.username')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('auth.password')}</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleFormChange}
                                    required
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
                        >
                            {getRoleOptions()}
                        </select>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={onCancel}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="save-button">
                            {mode === 'edit' ? t('common.save') : t('admin.addUser')}
                        </button>

                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;