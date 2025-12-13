import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Calendar, CheckCircle, Bell, MapPin } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import '../../styles/dashboard-styles.scss';

/**
 * User Dashboard Component
 * Displays basic user-level information and personal metrics
 */
const UserDashboard = () => {
    const { t } = useTranslation();
    const { showError } = useSnackbar();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const data = await DashboardService.getUserDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching user dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="user-dashboard-error">No data available</div>;
    }

    return (
        <div className="user-dashboard">
            <div className="user-dashboard-header">
                <div>
                    <h1>Welcome, {dashboardData.userName}</h1>
                    <p>Your personal dashboard</p>
                </div>
                <div className="user-info-badge">
                    <User size={18} />
                    <span>{dashboardData.userRole}</span>
                </div>
            </div>

            {/* User Info Cards */}
            <div className="user-info-grid">
                <div className="user-info-card">
                    <div className="user-info-icon">
                        <User />
                    </div>
                    <div className="user-info-content">
                        <div className="user-info-label">Department</div>
                        <div className="user-info-value">{dashboardData.department}</div>
                    </div>
                </div>

                <div className="user-info-card">
                    <div className="user-info-icon">
                        <MapPin />
                    </div>
                    <div className="user-info-content">
                        <div className="user-info-label">Site</div>
                        <div className="user-info-value">{dashboardData.site}</div>
                    </div>
                </div>

                <div className="user-info-card">
                    <div className="user-info-icon">
                        <Calendar />
                    </div>
                    <div className="user-info-content">
                        <div className="user-info-label">Attendance Status</div>
                        <div className="user-info-value success">{dashboardData.attendanceStatus}</div>
                    </div>
                </div>

                <div className="user-info-card">
                    <div className="user-info-icon">
                        <Bell />
                    </div>
                    <div className="user-info-content">
                        <div className="user-info-label">Notifications</div>
                        <div className="user-info-value">{dashboardData.unreadNotifications} Unread</div>
                    </div>
                </div>
            </div>

            {/* Attendance & Leave Section */}
            <div className="user-sections">
                <div className="user-section-card">
                    <h3>Attendance Overview</h3>
                    <div className="user-section-content">
                        <div className="user-metric-row">
                            <span>Days Present:</span>
                            <span className="metric-value">{dashboardData.daysPresent}</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Days Absent:</span>
                            <span className="metric-value">{dashboardData.daysAbsent}</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Attendance Rate:</span>
                            <span className="metric-value success">{dashboardData.attendanceRate}%</span>
                        </div>
                    </div>
                </div>

                <div className="user-section-card">
                    <h3>Leave Balance</h3>
                    <div className="user-section-content">
                        <div className="user-metric-row">
                            <span>Available Leave:</span>
                            <span className="metric-value">{dashboardData.availableLeaveBalance} days</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Used Leave:</span>
                            <span className="metric-value">{dashboardData.usedLeaveBalance} days</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Pending Requests:</span>
                            <span className="metric-value">{dashboardData.pendingLeaveRequests}</span>
                        </div>
                    </div>
                </div>

                <div className="user-section-card">
                    <h3>My Tasks</h3>
                    <div className="user-section-content">
                        <div className="user-metric-row">
                            <span>Assigned Tasks:</span>
                            <span className="metric-value">{dashboardData.assignedTasks}</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Completed Tasks:</span>
                            <span className="metric-value success">{dashboardData.completedTasks}</span>
                        </div>
                        <div className="user-metric-row">
                            <span>Pending Tasks:</span>
                            <span className="metric-value">{dashboardData.pendingTasks}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            {dashboardData.recentNotifications && dashboardData.recentNotifications.length > 0 && (
                <div className="user-recent-section">
                    <h3>Recent Notifications</h3>
                    <div className="user-notifications-list">
                        {dashboardData.recentNotifications.map((notification, index) => (
                            <div key={index} className="user-notification-item">
                                <Bell size={16} />
                                <span>{notification}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="user-quick-actions">
                <h3>Quick Actions</h3>
                <div className="user-actions-grid">
                    <button className="user-action-button">
                        <Calendar />
                        <span>Request Leave</span>
                    </button>
                    <button className="user-action-button">
                        <CheckCircle />
                        <span>View My Tasks</span>
                    </button>
                    <button className="user-action-button">
                        <Bell />
                        <span>View Notifications</span>
                    </button>
                    <button className="user-action-button">
                        <User />
                        <span>Update Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
