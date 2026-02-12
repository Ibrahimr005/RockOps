// ========================================
// FILE: PayrollTimeline.jsx
// Shared component - Lifecycle timeline
// ========================================

import React from 'react';
import {
    FaCalendarAlt,
    FaClock,
    FaUsers,
    FaLock,
    FaCheckCircle,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaGift
} from 'react-icons/fa';
import './PayrollTimeline.scss';

const PayrollTimeline = ({ currentStatus, steps, isFinancePhase = false }) => {
    // Icon mapping for HR phases
    const iconMap = {
        'PUBLIC_HOLIDAYS_REVIEW': <FaCalendarAlt />,
        'ATTENDANCE_IMPORT': <FaClock />,
        'LEAVE_REVIEW': <FaUsers />,
        'OVERTIME_REVIEW': <FaClock />,
        'BONUS_REVIEW': <FaGift />,
        'DEDUCTION_REVIEW': <FaMoneyBillWave />,
        'CONFIRMED_AND_LOCKED': <FaLock />,
    };

    // Description mapping for HR phases
    const descriptionMap = {
        'PUBLIC_HOLIDAYS_REVIEW': 'Identify and mark public holidays',
        'ATTENDANCE_IMPORT': 'Import and snapshot attendance data',
        'LEAVE_REVIEW': 'Review employee leave requests',
        'OVERTIME_REVIEW': 'Review and approve overtime',
        'BONUS_REVIEW': 'Review and process employee bonuses',
        'DEDUCTION_REVIEW': 'Review all deductions including loans',
        'CONFIRMED_AND_LOCKED': 'Calculations finalized and locked',
    };

    // Get current index - if in finance phase, all HR steps are completed
    const currentIndex = isFinancePhase
        ? steps.length // All HR steps complete
        : steps.findIndex(step => step.key === currentStatus);

    return (
        <div className="payroll-timeline">
            <div className="timeline-header">
                <h3>HR Workflow</h3>
                {isFinancePhase && <span className="completed-badge"><FaCheckCircle /> Completed</span>}
            </div>
            <div className="lifecycle-timeline">
                {steps.map((step, index) => {
                    const isActive = !isFinancePhase && index === currentIndex;
                    const isCompleted = isFinancePhase || index < currentIndex;

                    return (
                        <div
                            key={step.key}
                            className={`timeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        >
                            <div className="step-number">
                                {isCompleted ? <FaCheckCircle /> : step.number}
                            </div>
                            <div className="step-content">
                                <div className="step-icon">{iconMap[step.key]}</div>
                                <h3>{step.title}</h3>
                                <p>{descriptionMap[step.key]}</p>
                            </div>
                            {index < steps.length - 1 && <div className="step-connector" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PayrollTimeline;