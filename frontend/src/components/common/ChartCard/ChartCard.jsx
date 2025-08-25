import React, { useEffect, useRef } from 'react';
import { FaChartLine, FaChartBar, FaChartPie } from 'react-icons/fa';
import './ChartCard.scss';

const ChartCard = ({ chart, className = '' }) => {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!chart || !canvasRef.current) return;

        // For this implementation, we'll create a simple mock chart
        // In a real app, you'd integrate with Chart.js, Recharts, or similar
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw mock chart based on type
        drawMockChart(ctx, chart, canvas.width, canvas.height);

        return () => {
            if (chartInstanceRef.current) {
                // Cleanup chart instance if using a real chart library
                chartInstanceRef.current = null;
            }
        };
    }, [chart]);

    const drawMockChart = (ctx, chart, width, height) => {
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        if (chart.type === 'line') {
            drawLineChart(ctx, chart.data, width, height);
        } else if (chart.type === 'bar') {
            drawBarChart(ctx, chart.data, width, height);
        } else if (chart.type === 'doughnut') {
            drawDoughnutChart(ctx, chart.data, width, height);
        }
    };

    const drawLineChart = (ctx, data, width, height) => {
        const padding = 40;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw sample line
        if (data.datasets && data.datasets.length > 0) {
            data.datasets.forEach((dataset, index) => {
                ctx.strokeStyle = dataset.borderColor || '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();

                const points = dataset.data || [10, 20, 15, 25, 30, 20];
                const maxValue = Math.max(...points);

                points.forEach((point, i) => {
                    const x = padding + (chartWidth / (points.length - 1)) * i;
                    const y = height - padding - (point / maxValue) * chartHeight;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();
            });
        }
    };

    const drawBarChart = (ctx, data, width, height) => {
        const padding = 40;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        if (data.datasets && data.datasets.length > 0) {
            const dataset = data.datasets[0];
            const values = dataset.data || [10, 20, 15, 25, 30];
            const maxValue = Math.max(...values);
            const barWidth = chartWidth / values.length * 0.8;
            const barSpacing = chartWidth / values.length * 0.2;

            values.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = padding + (chartWidth / values.length) * index + barSpacing / 2;
                const y = height - padding - barHeight;

                ctx.fillStyle = dataset.backgroundColor?.[index] || '#3b82f6';
                ctx.fillRect(x, y, barWidth, barHeight);
            });
        }
    };

    const drawDoughnutChart = (ctx, data, width, height) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        const innerRadius = radius * 0.6;

        if (data.datasets && data.datasets.length > 0) {
            const dataset = data.datasets[0];
            const values = dataset.data || [30, 25, 20, 25];
            const total = values.reduce((sum, val) => sum + val, 0);

            let currentAngle = -Math.PI / 2;

            values.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI;

                ctx.fillStyle = dataset.backgroundColor?.[index] || `hsl(${index * 60}, 70%, 50%)`;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
                ctx.closePath();
                ctx.fill();

                currentAngle += sliceAngle;
            });
        }
    };

    const getChartIcon = () => {
        switch (chart?.type) {
            case 'line':
                return <FaChartLine />;
            case 'bar':
                return <FaChartBar />;
            case 'doughnut':
                return <FaChartPie />;
            default:
                return <FaChartLine />;
        }
    };

    if (!chart) {
        return (
            <div className={`chart-card ${className}`}>
                <div className="chart-card-header">
                    <h3>No Chart Data</h3>
                </div>
                <div className="chart-card-content">
                    <div className="no-data-message">
                        <FaChartLine />
                        <span>No data available to display</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`chart-card ${className}`}>
            <div className="chart-card-header">
                <div className="chart-title">
                    {getChartIcon()}
                    <h3>{chart.title}</h3>
                </div>
            </div>
            <div className="chart-card-content">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    className="chart-canvas"
                />
                {chart.data?.labels && (
                    <div className="chart-legend">
                        {chart.data.labels.map((label, index) => (
                            <div key={index} className="legend-item">
                                <span
                                    className="legend-color"
                                    style={{
                                        backgroundColor: chart.data.datasets?.[0]?.backgroundColor?.[index] || '#3b82f6'
                                    }}
                                />
                                <span className="legend-label">{label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChartCard;