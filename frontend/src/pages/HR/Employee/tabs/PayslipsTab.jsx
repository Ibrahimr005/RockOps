import React, { useState, useEffect } from 'react';
import { payslipService } from '../../../../services/payroll/payslipService.js';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { FaDownload, FaEnvelope, FaEye } from 'react-icons/fa';

const PayslipsTab = ({ employee, formatCurrency }) => {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState({});

    useEffect(() => {
        if (employee?.id) {
            fetchEmployeePayslips();
        }
    }, [employee?.id]);

    const fetchEmployeePayslips = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch payslips for the specific employee
            const response = await payslipService.getPayslipsByEmployee(employee.id, 0, 50);

            console.log('Payslips response:', response);

            // Handle both paginated and direct array responses
            const payslipsData = response.data?.content || response.data || [];
            setPayslips(payslipsData);

        } catch (error) {
            console.error('Error fetching payslips:', error);
            setError(error.response?.data?.message || 'Failed to fetch payslips');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPayslip = async (payslipId) => {
        try {
            setDownloading(prev => ({ ...prev, [payslipId]: true }));

            // Download the payslip PDF
            const response = await payslipService.downloadPayslipPdf(payslipId);

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payslip_${payslipId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading payslip:', error);
            alert('Failed to download payslip. Please try again.');
        } finally {
            setDownloading(prev => ({ ...prev, [payslipId]: false }));
        }
    };

    const handleSendEmail = async (payslipId) => {
        try {
            await payslipService.sendPayslipEmail(payslipId);
            alert('Payslip sent via email successfully');
            // Refresh payslips to update status
            await fetchEmployeePayslips();
        } catch (error) {
            console.error('Error sending payslip email:', error);
            alert('Failed to send payslip via email. Please try again.');
        }
    };

    const handleViewPayslip = async (payslipId) => {
        try {
            // For now, just download and view. Later this could open in a modal
            await handleDownloadPayslip(payslipId);
        } catch (error) {
            console.error('Error viewing payslip:', error);
        }
    };

    const formatPeriod = (payslip) => {
        if (payslip.payPeriodStart && payslip.payPeriodEnd) {
            const startDate = new Date(payslip.payPeriodStart);
            const endDate = new Date(payslip.payPeriodEnd);

            // If same month, show month year format
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            // Otherwise show date range
            return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }

        // Fallback to pay date if period not available
        if (payslip.payDate) {
            const payDate = new Date(payslip.payDate);
            return payDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        return 'Unknown Period';
    };

    const getStatusBadge = (status) => {
        const statusLower = status?.toLowerCase() || 'unknown';
        let className = 'status-badge ';

        switch (statusLower) {
            case 'paid':
            case 'completed':
                className += 'completed';
                break;
            case 'pending':
            case 'processing':
                className += 'pending';
                break;
            case 'draft':
                className += 'draft';
                break;
            case 'sent':
                className += 'sent';
                break;
            case 'acknowledged':
                className += 'acknowledged';
                break;
            default:
                className += 'unknown';
        }

        return <span className={className}>{status || 'Unknown'}</span>;
    };

    const calculateNetPay = (payslip) => {
        const grossPay = payslip.grossPay || 0;
        const totalDeductions = payslip.totalDeductions || 0;
        return grossPay - totalDeductions;
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'period',
            header: 'Pay Period',
            accessor: 'period',
            sortable: true,
            filterable: true,
            render: (row) => formatPeriod(row)
        },
        {
            id: 'grossPay',
            header: 'Gross Pay',
            accessor: 'grossPay',
            sortable: true,
            filterable: true,
            render: (row) => formatCurrency(row.grossPay)
        },
        {
            id: 'totalDeductions',
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            filterable: true,
            render: (row) => formatCurrency(row.totalDeductions)
        },
        {
            id: 'netPay',
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            filterable: true,
            render: (row) => formatCurrency(calculateNetPay(row))
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            render: (row) => getStatusBadge(row.status)
        },
        {
            id: 'payDate',
            header: 'Pay Date',
            accessor: 'payDate',
            sortable: true,
            filterable: true,
            render: (row) => row.payDate ? new Date(row.payDate).toLocaleDateString('en-US') : 'N/A'
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            id: 'view',
            label: 'View Payslip',
            icon: <FaEye />,
            onClick: (row) => handleViewPayslip(row.id),
            isDisabled: (row) => row.status?.toLowerCase() === 'draft'
        },
        {
            id: 'download',
            label: 'Download PDF',
            icon: <FaDownload />,
            onClick: (row) => handleDownloadPayslip(row.id),
            isDisabled: (row) => downloading[row.id] || row.status?.toLowerCase() === 'draft'
        },
        {
            id: 'email',
            label: 'Send Email',
            icon: <FaEnvelope />,
            onClick: (row) => handleSendEmail(row.id),
            isDisabled: (row) => row.status?.toLowerCase() === 'sent' || row.status?.toLowerCase() === 'draft'
        }
    ];

    if (loading) {
        return (
            <div className="payslips-info tab-panel">
                <h3>Payslips & Salary History</h3>
                <div className="loading-message">
                    <p>Loading payslips...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payslips-info tab-panel">
                <h3>Payslips & Salary History</h3>
                <div className="error-message">
                    <p>Error: {error}</p>
                    <button onClick={fetchEmployeePayslips} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="payslips-info tab-panel">
            <h3>Payslips & Salary History</h3>

            <DataTable
                data={payslips}
                columns={columns}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                showExport={true}
                exportFileName={`${employee.firstName}_${employee.lastName}_Payslips`}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 25, 50]}
                defaultSortField="payDate"
                defaultSortDirection="desc"
                emptyStateMessage="No payslips found for this employee"
                noResultsMessage="No payslips match your search criteria"
                className="payslips-table"
            />
        </div>
    );
};

export default PayslipsTab;