import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable from '../../components/common/DataTable/DataTable';
import UserStatsCard from './components/UserStatsCard';
import EditUserModal from './components/EditUserModal';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import './AdminPage.css';

const AdminPage = () => {
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
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
            const response = await adminService.getUsers();

            // DEBUG: Log the entire response
            console.log('Full API Response:', response);
            console.log('Response Data:', response.data);
            console.log('Data Type:', typeof response.data);
            console.log('Is Array:', Array.isArray(response.data));

            if (response.data && Array.isArray(response.data)) {
                console.log('First User:', response.data[0]);
                console.log('User Count:', response.data.length);
            }

            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
            showSnackbar(t('admin.fetchUsersError', 'Failed to load users'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm(t('admin.confirmDelete'))) {
            return;
        }

        try {
            await adminService.deleteUser(userId);
            // Remove user from state
            setUsers(users.filter(user => user.id !== userId));
            showSnackbar(t('admin.userDeletedSuccessfully', 'User deleted successfully'), 'success');
        } catch (err) {
            console.error('Error deleting user:', err);
            showSnackbar(t('admin.deleteUserError', 'Failed to delete user'), 'error');
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
            await adminService.updateUserRole(editingUser.id, { role: updatedUserData.role });

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
        } catch (err) {
            console.error('Error updating user:', err);
            // Re-throw to let modal handle the error display
            throw err;
        }
    };

    const createUser = async (newUserData) => {
        try {
            await adminService.createUser(newUserData);

            // Refresh user list to include the new user
            await fetchUsers();

            // Close modal
            setShowModal(false);
        } catch (err) {
            console.error('Error creating user:', err);
            // Re-throw to let modal handle the error display
            throw err;
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
            render: (row, value) => {
                // Handle null/undefined values
                if (!value) {
                    return (
                        <span className="role-badge role-badge--unknown">
                            {t('admin.noRole', 'No Role')}
                        </span>
                    );
                }

                return (
                    <span className={`role-badge role-badge--${value.toLowerCase()}`}>
                        {t(`roles.${value}`)}
                    </span>
                );
            }
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
            <div className="admin-content">
                <main className="admin-main">
                    <div className="">
                        {/* Summary Cards */}
                        <div className="summary-section">
                            <UserStatsCard users={users} />
                            {/* Add more summary cards here if needed */}
                        </div>

                        {/* Removed error message display - now handled by snackbar */}

                        {/* Data Table */}
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