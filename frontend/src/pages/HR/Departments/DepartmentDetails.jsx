import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {FiUsers, FiBriefcase, FiEdit, FiArrowLeft, FiCalendar, FiTrendingUp, FiHome} from 'react-icons/fi';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { departmentService } from '../../../services/hr/departmentService.js';
import { jobPositionService } from '../../../services/hr/jobPositionService.js';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import DataTable from '../../../components/common/DataTable/DataTable';
import DepartmentModal from './DepartmentModal';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './DepartmentDetails.scss';
import {FaBuilding} from "react-icons/fa";
import IntroCard from "../../../components/common/IntroCard/IntroCard.jsx";

const DepartmentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    const [department, setDepartment] = useState(null);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Statistics state
    const [stats, setStats] = useState({
        totalPositions: 0,
        totalEmployees: 0,
        activePositions: 0,
        vacantPositions: 0
    });

    useEffect(() => {
        if (id) {
            fetchDepartmentDetails();
        }
    }, [id]);

    const fetchDepartmentDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch department details
            const deptResponse = await departmentService.getById(id);
            const departmentData = deptResponse.data;
            console.log("Department Details Response",departmentData);
            setDepartment(departmentData);

            // Extract positions and employees from department data
            const departmentPositions = departmentData.jobPositions || [];
            setPositions(departmentPositions);

            // Calculate statistics
            const totalPositions = departmentPositions.length;
            const activePositions = departmentPositions.filter(pos => pos.active).length;
            const totalEmployees = departmentPositions.reduce((sum, pos) => sum + (pos.employeeCount || 0), 0);
            const vacantPositions = totalPositions - activePositions;

            setStats({
                totalPositions,
                totalEmployees,
                activePositions,
                vacantPositions
            });

            // Flatten employees from all positions
            const allEmployees = [];
            departmentPositions.forEach(position => {
                if (position.employees) {
                    position.employees.forEach(emp => {
                        allEmployees.push({
                            ...emp,
                            positionName: position.positionName
                        });
                    });
                }
            });
            setEmployees(allEmployees);

        } catch (err) {
            console.error('Error fetching department details:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load department details';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSuccess = () => {
        fetchDepartmentDetails();
    };

    const handleBackClick = () => {
        navigate('/hr/departments');
    };

    const handlePositionClick = (position) => {
        navigate(`/hr/positions/${position.id}`);
    };

    const handleEmployeeClick = (employee) => {
        navigate(`/hr/employee-details/${employee.id}`);
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (error || !department) {
        return (
            <div className="department-details-error">
                <div className="error-content">
                    <h2>Department Not Found</h2>
                    <p>{error || 'The requested department could not be found.'}</p>
                    <button onClick={handleBackClick} className="btn-primary">
                        <FiArrowLeft /> Back to Departments
                    </button>
                </div>
            </div>
        );
    }

    // Table columns for positions
    const positionsColumns = [
        {
            header: 'Position Name',
            accessor: 'positionName',
            sortable: true,
            render: (row, value) => (
                <button
                    className="table-link-button"
                    onClick={() => handlePositionClick(row)}
                    title="View position details"
                >
                    <FiBriefcase /> {value}
                </button>
            )
        },
        {
            header: 'Type',
            accessor: 'type',
            sortable: true,
            render: (row, value) => (
                <span className={`status-badge ${value?.toLowerCase() || 'unknown'}`}>
                    {value || 'Not specified'}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'active',
            sortable: true,
            render: (row, value) => (
                <span className={`status-badge ${value ? 'active' : 'inactive'}`}>
                    {value ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Employees',
            accessor: 'employeeCount',
            sortable: true,
            render: (row, value) => (
                <div className="employee-count">
                    <FiUsers /> {value || 0}
                </div>
            )
        }
    ];

    // Table columns for employees
    const employeesColumns = [
        {
            header: 'Employee',
            accessor: 'fullName',
            sortable: true,
            render: (row, value) => (
                <button
                    className="table-link-button"
                    onClick={() => handleEmployeeClick(row)}
                    title="View employee details"
                >
                    <FiUsers /> {value || `${row.firstName} ${row.lastName}`}
                </button>
            )
        },
        {
            header: 'Position',
            accessor: 'positionName',
            sortable: true
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row, value) => (
                <span className={`status-badge ${value?.toLowerCase() || 'unknown'}`}>
                    {value || 'Unknown'}
                </span>
            )
        },
        {
            header: 'Hire Date',
            accessor: 'hireDate',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'Not available'
        }
    ];

    const getBreadcrumbs = () => {
        return [
            {
                label: 'Home',
                icon: <FiHome />,
                onClick: () => navigate('/')
            },
            {
                label: 'HR',
                onClick: () => navigate('/hr')
            },
            {
                label: 'Departments',
                icon: <FaBuilding />,
                onClick: () => navigate('/hr/departments')
            },
            {
                label: department.name
            }
        ];
    };

    const getDepartmentStats = () => {
        return [
            {
                value: stats.totalEmployees || '0',
                label: 'Total Employees'
            },
            {
                value: stats.totalPositions || '0',
                label: 'Job Positions'
            }
        ];
    };

    const getActionButtons = () => {
        return [
            {
                text: 'Edit Department',
                icon: <FiEdit />,
                onClick: () => setIsEditModalOpen(true),
                className: 'primary'
            }
        ];
    };

    // Statistics cards configuration
    const statisticsCards = [
        {
            icon: <FiBriefcase />,
            label: 'Total Positions',
            getValue: () => stats.totalPositions,
            color: 'blue',
            tooltip: 'Total number of positions in this department'
        },
        {
            icon: <FiUsers />,
            label: 'Total Employees',
            getValue: () => stats.totalEmployees,
            color: 'green',
            tooltip: 'Total number of employees in this department'
        },
        {
            icon: <FiTrendingUp />,
            label: 'Active Positions',
            getValue: () => stats.activePositions,
            color: 'yellow',
            tooltip: 'Number of currently active positions'
        },
        {
            icon: <FiCalendar />,
            label: 'Vacant Positions',
            getValue: () => stats.vacantPositions,
            color: 'purple',
            tooltip: 'Number of vacant/inactive positions'
        }
    ];

    return (
        <div className="department-details-container">
            {/* Header */}
            <IntroCard
                title={department.name}
                subtitle={department.departmentNumber}
                label="DEPARTMENT DETAILS"
                breadcrumbs={getBreadcrumbs()}
                icon={<FaBuilding />}
                stats={getDepartmentStats()}
                actionButtons={getActionButtons()}
                className="department-intro-card"
            />

            {/* Statistics Cards - Using the new component */}
            <StatisticsCards
                data={[stats]}
                cards={statisticsCards}
            />

            {/* Positions Table */}
            <div className="department-section">
                <div className="section-header">
                    <h2><FiBriefcase /> Positions in {department.name}</h2>
                </div>
                <DataTable
                    data={positions}
                    columns={positionsColumns}
                    loading={false}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={positionsColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 25, 50]}
                    emptyMessage="No positions found in this department"
                />
            </div>

            {/* Employees Table */}
            <div className="department-section">
                <div className="section-header">
                    <h2><FiUsers /> Employees in {department.name}</h2>
                </div>
                <DataTable
                    data={employees}
                    columns={employeesColumns}
                    loading={false}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={employeesColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 25, 50]}
                    emptyMessage="No employees found in this department"
                />
            </div>

            {/* Edit Modal */}
            <DepartmentModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleEditSuccess}
                department={department}
                title="Edit Department"
            />
        </div>
    );
};

export default DepartmentDetails;