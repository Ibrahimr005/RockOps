import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiEdit, FiPlus, FiTrash2, FiX, FiUsers, FiBriefcase, FiEye } from 'react-icons/fi';
import DataTable from '../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { departmentService } from '../../../services/hr/departmentService.js';
import DepartmentModal from './DepartmentModal';
import './DepartmentsList.scss';

const DepartmentsList = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch departments
    const fetchDepartments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await departmentService.getAll();
            console.log('Fetched departments:', response.data);

            setDepartments(response.data);
        } catch (err) {
            console.error('Error fetching departments:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load departments';
            setError(errorMessage);
            showError('Failed to load departments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    // Modal handlers
    const handleOpenCreateModal = () => {
        setCurrentDepartment(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (department) => {
        setCurrentDepartment(department);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentDepartment(null);
        setError(null);
    };

    const handleModalSuccess = () => {
        fetchDepartments();
    };

    // Delete handlers
    const handleDeleteDepartment = async () => {
        if (!deleteConfirmId) return;

        setIsDeleting(true);

        try {
            console.log('Deleting department with id:', deleteConfirmId);
            await departmentService.delete(deleteConfirmId);

            await fetchDepartments(); // Refresh the list
            setDeleteConfirmId(null);
            showSuccess('Department deleted successfully');
        } catch (err) {
            console.error('Error deleting department:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to delete department';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmId(null);
    };

    // Navigation handler for row clicks
    const handleRowClick = (department) => {
        navigate(`/hr/departments/${department.id}`);
    };

    // DataTable configuration with enhanced columns
    const columns = [
        {
            header: 'Department Name',
            accessor: 'name',
            sortable: true,
            render: (row, value) => (
                <div className="department-name-cell">
                    <span className="department-name">{value}</span>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row, value) => (
                <span className="department-description">
                    {value || 'No description'}
                </span>
            )
        },
        {
            header: 'Employees',
            accessor: 'employeeCount',
            sortable: true,
            render: (row, value) => (
                <div className="count-cell">
                    <FiUsers className="count-icon" />
                    <span className="count-number">{value || 0}</span>
                </div>
            )
        },
        {
            header: 'Positions',
            accessor: 'jobPositionCount',
            sortable: true,
            render: (row, value) => (
                <div className="count-cell">
                    <FiBriefcase className="count-icon" />
                    <span className="count-number">{value || 0}</span>
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FiEdit />,
            onClick: (row) => handleOpenEditModal(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FiTrash2 />,
            onClick: (row) => setDeleteConfirmId(row.id),
            className: 'danger'
        }
    ];

    return (
        <div className="departments-list-container">
            <div className="departments-header">
                <h1>Departments
                    <p className="employees-header__subtitle">
                        Manage departments to structure your workforce effectively
                    </p>
                </h1>
                <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModal}
                    disabled={loading}
                >
                    <FiPlus /> Add Department
                </button>
            </div>

            {error && !isModalOpen && (
                <div className="departments-error">
                    {error}
                    <button onClick={fetchDepartments} className="retry-button">
                        Try Again
                    </button>
                </div>
            )}

            <DataTable
                data={departments}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle="Departments"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                onRowClick={handleRowClick}
                rowClickable={true}
                emptyMessage="No departments found. Create your first department to get started."
            />

            {/* Reusable Department Modal */}
            <DepartmentModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleModalSuccess}
                department={currentDepartment}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={!!deleteConfirmId}
                type="delete"
                title="Delete Department"
                message="Are you sure you want to delete this department? This action cannot be undone and may affect associated positions and employees."
                confirmText="Delete Department"
                cancelText="Cancel"
                onConfirm={handleDeleteDepartment}
                onCancel={handleCancelDelete}
                isLoading={isDeleting}
                size="medium"
            />
        </div>
    );
};

export default DepartmentsList;