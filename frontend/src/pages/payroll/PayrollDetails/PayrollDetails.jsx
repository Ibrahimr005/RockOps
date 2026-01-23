// ========================================
// FILE: PayrollDetails.jsx (REFACTORED)
// Main container - orchestrates phase components
// ========================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaChevronRight,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaFileInvoiceDollar
} from 'react-icons/fa';

// Common Components
import IntroCard from '../../../components/common/IntroCard/IntroCard'; // Replaced PageHeader
import { useSnackbar } from '../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import payrollService from '../../../services/payroll/payrollService';

// Phase Components
import PayrollTimeline from './components/PayrollTimeline';
import PayrollSummaryCards from './components/PayrollSummaryCards';
import PublicHolidaysPhase from './components/PublicHolidaysPhase';
import AttendanceImportPhase from './components/AttendanceImportPhase';
import LeaveReviewPhase from './components/LeaveReviewPhase';
import OvertimeReviewPhase from './components/OvertimeReviewPhase';
import DeductionReviewPhase from './components/DeductionReviewPhase';
import ConfirmedLockedPhase from './components/ConfirmedLockedPhase';
import PendingFinanceReviewPhase from './components/PendingFinanceReviewPhase';
import PaidPhase from './components/PaidPhase';

import './PayrollDetails.scss';

const PayrollDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        action: null,
        title: '',
        message: ''
    });

    // Fetch data on mount
    useEffect(() => {
        fetchPayrollDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Fetch payroll details
    const fetchPayrollDetails = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getPayrollById(id);
            setPayroll(data);
        } catch (error) {
            showError(error.message || 'Failed to load payroll details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle state transition
    const handleStateTransition = async (endpoint, successMessage) => {
        try {
            setProcessing(true);
            // Construct full endpoint relative to the ID, but service usually handles the ID
            // Ideally, add transition method to payrollService if not exists, or pass full string
            const fullEndpoint = `/api/v1/payroll/${id}/${endpoint}`;

            await payrollService.transitionState(id, fullEndpoint, successMessage);

            showSuccess(successMessage);
            await fetchPayrollDetails();
        } catch (error) {
            showError(error.message || 'Operation failed');
            console.error(error);
        } finally {
            setProcessing(false);
            setConfirmDialog({ open: false, action: null, title: '', message: '' });
        }
    };

    // Open confirmation dialog
    const openConfirmDialog = (action, title, message) => {
        setConfirmDialog({
            open: true,
            action,
            title,
            message,
        });
    };

    // Get phase steps configuration - 8 phases
    const getPhaseSteps = () => [
        { key: 'PUBLIC_HOLIDAYS_REVIEW', number: 1, title: 'Public Holidays Review', nextAction: 'import-attendance', nextLabel: 'Import Attendance' },
        { key: 'ATTENDANCE_IMPORT', number: 2, title: 'Attendance Import', nextAction: 'leave-review', nextLabel: 'Move to Leave Review' },
        { key: 'LEAVE_REVIEW', number: 3, title: 'Leave Review', nextAction: 'overtime-review', nextLabel: 'Move to Overtime Review' },
        { key: 'OVERTIME_REVIEW', number: 4, title: 'Overtime Review', nextAction: 'deduction-review', nextLabel: 'Move to Deduction Review' },
        { key: 'DEDUCTION_REVIEW', number: 5, title: 'Deduction Review', nextAction: 'confirm-lock', nextLabel: 'Confirm & Lock' },
        { key: 'CONFIRMED_AND_LOCKED', number: 6, title: 'Confirmed & Locked', nextAction: null, nextLabel: null },
        { key: 'PENDING_FINANCE_REVIEW', number: 7, title: 'Pending Finance Review', nextAction: null, nextLabel: null },
        { key: 'PAID', number: 8, title: 'Paid', nextAction: null, nextLabel: null },
    ];

    // Get current phase index
    const getCurrentPhaseIndex = () => {
        if (!payroll) return -1;
        return getPhaseSteps().findIndex(step => step.key === payroll.status);
    };

    // Handle next phase button
    const handleNextPhase = () => {
        const currentIndex = getCurrentPhaseIndex();
        const currentStep = getPhaseSteps()[currentIndex];

        if (!currentStep?.nextAction) return;

        openConfirmDialog(
            currentStep.nextAction,
            `${currentStep.nextLabel}?`,
            `Are you sure you want to proceed to the next phase: ${getPhaseSteps()[currentIndex + 1]?.title}?`
        );
    };

    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    // Get payroll period label from startDate
    const getPayrollPeriodLabel = () => {
        if (!payroll?.startDate) return 'Payroll';
        const date = new Date(payroll.startDate);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${month} ${year}`;
    };

    // Render phase component based on status
    const renderPhaseComponent = () => {
        const phaseProps = {
            payroll,
            onTransition: handleStateTransition,
            onRefresh: fetchPayrollDetails,
            processing,
            openConfirmDialog,
        };

        switch (payroll.status) {
            case 'PUBLIC_HOLIDAYS_REVIEW':
                return <PublicHolidaysPhase {...phaseProps} />;

            case 'ATTENDANCE_IMPORT':
                return <AttendanceImportPhase {...phaseProps} />;

            case 'LEAVE_REVIEW':
                return <LeaveReviewPhase {...phaseProps} />;

            case 'OVERTIME_REVIEW':
                return <OvertimeReviewPhase {...phaseProps} />;

            case 'DEDUCTION_REVIEW':
                return <DeductionReviewPhase {...phaseProps} />;

            case 'CONFIRMED_AND_LOCKED':
                return <ConfirmedLockedPhase {...phaseProps} />;

            case 'PENDING_FINANCE_REVIEW':
                return <PendingFinanceReviewPhase {...phaseProps} />;

            case 'PAID':
                return <PaidPhase {...phaseProps} />;

            default:
                return <div className="unknown-phase">Unknown payroll status: {payroll.status}</div>;
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="payroll-details-page loading">
                <div className="loading-spinner">Loading payroll details...</div>
            </div>
        );
    }

    // Error state
    if (!payroll) {
        return (
            <div className="payroll-details-page error">
                <div className="error-message">Payroll not found</div>
            </div>
        );
    }

    const currentPhaseIndex = getCurrentPhaseIndex();
    const phaseSteps = getPhaseSteps();
    const currentStep = phaseSteps[currentPhaseIndex];
    const isLocked = payroll.status === 'CONFIRMED_AND_LOCKED' || payroll.status === 'PENDING_FINANCE_REVIEW' || payroll.status === 'PAID';

    return (
        <div className="payroll-details-page">
            {/* Intro Card (Replaces PageHeader) */}
            <IntroCard
                title={`Payroll - ${getPayrollPeriodLabel()}`}
                label="PAYROLL CYCLE MANAGEMENT"
                icon={<FaFileInvoiceDollar style={{ fontSize: '3.5rem', color: 'var(--color-primary)' }} />}
                breadcrumbs={[
                    {
                        label: 'Payroll Cycles',
                        icon: <FaCalendarAlt />,
                        onClick: () => navigate('/payroll')
                    },
                    {
                        label: getPayrollPeriodLabel(),
                        icon: <FaFileInvoiceDollar />
                    }
                ]}
                stats={[
                    {
                        label: 'Period',
                        value: `${formatDate(payroll.startDate)} - ${formatDate(payroll.endDate)}`
                    },
                    {
                        label: 'Total Net Pay',
                        value: formatCurrency(payroll.totalNetAmount)
                    },
                    {
                        label: 'Status',
                        value: payroll.statusDisplayName || payroll.status?.replace(/_/g, ' ')
                    }
                ]}
                actionButtons={[
                    currentStep?.nextAction && !isLocked && {
                        text: currentStep.nextLabel,
                        icon: <FaChevronRight />,
                        onClick: handleNextPhase,
                        className: 'bg-primary text-white',
                        disabled: processing
                    }
                ].filter(Boolean)}
            />



            {/* Timeline - Always visible */}
            <PayrollTimeline
                currentStatus={payroll.status}
                steps={phaseSteps}
            />

            {/* Summary Cards - Always visible */}
            <PayrollSummaryCards payroll={payroll} />

            {/* Phase-Specific Component */}
            {renderPhaseComponent()}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.open}
                type="info"
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Proceed"
                cancelText="Cancel"
                onConfirm={() => handleStateTransition(confirmDialog.action, 'Phase updated successfully')}
                onCancel={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
            />
        </div>
    );
};

export default PayrollDetails;