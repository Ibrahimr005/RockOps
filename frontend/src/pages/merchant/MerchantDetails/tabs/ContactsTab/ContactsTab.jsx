import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaPlus, FaSync, FaEdit, FaTrash, FaBriefcase, FaBuilding } from 'react-icons/fa';
import contactService from '../../../../../services/contactService';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import Snackbar from '../../../../../components/common/Snackbar/Snackbar';
import ContactModal from './ContactModal';
import './ContactsTab.scss';

const ContactsTab = ({ merchant }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // Snackbar State
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    useEffect(() => {
        if (merchant?.id) {
            fetchContacts();
        }
    }, [merchant]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await contactService.getContactsByMerchant(merchant.id);
            setContacts(response.data || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            setContacts([]);
            showSnackbar('error', 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (type, message) => {
        setSnackbar({
            show: true,
            type,
            message
        });
    };

    const handleUnlinkClick = (contact) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Unlink Contact',
            message: `Are you sure you want to unlink "${contact.firstName} ${contact.lastName}" from this merchant? The contact will still exist but won't be associated with this merchant.`,
            onConfirm: () => confirmUnlink(contact.id)
        });
    };

    const confirmUnlink = async (contactId) => {
        try {
            await contactService.updateContact(contactId, { merchantId: null });
            await fetchContacts();
            showSnackbar('success', 'Contact unlinked successfully!');
        } catch (error) {
            console.error('Error unlinking contact:', error);
            showSnackbar('error', 'Failed to unlink contact. Please try again.');
        } finally {
            setConfirmDialog({ ...confirmDialog, isVisible: false });
        }
    };

    const formatContactMethod = (method) => {
        if (!method) return 'Not specified';
        return method.replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="contacts-tab">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <h4>Loading Contacts</h4>
                    <p>Please wait while we fetch contacts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contacts-tab">
            {/* Section Header */}
            <div className="section-header-contacts">
                <h3>
                    <FaUser />
                    Associated Contacts
                </h3>
                <div className="header-actions">

                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <FaPlus />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Contact Summary Cards */}
            <div className="contacts-summary-grid">
                <div className="summary-card">
                    <div className="summary-icon">
                        <FaUser />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Total Contacts</div>
                        <div className="summary-value">{contacts.length}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaUser />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Active Contacts</div>
                        <div className="summary-value">
                            {contacts.filter(c => c.isActive).length}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaUser />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Emergency Contacts</div>
                        <div className="summary-value">
                            {contacts.filter(c => c.emergencyContact).length}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaUser />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Contact Types</div>
                        <div className="summary-value">
                            {[...new Set(contacts.map(c => c.contactTypeName))].length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Separator (only shown if there are contacts) */}
            {contacts.length > 0 && (
                <div className="contacts-separator"></div>
            )}

            {/* Contacts Grid or Empty State */}
            {contacts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FaUser />
                    </div>
                    <div className="empty-content">
                        <h4 className="empty-title">No Contacts Yet</h4>
                        <p className="empty-description">
                            Add contacts to keep track of people associated with this merchant for better communication and organization.
                        </p>

                    </div>
                </div>
            ) : (
                <div className="contacts-grid">
                    {contacts.map((contact) => (
                        <div key={contact.id} className="contact-card">
                            <div className="contact-header">
                                <div className="contact-icon-wrapper">
                                    <FaUser />
                                </div>
                            </div>

                            <div className="contact-title-section">
                                <h4>{contact.firstName} {contact.lastName}</h4>
                                <div className="contact-type-label">{contact.contactTypeName || 'No Type'}</div>
                            </div>

                            <div className="contact-meta">
                                {contact.position && (
                                    <div className="meta-row">
                                        <span className="meta-label">Position</span>
                                        <span className="meta-value">{contact.position}</span>
                                    </div>
                                )}
                                {contact.department && (
                                    <div className="meta-row">
                                        <span className="meta-label">Department</span>
                                        <span className="meta-value">{contact.department}</span>
                                    </div>
                                )}
                                <div className="meta-row">
                                    <span className="meta-label">Email</span>
                                    <span className="meta-value">{contact.email}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">Phone</span>
                                    <span className="meta-value">{contact.phoneNumber}</span>
                                </div>
                                {contact.preferredContactMethod && (
                                    <div className="meta-row">
                                        <span className="meta-label">Preferred Contact</span>
                                        <span className="meta-value">{formatContactMethod(contact.preferredContactMethod)}</span>
                                    </div>
                                )}
                                <div className="meta-row">
                                    <span className="meta-label">Status</span>
                                    <span className={`meta-value status-badge ${contact.isActive ? 'active' : 'inactive'}`}>
                                        {contact.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {contact.emergencyContact && (
                                    <div className="meta-row">
                                        <span className="meta-label">Emergency Contact</span>
                                        <span className="meta-value emergency-badge">Yes</span>
                                    </div>
                                )}
                            </div>

                            <div className="contact-actions">
                                <button
                                    className="btn-view"
                                    onClick={() => console.log('View contact', contact.id)}
                                    title="View Details"
                                >
                                    <FaUser />
                                </button>
                                <button
                                    className="btn-edit"
                                    onClick={() => console.log('Edit contact', contact.id)}
                                    title="Edit Contact"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    className="btn-unlink"
                                    onClick={() => handleUnlinkClick(contact)}
                                    title="Unlink from Merchant"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Unlink"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isVisible: false })}
                showIcon={true}
            />

            {/* Snackbar */}
            <Snackbar
                show={snackbar.show}
                type={snackbar.type}
                message={snackbar.message}
                onClose={() => setSnackbar({ ...snackbar, show: false })}
                duration={3000}
            />

            {/* Contact Modal */}
            <ContactModal
                isVisible={showAddModal}
                onClose={() => setShowAddModal(false)}
                merchantId={merchant.id}
                onSuccess={() => {
                    fetchContacts();
                    showSnackbar('success', 'Contact added successfully!');
                }}
            />

        </div>

    );
};

export default ContactsTab;