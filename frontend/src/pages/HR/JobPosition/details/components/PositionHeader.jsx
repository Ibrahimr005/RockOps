import React from 'react';
import {
    FiArrowLeft,
    FiEdit,
    FiTrash2,
    FiMapPin,
    FiCheckCircle,
    FiAlertTriangle
} from 'react-icons/fi';

const PositionHeader = ({ position, onEdit, onDelete, onBack }) => {
    const getStatusIcon = (active) => {
        return active ? <FiCheckCircle /> : <FiAlertTriangle />;
    };

    return (
        <div className="position-header">
            <div className="header-left">
                <button onClick={onBack} className="back-button">
                    <FiArrowLeft />
                    Back to Positions
                </button>
                <div className="header-info">
                    <h1>{position.positionName}</h1>
                    <div className="header-meta">
                        <span className="department">
                            <FiMapPin />
                            {position.department?.name || 'No Department'}
                        </span>
                        <span className={`status ${position.active ? 'active' : 'inactive'}`}>
                            {getStatusIcon(position.active)}
                            {position.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="header-actions">
                <button onClick={onEdit} className="btn btn-secondary">
                    <FiEdit />
                    Edit
                </button>
                <button onClick={onDelete} className="btn btn-danger">
                    <FiTrash2 />
                    Delete
                </button>
            </div>
        </div>
    );
};

export default PositionHeader;