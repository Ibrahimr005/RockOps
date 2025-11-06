// EmployeeDetails.jsx - Updated version with refresh callback
import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import './EmployeeDetails.scss';

// Import tab components
import PersonalInfoTab from '../tabs/PersonalInfoTab.jsx';
import EmploymentTab from '../tabs/EmploymentTab.jsx';
import DocumentsTab from '../tabs/DocumentsTab.jsx';
import CompensationTab from '../tabs/CompensationTab.jsx';
import AttendanceTab from '../tabs/AttendanceTab.jsx';
import DeductionsTab from '../tabs/DeductionsTab.jsx';
import CommissionsTab from '../tabs/CommissionsTab.jsx';
import LoansTab from '../tabs/LoansTab.jsx';
import PayslipsTab from '../tabs/PayslipsTab.jsx';
import VacationTab from '../tabs/VacationTab.jsx';
import IntroCard from "../../../../components/common/IntroCard/IntroCard.jsx";
import ContentLoader from "../../../../components/common/ContentLoader/ContentLoader.jsx";
import {FaBuilding, FaEdit, FaFileDownload, FaMapMarkerAlt, FaUser} from "react-icons/fa";
import {FiBriefcase, FiHome, FiUsers} from "react-icons/fi";
import {hrEmployeeService} from "../../../../services/hr/hrEmployeeService.js";

const EmployeeDetails = () => {
    const {id} = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('personal');

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id]);

    const fetchEmployeeDetails = async () => {
        try {
            setLoading(true);
            const response = await hrEmployeeService.employee.getById(id);
            setEmployee(response.data || response);
            setError(null);
        } catch (err) {
            console.error('Error fetching employee details:', err);
            setError(err.message || 'Failed to load employee details');
        } finally {
            setLoading(false);
        }
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate days since hire
    const calculateDaysSinceHire = (hireDate) => {
        if (!hireDate) return '';
        const hire = new Date(hireDate);
        const today = new Date();
        const diffTime = Math.abs(today - hire);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) {
            return `${diffDays} days`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''}`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} year${years > 1 ? 's' : ''}`;
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="employee-details-container">
                <ContentLoader text="Loading employee details..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="employee-details-container">
                <div className="error-message">
                    <h2>Error Loading Employee</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/hr/employees')}>Back to Employees List</button>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="employee-details-container">
                <div className="error-message">
                    <h2>Employee Not Found</h2>
                    <p>The requested employee could not be found.</p>
                    <button onClick={() => navigate('/hr/employees')}>Back to Employees List</button>
                </div>
            </div>
        );
    }

    // Helper functions to get employee data
    const getPosition = () => {
        if (employee.jobPosition && employee.jobPosition.positionName) {
            return employee.jobPosition.positionName;
        }
        return employee.position || 'Position Not Assigned';
    };

    const getDepartment = () => {
        if (employee.jobPosition?.department) {
            if (typeof employee.jobPosition.department === 'object' && employee.jobPosition.department.name) {
                return employee.jobPosition.department.name;
            }
            if (typeof employee.jobPosition.department === 'string') {
                return employee.jobPosition.department;
            }
        }
        return 'Department Not Assigned';
    };

    const getSiteName = () => {
        if (employee.site && employee.site.name) {
            return employee.site.name;
        }
        return employee.siteName || 'No site assigned';
    };

    const getFullName = () => {
        return employee.fullName || `${employee.firstName} ${employee.middleName ? employee.middleName + ' ' : ''}${employee.lastName}`;
    };

    // IntroCard configuration
    const getBreadcrumbs = () => {
        return [
            {
                label: 'Home',
                icon: <FiHome/>,
                onClick: () => navigate('/')
            },
            {
                label: 'HR',
                onClick: () => navigate('/hr')
            },
            {
                label: 'Employees',
                icon: <FiUsers/>,
                onClick: () => navigate('/hr/employees')
            },
            {
                label: getFullName()
            }
        ];
    };

    const getEmployeeStats = () => {
        return [
            {
                value: getPosition(),
                label: 'Position',
                icon: <FiBriefcase/>
            },
            {
                value: getDepartment(),
                label: 'Department',
                icon: <FaBuilding/>
            },
            {
                value: getSiteName(),
                label: 'Site',
                icon: <FaMapMarkerAlt/>
            },
            {
                value: employee.status || 'Active',
                label: 'Status',
                className: `status-badge ${employee.status?.toLowerCase() || 'active'}`
            }
        ];
    };

    const getActionButtons = () => {
        return [
            {
                text: 'Edit Employee',
                icon: <FaEdit/>,
                onClick: () => navigate(`/hr/employees/edit/${id}`),
                className: 'primary'
            },
            {
                text: 'Export Report',
                icon: <FaFileDownload/>,
                onClick: () => console.log('Export report'),
                className: 'secondary'
            }
        ];
    };

    return (
        <div className="employee-details-container">
            <div className="employee-details-content">
                <IntroCard
                    title={getFullName()}
                    label="EMPLOYEE DETAILS"
                    subtitle={`Employee ID: #${employee.id} • Hired ${formatDate(employee.hireDate)} (${calculateDaysSinceHire(employee.hireDate)})`}
                    breadcrumbs={getBreadcrumbs()}
                    lightModeImage={employee.photoUrl || null}
                    darkModeImage={employee.photoUrl || null}
                    icon={employee.photoUrl ? null : <FaUser/>}
                    stats={getEmployeeStats()}
                    actions={getActionButtons()}
                />

                <div className="employee-details-tabs">
                    <div className="tabs-header">
                        <button
                            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            Personal Info
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'employment' ? 'active' : ''}`}
                            onClick={() => setActiveTab('employment')}
                        >
                            Employment
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                            onClick={() => setActiveTab('documents')}
                        >
                            Documents
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'compensation' ? 'active' : ''}`}
                            onClick={() => setActiveTab('compensation')}
                        >
                            Compensation
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('attendance')}
                        >
                            Attendance
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'deductions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('deductions')}
                        >
                            Deductions
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'commissions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('commissions')}
                        >
                            Commissions
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'loans' ? 'active' : ''}`}
                            onClick={() => setActiveTab('loans')}
                        >
                            Loans
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'payslips' ? 'active' : ''}`}
                            onClick={() => setActiveTab('payslips')}
                        >
                            Payslips
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'vacation' ? 'active' : ''}`}
                            onClick={() => setActiveTab('vacation')}
                        >
                            Vacation
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'personal' && <PersonalInfoTab employee={employee} formatDate={formatDate}/>}
                        {activeTab === 'employment' &&
                            <EmploymentTab employee={employee} formatDate={formatDate} getPosition={getPosition}
                                           getDepartment={getDepartment} getSiteName={getSiteName}/>}
                        {activeTab === 'documents' && (
                            <DocumentsTab
                                employee={employee}
                                onRefresh={fetchEmployeeDetails}
                            />
                        )}
                        {activeTab === 'compensation' &&
                            <CompensationTab employee={employee} formatCurrency={formatCurrency}/>}
                        {activeTab === 'attendance' && <AttendanceTab employee={employee} formatDate={formatDate}/>}
                        {activeTab === 'deductions' &&
                            <DeductionsTab employee={employee} formatCurrency={formatCurrency}/>}
                        {activeTab === 'commissions' &&
                            <CommissionsTab employee={employee} formatCurrency={formatCurrency}/>}
                        {activeTab === 'loans' && <LoansTab employee={employee} formatCurrency={formatCurrency}/>}
                        {activeTab === 'payslips' && <PayslipsTab employee={employee} formatCurrency={formatCurrency}/>}
                        {activeTab === 'vacation' && <VacationTab employee={employee} formatDate={formatDate}/>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetails;