import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaCog, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import './ContactModal.scss';

const ContactModal = ({ isOpen, onClose, onSubmit, editingContact }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        alternatePhone: '',
        contactType: 'TECHNICIAN',
        company: '',
        position: '',
        department: '',
        specialization: '',
        availabilityHours: '',
        emergencyContact: false,
        preferredContactMethod: 'PHONE',
        notes: '',
        isActive: true
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingContact) {
            setFormData({
                firstName: editingContact.firstName || '',
                lastName: editingContact.lastName || '',
                email: editingContact.email || '',
                phoneNumber: editingContact.phoneNumber || '',
                alternatePhone: editingContact.alternatePhone || '',
                contactType: editingContact.contactType || 'TECHNICIAN',
                company: editingContact.company || '',
                position: editingContact.position || '',
                department: editingContact.department || '',
                specialization: editingContact.specialization || '',
                availabilityHours: editingContact.availabilityHours || '',
                emergencyContact: editingContact.emergencyContact || false,
                preferredContactMethod: editingContact.preferredContactMethod || 'PHONE',
                notes: editingContact.notes || '',
                isActive: editingContact.isActive !== undefined ? editingContact.isActive : true
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phoneNumber: '',
                alternatePhone: '',
                contactType: 'TECHNICIAN',
                company: '',
                position: '',
                department: '',
                specialization: '',
                availabilityHours: '',
                emergencyContact: false,
                preferredContactMethod: 'PHONE',
                notes: '',
                isActive: true
            });
        }
        setErrors({});
    }, [editingContact, isOpen]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        }

        if (!formData.contactType) {
            newErrors.contactType = 'Contact type is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const contactTypes = [
        { value: 'TECHNICIAN', label: 'Technician' },
        { value: 'SUPERVISOR', label: 'Supervisor' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'SUPPLIER', label: 'Supplier' },
        { value: 'CONTRACTOR', label: 'Contractor' },
        { value: 'CUSTOMER', label: 'Customer' },
        { value: 'INTERNAL_STAFF', label: 'Internal Staff' }
    ];

    const contactMethods = [
        { value: 'PHONE', label: 'Phone' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'SMS', label: 'SMS' },
        { value: 'IN_PERSON', label: 'In Person' },
        { value: 'VIDEO_CALL', label: 'Video Call' }
    ];

    if (!isOpen) return null;

    return (
        <div className="contact-modal-overlay">
            <div className="contact-modal">
                <div className="contact-modal-header">
                    <h2>
                        <FaUser />
                        {editingContact ? 'Edit Contact' : 'New Contact'}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="contact-modal-form">
                    <div className="form-section">
                        <h3>Basic Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className={errors.firstName ? 'error' : ''}
                                    placeholder="Enter first name"
                                />
                                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className={errors.lastName ? 'error' : ''}
                                    placeholder="Enter last name"
                                />
                                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="email">Email *</label>
                                <div className="input-with-icon">
                                    <FaEnvelope />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={errors.email ? 'error' : ''}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactType">Contact Type *</label>
                                <select
                                    id="contactType"
                                    name="contactType"
                                    value={formData.contactType}
                                    onChange={handleInputChange}
                                    className={errors.contactType ? 'error' : ''}
                                >
                                    {contactTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.contactType && <span className="error-message">{errors.contactType}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Contact Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phoneNumber">Phone Number *</label>
                                <div className="input-with-icon">
                                    <FaPhone />
                                    <input
                                        type="tel"
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className={errors.phoneNumber ? 'error' : ''}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="alternatePhone">Alternate Phone</label>
                                <div className="input-with-icon">
                                    <FaPhone />
                                    <input
                                        type="tel"
                                        id="alternatePhone"
                                        name="alternatePhone"
                                        value={formData.alternatePhone}
                                        onChange={handleInputChange}
                                        className={errors.alternatePhone ? 'error' : ''}
                                        placeholder="Enter alternate phone"
                                    />
                                </div>
                                {errors.alternatePhone && <span className="error-message">{errors.alternatePhone}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="preferredContactMethod">Preferred Contact Method</label>
                                <select
                                    id="preferredContactMethod"
                                    name="preferredContactMethod"
                                    value={formData.preferredContactMethod}
                                    onChange={handleInputChange}
                                >
                                    {contactMethods.map(method => (
                                        <option key={method.value} value={method.value}>
                                            {method.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="emergencyContact"
                                        checked={formData.emergencyContact}
                                        onChange={handleInputChange}
                                    />
                                    <span className="checkmark"></span>
                                    Emergency Contact
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Professional Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="company">Company</label>
                                <div className="input-with-icon">
                                    <FaBuilding />
                                    <input
                                        type="text"
                                        id="company"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        placeholder="Enter company name"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="position">Position</label>
                                <div className="input-with-icon">
                                    <FaBriefcase />
                                    <input
                                        type="text"
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        placeholder="Enter job position"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="department">Department</label>
                                <input
                                    type="text"
                                    id="department"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    placeholder="Enter department"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="specialization">Specialization</label>
                                <div className="input-with-icon">
                                    <FaCog />
                                    <input
                                        type="text"
                                        id="specialization"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        placeholder="Enter specialization"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="availabilityHours">Availability Hours</label>
                                <div className="input-with-icon">
                                    <FaClock />
                                    <input
                                        type="text"
                                        id="availabilityHours"
                                        name="availabilityHours"
                                        value={formData.availabilityHours}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Mon-Fri 9AM-5PM"
                                    />
                                </div>
                            </div>
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                    />
                                    <span className="checkmark"></span>
                                    Active Contact
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Additional Information</h3>
                        <div className="form-group">
                            <label htmlFor="notes">Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Enter any additional notes or comments"
                                rows="4"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (editingContact ? 'Update Contact' : 'Create Contact')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContactModal; 