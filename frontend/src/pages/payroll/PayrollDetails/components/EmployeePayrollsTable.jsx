// ========================================
// FILE: EmployeePayrollsTable.jsx
// Shared component - Employee payrolls table
// ========================================

import React from 'react';
import { FaCheckCircle, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable';
import './EmployeePayrollsTable.scss';

const EmployeePayrollsTable = ({ employeePayrolls, payroll, onRefresh, loading }) => {
    const navigate = useNavigate();

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) {
            return '-';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Handle row click to view detailed snapshots for this specific payroll entry
    const handleRowClick = (row) => {
        if (payroll?.id && row?.employeeId) {
            navigate(`/payroll/cycles/${payroll.id}/employee/${row.employeeId}`);
        }
    };

    const employeeColumns = [
        {
            id: 'employee',
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => (
                <div className="payroll-employee-cell">
                    <div className="employee-name">{row.employeeName}</div>
                    <div className="employee-details">
                        {row.jobPositionName} • {row.departmentName}
                    </div>
                </div>
            ),
        },
        {
            id: 'contractType',
            header: 'Type',
            accessor: 'contractType',
            sortable: true,
            filterable: true,
            render: (row) => (
                <span className={`contract-badge ${row.contractType?.toLowerCase()}`}>
                    {row.contractType}
                </span>
            ),
        },
        {
            id: 'baseSalary',
            header: 'Base Salary',
            accessor: 'monthlyBaseSalary',
            sortable: true,
            render: (row) => {
                if (row.contractType === 'MONTHLY') {
                    return formatCurrency(row.monthlyBaseSalary);
                } else if (row.contractType === 'DAILY') {
                    return formatCurrency(row.dailyRate) + '/day';
                } else if (row.contractType === 'HOURLY') {
                    return formatCurrency(row.hourlyRate) + '/hr';
                }
                return '-';
            },
        },
        {
            id: 'attendance',
            header: 'Attendance',
            accessor: 'attendedDays',
            render: (row) => (
                <div className="payroll-attendance-stats">
                    <div className="attendance-summary">
                        <span className="attended">{row.attendedDays || 0}</span>
                        <span className="separator">/</span>
                        <span className="total">{row.totalWorkingDays || 0}</span>
                    </div>
                    <div className="attendance-details">
                        {row.absentDays > 0 && (
                            <span className="absent-badge" title="Absent Days">
                                {row.absentDays} absent
                            </span>
                        )}
                        {row.lateDays > 0 && (
                            <span className="late-badge" title="Late Days">
                                {row.lateDays} late
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'gross',
            header: 'Gross Pay',
            accessor: 'grossPay',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) {
                    return <span className="not-calculated"><FaClock /> --</span>;
                }
                return <span className="gross-amount">{formatCurrency(row.grossPay)}</span>;
            },
        },
        {
            id: 'deductions',
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) return <span className="not-calculated">--</span>;
                if (row.totalDeductions > 0) {
                    return <span className="deduction-amount has-deductions">-{formatCurrency(row.totalDeductions)}</span>;
                }
                return <span className="deduction-amount no-deductions">$0.00</span>;
            },
        },
        {
            id: 'net',
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            render: (row) => {
                if (!row.calculatedAt) return <span className="not-calculated">--</span>;
                return <span className="net-amount">{formatCurrency(row.netPay)}</span>;
            },
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'calculatedAt',
            render: (row) => {
                if (row.calculatedAt) {
                    return <span className="status-badge calculated"><FaCheckCircle /> Calculated</span>;
                }
                const hasIssues = (row.absentDays > 5 || row.lateDays > 3);
                if (hasIssues) {
                    return <span className="status-badge pending-issues"><FaExclamationCircle /> Needs Review</span>;
                }
                return <span className="status-badge pending"><FaClock /> Pending</span>;
            },
        },
    ];

    if (loading) {
        return (
            <div className="table-loading">
                <FaClock className="spin" />
                <p>Loading employee payrolls...</p>
            </div>
        );
    }

    if (!employeePayrolls || employeePayrolls.length === 0) {
        return (
            <div className="table-empty">
                <FaExclamationCircle />
                <p>No employee payroll data available</p>
            </div>
        );
    }

    return (
        <div className="employee-payrolls-table">
            <div className="payroll-table-header">
                <h3>Employee Payrolls ({employeePayrolls.length})</h3>
                {!payroll?.attendanceFinalized && (
                    <div className="table-notice">
                        <FaClock />
                        <span>Calculations will be performed after attendance is finalized</span>
                    </div>
                )}
            </div>

            <DataTable
                data={Array.isArray(employeePayrolls) ? employeePayrolls : []}
                columns={employeeColumns}
                actions={[]} // Removed explicit actions as requested
                onRowClick={handleRowClick} // Added row click handler
                showSearch={true}
                showFilters={false}
                showExportButton={true}
                exportButtonText="Export Excel"
                exportFileName={`payroll-${payroll?.month}-${payroll?.year}-employees`}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                // Optional: Add hover class for better UX
                className="clickable-rows"
            />
        </div>
    );
};

export default EmployeePayrollsTable;