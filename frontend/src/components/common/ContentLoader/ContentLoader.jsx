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
        let classes = ['oretech-content-loader'];

        // Size variants
        if (size === 'small') classes.push('oretech-content-loader--small');
        if (size === 'large') classes.push('oretech-content-loader--large');

        // Animation variants
        if (variant === 'pulse') classes.push('oretech-content-loader--pulse');
        if (variant === 'fade') classes.push('oretech-content-loader--fade');

        // Context-specific variants
        if (context === 'employee-details') classes.push('oretech-content-loader--employee-details');
        if (context === 'dashboard') classes.push('oretech-content-loader--dashboard');
        if (context === 'table') classes.push('oretech-content-loader--table');
        if (context === 'modal') classes.push('oretech-content-loader--modal');

        // Fade in animation
        if (fadeIn) classes.push('oretech-content-loader--fade-in');

        return classes.join(' ');
    };

    return (
        <div className={getLoaderClasses()}>
            <div className="oretech-content-loader__container">
                {/* Main spinner */}
                <div className="oretech-content-loader__spinner-wrapper">
                    <div className="oretech-content-loader__spinner">
                        <div className="oretech-content-loader__spinner-ring oretech-content-loader__spinner-ring--primary"></div>
                        <div className="oretech-content-loader__spinner-ring oretech-content-loader__spinner-ring--secondary"></div>
                    </div>
                </div>

                {/* Loading message */}
                {message && (
                    <p className="oretech-content-loader__message">
                        {message}
                    </p>
                )}

                {/* Animated dots */}
                <div className="oretech-content-loader__dots-container">
                    <span className="oretech-content-loader__dot oretech-content-loader__dot--first"></span>
                    <span className="oretech-content-loader__dot oretech-content-loader__dot--second"></span>
                    <span className="oretech-content-loader__dot oretech-content-loader__dot--third"></span>
                </div>
            </div>
        </div>
    );
};

export default ContentLoader;