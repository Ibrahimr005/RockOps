import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaEye,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaClock,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTimesCircle
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import {payrollService} from '../../../services/payroll/payrollService';
import './EmployeePayrollList.scss';

/**
 * EmployeePayrollList Component
 * Displays detailed list of all employee payrolls for a specific payroll period
 *
 * Features:
 * - Employee payroll table with all calculations
 * - Search and filtering
 * - Export to Excel/CSV
 * - View individual employee details
 * - Financial summary cards
 * - Contract type filtering
 * - Status indicators
 */
const EmployeePayrollList = ({ payrollId, payroll }) => {
    const navigate = useNavigate();
    const [employeePayrolls, setEmployeePayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        monthlyCount: 0,
        dailyCount: 0,
        hourlyCount: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0
    });
    const [filterContractType, setFilterContractType] = useState('ALL');

    useEffect(() => {
        fetchEmployeePayrolls();
    }, [payrollId]);

    const fetchEmployeePayrolls = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getEmployeePayrolls(payrollId);
            setEmployeePayrolls(data);
            calculateStats(data);
        } catch (error) {
            console.error('Error fetching employee payrolls:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (payrolls) => {
        const stats = {
            totalEmployees: payrolls.length,
            monthlyCount: payrolls.filter(p => p.contractType === 'MONTHLY').length,
            dailyCount: payrolls.filter(p => p.contractType === 'DAILY').length,
            hourlyCount: payrolls.filter(p => p.contractType === 'HOURLY').length,
            totalGross: payrolls.reduce((sum, p) => sum + (p.grossPay || 0), 0),
            totalDeductions: payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
            totalNet: payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0)
        };
        setStats(stats);
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'EGP 0.00';
        return `EGP ${Number(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const getContractTypeBadge = (type) => {
        const badges = {
            MONTHLY: { className: 'badge-monthly', label: 'Monthly' },
            DAILY: { className: 'badge-daily', label: 'Daily' },
            HOURLY: { className: 'badge-hourly', label: 'Hourly' }
        };
        const badge = badges[type] || { className: 'badge-default', label: type };
        return <span className={`contract-badge ${badge.className}`}>{badge.label}</span>;
    };

    const getAttendanceRateColor = (rate) => {
        if (rate >= 95) return 'text-success';
        if (rate >= 80) return 'text-warning';
        return 'text-danger';
    };

    const handleViewDetails = (employeePayroll) => {
        navigate(`/payroll/employee/${payrollId}/${employeePayroll.employeeId}`);
    };

    // Filter employee payrolls by contract type
    const filteredPayrolls = filterContractType === 'ALL'
        ? employeePayrolls
        : employeePayrolls.filter(p => p.contractType === filterContractType);

    const columns = [
        {
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            cell: (row) => (
                <div className="employee-cell">
                    <div className="employee-name">{row.employeeName}</div>
                    <div className="employee-position">{row.positionName || 'N/A'}</div>
                </div>
            )
        },
        {
            header: 'Contract',
            accessor: 'contractType',
            sortable: true,
            cell: (row) => getContractTypeBadge(row.contractType)
        },
        {
            header: 'Base Salary',
            accessor: 'baseSalary',
            sortable: true,
            align: 'right',
            cell: (row) => formatCurrency(row.baseSalary)
        },
        {
            header: 'Working Days',
            accessor: 'workingDays',
            sortable: true,
            align: 'center',
            cell: (row) => (
                <div className="working-days-cell">
                    <div>{row.actualWorkingDays || 0} / {row.expectedWorkingDays || 0}</div>
                    <div className={`attendance-rate ${getAttendanceRateColor(row.attendanceRate)}`}>
                        {(row.attendanceRate || 0).toFixed(1)}%
                    </div>
                </div>
            )
        },
        {
            header: 'Overtime',
            accessor: 'totalOvertimeHours',
            sortable: true,
            align: 'center',
            cell: (row) => (
                <div className="overtime-cell">
                    <div>{(row.totalOvertimeHours || 0).toFixed(1)}h</div>
                    {row.totalOvertimePay > 0 && (
                        <div className="overtime-pay">{formatCurrency(row.totalOvertimePay)}</div>
                    )}
                </div>
            )
        },
        {
            header: 'Late/Absence',
            accessor: 'deductions',
            sortable: true,
            align: 'center',
            cell: (row) => (
                <div className="deduction-cell">
                    <div className="deduction-item">
                        <FaClock className="icon-late" />
                        {row.totalLateMinutes || 0}m
                    </div>
                    <div className="deduction-item">
                        <FaTimesCircle className="icon-absence" />
                        {row.totalAbsenceDays || 0}d
                    </div>
                </div>
            )
        },
        {
            header: 'Gross Pay',
            accessor: 'grossPay',
            sortable: true,
            align: 'right',
            cell: (row) => (
                <div className="amount-cell gross">
                    {formatCurrency(row.grossPay)}
                </div>
            )
        },
        {
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            align: 'right',
            cell: (row) => (
                <div className="amount-cell deductions">
                    {formatCurrency(row.totalDeductions)}
                </div>
            )
        },
        {
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            align: 'right',
            cell: (row) => (
                <div className="amount-cell net">
                    <strong>{formatCurrency(row.netPay)}</strong>
                </div>
            )
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: handleViewDetails,
            variant: 'primary'
        }
    ];

    if (loading) {
        return <div className="loading">Loading employee payrolls...</div>;
    }

    return (
        <div className="employee-payroll-list">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-icon employee">
                        <FaCheckCircle />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{stats.totalEmployees}</div>
                        <div className="card-label">Total Employees</div>
                        <div className="card-breakdown">
                            <span>Monthly: {stats.monthlyCount}</span>
                            <span>Daily: {stats.dailyCount}</span>
                            <span>Hourly: {stats.hourlyCount}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon gross">
                        <FaMoneyBillWave />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{formatCurrency(stats.totalGross)}</div>
                        <div className="card-label">Total Gross Pay</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon deductions">
                        <FaExclamationTriangle />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{formatCurrency(stats.totalDeductions)}</div>
                        <div className="card-label">Total Deductions</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon net">
                        <FaCheckCircle />
                    </div>
                    <div className="card-content">
                        <div className="card-value">{formatCurrency(stats.totalNet)}</div>
                        <div className="card-label">Total Net Pay</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <label>Contract Type:</label>
                    <select
                        value={filterContractType}
                        onChange={(e) => setFilterContractType(e.target.value)}
                        className="filter-select"
                    >
                        <option value="ALL">All ({employeePayrolls.length})</option>
                        <option value="MONTHLY">Monthly ({stats.monthlyCount})</option>
                        <option value="DAILY">Daily ({stats.dailyCount})</option>
                        <option value="HOURLY">Hourly ({stats.hourlyCount})</option>
                    </select>
                </div>
            </div>

            {/* Employee Payrolls Table */}
            <div className="table-section">
                <DataTable
                    data={filteredPayrolls}
                    columns={columns}
                    actions={actions}
                    searchable
                    searchPlaceholder="Search employees..."
                    exportable
                    exportFileName={`payroll-${payroll?.month}-${payroll?.year}-employees`}
                />
            </div>
        </div>
    );
};

export default EmployeePayrollList;