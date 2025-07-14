import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './IntroCard.scss';

const IntroCard = ({
                       title,
                       label = "PROCUREMENT CENTER",
                       lightModeImage,
                       darkModeImage,
                       icon, // New icon prop
                       stats = [],
                       onInfoClick,
                       className = ""
                   }) => {
    const { theme } = useTheme();

    // Get the appropriate image based on theme
    const currentImage = theme === 'dark' ? darkModeImage : lightModeImage;

    return (
        <div className={`intro-card ${className}`}>
            {/* Background decorative elements */}
            <div className="intro-card-bg-decoration">
                <div className="intro-card-circle-1"></div>
                <div className="intro-card-circle-2"></div>
                <div className="intro-card-line-1"></div>
                <div className="intro-card-line-2"></div>
            </div>

            <div className="intro-card-left">
                <div className="intro-card-image-container">
                    {/* Render image if available, otherwise fall back to icon */}
                    {(lightModeImage || darkModeImage) ? (
                        <>
                            <img
                                src={currentImage}
                                alt={title}
                                className="intro-card-image"
                            />
                            <div className="intro-card-image-glow"></div>
                        </>
                    ) : icon ? (
                        <div className="intro-card-icon">
                            {icon}
                            <div className="intro-card-icon-glow"></div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="intro-card-content">
                <div className="intro-card-header">
                    <span className="intro-card-label">{label}</span>
                    <h2 className="intro-card-title">{title}</h2>
                </div>

                {stats.length > 0 && (
                    <div className="intro-card-stats">
                        {stats.map((stat, index) => (
                            <div key={index} className="intro-card-stat-item">
                                <div className="intro-card-stat-value-container">
                                    <span className="intro-card-stat-value">{stat.value}</span>
                                    <div className="intro-card-stat-pulse"></div>
                                </div>
                                <span className="intro-card-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="intro-card-right">
                {onInfoClick && (
                    <button className="intro-card-info-button" onClick={onInfoClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <div className="intro-card-button-ripple"></div>
                    </button>
                )}
            </div>
        </div>
    );
};

export default IntroCard;