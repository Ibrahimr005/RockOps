import React from 'react';
import './LoadingPage.css';

const LoadingPage = () => {
    return (
        <div className="loading-page">
            <div className="loading-container">
                {/* Logo Section */}
                <div className="loading-logo">
                    <div className="logo-wrapper">
                        <div className="logo-icon">
                            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="30" cy="30" r="25" fill="url(#gradient1)" />
                                <path d="M20 30L28 38L40 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                <defs>
                                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#667eea" />
                                        <stop offset="100%" stopColor="#764ba2" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h1 className="logo-text">RockOps</h1>
                    </div>
                </div>

                {/* Loading Animation */}
                <div className="loading-animation">
                    <div className="spinner-container">
                        <div className="spinner">
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div className="progress-fill"></div>
                        </div>
                        <div className="progress-text">Loading your workspace...</div>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="floating-elements">
                    <div className="floating-dot dot-1"></div>
                    <div className="floating-dot dot-2"></div>
                    <div className="floating-dot dot-3"></div>
                    <div className="floating-dot dot-4"></div>
                    <div className="floating-dot dot-5"></div>
                </div>

                {/* Loading Text */}
                <div className="loading-text">
                    <p className="loading-message">Please wait while we prepare everything for you</p>
                    <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>

            {/* Background Pattern */}
            <div className="background-pattern">
                <div className="pattern-grid">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="grid-item"></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoadingPage;