import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaUserTimes, FaUserCheck } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import ContactModal from './ContactModal';
import './Contacts.scss';
import contactService from '../../../services/contactService.js';

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [filters, setFilters] = useState({
        contactType: 'all',
        company: 'all',
        isActive: 'all'
    });

    const { showSuccess, showError, showInfo, showWarning } = useSnackbar();
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        loadContacts();
    }, [filters]);

    useEffect(() => {
        if (location.state?.action === 'add-and-return') {
            handleOpenModal();
        }
    }, [location.state]);

    const loadContacts = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if all filters are set to 'all' - if so, use the basic getContacts method
            const allFiltersAreAll = Object.values(filters).every(value => value === 'all');

            let response;
            if (allFiltersAreAll) {
                response = await contactService.getContacts();
            } else {
                response = await contactService.getContactsWithFilters(filters);
            }

            console.log('API Response:', response);

            const contactsData = Array.isArray(response?.data?.content) ? response.data.content :
                Array.isArray(response?.data) ? response.data :
                    Array.isArray(response) ? response : [];

            console.log('Processed contacts data:', contactsData);
            setContacts(contactsData);
        } catch (error) {
            console.error('Error loading contacts:', error);
            setError('Failed to load contacts');
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (contact = null) => {
        if (contact) {
            setEditingContact(contact);
        } else {
            setEditingContact(null);
        }
        setShowModal(true);
    };

    const handleViewContact = (contact) => {
        setSelectedContact(contact);
        showInfo(`Viewing contact: ${contact.firstName} ${contact.lastName}`);
    };

    const handleDeleteContact = async (contactId) => {
        try {
            await contactService.deleteContact(contactId);
            setContacts(prev => prev.filter(contact => contact.id !== contactId));
            showSuccess('Contact deleted successfully');
        } catch (error) {
            console.error('Error deleting contact:', error);
            showError('Failed to delete contact');
        }
    };

    const handleDeactivateContact = async (contactId) => {
        try {
            await contactService.deactivateContact(contactId);
            setContacts(prev => prev.map(contact =>
                contact.id === contactId ? { ...contact, isActive: false } : contact
            ));
            showSuccess('Contact deactivated successfully');
        } catch (error) {
            console.error('Error deactivating contact:', error);
            showError('Failed to deactivate contact');
        }
    };

    const handleActivateContact = async (contactId) => {
        try {
            await contactService.activateContact(contactId);
            setContacts(prev => prev.map(contact =>
                contact.id === contactId ? { ...contact, isActive: true } : contact
            ));
            showSuccess('Contact activated successfully');
        } catch (error) {
            console.error('Error activating contact:', error);
            showError('Failed to activate contact');
        }
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingContact) {
                const response = await contactService.updateContact(editingContact.id, formData);
                setContacts(prev => prev.map(contact =>
                    contact.id === editingContact.id ? response.data : contact
                ));
                showSuccess('Contact updated successfully');
            } else {
                const response = await contactService.createContact(formData);
                const newContact = response.data;
                setContacts(prev => [...prev, newContact]);
                showSuccess('Contact created successfully');

                if (location.state?.action === 'add-and-return') {
                    const { returnPath, formDataToRestore } = location.state;

                    // Create a new state object for the return trip
                    const newFormData = {
                        ...formDataToRestore,
                        responsibleContactId: newContact.id
                    };

                    navigate(returnPath, {
                        replace: true,
                        state: {
                            restoredFormData: newFormData,
                            openStepModal: true,
                            showRestoredMessage: true
                        }
                    });
                    return; // Stop further execution
                }
            }
            setShowModal(false);
            setEditingContact(null);
        } catch (error) {
            console.error('Error saving contact:', error);
            showError('Failed to save contact');
        }
    };

    const getContactTypeColor = (contactType) => {
        switch (contactType) {
            case 'TECHNICIAN': return 'var(--color-primary)';
            case 'SUPERVISOR': return 'var(--color-success)';
            case 'MANAGER': return 'var(--color-warning)';
            case 'SUPPLIER': return 'var(--color-info)';
            case 'CONTRACTOR': return 'var(--color-secondary)';
            case 'CUSTOMER': return 'var(--color-danger)';
            case 'INTERNAL_STAFF': return 'var(--color-text-secondary)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getContactTypeBadge = (contactType) => {
        const color = getContactTypeColor(contactType);
        return (
            <span
                className="contact-type-badge"
                style={{
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}`
                }}
            >
                {contactType?.replace('_', ' ')}
            </span>
        );
    };

    const getStatusBadge = (isActive) => {
        const color = isActive ? 'var(--color-success)' : 'var(--color-danger)';
        const text = isActive ? 'Active' : 'Inactive';
        return (
            <span
                className="status-badge"
                style={{
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}`
                }}
            >
                {text}
            </span>
        );
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'firstName',
            sortable: true,
            render: (row) => (
                <div className="contact-info" style={{ cursor: 'pointer' }} onClick={() => handleViewContact(row)}>
                    <div className="contact-name">{row.firstName} {row.lastName}</div>
                    <div className="contact-email">{row.email}</div>
                </div>
            )
        },
        {
            header: 'Contact Type',
            accessor: 'contactType',
            sortable: true,
            render: (row) => getContactTypeBadge(row.contactType)
        },
        {
            header: 'Company',
            accessor: 'company',
            sortable: true,
            render: (row) => (
                <div className="company-info">
                    <div className="company-name">{row.company || '-'}</div>
                    <div className="company-position">{row.position || '-'}</div>
                </div>
            )
        },
        {
            header: 'Phone',
            accessor: 'phoneNumber',
            sortable: true,
            render: (row) => (
                <div className="phone-info">
                    <div className="primary-phone">{row.phoneNumber}</div>
                    {row.alternatePhone && (
                        <div className="alternate-phone">{row.alternatePhone}</div>
                    )}
                </div>
            )
        },
        {
            header: 'Specialization',
            accessor: 'specialization',
            sortable: true,
            render: (row) => row.specialization || '-'
        },
        {
            header: 'Status',
            accessor: 'isActive',
            sortable: true,
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getStatusBadge(row.isActive)}
                    <button
                        className={`btn btn-sm ${row.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (row.isActive) {
                                handleDeactivateContact(row.id);
                            } else {
                                handleActivateContact(row.id);
                            }
                        }}
                        title={row.isActive ? 'Deactivate' : 'Activate'}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                        {row.isActive ? <FaUserTimes /> : <FaUserCheck />}
                    </button>
                </div>
            )
        },
        {
            header: 'Active Assignments',
            accessor: 'activeAssignments',
            sortable: true,
            render: (row) => (
                <div className="assignments-info">
                    <span className="assignments-count">{row.activeAssignments || 0}</span>
                    {row.isAvailable && (
                        <span className="available-indicator">Available</span>
                    )}
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => {
                if (window.confirm(`Are you sure you want to delete the contact ${row.firstName} ${row.lastName}?`)) {
                    handleDeleteContact(row.id);
                }
            },
            className: 'danger'
        }
    ];

    const filterableColumns = [
        { header: 'Name', accessor: 'firstName' },
        { header: 'Contact Type', accessor: 'contactType' },
        { header: 'Company', accessor: 'company' },
        { header: 'Status', accessor: 'isActive' }
    ];

    if (error) {
        return (
            <div className="contacts-error">
                <div className="error-message">
                    <h3>Error Loading Contacts</h3>
                    <p>{error}</p>
                    <button onClick={loadContacts} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="contacts">
            <div className="contacts-header">
                <div className="header-left">
                    <h1>Contacts</h1>
                    <p>Manage maintenance team contacts and responsible persons</p>
                </div>
            </div>

            <DataTable
                data={contacts}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Contacts"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No contacts found. Create your first contact to get started."
                showAddButton={true}
                addButtonText="New Contact"
                onAddClick={() => handleOpenModal()}
            />

            {showModal && (
                <ContactModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setEditingContact(null);
                    }}
                    onSubmit={handleSubmit}
                    editingContact={editingContact}
                />
            )}
        </div>
    );
};

export default Contacts;