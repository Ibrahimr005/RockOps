import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaEnvelope, FaFilePdf, FaCheck, FaUser, FaCalendarAlt, FaMoneyBillWave, FaFileAlt } from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import './PayslipDetails.scss';

const PayslipDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError, showConfirmation } = useSnackbar();

    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            loadPayslipDetails();
        }
    }, [id]);

    const loadPayslipDetails = async () => {
        try {
            setLoading(true);
            const response = await payslipService.getPayslipById(id);
            setPayslip(response.data);
        } catch (error) {
            console.error('Error loading payslip details:', error);
            const errorMessage = error.response?.data?.message || 'Failed to load payslip details';
            setError(errorMessage);
            showError('Failed to load payslip details');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePdf = async () => {
        try {
            await payslipService.generatePayslipPdf(id);
            showSuccess('PDF generated successfully');
            loadPayslipDetails();
        } catch (error) {
            console.error('Error generating PDF:', error);
            showError('Failed to generate PDF');
        }
    };

    const handleSendEmail = () => {
        showConfirmation(
            'Are you sure you want to send this payslip via email?',
            async () => {
                try {
                    await payslipService.sendPayslipEmail(id);
                    showSuccess('Email sent successfully');
                    loadPayslipDetails();
                } catch (error) {
                    console.error('Error sending email:', error);
                    showError('Failed to send email');
                }
            }
        );
    };

    const handleDownloadPdf = async () => {
        try {
            const blob = await payslipService.downloadPayslipPdf(id);
            const url = window.URL.createObjectURL(blob.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payslip-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showError('Failed to download PDF');
        }
    };

    const handleAcknowledge = () => {
        showConfirmation(
            'Mark this payslip as acknowledged?',
            async () => {
                try {
                    await payslipService.acknowledgePayslip(id);
                    showSuccess('Payslip acknowledged successfully');
                    loadPayslipDetails();
                } catch (error) {
                    console.error('Error acknowledging payslip:', error);
                    showError('Failed to acknowledge payslip');
                }
            }
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            DRAFT: { class: 'status-warning', text: 'Draft' },
            GENERATED: { class: 'status-info', text: 'Generated' },
            SENT: { class: 'status-success', text: 'Sent' },
            ACKNOWLEDGED: { class: 'status-default', text: 'Acknowledged' }
        };

        const config = statusConfig[status] || { class: 'status-default', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
        );
    };

    if (loading) {
        return (
            <div className="payslip-details">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading payslip details...</span>
                </div>
            </div>
        );
    }

    if (error || !payslip) {
        return (
            <div className="payslip-details">
                <div className="error-state">
                    <div className="error-content">
                        <h3>Error Loading Payslip</h3>
                        <p>{error || 'Payslip not found'}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/payroll/payslips')}
                        >
                            Back to Payslips
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payslip-details">
            {/* Header */}
            <div className="payslip-details__header">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            className="btn-cancel"
                            onClick={() => navigate('/payroll/payslips')}
                        >
                            <FaArrowLeft /> Back to Payslips
                        </button>
                        <div className="payslip-title">
                            <h1>Payslip Details</h1>
                            <span className="payslip-id">Payslip ID: {payslip.id}</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        {payslip.status === 'DRAFT' && (
                            <button
                                className="btn btn-warning"
                                onClick={handleGeneratePdf}
                            >
                                <FaFilePdf /> Generate PDF
                            </button>
                        )}
                        {payslip.status === 'GENERATED' && (
                            <button
                                className="btn btn-success"
                                onClick={handleSendEmail}
                            >
                                <FaEnvelope /> Send Email
                            </button>
                        )}
                        {(payslip.status === 'SENT' || payslip.status === 'ACKNOWLEDGED') && (
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadPdf}
                            >
                                <FaDownload /> Download PDF
                            </button>
                        )}
                        {payslip.status === 'SENT' && (
                            <button
                                className="btn btn-primary"
                                onClick={handleAcknowledge}
                            >
                                <FaCheck /> Acknowledge
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Payslip Overview Cards */}
            <div className="payslip-details__overview">
                <div className="overview-cards">
                    <PayslipOverviewCard
                        title="Gross Salary"
                        value={payslip.grossSalary}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="card--primary"
                    />
                    <PayslipOverviewCard
                        title="Total Deductions"
                        value={payslip.totalDeductions}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="card--warning"
                    />
                    <PayslipOverviewCard
                        title="Net Pay"
                        value={payslip.netPay}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="card--success"
                    />
                    <PayslipOverviewCard
                        title="Days Worked"
                        value={payslip.daysWorked}
                        format="number"
                        icon={<FaCalendarAlt />}
                        className="card--info"
                    />
                </div>
            </div>

            {/* Payslip Information */}
            <div className="payslip-details__content">
                <div className="content-grid">
                    {/* Employee Information */}
                    <div className="info-card">
                        <div className="card-header">
                            <h3><FaUser /> Employee Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Employee Name:</label>
                                    <span>{payslip.employeeName}</span>
                                </div>
                                <div className="info-item">
                                    <label>Email:</label>
                                    <span>{payslip.employeeEmail}</span>
                                </div>
                                <div className="info-item">
                                    <label>Department:</label>
                                    <span>{payslip.departmentName || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Position:</label>
                                    <span>{payslip.jobPositionName || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pay Period Information */}
                    <div className="info-card">
                        <div className="card-header">
                            <h3><FaCalendarAlt /> Pay Period Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Status:</label>
                                    <span>{getStatusBadge(payslip.status)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Pay Period Start:</label>
                                    <span>{formatDate(payslip.payPeriodStart)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Pay Period End:</label>
                                    <span>{formatDate(payslip.payPeriodEnd)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Pay Date:</label>
                                    <span>{formatDate(payslip.payDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Days Absent:</label>
                                    <span>{payslip.daysAbsent}</span>
                                </div>
                                <div className="info-item">
                                    <label>Overtime Hours:</label>
                                    <span>{payslip.overtimeHours}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Processing Information */}
                    <div className="info-card full-width">
                        <div className="card-header">
                            <h3><FaFileAlt /> Processing Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Generated At:</label>
                                    <span>{payslip.generatedAt ? formatDate(payslip.generatedAt) : 'Not generated'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Sent At:</label>
                                    <span>{payslip.sentAt ? formatDate(payslip.sentAt) : 'Not sent'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Acknowledged At:</label>
                                    <span>{payslip.acknowledgedAt ? formatDate(payslip.acknowledgedAt) : 'Not acknowledged'}</span>
                                </div>
                                <div className="info-item">
                                    <label>PDF Path:</label>
                                    <span>{payslip.pdfPath ? 'Available' : 'Not generated'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Earnings and Deductions */}
            <div className="payslip-details__breakdown">
                <div className="breakdown-grid">
                    {/* Earnings Table */}
                    <div className="breakdown-card">
                        <div className="card-header">
                            <h3><FaMoneyBillWave /> Earnings</h3>
                            <span className="total-amount total-earnings">
                {formatCurrency(payslip.grossSalary + payslip.totalEarnings)}
              </span>
                        </div>
                        <div className="card-content">
                            <EarningsTable earnings={payslip.earnings || []} grossSalary={payslip.grossSalary} />
                        </div>
                    </div>

                    {/* Deductions Table */}
                    <div className="breakdown-card">
                        <div className="card-header">
                            <h3><FaMoneyBillWave /> Deductions</h3>
                            <span className="total-amount total-deductions">
                {formatCurrency(payslip.totalDeductions)}
              </span>
                        </div>
                        <div className="card-content">
                            <DeductionsTable deductions={payslip.deductions || []} />
                        </div>
                    </div>
                </div>

                {/* Net Pay Summary */}
                <div className="net-pay-summary">
                    <div className="summary-card">
                        <div className="summary-content">
                            <div className="calculation-row">
                                <span className="label">Gross Earnings:</span>
                                <span className="amount">{formatCurrency(payslip.grossSalary + payslip.totalEarnings)}</span>
                            </div>
                            <div className="calculation-row">
                                <span className="label">Total Deductions:</span>
                                <span className="amount deduction">- {formatCurrency(payslip.totalDeductions)}</span>
                            </div>
                            <div className="calculation-row final-row">
                                <span className="label">Net Pay:</span>
                                <span className="amount net-pay">{formatCurrency(payslip.netPay)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employer Contributions */}
            {payslip.employerContributions && payslip.employerContributions.length > 0 && (
                <div className="payslip-details__contributions">
                    <div className="contributions-card">
                        <div className="card-header">
                            <h3><FaFileAlt /> Employer Contributions</h3>
                            <span className="total-amount total-contributions">
                {formatCurrency(payslip.totalEmployerContributions)}
              </span>
                        </div>
                        <div className="card-content">
                            <ContributionsTable contributions={payslip.employerContributions} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Payslip Overview Card Component
const PayslipOverviewCard = ({ title, value, format, icon, className = '' }) => {
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
        <div className={`overview-card ${className}`}>
            <div className="overview-card__icon">
                {icon}
            </div>
            <div className="overview-card__content">
                <h4 className="overview-card__title">{title}</h4>
                <div className="overview-card__value">{formatValue(value)}</div>
            </div>
        </div>
    );
};

// Earnings Table Component
const EarningsTable = ({ earnings, grossSalary }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const allEarnings = [
        {
            description: 'Base Salary',
            amount: grossSalary,
            type: 'BASE'
        },
        ...earnings
    ];

    const columns = [
        {
            key: 'description',
            title: 'Description',
            width: 200,
            render: (earning) => earning.description
        },
        {
            key: 'amount',
            title: 'Amount',
            width: 120,
            render: (earning) => (
                <span className="earning-amount">
          {formatCurrency(earning.amount)}
        </span>
            )
        },
        {
            key: 'taxable',
            title: 'Taxable',
            width: 80,
            render: (earning) => (
                <span className={`taxable-indicator ${earning.isTaxable ? 'taxable' : 'non-taxable'}`}>
          {earning.type === 'BASE' ? 'Yes' : (earning.isTaxable ? 'Yes' : 'No')}
        </span>
            )
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={allEarnings}
            emptyMessage="No earnings data"
            pagination={false}
        />
    );
};

// Deductions Table Component
const DeductionsTable = ({ deductions }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const columns = [
        {
            key: 'description',
            title: 'Description',
            width: 200,
            render: (deduction) => deduction.description
        },
        {
            key: 'amount',
            title: 'Amount',
            width: 120,
            render: (deduction) => (
                <span className="deduction-amount">
          {formatCurrency(deduction.amount)}
        </span>
            )
        },
        {
            key: 'preTax',
            title: 'Pre-Tax',
            width: 80,
            render: (deduction) => (
                <span className={`tax-indicator ${deduction.isPreTax ? 'pre-tax' : 'post-tax'}`}>
          {deduction.isPreTax ? 'Yes' : 'No'}
        </span>
            )
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={deductions}
            emptyMessage="No deductions"
            pagination={false}
        />
    );
};

// Contributions Table Component
const ContributionsTable = ({ contributions }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const columns = [
        {
            key: 'description',
            title: 'Description',
            width: 200,
            render: (contribution) => contribution.description
        },
        {
            key: 'amount',
            title: 'Amount',
            width: 120,
            render: (contribution) => (
                <span className="contribution-amount">
          {formatCurrency(contribution.amount)}
        </span>
            )
        },
        {
            key: 'type',
            title: 'Type',
            width: 120,
            render: (contribution) => (
                <span className="contribution-type">
          {contribution.contributionType}
        </span>
            )
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={contributions}
            emptyMessage="No employer contributions"
            pagination={false}
        />
    );
};

export default PayslipDetails;