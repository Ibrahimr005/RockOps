import React, { useState } from 'react';
import './UnifiedCard.scss';

/**
 * UnifiedCard Component - Beautiful Modern Design
 * Supports presigned URL refresh for MinIO/S3 images
 */
const UnifiedCard = ({
                         id,
                         title = 'Untitled',
                         imageUrl,
                         imageFallback,
                         stats = [],
                         actions = [],
                         hasAlert = false,
                         alertTooltip = '',
                         onClick,
                         className = '',
                         // Empty state props
                         isEmpty = false,
                         emptyIcon: EmptyIcon,
                         emptyMessage = 'No data available',
                         emptyIconSize = 54,
                         // New prop for presigned URL refresh
                         onImageRefresh = null
                     }) => {

    const [imageRefreshAttempted, setImageRefreshAttempted] = useState(false);
    const [refreshedImageUrl, setRefreshedImageUrl] = useState(null);

    const handleImageError = async (e) => {
        // If we have a refresh callback and haven't attempted refresh yet
        if (onImageRefresh && !imageRefreshAttempted) {
            setImageRefreshAttempted(true);
            try {
                const newUrl = await onImageRefresh(id);
                if (newUrl && newUrl !== e.target.src) {
                    setRefreshedImageUrl(newUrl);
                    e.target.src = newUrl;
                    return;
                }
            } catch (error) {
                console.error(`Failed to refresh image for ${title}:`, error);
            }
        }
        
        // Fallback to placeholder
        if (imageFallback && e.target.src !== imageFallback) {
            e.target.src = imageFallback;
        }
    };

    const handleCardClick = () => {
        if (onClick && !isEmpty) {
            onClick(id);
        }
    };

    const getActionsClass = () => {
        const count = actions.length;
        if (count === 2) return 'has-two-buttons';
        if (count === 3) return 'has-three-buttons';
        if (count >= 4) return 'has-four-buttons';
        return '';
    };

    // Render empty state
    if (isEmpty) {
        return (
            <div className="unified-cards-empty">
                {EmptyIcon && (
                    <div className="unified-cards-empty-icon">
                        <EmptyIcon size={emptyIconSize} />
                    </div>
                )}
                <p>{emptyMessage}</p>
            </div>
        );
    }

    // Render normal card
    return (
        <div
            className={`unified-card ${className}`}
            onClick={handleCardClick}
            title={hasAlert ? alertTooltip : undefined}
        >
            {/* Image Section */}
            <div className="unified-card-image">
                <img
                    src={refreshedImageUrl || imageUrl || imageFallback}
                    alt={title}
                    onError={handleImageError}
                />

                {hasAlert && (
                    <div className="unified-card-status-corner"></div>
                )}
            </div>

            {/* Content Section */}
            <div className="unified-card-content">
                {/* Title */}
                <h2 className="unified-card-title">{title}</h2>

                {/* Stats */}
                {stats.length > 0 && (
                    <div className="unified-card-stats">
                        {stats.map((stat, index) => (
                            <React.Fragment key={index}>
                                <div className="unified-card-stat-item">
                                    <span className="unified-card-stat-label">{stat.label}</span>
                                    <div className="unified-card-stat-value">
                                        {stat.statusIndicator ? (
                                            <span className={`unified-status-indicator ${stat.statusClass || ''}`}>
                                                {stat.value}
                                            </span>
                                        ) : (
                                            stat.value
                                        )}
                                    </div>
                                </div>
                                {index < stats.length - 1 && (
                                    <div className="unified-card-divider"></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                {actions.length > 0 && (
                    <div className={`unified-card-actions ${getActionsClass()}`}>
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                className={`unified-btn-${action.variant || 'primary'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (action.onClick) {
                                        action.onClick(id);
                                    }
                                }}
                                disabled={action.disabled}
                            >
                                {action.icon && <span className="btn-icon">{action.icon}</span>}
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedCard;