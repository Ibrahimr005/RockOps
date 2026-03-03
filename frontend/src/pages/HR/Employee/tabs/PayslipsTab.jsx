import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCalendarAlt, FaMinus, FaPlus } from 'react-icons/fa';
import payrollService from '../../../../services/payroll/payrollService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import ContentLoader from '../../../../components/common/ContentLoader/ContentLoader.jsx';

const PayslipsTab = ({ employee, formatCurrency }) => {
    const { showError } = useSnackbar();
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee?.id) {
            fetchPayrollHistory();
        }
    }, [employee?.id]);

    const fetchPayrollHistory = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getEmployeePayrollHistory(employee.id);
            setPayrolls(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching payroll history:', error);
            showError('Failed to load payroll history');
        } finally {
            setLoading(false);
        }
    };

    const formatPeriod = (row) => {
        if (row.payrollStartDate && row.payrollEndDate) {
            const start = new Date(row.payrollStartDate);
            const end = new Date(row.payrollEndDate);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        if (row.calculatedAt) {
            return new Date(row.calculatedAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
        return row.employeePayrollNumber || '-';
    };

    const getPayrollStatusBadge = (status) => {
        const config = {
            DRAFT: 'pending',
            ATTENDANCE_IMPORTED: 'pending',
            DEDUCTIONS_REVIEWED: 'pending',
            OVERTIME_REVIEWED: 'pending',
            BONUSES_REVIEWED: 'pending',
            LEAVES_REVIEWED: 'pending',
            CALCULATED: 'active',
            SENT_TO_FINANCE: 'active',
            FINANCE_APPROVED: 'completed',
            FINANCE_REJECTED: 'cancelled',
            COMPLETED: 'completed'
        };
        const badgeClass = config[status] || 'default';
        const displayText = status?.replace(/_/g, ' ') || '-';
        return <span className={`status-badge ${badgeClass}`}>{displayText}</span>;
    };

    // Summary calculations
    const totalGross = payrolls.reduce((sum, p) => sum + (p.grossPay || 0), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const avgNet = payrolls.length > 0 ? totalNet / payrolls.length : 0;

    const columns = [
        {
            header: 'Payroll #',
            accessor: 'employeePayrollNumber',
            sortable: true,
            width: '150px'
        },
        {
            header: 'Period',
            accessor: 'payrollStartDate',
            sortable: true,
            render: (row) => formatPeriod(row)
        },
        {
            header: 'Contract',
            accessor: 'contractType',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => row.contractType || '-'
        },
        {
            header: 'Base Salary',
            accessor: 'monthlyBaseSalary',
            sortable: true,
            render: (row) => {
                if (row.contractType === 'HOURLY') return formatCurrency(row.hourlyRate) + '/hr';
                if (row.contractType === 'DAILY') return formatCurrency(row.dailyRate) + '/day';
                return formatCurrency(row.monthlyBaseSalary);
            }
        },
        {
            header: 'Days/Hours',
            accessor: 'attendedDays',
            sortable: true,
            render: (row) => {
                if (row.contractType === 'HOURLY') return `${row.totalWorkedHours || 0} hrs`;
                return `${row.attendedDays || 0} / ${row.totalWorkingDays || 0} days`;
            }
        },
        {
            header: 'Gross Pay',
            accessor: 'grossPay',
            sortable: true,
            render: (row) => (
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    {formatCurrency(row.grossPay)}
                </span>
            )
        },
        {
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            render: (row) => {
                const parts = [];
                if (row.absenceDeductionAmount > 0) parts.push(`Absence: ${formatCurrency(row.absenceDeductionAmount)}`);
                if (row.lateDeductionAmount > 0) parts.push(`Late: ${formatCurrency(row.lateDeductionAmount)}`);
                if (row.loanDeductionAmount > 0) parts.push(`Loan: ${formatCurrency(row.loanDeductionAmount)}`);
                if (row.otherDeductionAmount > 0) parts.push(`Other: ${formatCurrency(row.otherDeductionAmount)}`);

                return (
                    <div>
                        <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                            {formatCurrency(row.totalDeductions)}
                        </span>
                        {parts.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                {parts.join(' | ')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Bonus',
            accessor: 'bonusAmount',
            sortable: true,
            render: (row) => row.bonusAmount > 0
                ? <span style={{ color: 'var(--color-success)' }}>{formatCurrency(row.bonusAmount)}</span>
                : '-'
        },
        {
            header: 'Overtime',
            accessor: 'overtimePay',
            sortable: true,
            render: (row) => row.overtimePay > 0
                ? <span>{formatCurrency(row.overtimePay)} ({row.overtimeHours}h)</span>
                : '-'
        },
        {
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {formatCurrency(row.netPay)}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'payrollStatus',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => row.payrollStatus ? getPayrollStatusBadge(row.payrollStatus) : '-'
        }
    ];

    if (loading) {
        return (
            <div className="payslips-info tab-panel">
                <ContentLoader text="Loading payroll history..." />
            </div>
        );
    }

    return (
        <div className="payslips-info tab-panel">
            <StatisticsCards
                cards={[
                    {
                        icon: <FaMoneyBillWave />,
                        label: 'Total Gross',
                        value: formatCurrency(totalGross),
                        variant: 'success',
                        subtitle: `${payrolls.length} payroll${payrolls.length !== 1 ? 's' : ''}`
                    },
                    {
                        icon: <FaMinus />,
                        label: 'Total Deductions',
                        value: formatCurrency(totalDeductions),
                        variant: 'danger',
                        subtitle: 'Lifetime deductions'
                    },
                    {
                        icon: <FaPlus />,
                        label: 'Total Net',
                        value: formatCurrency(totalNet),
                        variant: 'primary',
                        subtitle: 'Total received'
                    },
                    {
                        icon: <FaCalendarAlt />,
                        label: 'Avg Net Pay',
                        value: formatCurrency(avgNet),
                        variant: 'info',
                        subtitle: 'Per payroll cycle'
                    }
                ]}
                columns={4}
            />

            <DataTable
                data={payrolls}
                columns={columns}
                isLoading={loading}
                emptyMessage="No payroll records found for this employee"
                searchPlaceholder="Search payroll records..."
                defaultSortField="payrollStartDate"
                defaultSortDirection="desc"
                exportFileName={`${employee.firstName}_${employee.lastName}_Payrolls`}
            />
        </div>
    );
};

export default PayslipsTab;
