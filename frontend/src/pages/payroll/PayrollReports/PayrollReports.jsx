import React, { useState, useEffect } from 'react';
import { FaDownload, FaFilter, FaCalendarAlt, FaChartLine, FaFileExcel, FaFilePdf, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import { payrollService } from '../../../services/payroll/payrollService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import './PayrollReports.scss';

const PayrollReports = () => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reportType: 'summary',
        department: '',
        employee: ''
    });

    useEffect(() => {
        loadReportData();
    }, []);

    const loadReportData = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getPayrollReport(filters.startDate, filters.endDate);
            setReportData(response.data);
        } catch (error) {
            console.error('Error loading report data:', error);
            showError('Failed to load payroll report data');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGenerateReport = () => {
        loadReportData();
    };

    const handleExportReport = async (format) => {
        try {
            const blob = await payrollService.exportPayrollReport(filters.startDate, filters.endDate, format);
            const url = window.URL.createObjectURL(blob.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payroll-report-${filters.startDate}-to-${filters.endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showSuccess(`Report exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Error exporting report:', error);
            showError('Failed to export report');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(1)}%`;
    };

    return (
        <div className="payroll-reports">
            {/* Header */}
            <div className="payroll-reports__header">
                <div className="header-content">
                    <h1 className="page-title">Payroll Reports</h1>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExportReport('excel')}
                            disabled={!reportData}
                        >
                            <FaFileExcel /> Export Excel
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExportReport('pdf')}
                            disabled={!reportData}
                        >
                            <FaFilePdf /> Export PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="payroll-reports__filters">
                <div className="filters-card">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label htmlFor="report-type">Report Type:</label>
                            <select
                                id="report-type"
                                value={filters.reportType}
                                onChange={(e) => handleFilterChange('reportType', e.target.value)}
                            >
                                <option value="summary">Summary Report</option>
                                <option value="detailed">Detailed Report</option>
                                <option value="department">By Department</option>
                                <option value="monthly">Monthly Trends</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="start-date">Start Date:</label>
                            <input
                                id="start-date"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="end-date">End Date:</label>
                            <input
                                id="end-date"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>

                        <button className="btn btn-primary" onClick={handleGenerateReport}>
                            <FaChartLine /> Generate Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Summary Cards */}
            {reportData && (
                <div className="payroll-reports__summary">
                    <ReportSummaryCard
                        title="Total Employees"
                        value={reportData.totalEmployees}
                        format="number"
                        icon={<FaUsers />}
                        className="summary-card--info"
                    />
                    <ReportSummaryCard
                        title="Total Gross Payroll"
                        value={reportData.totalGrossPayroll}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="summary-card--primary"
                    />
                    <ReportSummaryCard
                        title="Total Net Payroll"
                        value={reportData.totalNetPayroll}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="summary-card--success"
                    />
                    <ReportSummaryCard
                        title="Total Deductions"
                        value={reportData.totalDeductions}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="summary-card--warning"
                    />
                </div>
            )}

            {/* Report Content */}
            <div className="payroll-reports__content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <span>Generating report...</span>
                    </div>
                ) : reportData ? (
                    <>
                        {/* Summary Chart Section */}
                        <div className="report-section">
                            <div className="section-header">
                                <h3>Payroll Summary</h3>
                            </div>
                            <div className="section-content">
                                <PayrollSummaryChart data={reportData} />
                            </div>
                        </div>

                        {/* Department Breakdown */}
                        <div className="report-section">
                            <div className="section-header">
                                <h3>Department Breakdown</h3>
                            </div>
                            <div className="section-content">
                                <DepartmentBreakdownTable data={reportData.departmentBreakdown || []} />
                            </div>
                        </div>

                        {/* Detailed Employee Report */}
                        <div className="report-section">
                            <div className="section-header">
                                <h3>Employee Details</h3>
                            </div>
                            <div className="section-content">
                                <EmployeeDetailsTable employees={reportData.employees || []} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <FaChartLine className="empty-icon" />
                        <p>Select date range and generate report to view data</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Report Summary Card Component
const ReportSummaryCard = ({ title, value, format, icon, className = '' }) => {
    const formatValue = (val) => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(val);
            case 'number':
                return new Intl.NumberFormat('en-US').format(val);
            case 'percentage':
                return `${(val || 0).toFixed(1)}%`;
            default:
                return val;
        }
    };

    return (
        <div className={`summary-card ${className}`}>
            <div className="summary-card__icon">
                {icon}
            </div>
            <div className="summary-card__content">
                <h4 className="summary-card__title">{title}</h4>
                <div className="summary-card__value">{formatValue(value)}</div>
            </div>
        </div>
    );
};

// Payroll Summary Chart Component (Placeholder)
const PayrollSummaryChart = ({ data }) => {
    return (
        <div className="payroll-chart">
            <div className="chart-placeholder">
                <div className="chart-bars">
                    <div className="bar bar-gross" style={{ height: '80%' }}>
                        <span className="bar-label">Gross</span>
                        <span className="bar-value">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalGrossPayroll)}</span>
                    </div>
                    <div className="bar bar-deductions" style={{ height: '30%' }}>
                        <span className="bar-label">Deductions</span>
                        <span className="bar-value">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalDeductions)}</span>
                    </div>
                    <div className="bar bar-net" style={{ height: '65%' }}>
                        <span className="bar-label">Net</span>
                        <span className="bar-value">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalNetPayroll)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Department Breakdown Table Component
const DepartmentBreakdownTable = ({ data }) => {
    const columns = [
        {
            key: 'department',
            title: 'Department',
            width: 200,
            sortable: true,
            render: (item) => item.departmentName || 'N/A'
        },
        {
            key: 'employees',
            title: 'Employees',
            width: 120,
            sortable: true,
            render: (item) => item.employeeCount || 0
        },
        {
            key: 'grossTotal',
            title: 'Gross Total',
            width: 150,
            sortable: true,
            render: (item) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.grossTotal || 0)
        },
        {
            key: 'netTotal',
            title: 'Net Total',
            width: 150,
            sortable: true,
            render: (item) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.netTotal || 0)
        },
        {
            key: 'avgSalary',
            title: 'Avg Salary',
            width: 150,
            sortable: true,
            render: (item) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.avgSalary || 0)
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={data}
            emptyMessage="No department data available"
        />
    );
};

// Employee Details Table Component
const EmployeeDetailsTable = ({ employees }) => {
    const columns = [
        {
            key: 'employee',
            title: 'Employee',
            width: 200,
            sortable: true,
            render: (employee) => (
                <div className="employee-info">
                    <div className="employee-name">{employee.employeeName}</div>
                    <div className="employee-id">ID: {employee.employeeId}</div>
                </div>
            )
        },
        {
            key: 'department',
            title: 'Department',
            width: 150,
            sortable: true,
            render: (employee) => employee.departmentName || 'N/A'
        },
        {
            key: 'grossSalary',
            title: 'Gross Salary',
            width: 120,
            sortable: true,
            render: (employee) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(employee.grossSalary || 0)
        },
        {
            key: 'deductions',
            title: 'Deductions',
            width: 120,
            sortable: true,
            render: (employee) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(employee.totalDeductions || 0)
        },
        {
            key: 'netPay',
            title: 'Net Pay',
            width: 120,
            sortable: true,
            render: (employee) => (
                <span className="net-pay-amount">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(employee.netPay || 0)}
        </span>
            )
        },
        {
            key: 'status',
            title: 'Status',
            width: 100,
            sortable: true,
            render: (employee) => (
                <span className={`status-badge status-${employee.status?.toLowerCase() || 'active'}`}>
          {employee.status || 'Active'}
        </span>
            )
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={employees}
            emptyMessage="No employee data available"
            pagination={{
                pageSize: 10
            }}
        />
    );
};

export default PayrollReports;