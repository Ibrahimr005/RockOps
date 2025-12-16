import React from 'react';
import './LoadingSpinner.scss';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium', fullPage = false }) => {
    const content = (
        <div className={`loading-spinner-wrapper ${fullPage ? 'full-page' : ''}`}>
            <div className={`loading-spinner-container ${size}`}>
                <div className="spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                {message && <p className="loading-message">{message}</p>}
            </div>
        </div>
    );

    return content;
};

export default LoadingSpinner;
