import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable from '../../components/common/DataTable/DataTable';
import UserStatsCard from './components/UserStatsCard';
import EditUserModal from './components/EditUserModal';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import './AdminPage.css';

const AdminPage = () => {
    const { t } = useTranslation();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // 'edit' or 'add'

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8080/api/v1/admin/users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`${t('common.error')}: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setUsers(data);
            setError(null);
        } catch (err) {
            setError(`${t('common.error')}: ${err.message}`);
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm(t('admin.confirmDelete'))) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(t('common.error'));
            }

            // Remove user from state
            setUsers(users.filter(user => user.id !== userId));
            setError(null);
        } catch (err) {
            setError(`${t('common.error')}: ${err.message}`);
            console.error('Error deleting user:', err);
        }
    };

    const handleEdit = (user) => {
        setModalMode('edit');
        setEditingUser(user);
        setShowModal(true);
    };

    const handleAddUser = () => {
        setModalMode('add');
        setEditingUser(null);
        setShowModal(true);
    };

    const handleUpdateUser = async (userData) => {
        if (modalMode === 'edit') {
            await updateUser(userData);
        } else {
            await createUser(userData);
        }
    };

    const updateUser = async (updatedUserData) => {
        try {
            // For updating role only (as per your controller)
            const roleUpdateResponse = await fetch(`http://localhost:8080/api/v1/admin/users/${editingUser.id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ role: updatedUserData.role })
            });

            if (!roleUpdateResponse.ok) {
                throw new Error(`${t('common.error')}: Role update failed`);
            }

            // Update user in state
            const updatedUser = {
                ...editingUser,
                role: updatedUserData.role
            };

            setUsers(users.map(user =>
                user.id === editingUser.id ? updatedUser : user
            ));

            // Close modal and clear form
            setShowModal(false);
            setEditingUser(null);
            setError(null);
        } catch (err) {
            setError(`${t('common.error')}: ${err.message}`);
            console.error('Error updating user:', err);
        }
    };

    const createUser = async (newUserData) => {
        try {
            // Use the admin/users endpoint
            const response = await fetch('http://localhost:8080/api/v1/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newUserData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('common.error'));
            }

            // Refresh user list to include the new user
            await fetchUsers();

            // Close modal
            setShowModal(false);
            setError(null);
        } catch (err) {
            setError(`${t('common.error')}: ${err.message}`);
            console.error('Error creating user:', err);
        }
    };

    const cancelEdit = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    // Define table columns
    const columns = [
        {
            header: t('admin.firstName'),
            accessor: 'firstName',
            sortable: true
        },
        {
            header: t('admin.lastName'),
            accessor: 'lastName',
            sortable: true
        },
        {
            header: t('auth.username'),
            accessor: 'username',
            sortable: true
        },
        {
            header: t('admin.role'),
            accessor: 'role',
            sortable: true,
            render: (row, value) => (
                <span className={`role-badge role-badge--${value.toLowerCase()}`}>
                    {t(`roles.${value}`)}
                </span>
            )
        }
    ];

    // Define actions
    const actions = [
        {
            icon: <FaEdit />,
            label: t('common.edit'),
            onClick: handleEdit,
            className: 'primary'
        },
        {
            icon: <FaTrash />,
            label: t('common.delete'),
            onClick: (user) => handleDelete(user.id),
            className: 'danger'
        }
    ];

    // Define filterable columns
    const filterableColumns = [
        { header: t('admin.firstName'), accessor: 'firstName' },
        { header: t('admin.lastName'), accessor: 'lastName' },
        { header: t('auth.username'), accessor: 'username' },
        { header: t('admin.role'), accessor: 'role' }
    ];

    return (
        <div className="admin-container">
            {/* Use the new Navbar component */}

            <div className="admin-content">
                <main className="admin-main">
                    <div className="">
                        {/* Summary Cards */}
                        <div className="summary-section">
                            <UserStatsCard users={users} />
                            {/* Add more summary cards here if needed */}
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        {/* Action buttons */}
                        <DataTable
                            data={users}
                            columns={columns}
                            loading={loading}
                            tableTitle={t('admin.usersList')}
                            showSearch={true}
                            showFilters={true}
                            filterableColumns={filterableColumns}
                            defaultSortField="firstName"
                            defaultSortDirection="asc"
                            actions={actions}
                            actionsColumnWidth="120px"
                            itemsPerPageOptions={[10, 25, 50, 100]}
                            defaultItemsPerPage={10}
                            showAddButton={true}
                            addButtonText={t('admin.addUser')}
                            addButtonIcon={<FaUserPlus />}
                            onAddClick={handleAddUser}
                        />
                    </div>
                </main>
            </div>

            {/* Modal Overlay for Edit/Add User Form */}
            {showModal && (
                <EditUserModal
                    user={editingUser}
                    mode={modalMode}
                    onCancel={cancelEdit}
                    onSave={handleUpdateUser}
                />
            )}
        </div>
    );
};

export default AdminPage;