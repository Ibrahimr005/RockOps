// EmployeeDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const EmployeeDetails = () => {
    const { id } = useParams();
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
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/hr/employee/${id}`, {
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
            setEmployee(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching employee details:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    // Format date for display - moved to a utility function to be used by all tabs
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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
            <div className="employee-details-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading employee details...</p>
                </div>
            </div>
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
        if (employee.jobPosition && employee.jobPosition.department) {
            return employee.jobPosition.department;
        }
        return employee.department || 'Department Not Assigned';
    };

    const getSiteName = () => {
        if (employee.site && employee.site.name) {
            return employee.site.name;
        }
        return employee.siteName || 'No site assigned';
    };

    return (
        <div className="employee-details-container">
            <div className="employee-details-content">
                {/* Minimal Info Bar */}
                <div className="employee-info-bar">
                    <div className="employee-details-avatar">
                        <img
                            src={employee.photoUrl || 'https://via.placeholder.com/48?text=?'}
                            alt={`${employee.firstName} ${employee.lastName}`}
                        />
                        <div className={`employee-status-indicator ${employee.status?.toLowerCase() || 'active'}`}></div>
                    </div>

                    <div className="employee-basic-info">
                        <h1 className="employee-name">
                            {employee.fullName || `${employee.firstName} ${employee.middleName ? employee.middleName + ' ' : ''}${employee.lastName}`}
                        </h1>
                        <div className="employee-meta">
                            <span className="position">{getPosition()}</span>
                            <span className="separator">•</span>
                            <span className="department">{getDepartment()}</span>
                            <span className="separator">•</span>
                            <span className="site">{getSiteName()}</span>
                        </div>
                    </div>

                    <div className="employee-quick-stats">
                        <div className="stat-item">
                            <span className="stat-label">Status</span>
                            <span className={`stat-value status-badge ${employee.status?.toLowerCase() || 'active'}`}>
                                {employee.status || 'Active'}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Employee ID</span>
                            <span className="stat-value">#{employee.id}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Hire Date</span>
                            <span className="stat-value">{formatDate(employee.hireDate)}</span>
                        </div>
                    </div>
                </div>

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
                        {activeTab === 'personal' && <PersonalInfoTab employee={employee} formatDate={formatDate} />}
                        {activeTab === 'employment' && <EmploymentTab employee={employee} formatDate={formatDate} getPosition={getPosition} getDepartment={getDepartment} getSiteName={getSiteName} />}
                        {activeTab === 'documents' && <DocumentsTab employee={employee} />}
                        {activeTab === 'compensation' && <CompensationTab employee={employee} formatCurrency={formatCurrency} />}
                        {activeTab === 'attendance' && <AttendanceTab employee={employee} formatDate={formatDate} />}
                        {activeTab === 'deductions' && <DeductionsTab employee={employee} formatCurrency={formatCurrency} />}
                        {activeTab === 'commissions' && <CommissionsTab employee={employee} formatCurrency={formatCurrency} />}
                        {activeTab === 'loans' && <LoansTab employee={employee} formatCurrency={formatCurrency} />}
                        {activeTab === 'payslips' && <PayslipsTab employee={employee} formatCurrency={formatCurrency} />}
                        {activeTab === 'vacation' && <VacationTab employee={employee} formatDate={formatDate} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetails;