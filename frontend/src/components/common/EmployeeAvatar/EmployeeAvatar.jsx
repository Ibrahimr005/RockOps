import React from 'react';
import { FaUser } from 'react-icons/fa';
import './EmployeeAvatar.scss';

const EmployeeAvatar = ({ 
    photoUrl, 
    firstName, 
    lastName, 
    size = 'medium', 
    showStatus = false, 
    status = null,
    className = '' 
}) => {
    const getEmployeeName = () => {
        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        }
        return firstName || lastName || 'Employee';
    };

    const handleImageError = (e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
    };

    return (
        <div className={`employee-avatar employee-avatar--${size} ${className}`}>
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt={getEmployeeName()}
                    onError={handleImageError}
                />
            ) : (
                <div className="employee-avatar__placeholder">
                    <FaUser />
                </div>
            )}
            <div className="employee-avatar__placeholder" style={{ display: 'none' }}>
                <FaUser />
            </div>
            {showStatus && status && (
                <div className={`employee-status-indicator ${status.toLowerCase()}`}></div>
            )}
        </div>
    );
};

export default EmployeeAvatar; 