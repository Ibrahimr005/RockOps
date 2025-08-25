import React from 'react';
import './UserStatsCard.css';

const UserStatsCard = ({ users = [] }) => {
    // Calculate role distribution for donut chart
    const calculateRoleDistribution = () => {
        // Add safety check
        if (!Array.isArray(users) || users.length === 0) {
            return {};
        }

        const roleCount = {};
        users.forEach(user => {
            if (roleCount[user.role]) {
                roleCount[user.role]++;
            } else {
                roleCount[user.role] = 1;
            }
        });
        return roleCount;
    };

    // Generate donut chart SVG
    const generatePieChart = () => {
        const roleCount = calculateRoleDistribution();
        const roles = Object.keys(roleCount);

        // Return early if no roles
        if (roles.length === 0) {
            return null;
        }

        const counts = Object.values(roleCount);
        const total = counts.reduce((sum, count) => sum + count, 0);

        // Set up donut chart dimensions
        const size = 220;
        const radius = size / 2;
        const innerRadius = radius * 0.65; // Slightly larger inner radius for more subtle donut
        const centerX = radius;
        const centerY = radius;

        // Generate pie slices
        let startAngle = 0;
        const slices = [];

        // Color palette matching the dashboard
        const colors = [
            '#5d5fef', // Primary purple
            '#f77171', // Secondary red
            '#68d283', // Success green
            '#ffc107', // Warning yellow
            '#9d5de0', // Purple variant
            '#ff9f43', // Orange
            '#41b6e6', // Blue
            '#fd7e89', // Pink
            '#2ec4b6'  // Teal
        ];

        roles.forEach((role, index) => {
            const percentage = (roleCount[role] / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = startAngle + angle;

            // Calculate slice path for donut (with inner radius)
            const startRadians = (startAngle - 90) * (Math.PI / 180);
            const endRadians = (endAngle - 90) * (Math.PI / 180);

            const startOuterX = centerX + radius * Math.cos(startRadians);
            const startOuterY = centerY + radius * Math.sin(startRadians);
            const endOuterX = centerX + radius * Math.cos(endRadians);
            const endOuterY = centerY + radius * Math.sin(endRadians);

            const startInnerX = centerX + innerRadius * Math.cos(startRadians);
            const startInnerY = centerY + innerRadius * Math.sin(startRadians);
            const endInnerX = centerX + innerRadius * Math.cos(endRadians);
            const endInnerY = centerY + innerRadius * Math.sin(endRadians);

            const largeArcFlag = angle > 180 ? 1 : 0;

            // Path for donut slice
            const pathData = [
                `M ${startOuterX} ${startOuterY}`, // Move to start outer point
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`, // Outer arc
                `L ${endInnerX} ${endInnerY}`, // Line to inner point
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`, // Inner arc (counter-clockwise)
                'Z' // Close path
            ].join(' ');

            slices.push(
                <g key={role}>
                    <path
                        d={pathData}
                        fill={colors[index % colors.length]}
                        stroke="var(--section-background-color)"
                        strokeWidth="1"
                    />
                    {/* Add subtle gradient overlay for more dimension */}
                    <path
                        d={pathData}
                        fill="url(#subtleGradient)"
                        opacity="0.15"
                    />
                </g>
            );

            startAngle = endAngle;
        });

        // Create legend items with formatted percentages
        const legendItems = roles.map((role, index) => {
            const percentage = ((roleCount[role] / total) * 100).toFixed(1);
            const count = roleCount[role];
            return (
                <div key={role} className="legend-item">
                    <span
                        className="color-dot"
                        style={{ backgroundColor: colors[index % colors.length] }}
                    ></span>
                    <span className="legend-text">
                        {role} ({count}) <span style={{ opacity: 0.7 }}>{percentage}%</span>
                    </span>
                </div>
            );
        });

        return (
            <div className="donut-chart-container">
                <div className="donut-chart">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        {/* Define gradients for enhanced visual effect */}
                        <defs>
                            <linearGradient id="subtleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--color-text-inverse)" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="var(--text-color)" stopOpacity="0.1" />
                            </linearGradient>
                            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                <feOffset dx="0" dy="2" result="offsetblur" />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.15" />
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Background circle for better aesthetics */}
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={radius}
                            fill="var(--main-background-color)"
                            filter="url(#dropShadow)"
                        />

                        {/* Donut slices */}
                        <g>{slices}</g>

                        {/* Inner circle for donut hole */}
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={innerRadius}
                            fill="var(--color-surface)"
                        />

                        {/* Total users count in center */}
                        <text
                            x={centerX}
                            y={centerY - 12}
                            fontSize="35"
                            fontWeight="var(--bold-font-weight)"
                            fill="var(--color-primary)"
                            textAnchor="middle"
                        >
                            {total}
                        </text>
                        <text
                            x={centerX}
                            y={centerY + 16}
                            fontSize="14"
                            fill="var(--color-text-secondary)"
                            textAnchor="middle"
                            fontWeight="500"
                        >
                            Total Users
                        </text>
                    </svg>
                </div>
                <div className="chart-legend">
                    {legendItems}
                </div>
            </div>
        );
    };

    return (
        <div className="summary-card user-stats-card">
            <h2>User Role Distribution</h2>
            <div className="user-stats-content">
                {Array.isArray(users) && users.length > 0 ?
                    generatePieChart() :
                    <p className="no-data-message">No user data available</p>
                }
            </div>
        </div>
    );
};

export default UserStatsCard;