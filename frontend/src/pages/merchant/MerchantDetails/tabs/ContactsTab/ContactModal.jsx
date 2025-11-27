import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import contactService from '../../../../../services/contactService';
import contactTypeService from '../../../../../services/contactTypeService';
import './ContactModal.scss';

const ContactModal = ({
                          isVisible,
                          onClose,
                          merchantId,
                          contactToEdit = null,
                          onSuccess
                      }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        alternatePhone: '',
        contactTypeId: '',
        position: '',
        department: '',
        company: '',
        specialization: '',
        availabilityHours: '',
        emergencyContact: false,
        preferredContactMethod: '',
        notes: '',
        isActive: true,
        merchantId: merchantId
    });

    const [contactTypes, setContactTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isVisible) {
            fetchContactTypes();
            if (contactToEdit) {
                setFormData({
                    ...contactToEdit,
                    merchantId: merchantId
                });
            } else {
                // Reset form for new contact
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phoneNumber: '',
                    alternatePhone: '',
                    contactTypeId: '',
                    position: '',
                    department: '',
                    company: '',
                    specialization: '',
                    availabilityHours: '',
                    emergencyContact: false,
                    preferredContactMethod: '',
                    notes: '',
                    isActive: true,
                    merchantId: merchantId
                });
            }
            setErrors({});
        }
    }, [isVisible, contactToEdit, merchantId]);

    const fetchContactTypes = async () => {
        try {
            const types = await contactTypeService.getActiveContactTypes();
            setContactTypes(types || []);
        } catch (error) {
            console.error('Error fetching contact types:', error);
            setContactTypes([]);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!formData.phoneNumber?.trim()) newErrors.phoneNumber = 'Phone number is required';
        if (!formData.contactTypeId) newErrors.contactTypeId = 'Contact type is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            // Clean up the form data - convert empty strings to null for optional fields
            const cleanedData = {
                ...formData,
                alternatePhone: formData.alternatePhone || null,
                position: formData.position || null,
                department: formData.department || null,
                company: formData.company || null,
                specialization: formData.specialization || null,
                availabilityHours: formData.availabilityHours || null,
                preferredContactMethod: formData.preferredContactMethod || null,
                notes: formData.notes || null
            };

            if (contactToEdit) {
                await contactService.updateContact(contactToEdit.id, cleanedData);
            } else {
                await contactService.createContact(cleanedData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving contact:', error);
            setErrors({ submit: 'Failed to save contact. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="contact-modal-overlay" onClick={handleOverlayClick}>
            <div className="contact-modal-content">
                <div className="contact-modal-header">
                    <h3>{contactToEdit ? 'Edit Contact' : 'Add New Contact'}</h3>
                    <button
                        className="contact-modal-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="contact-modal-body">
                        <div className="contact-form-columns">
                            {/* Personal Information */}
                            <div className="contact-form-column">
                                <h4>Personal Information</h4>

                                <div className="contact-form-group">
                                    <label>
                                        First Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={errors.firstName ? 'error' : ''}
                                        disabled={loading}
                                    />
                                    {errors.firstName && (
                                        <span className="error-message">{errors.firstName}</span>
                                    )}
                                </div>

                                <div className="contact-form-group">
                                    <label>
                                        Last Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={errors.lastName ? 'error' : ''}
                                        disabled={loading}
                                    />
                                    {errors.lastName && (
                                        <span className="error-message">{errors.lastName}</span>
                                    )}
                                </div>

                                <div className="contact-form-group">
                                    <label>
                                        Email <span className="required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={errors.email ? 'error' : ''}
                                        disabled={loading}
                                    />
                                    {errors.email && (
                                        <span className="error-message">{errors.email}</span>
                                    )}
                                </div>

                                <div className="contact-form-group">
                                    <label>
                                        Phone Number <span className="required">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className={errors.phoneNumber ? 'error' : ''}
                                        disabled={loading}
                                    />
                                    {errors.phoneNumber && (
                                        <span className="error-message">{errors.phoneNumber}</span>
                                    )}
                                </div>

                                <div className="contact-form-group">
                                    <label>Alternate Phone</label>
                                    <input
                                        type="tel"
                                        name="alternatePhone"
                                        value={formData.alternatePhone}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Professional Information */}
                            <div className="contact-form-column">
                                <h4>Professional Information</h4>

                                <div className="contact-form-group">
                                    <label>
                                        Contact Type <span className="required">*</span>
                                    </label>
                                    <select
                                        name="contactTypeId"
                                        value={formData.contactTypeId}
                                        onChange={handleChange}
                                        className={errors.contactTypeId ? 'error' : ''}
                                        disabled={loading}
                                    >
                                        <option value="">Select type...</option>
                                        {contactTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.contactTypeId && (
                                        <span className="error-message">{errors.contactTypeId}</span>
                                    )}
                                </div>

                                <div className="contact-form-group">
                                    <label>Position</label>
                                    <input
                                        type="text"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="contact-form-group">
                                    <label>Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="contact-form-group">
                                    <label>Company</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="contact-form-group">
                                    <label>Specialization</label>
                                    <input
                                        type="text"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="contact-form-column">
                                <h4>Additional Information</h4>

                                <div className="contact-form-group">
                                    <label>Preferred Contact Method</label>
                                    <select
                                        name="preferredContactMethod"
                                        value={formData.preferredContactMethod}
                                        onChange={handleChange}
                                        disabled={loading}
                                    >
                                        <option value="">Select method...</option>
                                        <option value="PHONE">Phone</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="SMS">SMS</option>
                                        <option value="IN_PERSON">In Person</option>
                                        <option value="VIDEO_CALL">Video Call</option>
                                    </select>
                                </div>

                                <div className="contact-form-group">
                                    <label>Availability Hours</label>
                                    <input
                                        type="text"
                                        name="availabilityHours"
                                        value={formData.availabilityHours}
                                        onChange={handleChange}
                                        placeholder="e.g., Mon-Fri 9AM-5PM"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="contact-form-group">
                                    <label>Notes</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows="4"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="contact-form-group contact-form-checkboxes">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="emergencyContact"
                                            checked={formData.emergencyContact}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                        <span>Emergency Contact</span>
                                    </label>

                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                        <span>Active</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {errors.submit && (
                            <div className="contact-form-error">
                                {errors.submit}
                            </div>
                        )}
                    </div>

                    <div className="contact-modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (contactToEdit ? 'Update Contact' : 'Add Contact')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContactModal;