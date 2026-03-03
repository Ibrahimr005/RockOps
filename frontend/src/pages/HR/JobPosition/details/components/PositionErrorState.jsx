import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from '../../../../../components/common/Button/Button';

const PositionErrorState = ({
                                error,
                                title = "Failed to Load Position",
                                onRetry,
                                onBack
                            }) => {
    return (
        <div className="position-details-error">
            <div className="error-content">
                <FiAlertTriangle className="error-icon" />
                <h2>{title}</h2>
                <p>{error}</p>
                <div className="error-actions">
                    <Button variant="secondary" onClick={onBack}>
                        Back to Positions
                    </Button>
                    {onRetry && (
                        <Button variant="primary" onClick={onRetry}>
                            Try Again
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PositionErrorState;