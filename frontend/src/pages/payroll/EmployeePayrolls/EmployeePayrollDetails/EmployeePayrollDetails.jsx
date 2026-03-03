import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaClock,
    FaExclamationTriangle,
    FaUserTie,
    FaPrint,
    FaListAlt,
    FaBuilding
} from 'react-icons/fa';
// REPLACE PageHeader with IntroCard
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import './EmployeePayrollDetails.scss';
import { payrollService } from '../../../../services/payroll/payrollService';

const EmployeePayrollDetails = () => {
    const { payrollId, employeeId } = useParams();
    const navigate = useNavigate();
    const [employeePayroll, setEmployeePayroll] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployeePayroll();
    }, [payrollId, employeeId]);

    const fetchEmployeePayroll = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getEmployeePayroll(payrollId, employeeId);
            setEmployeePayroll(data);
        } catch (error) {
            console.error('Error fetching employee payroll:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'EGP 0.00';
        return `EGP ${Number(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const handlePrint = () => {
        window.print();
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

    const getStatusBadge = (status, isHoliday, isWeekend) => {
        if (isHoliday) return <span className="status-pill holiday">Public Holiday</span>;
        if (isWeekend) return <span className="status-pill weekend">Weekend</span>;

        const map = {
            PRESENT: 'success',
            ABSENT: 'danger',
            LATE: 'warning',
            HALF_DAY: 'warning',
            ON_LEAVE: 'info',
            OFF: 'neutral'
        };
        return <span className={`status-pill ${map[status] || 'neutral'}`}>{status}</span>;
    };

    if (loading) return <div className="loading-state"><FaClock className="spin"/> Loading payroll details...</div>;
    if (!employeePayroll) return <div className="error-state">Employee payroll record not found.</div>;

    const ep = employeePayroll;
    const snapshots = ep.attendanceSnapshots || [];

    return (
        <div className="employee-payroll-details">
            <div className="no-print">
                <IntroCard
                    title={ep.employeeName}
                    label="PAYROLL SLIP DETAILS"
                    icon={<FaUserTie style={{ fontSize: '3.5rem', color: 'var(--color-primary)' }} />}
                    // Breadcrumbs allow navigation back to the main list
                    breadcrumbs={[
                        {
                            label: 'Payroll Cycles',
                            icon: <FaCalendarAlt />,
                            onClick: () => navigate('/payroll')
                        },
                        {
                            label: 'Cycle Details',
                            onClick: () => navigate(`/payroll/cycles/${payrollId}`)
                        },
                        {
                            label: ep.employeeName,
                            icon: <FaUserTie />
                        }
                    ]}
                    // High-level stats displayed in the hero section
                    stats={[
                        {
                            label: 'Net Payable',
                            value: formatCurrency(ep.netPay)
                        },
                        {
                            label: 'Attendance',
                            value: `${ep.attendedDays}/${ep.totalWorkingDays} Days`
                        }
                    ]}
                    // Main Actions
                    actionButtons={[
                        {
                            text: 'Print Payslip',
                            icon: <FaPrint />,
                            onClick: handlePrint,
                            className: 'bg-primary text-white' // Ensure you have utility classes or add custom CSS
                        },
                        {
                            text: 'Back',
                            icon: <FaArrowLeft />,
                            onClick: () => navigate(-1),
                            className: 'bg-surface text-primary border-primary' // Example utility classes
                        }
                    ]}
                />
            </div>

            {/* --- TOP SUMMARY SECTION --- */}
            <div className="summary-section">
                <div className="info-card employee-card">
                    <div className="card-header">
                        <FaBuilding /> <span>Employment Details</span>
                    </div>
                    <div className="info-row">
                        <label>Department:</label>
                        <strong>{ep.departmentName}</strong>
                    </div>
                    <div className="info-row">
                        <label>Position:</label>
                        <strong>{ep.jobPositionName}</strong>
                    </div>
                    <div className="info-row">
                        <label>Contract:</label>
                        {getContractTypeBadge(ep.contractType)}
                    </div>
                </div>

                <div className="info-card attendance-card">
                    <div className="card-header">
                        <FaCalendarAlt /> <span>Attendance Summary</span>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="val">{ep.attendedDays}/{ep.totalWorkingDays}</span>
                            <span className="lbl">Days Attended</span>
                        </div>
                        <div className="stat-item">
                            <span className="val danger">{ep.absentDays}</span>
                            <span className="lbl">Days Absent</span>
                        </div>
                        <div className="stat-item">
                            <span className="val warning">{ep.lateDays}</span>
                            <span className="lbl">Days Late</span>
                        </div>
                        <div className="stat-item">
                            <span className="val info">{ep.overtimeHours || 0}h</span>
                            <span className="lbl">Overtime</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FINANCIAL BREAKDOWN --- */}
            <div className="financial-grid">
                {/* Earnings */}
                <div className="section-card">
                    <div className="section-header success-header">
                        <FaMoneyBillWave /> <h3>Earnings</h3>
                    </div>
                    <div className="breakdown-list">
                        <div className="breakdown-item">
                            <span>Base Salary</span>
                            <span>{formatCurrency(ep.monthlyBaseSalary)}</span>
                        </div>
                        {ep.overtimePay > 0 && (
                            <div className="breakdown-item">
                                <span>Overtime Pay ({ep.overtimeHours}h)</span>
                                <span className="positive">+{formatCurrency(ep.overtimePay)}</span>
                            </div>
                        )}
                        <div className="breakdown-item total">
                            <span>Total Gross Pay</span>
                            <span>{formatCurrency(ep.grossPay)}</span>
                        </div>
                    </div>
                </div>

                {/* Deductions */}
                <div className="section-card">
                    <div className="section-header danger-header">
                        <FaExclamationTriangle /> <h3>Deductions</h3>
                    </div>
                    <div className="breakdown-list">
                        {ep.absenceDeductionAmount > 0 && (
                            <div className="breakdown-item">
                                <span>Absence ({ep.absentDays} days)</span>
                                <span className="negative">-{formatCurrency(ep.absenceDeductionAmount)}</span>
                            </div>
                        )}
                        {ep.lateDeductionAmount > 0 && (
                            <div className="breakdown-item">
                                <span>Late Arrival</span>
                                <span className="negative">-{formatCurrency(ep.lateDeductionAmount)}</span>
                            </div>
                        )}
                        {ep.loanDeductionAmount > 0 && (
                            <div className="breakdown-item">
                                <span>Loan Repayment</span>
                                <span className="negative">-{formatCurrency(ep.loanDeductionAmount)}</span>
                            </div>
                        )}
                        {ep.otherDeductionAmount > 0 && (
                            <div className="breakdown-item">
                                <span>Other Deductions</span>
                                <span className="negative">-{formatCurrency(ep.otherDeductionAmount)}</span>
                            </div>
                        )}
                        {ep.totalDeductions === 0 && (
                            <div className="breakdown-item empty">No Deductions</div>
                        )}
                        <div className="breakdown-item total">
                            <span>Total Deductions</span>
                            <span className="negative">-{formatCurrency(ep.totalDeductions)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DAILY LOG TABLE --- */}
            <div className="section-card full-width">
                <div className="section-header info-header">
                    <FaListAlt /> <h3>Daily Activity Log</h3>
                </div>
                <div className="table-responsive">
                    <table className="details-table">
                        <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Status</th>
                            <th>Shift Time</th>
                            <th>Work Hours</th>
                            <th>Late</th>
                            <th>Notes</th>
                        </tr>
                        </thead>
                        <tbody>
                        {snapshots.length > 0 ? (
                            snapshots.map((snap) => (
                                <tr key={snap.id} className={snap.isWeekend ? 'row-weekend' : ''}>
                                    <td>{new Date(snap.attendanceDate).toLocaleDateString()}</td>
                                    <td>{new Date(snap.attendanceDate).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                                    <td>
                                        {getStatusBadge(snap.status, snap.isPublicHoliday, snap.isWeekend)}
                                        {snap.isPublicHoliday && <div className="sub-text">{snap.publicHolidayName}</div>}
                                    </td>
                                    <td>
                                        {snap.checkIn ? (
                                            <span className="times">{snap.checkIn.substring(0,5)} - {snap.checkOut ? snap.checkOut.substring(0,5) : '???'}</span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        {snap.workedHours ? `${snap.workedHours}h` : '-'}
                                        {snap.overtimeHours > 0 && <span className="ot-tag">+{snap.overtimeHours} OT</span>}
                                    </td>
                                    <td>
                                        {snap.lateMinutes > 0 ? <span className="text-danger">{snap.lateMinutes}m</span> : '-'}
                                    </td>
                                    <td className="notes-col">
                                        {snap.notes || '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">No daily snapshots available.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployeePayrollDetails;