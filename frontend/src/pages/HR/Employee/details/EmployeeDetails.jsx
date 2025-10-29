// EmployeeDetails.jsx
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

            console.log('Employee details response:', response);
            console.log('Employee details data:', response.data);

            setEmployee(response.data);
        } catch (error) {
            console.error('Error fetching employee details:', error);
            setError(error.message || 'Failed to fetch employee details');
        } finally {
            setLoading(false);
        }
    };

    // Format date for display - moved to a utility function to be used by all tabs
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        try {
            // Handle both ISO string and LocalDate format from backend
            let date;
            if (typeof dateString === 'string') {
                // Handle ISO string format (YYYY-MM-DD)
                date = new Date(dateString);
            } else if (dateString instanceof Date) {
                date = dateString;
            } else {
                // Handle LocalDate object format
                date = new Date(dateString + 'T00:00:00');
            }

            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return 'Not specified';
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Date string:', dateString);
            return 'Not specified';
        }
    };

    // Calculate days since hire
    const calculateDaysSinceHire = (hireDate) => {
        if (!hireDate) return 'N/A';
        try {
            const today = new Date();
            let hire;

            if (typeof hireDate === 'string') {
                hire = new Date(hireDate);
            } else if (hireDate instanceof Date) {
                hire = hireDate;
            } else {
                hire = new Date(hireDate + 'T00:00:00');
            }

            if (isNaN(hire.getTime())) {
                console.warn('Invalid hire date:', hireDate);
                return 'N/A';
            }

            const diffTime = today - hire;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} days`;
        } catch (error) {
            console.error('Error calculating days since hire:', error);
            return 'N/A';
        }
    };

    // Format currency for display - moved to a utility function to be used by all tabs
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <ContentLoader
                context="employee-details"
                message="Loading employee information..."
                fadeIn={true}
                size="large"
            />
        );
    }

    if (error) {
        return (
            <div className="employee-details-container">
                <div className="error-message">
                    <h2>Error Loading Data</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={() => fetchEmployeeDetails()}>Try Again</button>
                        <button onClick={() => navigate('/hr/employees')}>Back to List</button>
                    </div>
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

    // Helper functions to get employee data - moved here for reuse across tabs
    const getPosition = () => {
        if (employee.jobPosition && employee.jobPosition.positionName) {
            return employee.jobPosition.positionName;
        }
        return employee.position || 'Position Not Assigned';
    };

    const getDepartment = () => {
        if (employee.jobPosition?.department) {
            // If department is an object with a name property
            if (typeof employee.jobPosition.department === 'object' && employee.jobPosition.department.name) {
                return employee.jobPosition.department.name;
            }
            // If department is already a string
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

    // Get full name
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
                onClick: () => console.log('Edit employee'), // Implement edit functionality
                className: 'primary'
            },
            {
                text: 'Export Report',
                icon: <FaFileDownload/>,
                onClick: () => console.log('Export report'), // Implement export functionality
                className: 'secondary'
            }
        ];
    };

    return (
        <div className="employee-details-container">
            <div className="employee-details-content">
                {/* IntroCard replacing the employee-info-bar */}
                <IntroCard
                    title={getFullName()}
                    label="EMPLOYEE DETAILS"
                    subtitle={`Employee ID: #${employee.id} • Hired ${formatDate(employee.hireDate)} (${calculateDaysSinceHire(employee.hireDate)})`}
                    breadcrumbs={getBreadcrumbs()}
                    lightModeImage={employee.photoUrl || null}
                    darkModeImage={employee.photoUrl||null}// Pass URL or null
                    icon={employee.photoUrl ? null : <FaUser/>}  // Show icon only when no photo
                    stats={getEmployeeStats()}
                    actionButtons={getActionButtons()}
                    className="employee-intro-card"
                />

                {/* Tabs Section */}
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

                    <div className="tab-content" data-active-tab={
                        activeTab === 'personal' ? 'Personal Information' :
                            activeTab === 'employment' ? 'Employment Information' :
                                activeTab === 'documents' ? 'Documents' :
                                    activeTab === 'compensation' ? 'Compensation' :
                                        activeTab === 'attendance' ? 'Attendance' :
                                            activeTab === 'deductions' ? 'Deductions' :
                                                activeTab === 'commissions' ? 'Commissions' :
                                                    activeTab === 'loans' ? 'Loans' :
                                                        activeTab === 'payslips' ? 'Payslips' : 'Vacation'
                    }>
                        {activeTab === 'personal' && <PersonalInfoTab employee={employee} formatDate={formatDate}/>}
                        {activeTab === 'employment' &&
                            <EmploymentTab employee={employee} formatDate={formatDate} getPosition={getPosition}
                                           getDepartment={getDepartment} getSiteName={getSiteName}/>}
                        {activeTab === 'documents' && <DocumentsTab employee={employee}/>}
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