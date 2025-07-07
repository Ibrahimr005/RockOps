import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './IntroCard.scss';

const IntroCard = ({
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
        <div className={`intro-card ${className}`}>
            <div className="intro-card-left">
                <img
                    src={currentImage}
                    alt={title}
                    className="intro-card-image"
                />
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
                                <span className="intro-card-stat-value">{stat.value}</span>
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
                    </button>
                )}
            </div>
        </div>
    );
};

export default IntroCard;