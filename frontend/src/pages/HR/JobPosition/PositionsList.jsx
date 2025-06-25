import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import AddPositionForm from './components/AddPositionForm.jsx';
import EditPositionForm from './components/EditPositionForm.jsx';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../services/jobPositionService';
import './PositionsList.scss';

const PositionsList = () => {
    const { showSuccess, showError } = useSnackbar();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);

    useEffect(() => {
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await jobPositionService.getAll();
            const data = response.data;

            console.log(data);
            setPositions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching positions:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load positions';
            setError(errorMessage);
            showError('Failed to load positions. Please try again.');
            setPositions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPosition = async (formData) => {
        try {
            setError(null);
            const response = await jobPositionService.create(formData);

            await fetchPositions();
            setShowAddForm(false);
            showSuccess('Job position created successfully!');
        } catch (err) {
            console.error('Error adding position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to add position';
            setError(errorMessage);
            showError('Failed to add position. Please try again.');
            throw err; // Re-throw to let form handle it
        }
    };

    const handleEditPosition = async (formData) => {
        try {
            setError(null);
            const response = await jobPositionService.update(selectedPosition.id, formData);

            await fetchPositions();
            setShowEditForm(false);
            setSelectedPosition(null);
            showSuccess('Job position updated successfully!');
        } catch (err) {
            console.error('Error updating position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update position';
            setError(errorMessage);
            showError('Failed to update position. Please try again.');
            throw err; // Re-throw to let form handle it
        }
    };

    const handleDeletePosition = async (id) => {
        if (!window.confirm('Are you sure you want to delete this position?')) {
            return;
        }

        try {
            setError(null);
            await jobPositionService.delete(id);

            await fetchPositions();
            showSuccess('Job position deleted successfully!');
        } catch (err) {
            console.error('Error deleting position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to delete position';
            setError(errorMessage);
            showError('Failed to delete position. Please try again.');
        }
    };

    const columns = [
        {
            header: 'Position Name',
            accessor: 'positionName',
            sortable: true
        },
        {
            header: 'Department',
            accessor: 'department',
            sortable: true
        },
        {
            header: 'Type',
            accessor: 'type',
            sortable: true,
            render: (row) => row.type?.replace('_', ' ') || 'N/A'
        },
        {
            header: 'Experience Level',
            accessor: 'experienceLevel',
            sortable: true
        },
        {
            header: 'Base Salary (Monthly)',
            accessor: 'baseSalary',
            sortable: true,
            render: (row) => row.baseSalary ? `${Number(row.baseSalary).toLocaleString()}/month` : 'N/A'
        },
        {
            header: 'Reporting To',
            accessor: 'head',
            sortable: true
        },
        {
            header: 'Working Days',
            accessor: 'workingDays',
            sortable: true,
            render: (row) => {
                const daysPerMonth = row.workingDaysPerMonth;
                const daysPerWeek = row.workingDaysPerWeek;
                
                if (daysPerMonth) {
                    return (
                        <div className="salary-info">
                            <span className="salary-info__monthly">{daysPerMonth}</span>
                            <span className="salary-info__period"> days/month</span>
                        </div>
                    );
                } else if (daysPerWeek) {
                    return (
                        <div className="salary-info">
                            <span className="salary-info__monthly">{daysPerWeek}</span>
                            <span className="salary-info__period"> days/week</span>
                        </div>
                    );
                } else {
                    return <div className=".salary-info__period">N/A</div>;
                }
            }
        },
        {
            header: 'Working Hours',
            accessor: 'workingHours',
            sortable: true,
            render: (row) => row.workingHours ? `${row.workingHours}h/day` : 'N/A'
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: <FiEdit />,
            onClick: (row) => {
                setSelectedPosition(row);
                setShowEditForm(true);
            },
            className: 'primary',
        },
        {
            label: 'Delete',
            icon: <FiTrash2 />,
            className: 'danger',
            onClick: (row) => handleDeletePosition(row.id)
        }
    ];

    return (
        <div className="positions-container">
            <div className="departments-header">
                <h1>Job Positions
                    <p className="employees-header__subtitle">
                        Manage job positions with salary structures, requirements, and department assignments
                    </p>
                </h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    <FiPlus /> Add Position
                </button>
            </div>

            {error && (
                <div className="positions-error">
                    <strong>Error:</strong> {error}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            marginLeft: '10px',
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            <DataTable
                data={positions}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle="Job Positions"
                showSearch={true}
                showFilters={true}
                filterableColumns={['department', 'type', 'experienceLevel']}
                defaultSortField="positionName"
                defaultSortDirection="asc"
                emptyMessage="No job positions found. Click 'Add Position' to create one."
            />

            {showAddForm && (
                <AddPositionForm
                    isOpen={showAddForm}
                    onClose={() => {
                        setShowAddForm(false);
                        setError(null);
                    }}
                    onSubmit={handleAddPosition}
                />
            )}

            {showEditForm && selectedPosition && (
                <EditPositionForm
                    isOpen={showEditForm}
                    onClose={() => {
                        setShowEditForm(false);
                        setSelectedPosition(null);
                        setError(null);
                    }}
                    onSubmit={handleEditPosition}
                    position={selectedPosition}
                />
            )}
        </div>
    );
};

export default PositionsList;