import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaCog, FaClock, FaExclamationTriangle, FaStore } from 'react-icons/fa';
import '../../../styles/modal-styles.scss';
import '../../../styles/cancel-modal-button.scss';
import './ContactModal.scss';
import { merchantService } from '../../../services/merchant/merchantService';
import contactTypeService from '../../../services/contactTypeService';

const ContactModal = ({ isOpen, onClose, onSubmit, editingContact }) => {
    console.log('ContactModal rendered:', { isOpen, editingContact });
    const [formData, setFormData] = useState(() => {
        try {
            return {
                firstName: '',
                lastName: '',
                email: '',
                phoneNumber: '',
                alternatePhone: '',
                contactTypeId: '',
                company: '',
                position: '',
                department: '',
                specialization: '',
                availabilityHours: '',
                emergencyContact: false,
                preferredContactMethod: 'PHONE',
                notes: '',
                isActive: true,
                merchantId: null
            };
        } catch (error) {
            console.error('Error initializing form data:', error);
            return {};
        }
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [merchants, setMerchants] = useState([]);
    const [loadingMerchants, setLoadingMerchants] = useState(false);
    const [contactTypes, setContactTypes] = useState([]);
    const [loadingContactTypes, setLoadingContactTypes] = useState(false);

    useEffect(() => {
        if (editingContact) {
            setFormData({
                firstName: editingContact.firstName || '',
                lastName: editingContact.lastName || '',
                email: editingContact.email || '',
                phoneNumber: editingContact.phoneNumber || '',
                alternatePhone: editingContact.alternatePhone || '',
                contactTypeId: editingContact.contactTypeId || '',
                company: editingContact.company || '',
                position: editingContact.position || '',
                department: editingContact.department || '',
                specialization: editingContact.specialization || '',
                availabilityHours: editingContact.availabilityHours || '',
                emergencyContact: editingContact.emergencyContact || false,
                preferredContactMethod: editingContact.preferredContactMethod || 'PHONE',
                notes: editingContact.notes || '',
                isActive: editingContact.isActive !== undefined ? editingContact.isActive : true,
                merchantId: editingContact.merchantId || null
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phoneNumber: '',
                alternatePhone: '',
                contactTypeId: '',
                company: '',
                position: '',
                department: '',
                specialization: '',
                availabilityHours: '',
                emergencyContact: false,
                preferredContactMethod: 'PHONE',
                notes: '',
                isActive: true,
                merchantId: null
            });
        }
        setErrors({});
    }, [editingContact, isOpen]);

    // Load merchants and contact types when modal opens
    useEffect(() => {
        if (isOpen) {
            // Load merchants and contact types asynchronously without blocking modal
            setTimeout(() => {
                loadMerchants().catch(error => {
                    console.error('Failed to load merchants, but modal will still work:', error);
                });
                loadContactTypes().catch(error => {
                    console.error('Failed to load contact types, but modal will still work:', error);
                });
            }, 100); // Delay to ensure modal renders first
        }
    }, [isOpen]);

    const loadMerchants = async () => {
        try {
            setLoadingMerchants(true);
            console.log('Loading merchants...');
            
            // Check if merchantService is available
            if (!merchantService || !merchantService.getAll) {
                console.warn('Merchant service not available');
                setMerchants([]);
                return;
            }
            
            const response = await merchantService.getAll();
            console.log('Merchant service response:', response);
            
            const merchantsData = Array.isArray(response?.data) ? response.data : 
                                 Array.isArray(response) ? response : [];
            
            console.log('Processed merchants data:', merchantsData);
            setMerchants(merchantsData);
        } catch (error) {
            console.error('Error loading merchants:', error);
            console.error('Error details:', error.response?.data || error.message);
            // Don't break the modal if merchants fail to load
            setMerchants([]);
        } finally {
            setLoadingMerchants(false);
        }
    };

    const loadContactTypes = async () => {
        try {
            setLoadingContactTypes(true);
            console.log('Loading contact types...');
            
            const response = await contactTypeService.getActiveContactTypes();
            console.log('Contact types response:', response);
            
            const contactTypesData = Array.isArray(response) ? response : [];
            console.log('Processed contact types data:', contactTypesData);
            setContactTypes(contactTypesData);
        } catch (error) {
            console.error('Error loading contact types:', error);
            console.error('Error details:', error.response?.data || error.message);
            // Don't break the modal if contact types fail to load - show empty list
            setContactTypes([]);
        } finally {
            setLoadingContactTypes(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        let processedValue = type === 'checkbox' ? checked : value;
        
        // Handle merchantId specifically - convert empty string to null
        if (name === 'merchantId' && processedValue === '') {
            processedValue = null;
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

        if (!formData.contactTypeId) {
            newErrors.contactTypeId = 'Contact type is required';
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

    // contactTypes is now loaded dynamically from the state

    const contactMethods = [
        { value: 'PHONE', label: 'Phone' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'SMS', label: 'SMS' },
        { value: 'IN_PERSON', label: 'In Person' },
        { value: 'VIDEO_CALL', label: 'Video Call' }
    ];

    if (!isOpen) return null;

    // Error boundary pattern - if anything fails, show a basic modal
    try {
        return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUser />
                        {editingContact ? 'Edit Contact' : 'New Contact'}
                    </div>
                    <button className="modal-close btn-cancel" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                <form onSubmit={handleSubmit} className="contact-form" id="contact-form">
                    <div className="form-section">
                        <h3>Basic Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName" data-required="true">First Name</label>
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
                                <label htmlFor="lastName" data-required="true">Last Name</label>
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
                                <label htmlFor="email" data-required="true">Email</label>
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
                                <label htmlFor="contactTypeId" data-required="true">Contact Type</label>
                                <select
                                    id="contactTypeId"
                                    name="contactTypeId"
                                    value={formData.contactTypeId}
                                    onChange={handleInputChange}
                                    className={errors.contactTypeId ? 'error' : ''}
                                    required
                                    disabled={loadingContactTypes}
                                >
                                    {loadingContactTypes ? (
                                        <option value="">Loading contact types...</option>
                                    ) : contactTypes.length === 0 ? (
                                        <option value="">No contact types available</option>
                                    ) : (
                                        <>
                                            <option value="">Select contact type</option>
                                            {contactTypes.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name} {type.description && `- ${type.description}`}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                                {errors.contactTypeId && <span className="error-message">{errors.contactTypeId}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Contact Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phoneNumber" data-required="true">Phone Number</label>
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
                                <label htmlFor="merchantId">Merchant (Service Provider)</label>
                                <div className="input-with-icon">
                                    <FaStore />
                                    <select
                                        id="merchantId"
                                        name="merchantId"
                                        value={formData.merchantId || ''}
                                        onChange={handleInputChange}
                                        disabled={loadingMerchants}
                                    >
                                        <option value="">
                                            {loadingMerchants ? 'Loading merchants...' : 'No Merchant'}
                                        </option>
                                        {merchants && merchants.length > 0 && merchants.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
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
                        </div>

                        <div className="form-row">
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
                        </div>

                        <div className="form-row">
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
                        </div>

                        <div className="form-row">
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

                </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="contact-form" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editingContact ? 'Update Contact' : 'Create Contact')}
                    </button>
                </div>
            </div>
        </div>
        );
    } catch (error) {
        console.error('Error rendering ContactModal:', error);
        // Fallback UI if modal fails to render
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-container" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">Contact Form Error</div>
                        <button className="modal-close btn-cancel" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>There was an error loading the contact form. Please try again.</p>
                        <p>Error: {error.message}</p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }
};

export default ContactModal; 