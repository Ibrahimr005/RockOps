import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaTimes } from 'react-icons/fa';
import contactService from '../../../../services/contactService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import ContentLoader from '../../../../components/common/ContentLoader/ContentLoader';
import '../MerchantDetails.scss';

const ContactsTab = ({ merchant }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        if (merchant?.id) {
            loadMerchantContacts();
        }
    }, [merchant?.id]);

    const loadMerchantContacts = async () => {
        try {
            setLoading(true);
            const response = await contactService.getContactsByMerchant(merchant.id);
            const contactsData = Array.isArray(response?.data) ? response.data : 
                               Array.isArray(response) ? response : [];
            setContacts(contactsData);
        } catch (error) {
            console.error('Error loading merchant contacts:', error);
            showError('Failed to load contacts');
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlinkContact = async (contactId, contactName) => {
        if (!window.confirm(`Are you sure you want to unlink ${contactName} from this merchant?`)) {
            return;
        }

        try {
            // Update contact to remove merchant relationship
            await contactService.updateContact(contactId, { merchantId: null });
            showSuccess(`${contactName} has been unlinked from this merchant`);
            // Reload contacts
            loadMerchantContacts();
        } catch (error) {
            console.error('Error unlinking contact:', error);
            showError('Failed to unlink contact');
        }
    };

    const getContactTypeColor = (contactType) => {
        const colors = {
            'TECHNICIAN': '#3b82f6',
            'SUPERVISOR': '#10b981',
            'MANAGER': '#f59e0b',
            'SUPPLIER': '#8b5cf6',
            'CONTRACTOR': '#6366f1',
            'CUSTOMER': '#ef4444',
            'INTERNAL_STAFF': '#6b7280'
        };
        return colors[contactType] || '#6b7280';
    };

    const formatContactMethod = (method) => {
        if (!method) return 'Not specified';
        return method.replace('_', ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="tab-loading">
                <ContentLoader 
                    message="Loading contacts..." 
                    size="default" 
                    context="modal"
                />
            </div>
        );
    }

    if (contacts.length === 0) {
        return (
            <div className="tab-content-section">
                <div className="empty-state">
                    <FaUser className="empty-icon" />
                    <h3>No Contacts</h3>
                    <p>No contacts are currently associated with this merchant.</p>
                    <p className="hint">You can link contacts to this merchant from the Contacts page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content-section contacts-tab">
            <div className="section-header">
                <h3>Associated Contacts ({contacts.length})</h3>
            </div>

            <div className="contacts-grid">
                {contacts.map(contact => (
                    <div key={contact.id} className="contact-card">
                        <div className="contact-card-header">
                            <div className="contact-info">
                                <h4>{contact.firstName} {contact.lastName}</h4>
                                <span 
                                    className="contact-type-badge"
                                    style={{
                                        backgroundColor: getContactTypeColor(contact.contactType) + '20',
                                        color: getContactTypeColor(contact.contactType),
                                        border: `1px solid ${getContactTypeColor(contact.contactType)}`
                                    }}
                                >
                                    {contact.contactType?.replace('_', ' ')}
                                </span>
                            </div>
                            <button
                                className="unlink-button"
                                onClick={() => handleUnlinkContact(contact.id, `${contact.firstName} ${contact.lastName}`)}
                                title="Unlink contact from merchant"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="contact-card-body">
                            <div className="contact-detail">
                                <FaEnvelope className="detail-icon" />
                                <span>{contact.email}</span>
                            </div>
                            
                            <div className="contact-detail">
                                <FaPhone className="detail-icon" />
                                <span>{contact.phoneNumber}</span>
                            </div>

                            {contact.position && (
                                <div className="contact-detail">
                                    <span className="detail-label">Position:</span>
                                    <span>{contact.position}</span>
                                </div>
                            )}

                            {contact.department && (
                                <div className="contact-detail">
                                    <span className="detail-label">Department:</span>
                                    <span>{contact.department}</span>
                                </div>
                            )}

                            {contact.specialization && (
                                <div className="contact-detail">
                                    <span className="detail-label">Specialization:</span>
                                    <span>{contact.specialization}</span>
                                </div>
                            )}

                            <div className="contact-detail">
                                <span className="detail-label">Preferred Contact:</span>
                                <span>{formatContactMethod(contact.preferredContactMethod)}</span>
                            </div>

                            {contact.emergencyContact && (
                                <div className="contact-emergency">
                                    <span className="emergency-badge">Emergency Contact</span>
                                </div>
                            )}

                            <div className="contact-status">
                                <span className={`status-indicator ${contact.isActive ? 'active' : 'inactive'}`}>
                                    {contact.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {contact.activeAssignments > 0 && (
                                    <span className="assignments-count">
                                        {contact.activeAssignments} active assignments
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContactsTab;
