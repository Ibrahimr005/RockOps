import React from 'react';
import './AttendanceSummaryCard.scss';

const AttendanceSummaryCard = ({ icon, title, value, subValue, color = 'primary' }) => {
    return (
        <div className={`attendance-summary-card ${color}`}>
            <div className="card-icon">
                {icon}
            </div>
            <div className="card-content">
                <h3 className="card-title">{title}</h3>
                <div className="card-value">
                    <span className="main-value">{value}</span>
                    {subValue && <span className="sub-value">{subValue}</span>}
                </div>
            </div>
        </div>
    );
};

export default AttendanceSummaryCard;