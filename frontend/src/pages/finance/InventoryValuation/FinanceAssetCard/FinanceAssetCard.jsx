import React from 'react';
import './FinanceAssetCard.scss';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

const FinanceAssetCard = ({
                              title,
                              value,
                              expenses,  // ✅ ADDED
                              subtitle,
                              icon: Icon,
                              imageUrl,
                              imageFallback,
                              stats = [],
                              categoryBreakdown = [],
                              isExpanded = false,
                              onExpand,
                              badge,
                              variant = 'default', // 'default', 'site', 'nested'
                              size = 'normal', // 'normal', 'compact'
                              showValueLabel = false,
                              className = ''
                          }) => {


    const formatCurrency = (value) => {
        if (!value && value !== 0) return '0.00';
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    return (
        <div className={`finance-asset-card variant-${variant} size-${size} ${isExpanded ? 'expanded' : ''} ${className}`}>
            <div className="finance-card-header" onClick={onExpand && !categoryBreakdown.length ? onExpand : undefined}>
                {(imageUrl || imageFallback || Icon) && (
                    <div className="finance-card-icon">
                        {imageUrl || imageFallback ? (
                            <img
                                src={imageUrl || imageFallback}
                                alt={title}
                                onError={(e) => {
                                    if (imageFallback) e.target.src = imageFallback;
                                }}
                            />
                        ) : (
                            Icon && <Icon size={size === 'compact' ? 14 : 16} />
                        )}
                    </div>
                )}

                <div className="finance-card-main">
                    <div className="finance-card-title-row">
                        <h3 className="finance-card-title">{title}</h3>
                        {badge && (
                            <span className={`finance-card-badge ${badge.variant || ''}`}>
                                {badge.text}
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="finance-card-subtitle">{subtitle}</p>}
                </div>

                <div className="finance-card-values-wrapper">
                    <div className="finance-card-value-container">
                        <div className="finance-card-value">
                            {showValueLabel && <span className="value-label">Value</span>}
                            <span className="value-amount">{value}</span>
                            <span className="value-currency">EGP</span>
                        </div>
                    </div>

                    {expenses && (
                        <div className="finance-card-expenses-container">
                            <div className="finance-card-expenses">
                                <span className="expenses-label">Expenses</span>
                                <span className="expenses-amount">{expenses}</span>
                                <span className="expenses-currency">EGP</span>
                            </div>
                        </div>
                    )}
                </div>

                {onExpand && !categoryBreakdown.length && (
                    <button
                        className="finance-card-expand-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand();
                        }}
                    >
                        {isExpanded ? <FiChevronDown size={size === 'compact' ? 14 : 16} /> : <FiChevronRight size={size === 'compact' ? 14 : 16} />}
                    </button>
                )}
            </div>

            {stats.length > 0 && (
                <div className="finance-card-stats">
                    {stats.map((stat, index) => (
                        <div key={index} className="finance-stat-item">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {categoryBreakdown.length > 0 && (
                <div className="finance-card-breakdown">
                    {categoryBreakdown.map((category, index) => (
                        <div
                            key={index}
                            className={`breakdown-row ${category.isActive ? 'active' : ''}`}
                            onClick={!category.disabled ? category.onViewDetails : undefined}
                            style={{ cursor: category.disabled ? 'not-allowed' : 'pointer' }}
                        >
                            <div className="breakdown-info">
                                {category.icon && (
                                    <div className="breakdown-icon">
                                        <category.icon size={14} />
                                    </div>
                                )}
                                <span className="breakdown-label">{category.label}</span>
                                <span className="breakdown-count">{category.count}</span>
                            </div>


                            <div className="breakdown-values-wrapper">
                                <div className="breakdown-value-container">
                                    <div className="breakdown-value">
                                        <span className="breakdown-value-label">Value</span>
                                        <span className="breakdown-amount">{formatCurrency(category.value)}</span>
                                        <span className="breakdown-currency">EGP</span>
                                    </div>
                                </div>

                                {category.expenses !== undefined && (
                                    <div className="breakdown-expenses-container">
                                        <div className="breakdown-expenses">
                                            <span className="breakdown-expenses-label">Expenses</span>
                                            <span className="breakdown-expenses-amount">{formatCurrency(category.expenses)}</span>
                                            <span className="breakdown-expenses-currency">EGP</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!category.disabled ? (
                                <button
                                    className="breakdown-expand-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        category.onViewDetails();
                                    }}
                                >
                                    {category.isActive ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                                </button>
                            ) : (
                                <span className="breakdown-disabled-badge">Coming Soon</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FinanceAssetCard;