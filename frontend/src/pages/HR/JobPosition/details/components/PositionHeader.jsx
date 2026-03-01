import React from 'react';
import {
    FiArrowLeft,
    FiEdit,
    FiTrash2,
    FiMapPin,
    FiCheckCircle,
    FiAlertTriangle
} from 'react-icons/fi';
import { Button, IconButton } from '../../../../../components/common/Button/Button';

const PositionHeader = ({ position, onEdit, onDelete, onBack }) => {
    const getStatusIcon = (active) => {
        return active ? <FiCheckCircle /> : <FiAlertTriangle />;
    };

    return (
        <div className="position-header">
            <div className="header-left">
                <IconButton
                    variant="ghost"
                    icon={<FiArrowLeft />}
                    onClick={onBack}
                    title="Back to positions"
                />
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
                <Button variant="secondary" onClick={onEdit}>
                    <FiEdit />
                    Edit
                </Button>
                <Button variant="danger" onClick={onDelete}>
                    <FiTrash2 />
                    Delete
                </Button>
            </div>
        </div>
    );
};

export default PositionHeader;