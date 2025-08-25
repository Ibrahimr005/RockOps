import React, { useEffect, useState } from 'react';
import { FiUsers, FiPlus, FiEye, FiEdit, FiUserCheck, FiUserX } from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../../../services/hr/jobPositionService.js';

const PositionEmployees = ({ position, positionId, onRefresh }) => {
    const { showSuccess, showError } = useSnackbar();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0
    });

    useEffect(() => {
        fetchEmployees();
    }, [positionId]);

    const fetchEmployees = async () => {
        setLoading(true);
        showError(null);
        try {
            const response = await jobPositionService.getEmployees(positionId);
            const data = response.data;

            console.log(data);
            setEmployees(Array.isArray(data) ? data : []);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load employees';
            showError(errorMessage);
            showError('Failed to load positions. Please try again.');
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewEmployee = (employee) => {
        // Navigate to employee details
        console.log('View employee:', employee);
        // TODO: Add navigation to employee details page
        // navigate(`/hr/employees/${employee.id}`);
    };

    const handleEditEmployee = (employee) => {
        // Navigate to employee edit
        console.log('Edit employee:', employee);
        // TODO: Add navigation to employee edit page
        // navigate(`/hr/employees/${employee.id}/edit`);
    };

    const formatContractType = (contractType) => {
        if (!contractType || contractType === 'UNKNOWN') return 'N/A';
        return contractType.replace('_', ' ');
    };

    const formatDepartment = (employee) => {
        // Handle different ways department might be structured
        if (employee.department) {
            if (typeof employee.department === 'string') {
                return employee.department;
            } else if (employee.department.name) {
                return employee.department.name;
            }
        }
        return position?.department || 'N/A';
    };

    const formatSalary = (employee) => {
        // ✅ FIXED: Handle salary from EmployeeSummaryDTO structure
        const salary = employee.monthlySalary || employee.salary;
        if (!salary) return 'N/A';

        const contractType = employee.contractType || employee.employmentType || position?.contractType;
        switch (contractType) {
            case 'HOURLY':
                return `$${Number(salary).toLocaleString()}/hr`;
            case 'DAILY':
                return `$${Number(salary).toLocaleString()}/day`;
            case 'MONTHLY':
            default:
                return `$${Number(salary).toLocaleString()}/month`;
        }
    };

    // ✅ FIXED: Employee columns updated for EmployeeSummaryDTO structure
    const columns = [
        {
            header: 'Employee ID',
            accessor: 'id',
            sortable: true,
            render: (row) => (
                <span className="employee-id">
                    {row.employeeId || row.id?.substring(0, 8) || 'N/A'}
                </span>
            )
        },
        {
            header: 'Full Name',
            accessor: 'fullName',
            sortable: true,
            render: (row) => (
                <div className="employee-name">
                    <span className="name">
                        {row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown'}
                    </span>
                    {row.email && (
                        <span className="email">{row.email}</span>
                    )}
                </div>
            )
        },

        {
            header: 'Employment Type',
            accessor: 'contractType',
            sortable: true,
            render: (row) => (
                <span className="status-badge info">
                    {formatContractType(row.contractType || row.employmentType)}
                </span>
            )
        },
        {
            header: 'Date Joined',
            accessor: 'hireDate',
            sortable: true,
            render: (row) => {
                const date = row.hireDate;
                return date ? new Date(date).toLocaleDateString() : 'N/A';
            }
        },
        {
            header: 'Department',
            accessor: 'department',
            sortable: true,
            render: (row) => formatDepartment(row)
        },
        {
            header: 'Monthly Salary',
            accessor: 'monthlySalary',
            sortable: true,
            render: (row) => formatSalary(row)
        },
        {
            header: 'Promotion Eligible',
            accessor: 'eligibleForPromotion',
            sortable: true,
            render: (row) => (
                <span className={`promotion-badge ${row.eligibleForPromotion ? 'eligible' : 'not-eligible'}`}>
                    {row.eligibleForPromotion ? 'Eligible' : 'Not Eligible'}
                </span>
            )
        },
        {
            header: 'Time in Position',
            accessor: 'monthsSinceLastPromotion',
            sortable: true,
            render: (row) => {
                const months = row.monthsSinceLastPromotion || 0;
                if (months < 12) {
                    return `${months} months`;
                } else {
                    const years = Math.floor(months / 12);
                    const remainingMonths = months % 12;
                    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
                }
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                    {row.status || 'Unknown'}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: <FiEye />,
            onClick: handleViewEmployee,
            className: 'primary',
        },
        {
            label: 'Edit',
            icon: <FiEdit />,
            onClick: handleEditEmployee,
            className: 'secondary',
        }
    ];

    return (
        <div className="position-employees">
            {/* Statistics Cards */}
            <div className="employees-stats">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Employees</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon active">
                        <FiUserCheck />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon inactive">
                        <FiUserX />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">Inactive</span>
                    </div>
                </div>
            </div>

            {/* Position Summary */}
            <div className="position-summary">
                <div className="summary-item">
                    <label>Position</label>
                    <span>{position?.positionName || 'N/A'}</span>
                </div>
                <div className="summary-item">
                    <label>Department</label>
                    <span>{position?.department || 'N/A'}</span>
                </div>
                <div className="summary-item">
                    <label>Contract Type</label>
                    <span>{position?.contractType ? position.contractType.replace('_', ' ') : 'N/A'}</span>
                </div>
                <div className="summary-item">
                    <label>Experience Level</label>
                    <span>
                        {position?.experienceLevel ?
                            position.experienceLevel.replace('_', ' ').toLowerCase()
                                .replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'
                        }
                    </span>
                </div>
            </div>

         
            {/* Employees Data Table */}
                <DataTable
                    data={employees}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    tableTitle="Employees in this Position"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={['contractType', 'status', 'eligibleForPromotion']}
                    defaultSortField="fullName"
                    defaultSortDirection="asc"
                    showAddButton={true}
                    addButtonText="Assign Employee"
                    addButtonIcon={<FiPlus />}
                    onAddClick={() => {
                        console.log('Assign employee clicked');
                        // TODO: Open assign employee modal or navigate to assign page
                    }}
                    customActions={[
                        {
                            label: 'Refresh',
                            icon: '🔄',
                            onClick: fetchEmployees,
                            disabled: loading,
                            className: 'btn-secondary'
                        }
                    ]}
                    emptyMessage={
                        <div className="position-empty-state">
                            <FiUsers className="empty-icon" />
                            <h4>No Employees Assigned</h4>
                            <p>This position doesn't have any employees assigned yet.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    console.log('Assign first employee clicked');
                                    // TODO: Open assign employee modal or navigate to assign page
                                }}
                            >
                                <FiPlus /> Assign First Employee
                            </button>
                        </div>
                    }
                />

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="action-card">
                    <div className="action-icon">
                        <FiPlus />
                    </div>
                    <div className="action-content">
                        <h4>Assign Employee</h4>
                        <p>Add an existing employee to this position</p>
                        <button className="btn btn-outline">Assign</button>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon">
                        <FiUsers />
                    </div>
                    <div className="action-content">
                        <h4>Bulk Operations</h4>
                        <p>Perform bulk actions on multiple employees</p>
                        <button className="btn btn-outline">Manage</button>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon">
                        <FiUserCheck />
                    </div>
                    <div className="action-content">
                        <h4>Promotion Report</h4>
                        <p>View promotion eligibility and history</p>
                        <button className="btn btn-outline">View Report</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PositionEmployees;