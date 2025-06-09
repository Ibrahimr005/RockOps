import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiInfo } from 'react-icons/fi';

const PageHeader = ({
                        image,
                        imageAlt = "Page image",
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
                <img
                    src={image}
                    alt={imageAlt}
                    className="page-header-image"
                />
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