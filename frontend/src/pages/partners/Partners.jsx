// PartnerTable.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx'; // Update this path to match your project structure
import { useTranslation } from 'react-i18next';
import './Partners.scss';
import {FaEdit, FaTrashAlt, FaUsers} from "react-icons/fa";
import DataTable from '../../components/common/DataTable/DataTable';
import '../../styles/modal-styles.scss';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPartner, setNewPartner] = useState({ firstName: '', lastName: '' });

    const { currentUser, token } = useAuth();
    const { t } = useTranslation();

    // Check if user is admin
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    useEffect(() => {
        fetchPartners();
    }, [token]);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:8080/api/v1/partner/getallpartners', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(t('partners.fetchError', 'Unable to load partners'));
            }

            const data = await response.json();
            setPartners(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8080/api/v1/partner/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`
                },
                body: new URLSearchParams({
                    firstName: newPartner.firstName,
                    lastName: newPartner.lastName
                })
            });

            if (!response.ok) {
                throw new Error(t('partners.addError', 'Failed to add partner'));
            }

            const addedPartner = await response.json();
            setPartners([...partners, addedPartner]);
            setNewPartner({ firstName: '', lastName: '' });
            setShowAddModal(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPartner({
            ...newPartner,
            [name]: value
        });
    };

    const handleEditPartner = (partner) => {
        // TODO: Implement edit functionality
        console.log('Edit partner:', partner);
    };

    const handleDeletePartner = (partner) => {
        // TODO: Implement delete functionality
        console.log('Delete partner:', partner);
    };

    if (error) return <div className="error">{t('common.error', 'Error')}: {error}</div>;

    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '80px'
        },
        {
            header: t('partners.firstName', 'First Name'),
            accessor: 'firstName'
        },
        {
            header: t('partners.lastName', 'Last Name'),
            accessor: 'lastName'
        }
    ];

    const actions = isAdmin ? [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEditPartner,
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: handleDeletePartner,
            className: 'danger'
        }
    ] : [];

    return (
        <div className="partner-table-container">
            <div className="departments-header">
                <h2>{t('partners.title', 'Partners')}</h2>
            </div>

            <DataTable
                data={partners}
                columns={columns}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
                actions={actions}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                showAddButton={isAdmin}
                addButtonText={t('partners.addButton', 'Add Partner')}
                addButtonIcon={<FaUsers />}
                onAddClick={() => setShowAddModal(true)}
            />

            {showAddModal && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>{t('partners.addTitle', 'Add New Partner')}</h3>
                            <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form className="modal-body" onSubmit={handleAddPartner}>
                            <div className="form-group">
                                <label htmlFor="firstName">{t('partners.firstName', 'First Name')}</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={newPartner.firstName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">{t('partners.lastName', 'Last Name')}</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={newPartner.lastName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="modal-btn-secondary" onClick={() => setShowAddModal(false)}>
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button type="submit" className="btn btn-success">
                                    {t('common.add', 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;