import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import './ProcurementIntroCard.scss';

const ProcurementIntroCard = ({
                                  title,
                                  label = "PROCUREMENT CENTER",
                                  lightModeImage,
                                  darkModeImage,
                                  stats = [],
                                  onInfoClick,
                                  className = ""
                              }) => {
    const { theme } = useTheme();

    // Get the appropriate image based on theme
    const currentImage = theme === 'dark' ? darkModeImage : lightModeImage;

    return (
        <div className={`procurement-intro-card ${className}`}>
            <div className="procurement-intro-left">
                <img
                    src={currentImage}
                    alt={title}
                    className="procurement-intro-image"
                />
            </div>
            <div className="procurement-intro-content">
                <div className="procurement-intro-header">
                    <span className="procurement-label">{label}</span>
                    <h2 className="procurement-intro-title">{title}</h2>
                </div>

                {stats.length > 0 && (
                    <div className="procurement-stats">
                        {stats.map((stat, index) => (
                            <div key={index} className="procurement-stat-item">
                                <span className="procurement-stat-value">{stat.value}</span>
                                <span className="procurement-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="procurement-intro-right">
                {onInfoClick && (
                    <button className="procurement-info-button" onClick={onInfoClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProcurementIntroCard;