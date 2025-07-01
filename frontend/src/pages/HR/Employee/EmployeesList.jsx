import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaEdit, FaTrash,  FaUser } from 'react-icons/fa';
import './EmployeesList.scss';
import DataTable from '../../../components/common/DataTable/DataTable';
import EmployeeAvatar from '../../../components/common/EmployeeAvatar';
import AddEmployeeModal from './modals/AddEmployeeModal.jsx';
import EditEmployeeModal from './modals/EditEmployeeModal.jsx';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { employeeService } from '../../../services/employeeService';
import { hrEmployeeService } from '../../../services/hrEmployeeService';
import { departmentService } from '../../../services/departmentService';
import { jobPositionService } from '../../../services/jobPositionService';

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
                console.log('First employee data:', data[0]);
                console.log('Status field:', data[0].status);
                console.log('Status type:', typeof data[0].status);
            }

            setEmployees(data);
            setFilteredEmployees(data);
            setLoading(false);

            // Extract unique departments and positions for filters - FIX: Handle department objects
            const depts = [...new Set(data.map(emp => {
                // Handle department as object or string
                if (emp.jobPositionDepartment && typeof emp.jobPositionDepartment === 'object') {
                    return emp.jobPositionDepartment.name;
                }
                return emp.jobPositionDepartment;
            }).filter(Boolean))];

            const pos = [...new Set(data.map(emp => emp.position).filter(Boolean))];
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
        console.log('getStatusBadge called with:', status, 'Type:', typeof status); // DEBUG

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
                console.log('Rendering status for employee:', employee.firstName, 'Status:', employee.status); // DEBUG
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
            // Note: You'll need to create a site service or use the appropriate endpoint
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/site', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setSites(data);
        } catch (error) {
            console.error('Error fetching sites:', error);
            showError('Failed to load sites');
        }
    };

    // Load all necessary data when component mounts
    useEffect(() => {
        fetchEmployees();
        fetchJobPositions();
        fetchSites();
    }, []);

    // Filter employees based on search term and filters
    useEffect(() => {
        let result = employees;

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                employee =>
                    (employee.firstName && employee.firstName.toLowerCase().includes(lowerSearchTerm)) ||
                    (employee.lastName && employee.lastName.toLowerCase().includes(lowerSearchTerm)) ||
                    (employee.email && employee.email.toLowerCase().includes(lowerSearchTerm)) ||
                    (employee.fullName && employee.fullName.toLowerCase().includes(lowerSearchTerm))
            );
        }

        if (departmentFilter) {
            result = result.filter(employee => {
                // Handle department as object or string
                const empDept = employee.jobPositionDepartment;
                if (empDept && typeof empDept === 'object') {
                    return empDept.name === departmentFilter;
                }
                return empDept === departmentFilter;
            });
        }

        if (positionFilter) {
            result = result.filter(employee =>
                employee.position === positionFilter ||
                employee.jobPositionName === positionFilter
            );
        }

        if (statusFilter) {
            result = result.filter(employee => employee.status === statusFilter);
        }

        if (typeFilter) {
            result = result.filter(employee => employee.contractType === typeFilter);
        }

        setFilteredEmployees(result);
    }, [searchTerm, departmentFilter, positionFilter, statusFilter, typeFilter, employees]);

    // Handle adding a new employee
    const handleAddEmployee = async (employeeData, photoFile, idFrontFile, idBackFile) => {
        try {
            setLoading(true);

            console.log("Employee data being sent:", employeeData);

            // Create FormData for multipart/form-data request
            const formData = new FormData();

            // Add employee data as a JSON string
            formData.append("employeeData", new Blob([JSON.stringify(employeeData)], {
                type: "application/json"
            }));

            // Add image files if provided
            if (photoFile) {
                formData.append('photo', photoFile);
                console.log('Added photo file:', photoFile.name);
            }

            if (idFrontFile) {
                formData.append('idFrontImage', idFrontFile);
                console.log('Added ID front file:', idFrontFile.name);
            }

            if (idBackFile) {
                formData.append('idBackImage', idBackFile);
                console.log('Added ID back file:', idBackFile.name);
            }

            // Debug FormData contents (can't directly console.log FormData)
            for (let pair of formData.entries()) {
                console.log(pair[0], pair[1] instanceof Blob ? `Blob: ${pair[1].type}, size: ${pair[1].size}` : pair[1]);
            }

            // Make API request using HR employee service
            const response = await hrEmployeeService.employee.create(formData);
            console.log('Employee added successfully:', response.data);

            // Refresh the employee list
            await fetchEmployees();
            setShowAddModal(false);

            // Show success message
            showSuccess('Employee added successfully!');

        } catch (error) {
            console.error('Error adding employee:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to add employee';
            setError(`Failed to add employee: ${errorMessage}`);
            showError('Failed to add employee. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle editing an employee
    const handleEditEmployee = async (updatedEmployee, photoFile, idFrontFile, idBackFile) => {
        try {
            setLoading(true);

            // Create FormData for multipart/form-data request
            const formData = new FormData();

            // Add employee JSON data
            formData.append('employeeData', JSON.stringify(updatedEmployee));

            // Add image files if provided
            if (photoFile) formData.append('photo', photoFile);
            if (idFrontFile) formData.append('idFrontImage', idFrontFile);
            if (idBackFile) formData.append('idBackImage', idBackFile);

            // Use HR employee service for update
            const response = await hrEmployeeService.employee.update(selectedEmployee.id, formData);

            // Refresh the employee list
            await fetchEmployees();
            setShowEditModal(false);
            setSelectedEmployee(null);

            // Show success message
            showSuccess('Employee updated successfully!');

        } catch (error) {
            console.error('Error updating employee:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update employee';
            setError(`Failed to update employee: ${errorMessage}`);
            showError('Failed to update employee. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle deleting an employee
    const handleDeleteEmployee = async (employeeId) => {
        if (!window.confirm('Are you sure you want to delete this employee?')) {
            return;
        }

        try {
            setLoading(true);

            // Use HR employee service for delete
            await hrEmployeeService.employee.delete(employeeId);

            // Refresh the employee list
            await fetchEmployees();

            // Show success message
            showSuccess('Employee deleted successfully!');

        } catch (error) {
            console.error('Error deleting employee:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete employee';
            setError(`Failed to delete employee: ${errorMessage}`);
            showError('Failed to delete employee. Please try again.');
        } finally {
            setLoading(false);
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

    // Define filterable columns
    const filterableColumns = [
        { header: 'Name', accessor: 'fullName' },
        { header: 'Email', accessor: 'email' },
        { header: 'Position', accessor: 'position' },
        { header: 'Department', accessor: 'jobPositionDepartment' }
    ];

    // Define custom filters
    const customFilters = [
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
        },
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
            <div className="departments-header">
                <div className="employees-header__content">
                    <h1 className="employees-header__title">Employees Directory</h1>
                    <p className="employees-header__subtitle">
                        Manage your workforce and employee information
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <FaUserPlus />
                    <span>Add Employee</span>
                </button>
            </div>

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