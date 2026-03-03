import React from 'react';
import PropTypes from 'prop-types';
import './StatisticsCards.scss';

/**
 * StatisticsCards Component
 *
 * A reusable statistics card grid component that displays key metrics.
 * Supports both legacy API (with data + getValue) and direct value API.
 *
 * @param {Object} props - Component props
 * @param {Array} props.cards - Card configurations (required)
 * @param {Array} props.data - Optional data array for legacy getValue pattern
 * @param {number} props.columns - Optional fixed column count (default: auto based on card count)
 * @param {string} props.className - Optional additional CSS class
 *
 * Card shape (new API):
 *   { icon: <ReactIcon />, label: "Label", value: 42, variant: "primary", subtitle: "15 Active" }
 *
 * Card shape (legacy API - backward compatible):
 *   { icon: <ReactIcon />, label: "Label", getValue: (data) => data.length, color: "blue" }
 *
 * Supported variants/colors: primary, success, warning, danger, info, lime, orange, purple, total, active, loan, other
 */
const StatisticsCards = ({
    cards = [],
    data = [],
    columns,
    className = ''
}) => {
    if (!cards || cards.length === 0) return null;

    // Map legacy color names to variant names
    const colorToVariant = {
        blue: 'primary',
        green: 'success',
        yellow: 'warning',
        red: 'danger',
        purple: 'purple',
        orange: 'orange',
    };

    const gridStyle = columns
        ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
        : undefined;

    return (
        <div className={`statistics-cards ${className}`} style={gridStyle}>
            {cards.map((card, index) => {
                const variant = card.variant || colorToVariant[card.color] || card.color || 'primary';
                const displayValue = card.value !== undefined
                    ? card.value
                    : (card.getValue ? card.getValue(data) : 0);

                return (
                    <div key={index} className="stat-card">
                        <div className={`stat-icon ${variant}`}>
                            {card.icon}
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{displayValue}</span>
                            <span className="stat-label">{card.label}</span>
                            {card.subtitle && (
                                <span className="stat-subtitle">{card.subtitle}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

StatisticsCards.propTypes = {
    cards: PropTypes.arrayOf(PropTypes.shape({
        icon: PropTypes.node.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        subtitle: PropTypes.string,
        getValue: PropTypes.func,
        variant: PropTypes.string,
        color: PropTypes.string,
    })).isRequired,
    data: PropTypes.array,
    columns: PropTypes.number,
    className: PropTypes.string,
};

export default StatisticsCards;
