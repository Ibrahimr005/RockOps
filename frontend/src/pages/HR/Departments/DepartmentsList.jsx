import React, {useEffect, useState} from 'react';
import {FiCheck, FiEdit, FiPlus, FiTrash2, FiX} from 'react-icons/fi';
import DataTable from '../../../components/common/DataTable/DataTable';
import {useSnackbar} from '../../../contexts/SnackbarContext';
import {departmentService} from '../../../services/hr/departmentService.js';
import './DepartmentsList.scss';

const DepartmentsList = () => {
    const {showSuccess, showError} = useSnackbar();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [formData, setFormData] = useState({name: '', description: ''});
    const [editFormData, setEditFormData] = useState({name: '', description: ''});

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

    const handleOpenForm = () => {
        setFormData({name: '', description: ''});
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setFormData({name: '', description: ''});
        setError(null);
    };

    const handleOpenEditForm = (department) => {
        setCurrentDepartment(department);
        setEditFormData({
            name: department.name || '',
            description: department.description || ''
        });
        setIsEditFormOpen(true);
    };

    const handleCloseEditForm = () => {
        setIsEditFormOpen(false);
        setCurrentDepartment(null);
        setEditFormData({name: '', description: ''});
        setError(null);
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditInputChange = (e) => {
        const {name, value} = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Department name is required');
            showError('Department name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const departmentData = {
                name: formData.name.trim(),
                description: formData.description.trim() || null
            };

            console.log('Creating department with data:', departmentData);
            const response = await departmentService.create(departmentData);
            console.log('Created department:', response.data);

            await fetchDepartments(); // Refresh the list
            handleCloseForm();
            showSuccess('Department created successfully');
        } catch (err) {
            console.error('Error creating department:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to create department';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEditForm = async (e) => {
        e.preventDefault();

        if (!editFormData.name.trim()) {
            setError('Department name is required');
            showError('Department name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const departmentData = {
                name: editFormData.name.trim(),
                description: editFormData.description.trim() || null
            };

            console.log('Updating department with data:', departmentData);
            const response = await departmentService.update(currentDepartment.id, departmentData);

            await fetchDepartments(); // Refresh the list
            handleCloseEditForm();
            showSuccess('Department updated successfully');
        } catch (err) {
            console.error('Error updating department:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to update department';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDepartment = async (id) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Deleting department with id:', id);
            await departmentService.delete(id);

            await fetchDepartments(); // Refresh the list
            setDeleteConfirmId(null);
            showSuccess('Department deleted successfully');
        } catch (err) {
            console.error('Error deleting department:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to delete department';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // DataTable configuration
    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row, value) => value || 'No description'
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FiEdit/>,
            onClick: (row) => handleOpenEditForm(row),
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FiTrash2/>,
            onClick: (row) => setDeleteConfirmId(row.id),
            className: 'danger'
        }
    ];

    if (loading && departments.length === 0) {
        return (
            <div className="departments-loading">
                <div className="loader"></div>
                <p>Loading departments...</p>
            </div>
        );
    }

    return (
        <div className="departments-list-container">
            <div className="departments-header">
                <h1>Departments
                    <p className="employees-header__subtitle">
                        Manage departments to structure your workforce effectively
                    </p>
                </h1>
                <button
                    className="departments-add-button"
                    onClick={handleOpenForm}
                    disabled={loading}
                >
                    <FiPlus/> Add Department
                </button>
            </div>

            {error && !isFormOpen && !isEditFormOpen && (
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
            />

            {/* Add Department Modal */}
            {isFormOpen && (
                <div className="departments-modal">
                    <div className="departments-modal-content">
                        <h2>Add Department</h2>
                        {error && (
                            <div className="form-error">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmitForm}>
                            <div className="departments-form-group">
                                <label htmlFor="name">Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loading}
                                    placeholder="Enter department name"
                                />
                            </div>
                            <div className="departments-form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows="4"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    placeholder="Enter department description (optional)"
                                />
                            </div>
                            <div className="departments-form-actions">

                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCloseForm}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="departments-submit-button"
                                    disabled={loading}
                                >
                                    {loading ? 'Adding...' : 'Add Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Department Modal */}
            {isEditFormOpen && currentDepartment && (
                <div className="departments-modal">
                    <div className="departments-modal-content">
                        <h2>Edit Department</h2>
                        {error && (
                            <div className="form-error">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmitEditForm}>
                            <div className="departments-form-group">
                                <label htmlFor="edit-name">Name *</label>
                                <input
                                    type="text"
                                    id="edit-name"
                                    name="name"
                                    value={editFormData.name}
                                    onChange={handleEditInputChange}
                                    required
                                    disabled={loading}
                                    placeholder="Enter department name"
                                />
                            </div>
                            <div className="departments-form-group">
                                <label htmlFor="edit-description">Description</label>
                                <textarea
                                    id="edit-description"
                                    name="description"
                                    rows="4"
                                    value={editFormData.description}
                                    onChange={handleEditInputChange}
                                    disabled={loading}
                                    placeholder="Enter department description (optional)"
                                />
                            </div>
                            <div className="departments-form-actions">

                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCloseEditForm}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="departments-submit-button"
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : 'Update Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="departments-modal">
                    <div className="departments-modal-content">
                        <h2>Confirm Delete</h2>
                        <p>Are you sure you want to delete this department?</p>
                        <div className="departments-form-actions">

                            <button
                                className="btn-cancel"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={loading}
                            >
                                <FiX/> Cancel
                            </button>
                            <button
                                className="departments-confirm-button"
                                onClick={() => handleDeleteDepartment(deleteConfirmId)}
                                disabled={loading}
                            >
                                <FiCheck/> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentsList;