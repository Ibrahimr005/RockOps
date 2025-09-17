// ContentLoader.jsx
import React from 'react';
import './ContentLoader.scss';

const ContentLoader = ({
                           message = "Loading...",
                           size = "default", // "small", "default", "large"
                           variant = "default", // "default", "pulse", "fade"
                           context = "", // "employee-details", "dashboard", "table", "modal"
                           fadeIn = true
                       }) => {
    // Build class names dynamically
    const getLoaderClasses = () => {
        let classes = ['rockops-content-loader'];

        // Size variants
        if (size === 'small') classes.push('rockops-content-loader--small');
        if (size === 'large') classes.push('rockops-content-loader--large');

        // Animation variants
        if (variant === 'pulse') classes.push('rockops-content-loader--pulse');
        if (variant === 'fade') classes.push('rockops-content-loader--fade');

        // Context-specific variants
        if (context === 'employee-details') classes.push('rockops-content-loader--employee-details');
        if (context === 'dashboard') classes.push('rockops-content-loader--dashboard');
        if (context === 'table') classes.push('rockops-content-loader--table');
        if (context === 'modal') classes.push('rockops-content-loader--modal');

        // Fade in animation
        if (fadeIn) classes.push('rockops-content-loader--fade-in');

        return classes.join(' ');
    };

    return (
        <div className={getLoaderClasses()}>
            <div className="rockops-content-loader__container">
                {/* Main spinner */}
                <div className="rockops-content-loader__spinner-wrapper">
                    <div className="rockops-content-loader__spinner">
                        <div className="rockops-content-loader__spinner-ring rockops-content-loader__spinner-ring--primary"></div>
                        <div className="rockops-content-loader__spinner-ring rockops-content-loader__spinner-ring--secondary"></div>
                    </div>
                </div>

                {/* Loading message */}
                {message && (
                    <p className="rockops-content-loader__message">
                        {message}
                    </p>
                )}

                {/* Animated dots */}
                <div className="rockops-content-loader__dots-container">
                    <span className="rockops-content-loader__dot rockops-content-loader__dot--first"></span>
                    <span className="rockops-content-loader__dot rockops-content-loader__dot--second"></span>
                    <span className="rockops-content-loader__dot rockops-content-loader__dot--third"></span>
                </div>
            </div>
        </div>
    );
};

export default ContentLoader;