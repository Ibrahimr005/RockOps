import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './IntroCard.scss';

const IntroCard = ({
                       title,
                       label = "PROCUREMENT CENTER",
                       lightModeImage,
                       darkModeImage,
                       icon, // NEW: Accept icon component
                       iconColor, // NEW: Icon color override
                       iconSize = "3.5rem", // NEW: Icon size (slightly larger than PageHeader)
                       iconBackgroundColor, // NEW: Custom background color for icon
                       stats = [],
                       onInfoClick,
                       className = ""
                   }) => {
    const { theme } = useTheme();

    // Get the appropriate image based on theme
    const currentImage = theme === 'dark' ? darkModeImage : lightModeImage;

    // Default icon styling
    const defaultIconColor = iconColor || (theme === 'dark' ? '#4880ff' : '#3b82f6');
    const defaultBackgroundColor = iconBackgroundColor || `${defaultIconColor}15`;
    const defaultBorderColor = `${defaultIconColor}25`;

    return (
        <div className={`intro-card ${className}`}>
            <div className="intro-card-left">
                {/* Render either image or icon */}
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt={title}
                        className="intro-card-image"
                    />
                ) : icon ? (
                    <div
                        className="intro-card-icon"
                        style={{
                            color: defaultIconColor,
                            fontSize: iconSize,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '5rem',
                            height: '5rem',
                            borderRadius: '16px',
                            backgroundColor: defaultBackgroundColor,
                            border: `2px solid ${defaultBorderColor}`,
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {icon}
                    </div>
                ) : null}
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
                                <span
                                    className="intro-card-stat-value"
                                    style={{
                                        color: stat.color || defaultIconColor
                                    }}
                                >
                                    {stat.value}
                                </span>
                                <span className="intro-card-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="intro-card-right">
                {onInfoClick && (
                    <button
                        className="intro-card-info-button"
                        onClick={onInfoClick}
                        style={{
                            color: defaultIconColor,
                            borderColor: `${defaultIconColor}40`
                        }}
                    >
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