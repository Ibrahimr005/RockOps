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
    FaCheckCircle
} from 'react-icons/fa';
import './PayrollTimeline.scss';

const PayrollTimeline = ({ currentStatus, steps }) => {
    // Icon mapping
    const iconMap = {
        'PUBLIC_HOLIDAYS_REVIEW': <FaCalendarAlt />,
        'ATTENDANCE_IMPORT': <FaClock />,
        'LEAVE_REVIEW': <FaUsers />,
        'OVERTIME_REVIEW': <FaClock />,
        'CONFIRMED_AND_LOCKED': <FaLock />,
        'PAID': <FaCheckCircle />,
    };

    // Description mapping
    const descriptionMap = {
        'PUBLIC_HOLIDAYS_REVIEW': 'Identify and mark public holidays',
        'ATTENDANCE_IMPORT': 'Import and snapshot attendance data',
        'LEAVE_REVIEW': 'Review employee leave requests',
        'OVERTIME_REVIEW': 'Review and approve overtime',
        'CONFIRMED_AND_LOCKED': 'Calculations finalized and locked',
        'PAID': 'Payroll processed and paid',
    };

    // Get current index
    const currentIndex = steps.findIndex(step => step.key === currentStatus);

    return (
        <div className="payroll-timeline">
            <div className="lifecycle-timeline">
                {steps.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;

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