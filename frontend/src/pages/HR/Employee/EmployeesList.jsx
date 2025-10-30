import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaEdit, FaTrash,  FaUser } from 'react-icons/fa';
import './EmployeesList.scss';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import EmployeeAvatar from '../../../components/common/EmployeeAvatar';
import AddEmployeeModal from './modals/AddEmployeeModal.jsx';
import EditEmployeeModal from './modals/EditEmployeeModal.jsx';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { employeeService } from '../../../services/hr/employeeService.js';
import { hrEmployeeService } from '../../../services/hr/hrEmployeeService.js';
import { departmentService } from '../../../services/hr/departmentService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';
import { siteService } from '../../../services/siteService.js';

const EmployeesList = () => {
    const { showSuccess, showError } = useSnackbar();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(null);


    // Fetch departments and positions for dropdowns
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [sites, setSites] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);

    // Fetch employees data from the API
    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await employeeService.getAll();
            const data = response.data;

            // DEBUG: Log the first employee to see what status values we're getting
            if (data && data.length > 0) {
                // console.log('First employee data:', data[0]);

            }

            setEmployees(data);
            setFilteredEmployees(data);
            setLoading(false);

            // Extract unique departments and positions for filters
            const depts = [...new Set(data.map(emp => {
                // Handle department as object or string
                if (emp.jobPositionDepartment && typeof emp.jobPositionDepartment === 'object') {
                    return emp.jobPositionDepartment.name;
                }
                return emp.jobPositionDepartment;
            }).filter(Boolean))];

            // Extract unique job positions from jobPositionName
            const pos = [...new Set(data.map(emp => emp.jobPositionName).filter(Boolean))];
            setDepartments(depts);
            setPositions(pos);

        } catch (error) {
            console.error('Error fetching employees:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load employees';
            setError(errorMessage);
            showError('Failed to load employees. Please try again.');
            setLoading(false);
        }
    };

    // ... (keep all other functions the same until getStatusBadge)

    // Get status badge styling - IMPROVED
    const getStatusBadge = (status) => {

        const statusColors = {
            'ACTIVE': 'success',
            'INACTIVE': 'secondary',
            'INVITED': 'info',
            'ON_LEAVE': 'warning',
            'SUSPENDED': 'danger',
            'TERMINATED': 'danger'
        };

        // Handle null, undefined, or empty status
        const displayStatus = status || 'ACTIVE'; // Default to ACTIVE if no status
        const colorClass = statusColors[displayStatus] || 'secondary';

        return (
            <span className={`status-badge status-badge--${colorClass}`}>
                {displayStatus}
            </span>
        );
    };

    // Helper function to safely get department name
    const getDepartmentName = (employee) => {
        if (!employee.jobPositionDepartment) return 'N/A';

        // If department is an object, get its name property
        if (typeof employee.jobPositionDepartment === 'object' && employee.jobPositionDepartment.name) {
            return employee.jobPositionDepartment.name;
        }

        // If department is already a string
        if (typeof employee.jobPositionDepartment === 'string') {
            return employee.jobPositionDepartment;
        }

        return 'N/A';
    };

    // Define columns for DataTable
    const columns = [
        {
            header: 'Photo',
            accessor: 'photoUrl',
            sortable: false,
            width: '80px',
            render: (employee, photoUrl) => (
                <EmployeeAvatar
                    photoUrl={photoUrl}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    size="medium"
                />
            )
        },
        {
            header: 'Name',
            accessor: 'fullName',
            render: (employee) => (
                <div className="employee-name">
                    <div className="employee-name__primary">
                        {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                    </div>
                    <div className="employee-name__secondary">
                        {employee.email}
                    </div>
                </div>
            )
        },
        {
            header: 'Position',
            accessor: 'position',
            render: (employee) => (
                <div className="employee-position">
                    <div className="employee-position__title">
                        {employee.position || employee.jobPositionName || 'N/A'}
                    </div>
                    <div className="employee-position__department">
                        {getDepartmentName(employee)}
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (employee) => {

                return getStatusBadge(employee.status);
            }
        },
        {
            header: 'Type',
            accessor: 'contractType',
            render: (employee) => (
                <span className="contract-type">
                    {employee.jobPositionType ? employee.jobPositionType.replace('_', ' ') : 'N/A'}
                </span>
            )
        },
        {
            header: 'Salary',
            accessor: 'monthlySalary',
            render: (employee) => (
                <div className="salary-info">
                    <div className="salary-info__monthly">
                        {formatCurrency(employee.monthlySalary)}
                    </div>
                    <div className="salary-info__period">
                        {/* {employee.jobPositionType === 'HOURLY' ? 'per hour' :
                         employee.jobPositionType === 'DAILY' ? 'per day' : */}
                        {/* ' */}
                        per month
                        {/* '} */}
                    </div>
                </div>
            )
        },
        {
            header: 'Site',
            accessor: 'siteName',
            render: (employee) => employee.siteName || 'N/A'
        },
        {
            header: 'Hire Date',
            accessor: 'hireDate',
            render: (employee) => formatDate(employee.hireDate)
        }
    ];

    // ... (rest of the functions remain the same)

    // Fetch job positions for the dropdown
    const fetchJobPositions = async () => {
        try {
            const response = await jobPositionService.getAll();
            setJobPositions(response.data);
        } catch (error) {
            console.error('Error fetching job positions:', error);
            showError('Failed to load job positions');
        }
    };

    // Fetch sites for the dropdown
    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data);
        } catch (error) {
            console.error('Error fetching sites:', error);
            showError('Failed to load sites');
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchEmployees();
        fetchJobPositions();
        fetchSites();
    }, []);

    // Apply filters to employees
    useEffect(() => {
        let filtered = employees;

        // Apply department filter
        if (departmentFilter) {
            filtered = filtered.filter(emp => {
                const deptName = getDepartmentName(emp);
                return deptName === departmentFilter;
            });
        }

        // Apply position filter
        if (positionFilter) {
            filtered = filtered.filter(emp =>
                emp.jobPositionName === positionFilter
            );
        }

        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(emp => emp.status === statusFilter);
        }

        // Apply type filter (jobPositionType)
        if (typeFilter) {
            filtered = filtered.filter(emp => emp.jobPositionType === typeFilter);
        }

        setFilteredEmployees(filtered);
    }, [employees, departmentFilter, positionFilter, statusFilter, typeFilter]);

    // Handle adding a new employee
    // In EmployeesList.jsx

    const handleAddEmployee = async (employeeData, photoFile, idFrontFile, idBackFile) => {
        try {
            setIsSubmitting(true);

            // Create FormData
            const formData = new FormData();

            // Add employeeData as JSON blob
            const employeeDataBlob = new Blob([JSON.stringify(employeeData)], {
                type: 'application/json'
            });
            formData.append('employeeData', employeeDataBlob);

            // Add files if they exist
            if (photoFile) {
                formData.append('photo', photoFile);
            }
            if (idFrontFile) {
                formData.append('idFrontImage', idFrontFile);
            }
            if (idBackFile) {
                formData.append('idBackImage', idBackFile);
            }

            // Call the service
            await hrEmployeeService.employee.create(formData);
            showSuccess('Employee added successfully!');

            // Refresh the list and close modal
            await fetchEmployees();
            setShowAddModal(false);

            // Show success message
        } catch (error) {
            console.error('Error adding employee:', error);

            showError(
                error.response?.data?.message || 'Failed to add employee. Please try again.'
            );
            // Show error message
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditEmployee = async (employeeData, photoFile, idFrontFile, idBackFile) => {
        try {
            setIsSubmitting(true);

            // Create FormData
            const formData = new FormData();

            // Add employeeData as JSON blob
            const employeeDataBlob = new Blob([JSON.stringify(employeeData)], {
                type: 'application/json'
            });
            formData.append('employeeData', employeeDataBlob);

            // Add files if they exist
            if (photoFile) {
                formData.append('photo', photoFile);
            }
            if (idFrontFile) {
                formData.append('idFrontImage', idFrontFile);
            }
            if (idBackFile) {
                formData.append('idBackImage', idBackFile);
            }

            // Call the service with employee ID
            await hrEmployeeService.employee.update(selectedEmployee.id, formData);
            showSuccess('Employee updated successfully!');

            // Refresh the list and close modal
            await fetchEmployees();
            setShowEditModal(false);
            setSelectedEmployee(null);
            // Show success message
        } catch (error) {
            console.error('Error updating employee:', error);

            showError(
                error.response?.data?.message || 'Failed to update employee. Please try again.'
            );
            // Show error message
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (employeeId) => {
        try {
            const confirmed = window.confirm('Are you sure you want to delete this employee? This action cannot be undone.');

            if (!confirmed) return;

            setIsSubmitting(true);

            await hrEmployeeService.employee.delete(employeeId);

            showSuccess('Employee deleted successfully!');

            // Refresh the employee list
            await fetchEmployees();

        } catch (error) {
            console.error('Error deleting employee:', error);
            showError(
                error.response?.data?.message || 'Failed to delete employee. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    // Navigate to employee details
    const handleRowClick = (employee) => {
        // Navigate to employee details page
        window.location.href = `/hr/employee-details/${employee.id}`;
    };

    // Open edit modal with employee data
    const handleEditClick = (employee) => {
        setSelectedEmployee(employee);
        setShowEditModal(true);
    };

    // Format currency for display
    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    // Define filterable columns - removed Department from here
    const filterableColumns = [
        { header: 'Name', accessor: 'fullName' },
        { header: 'Email', accessor: 'email' }
    ];

    // Define custom filters - Position, Department, Status, and Contract Type as dropdowns
    const customFilters = [
        {
            label: 'Department',
            component: (
                <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            )
        },
        {
            label: 'Position',
            component: (
                <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Positions</option>
                    {positions.map(position => (
                        <option key={position} value={position}>{position}</option>
                    ))}
                </select>
            )
        },
        {
            label: 'Status',
            component: (
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="INVITED">Invited</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                </select>
            )
        },
        {
            label: 'Contract Type',
            component: (
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Types</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly</option>
                </select>
            )
        }
    ];

    // Define actions for each row
    const actions = [

        {
            label: 'Edit',
            icon: <FaEdit />,
            className: 'primary',
            onClick: (employee) => handleEditClick(employee)
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            className: 'danger',
            onClick: (employee) => handleDeleteEmployee(employee.id)
        }
    ];

    // If there's an error fetching data and not loading
    if (error && !loading) {
        return (
            <div className="error-container">
                <p>Error: {error}</p>
                <button onClick={fetchEmployees}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="employees-container">
            <PageHeader
                title="Employees"
                subtitle="Manage employee records, assignments, and organizational structure"
            />

            {/* DataTable Component */}
            <DataTable
                data={filteredEmployees}
                columns={columns}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                customFilters={customFilters}
                onRowClick={handleRowClick}
                actions={actions}
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultItemsPerPage={25}
                defaultSortField="fullName"
                defaultSortDirection="asc"
                className="employees-datatable"
                showAddButton={true}
                addButtonText="Add Employee"
                addButtonIcon={<FaUserPlus />}
                onAddClick={() => setShowAddModal(true)}
                showExportButton={true}
                exportFileName="employees"
                exportButtonText="Export Employees"
            />

            {showAddModal && (
                <AddEmployeeModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddEmployee}
                    jobPositions={jobPositions}
                    sites={sites}
                />
            )}

            {showEditModal && selectedEmployee && (
                <EditEmployeeModal
                    employee={selectedEmployee}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEmployee(null);
                    }}
                    onSave={handleEditEmployee}
                    jobPositions={jobPositions}
                    sites={sites}
                />
            )}
        </div>
    );
};

export default EmployeesList;