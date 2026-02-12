// ========================================
// FILE: FinanceSubTimeline.jsx
// Finance workflow sub-timeline component
// Shown only during finance phases
// ========================================

import React from 'react';
import {
    FaFileInvoiceDollar,
    FaCheckCircle,
    FaTimesCircle,
    FaMoneyCheckAlt,
    FaCoins
} from 'react-icons/fa';
import './FinanceSubTimeline.scss';

const FinanceSubTimeline = ({ currentStatus }) => {
    // Finance phase steps
    const financeSteps = [
        { key: 'PENDING_FINANCE_REVIEW', number: 1, title: 'Pending Review', icon: <FaFileInvoiceDollar /> },
        { key: 'FINANCE_APPROVED', number: 2, title: 'Approved', icon: <FaCheckCircle /> },
        { key: 'PARTIALLY_PAID', number: 3, title: 'Partially Paid', icon: <FaCoins /> },
        { key: 'PAID', number: 4, title: 'Paid', icon: <FaMoneyCheckAlt /> },
    ];

    // Special handling for rejected status
    const isRejected = currentStatus === 'FINANCE_REJECTED';

    // Get current step index
    const getCurrentIndex = () => {
        if (isRejected) return 0; // Show at pending review step
        return financeSteps.findIndex(step => step.key === currentStatus);
    };

    const currentIndex = getCurrentIndex();

    return (
        <div className="finance-sub-timeline">
            <div className="sub-timeline-header">
                <FaFileInvoiceDollar />
                <h4>Finance Workflow</h4>
            </div>

            {isRejected ? (
                <div className="rejected-status">
                    <FaTimesCircle className="rejected-icon" />
                    <span>Finance Rejected</span>
                </div>
            ) : (
                <div className="sub-timeline-steps">
                    {financeSteps.map((step, index) => {
                        const isActive = index === currentIndex;
                        const isCompleted = index < currentIndex;

                        return (
                            <div
                                key={step.key}
                                className={`sub-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            >
                                <div className="sub-step-indicator">
                                    {isCompleted ? <FaCheckCircle /> : step.icon}
                                </div>
                                <span className="sub-step-title">{step.title}</span>
                                {index < financeSteps.length - 1 && (
                                    <div className={`sub-step-connector ${isCompleted ? 'completed' : ''}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FinanceSubTimeline;
