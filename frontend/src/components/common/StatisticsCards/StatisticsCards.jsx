import React from 'react';
import './StatisticsCards.scss';

const StatisticsCards = ({ cards }) => {
    if (!cards || cards.length === 0) return null;

    const getColorClass = (color) => {
        const colorMap = {
            blue: 'stat-card-blue',
            green: 'stat-card-green',
            orange: 'stat-card-orange',
            purple: 'stat-card-purple',
            teal: 'stat-card-teal',
            red: 'stat-card-red',
            yellow: 'stat-card-yellow'
        };
        return colorMap[color] || 'stat-card-blue';
    };

    return (
        <div className="statistics-cards-container">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`stat-card ${getColorClass(card.color)} ${card.onClick ? 'clickable' : ''}`}
                    onClick={card.onClick}
                >
                    <div className="stat-card-content">
                        <div className="stat-card-icon">
                            {card.icon}
                        </div>
                        <div className="stat-card-info">
                            <h3 className="stat-card-title">{card.title}</h3>
                            <div className="stat-card-value">{card.value}</div>
                            {card.trend !== undefined && (
                                <div className={`stat-card-trend ${card.trend >= 0 ? 'positive' : 'negative'}`}>
                                    {card.trend >= 0 ? '+' : ''}{card.trend}% {card.trendLabel}
                                </div>
                            )}
                        </div>
                    </div>
                    {card.urgent && (
                        <div className="stat-card-urgent-indicator">
                            <span>!</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default StatisticsCards;