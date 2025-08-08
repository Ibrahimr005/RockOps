import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiClock, FiEye } from 'react-icons/fi';
import AddPositionForm from './components/AddPositionForm.jsx';
import EditPositionForm from './components/EditPositionForm.jsx';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';
import './PositionsList.scss';

const PositionsList = () => {
    const navigate = useNavigate();
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

    // NEW: Handle row click to navigate to details
    const handleRowClick = (row) => {
        navigate(`/hr/positions/${row.id}`);
    };

    // Helper function to format time range
    const formatTimeRange = (startTime, endTime) => {
        if (!startTime || !endTime) return null;

        // Handle different time formats
        const formatTime = (time) => {
            if (!time) return '';
            // If time is in HH:mm:ss format, extract HH:mm
            if (time.includes(':')) {
                const parts = time.split(':');
                return `${parts[0]}:${parts[1]}`;
            }
            return time;
        };

        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);

        return `${formattedStart} - ${formattedEnd}`;
    };

    // Helper function to calculate working hours from time range
    const calculateWorkingHours = (startTime, endTime) => {
        if (!startTime || !endTime) return null;

        try {
            const start = new Date(`1970-01-01T${startTime}`);
            const end = new Date(`1970-01-01T${endTime}`);
            let diffHours = (end - start) / (1000 * 60 * 60);

            // Handle overnight shifts
            if (diffHours < 0) {
                diffHours += 24;
            }

            return Math.round(diffHours * 100) / 100;
        } catch (error) {
            return null;
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
            header: 'Contract Type',
            accessor: 'contractType',
            sortable: true,
            render: (row) => {
                if (row.contractType) {
                    return row.contractType.replace('_', ' ');
                }
                // Fallback to legacy type field
                return row.type ? row.type.replace('_', ' ') : 'N/A';
            }
        },
        {
            header: 'Experience Level',
            accessor: 'experienceLevel',
            sortable: true,
            render: (row) => {
                if (!row.experienceLevel) return 'N/A';
                return row.experienceLevel.replace('_', ' ').toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());
            }
        },
        {
            header: 'Base Salary',
            accessor: 'baseSalary',
            sortable: true,
            render: (row) => {
                // Use calculated monthly salary if available, otherwise use base salary
                const salary = row.calculatedMonthlySalary || row.monthlyBaseSalary || row.baseSalary;

                if (!salary) return 'N/A';

                const contractType = row.contractType || row.type;
                let suffix = '';

                switch (contractType) {
                    case 'HOURLY':
                        const hourlyRate = row.hourlyRate;
                        return hourlyRate ? `${Number(hourlyRate).toLocaleString()}/hr` : 'N/A';
                    case 'DAILY':
                        const dailyRate = row.dailyRate;
                        return dailyRate ? `${Number(dailyRate).toLocaleString()}/day` : 'N/A';
                    case 'MONTHLY':
                    default:
                        return `${Number(salary).toLocaleString()}/month`;
                }
            }
        },
        {
            header: 'Working Schedule',
            accessor: 'workingSchedule',
            sortable: false,
            render: (row) => {
                const contractType = row.contractType || row.type;

                switch (contractType) {
                    case 'HOURLY':
                        const daysPerWeek = row.workingDaysPerWeek;
                        const hoursPerShift = row.hoursPerShift;
                        return (
                            <div className="schedule-info">
                                {daysPerWeek && <div>{daysPerWeek} days/week</div>}
                                {hoursPerShift && <div>{hoursPerShift}h/shift</div>}
                            </div>
                        );

                    case 'DAILY':
                        const daysPerMonth = row.workingDaysPerMonth;
                        const includesWeekends = row.includesWeekends;
                        return (
                            <div className="schedule-info">
                                {daysPerMonth && <div>{daysPerMonth} days/month</div>}
                                {includesWeekends && <div className="schedule-badge">Weekends</div>}
                            </div>
                        );

                    case 'MONTHLY':
                        const timeRange = formatTimeRange(row.startTime, row.endTime);
                        const workingHours = calculateWorkingHours(row.startTime, row.endTime) || row.workingHours;
                        const monthlyDays = row.workingDaysPerMonth;

                        return (
                            <div className="schedule-info">
                                {timeRange && (
                                    <div className="time-range">
                                        <FiClock className="time-icon" />
                                        {timeRange}
                                    </div>
                                )}
                                {workingHours && <div>{workingHours}h/day</div>}
                                {monthlyDays && <div>{monthlyDays} days/month</div>}
                            </div>
                        );

                    default:
                        return 'N/A';
                }
            }
        },
        {
            header: 'Reporting To',
            accessor: 'head',
            sortable: true,
            render: (row) => row.head || 'N/A'
        },
        {
            header: 'Status',
            accessor: 'active',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.active ? 'active' : 'inactive'}`}>
                    {row.active ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FiEye />,
            onClick: (row) => {
                navigate(`/hr/positions/${row.id}`);
            },
            className: 'info',
        },
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
                        Manage job positions with salary structures, working schedules, and department assignments
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
                filterableColumns={['department', 'contractType', 'experienceLevel', 'active']}
                defaultSortField="positionName"
                defaultSortDirection="asc"
                emptyMessage="No job positions found. Click 'Add Position' to create one."
                onRowClick={handleRowClick}
                rowClickable={true}
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