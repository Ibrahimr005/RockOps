import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable from '../../components/common/DataTable/DataTable';
import PageHeader from '../../components/common/PageHeader';
import UserStatsCard from './components/UserStatsCard';
import EditUserModal from './components/EditUserModal';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAdminUsers } from '../../hooks/queries';
import './AdminPage.css';

const AdminPage = () => {
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();

    const { data: users = [], isLoading: loading, refetch: refetchUsers } = useAdminUsers();
    const [editingUser, setEditingUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // 'edit' or 'add'

    const handleDelete = async (userId) => {
        if (!window.confirm(t('admin.confirmDelete'))) {
            return;
        }

        try {
            await adminService.deleteUser(userId);
            // Refresh user list
            await refetchUsers();
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

            // Refresh user list
            await refetchUsers();

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
            await refetchUsers();

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
                        <PageHeader
                            title={t('admin.usersList')}
                            subtitle="Manage system users, roles, and access permissions"
                        />

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
                            tableTitle=""
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