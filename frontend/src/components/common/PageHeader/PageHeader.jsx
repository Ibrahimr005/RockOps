import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiInfo } from 'react-icons/fi';
import "./PageHeader.scss"

const PageHeader = ({
                        image,
                        imageAlt = "Page image",
                        icon, // NEW: Accept icon component
                        iconColor, // NEW: Icon color override
                        iconSize = "3rem", // NEW: Icon size
                        label,
                        title,
                        stats = [],
                        backButton = null,
                        showInfoButton = false,
                        onInfoClick = null,
                        accentColor = "#3b82f6",
                        className = ""
                    }) => {
    const navigate = useNavigate();

    return (
        <div className={`page-header ${className}`}>
            <div className="page-header-left">
                {/* Render either image or icon */}
                {image ? (
                    <img
                        src={image}
                        alt={imageAlt}
                        className="page-header-image"
                    />
                ) : icon ? (
                    <div
                        className="page-header-icon"
                        style={{
                            color: iconColor || accentColor,
                            fontSize: iconSize,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '4rem',
                            height: '4rem',
                            borderRadius: '12px',
                            backgroundColor: `${iconColor || accentColor}15`,
                            border: `2px solid ${iconColor || accentColor}25`
                        }}
                    >
                        {icon}
                    </div>
                ) : null}
            </div>

            <div className="page-header-content">
                <div className="page-header-intro">
                    <span className="page-header-label">{label}</span>
                    <h2 className="page-header-title">{title}</h2>
                </div>

                {stats.length > 0 && (
                    <div className="page-header-stats">
                        {stats.map((stat, index) => (
                            <div key={index} className="page-header-stat-item">
                                <span
                                    className="page-header-stat-value"
                                    style={{ color: stat.color || accentColor }}
                                >
                                    {stat.value}
                                </span>
                                <span className="page-header-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(backButton || showInfoButton) && (
                <div className="page-header-right">
                    {showInfoButton && (
                        <button
                            className="page-header-info-button"
                            onClick={onInfoClick}
                        >
                            <FiInfo />
                        </button>
                    )}

                    {backButton && (
                        <button
                            className="page-header-back-button"
                            onClick={() => navigate(backButton.path)}
                        >
                            <FiChevronRight className="page-header-icon-rotate-180" />
                            {backButton.text}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PageHeader;