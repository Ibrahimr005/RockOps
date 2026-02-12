import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiPlus, FiEye, FiEdit, FiUserCheck, FiUserX, FiRefreshCw } from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import StatisticsCards from '../../../../../components/common/StatisticsCards/StatisticsCards';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../../../services/hr/jobPositionService.js';

const PositionEmployees = ({ position, positionId, onRefresh }) => {
    const navigate = useNavigate();
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
        try {
            const response = await jobPositionService.getEmployees(positionId);
            const data = response.data;

            console.log(data);
            const employeeList = Array.isArray(data) ? data : [];
            setEmployees(employeeList);

            // Calculate statistics
            const activeCount = employeeList.filter(emp => emp.status === 'ACTIVE').length;
            const inactiveCount = employeeList.filter(emp => emp.status !== 'ACTIVE').length;

            setStats({
                total: employeeList.length,
                active: activeCount,
                inactive: inactiveCount
            });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load employees';
            showError(errorMessage);
            setEmployees([]);
            setStats({ total: 0, active: 0, inactive: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleViewEmployee = (employee) => {
        navigate(`/hr/employee-details/${employee.id}`);
    };

    const handleEditEmployee = (employee) => {
        navigate(`/hr/employees/${employee.id}/edit`);
    };

    const handleRowClick = (employee) => {
        navigate(`/hr/employee-details/${employee.id}`);
    };

    const handleAssignEmployee = () => {
        console.log('Assign employee clicked');
        // TODO: Open assign employee modal or navigate to assign page
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
            <StatisticsCards
                cards={[
                    { icon: <FiUsers />, label: "Total Employees", value: stats.total, variant: "primary" },
                    { icon: <FiUserCheck />, label: "Active", value: stats.active, variant: "success" },
                    { icon: <FiUserX />, label: "Inactive", value: stats.inactive, variant: "danger" },
                ]}
                columns={3}
            />

            {/* Position Summary */}
            {/*<div className="position-summary">*/}
            {/*    <div className="summary-item">*/}
            {/*        <label>Position</label>*/}
            {/*        <span>{position?.positionName || 'N/A'}</span>*/}
            {/*    </div>*/}
            {/*    <div className="summary-item">*/}
            {/*        <label>Department</label>*/}
            {/*        <span>{position?.departmentName || 'N/A'}</span>*/}
            {/*    </div>*/}
            {/*    <div className="summary-item">*/}
            {/*        <label>Contract Type</label>*/}
            {/*        <span>{position?.contractType ? position.contractType.replace('_', ' ') : 'N/A'}</span>*/}
            {/*    </div>*/}
            {/*    <div className="summary-item">*/}
            {/*        <label>Experience Level</label>*/}
            {/*        <span>*/}
            {/*            {position?.experienceLevel ?*/}
            {/*                position.experienceLevel.replace('_', ' ').toLowerCase()*/}
            {/*                    .replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'*/}
            {/*            }*/}
            {/*        </span>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/* Employees Data Table */}
            <DataTable
                data={employees}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={['contractType', 'status', 'eligibleForPromotion']}
                defaultSortField="fullName"
                defaultSortDirection="asc"
                showAddButton={true}
                addButtonText="Assign Employee"
                addButtonIcon={<FiPlus />}
                onAddClick={handleAssignEmployee}
                onRowClick={handleRowClick}
                customActions={[
                    {
                        label: 'Refresh',
                        icon: <FiRefreshCw />,
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
                            onClick={handleAssignEmployee}
                        >
                            <FiPlus /> Assign First Employee
                        </button>
                    </div>
                }
            />
        </div>
    );
};

export default PositionEmployees;