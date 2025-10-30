import React from 'react';
import { FaUsers, FaStar, FaChartBar, FaBriefcase } from 'react-icons/fa';
import './StatisticsCards.scss';

/**
 * StatisticsCards Component
 *
 * A reusable statistics card grid component that displays key metrics.
 *
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of data items to calculate statistics from
 * @param {Array} props.cards - Optional custom card configurations
 * @param {string} props.className - Optional additional CSS class
 *
 * @example
 * // Basic usage with default cards
 * <StatisticsCards data={potentialCandidates} />
 *
 * @example
 * // Custom cards configuration
 * <StatisticsCards
 *   data={candidates}
 *   cards={[
 *     {
 *       icon: <FaUsers />,
 *       label: "Total Users",
 *       getValue: (data) => data.length,
 *       color: "blue"
 *     }
 *   ]}
 * />
 */
const StatisticsCards = ({
                             data = [],
                             cards = null,
                             className = ''
                         }) => {

    // Default cards configuration for potential candidates
    const defaultCards = [
        {
            icon: <FaUsers />,
            label: 'Total Potential',
            getValue: (data) => data.length,
            color: 'blue'
        },
        {
            icon: <FaStar />,
            label: 'With Rating',
            getValue: (data) => data.filter(c => c.rating).length,
            color: 'yellow'
        },
        {
            icon: <FaChartBar />,
            label: 'Avg Rating',
            getValue: (data) => {
                const ratedItems = data.filter(c => c.rating);
                if (ratedItems.length === 0) return 0;
                const sum = ratedItems.reduce((sum, c) => sum + c.rating, 0);
                return Math.round((sum / ratedItems.length) * 10) / 10;
            },
            color: 'green'
        },
        {
            icon: <FaBriefcase />,
            label: 'From Closed Vacancies',
            getValue: (data) => data.filter(c =>
                c.rejectionReason && c.rejectionReason.includes('closed')
            ).length,
            color: 'purple'
        }
    ];

    // Use custom cards if provided, otherwise use default
    const displayCards = cards || defaultCards;

    return (
        <div className={`statistics-section ${className}`}>
            <div className="stats-grid">
                {displayCards.map((card, index) => (
                    <div key={index} className={`stat-card stat-card--${card.color || 'default'}`}>
                        <div className="stat-icon">
                            {card.icon}
                        </div>
                        <div className="stat-content">
              <span className="stat-number">
                {card.getValue(data)}
              </span>
                            <span className="stat-label">{card.label}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatisticsCards;