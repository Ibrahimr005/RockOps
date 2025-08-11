import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

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
                    <button onClick={onBack} className="btn btn-secondary">
                        Back to Positions
                    </button>
                    {onRetry && (
                        <button onClick={onRetry} className="btn btn-primary">
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PositionErrorState;