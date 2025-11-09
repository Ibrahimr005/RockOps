import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Bell, Calendar, Users, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import '../../styles/dashboard-styles.scss';

/**
 * Secretary Dashboard Component
 * Displays administrative support tasks, document management, and approval workflows
 */
const SecretaryDashboard = () => {
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
            const data = await DashboardService.getSecretaryDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching secretary dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="secretary-dashboard-error">No data available</div>;
    }

    return (
        <div className="secretary-dashboard">
            <div className="secretary-dashboard-header">
                <h1>Secretary Dashboard</h1>
                <p>Administrative support and task management</p>
            </div>

            {/* KPI Cards */}
            <div className="secretary-kpi-grid">
                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <FileText />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.totalDocuments}</div>
                        <div className="secretary-kpi-label">Total Documents</div>
                        <div className="secretary-kpi-sub">{dashboardData.pendingDocuments} Pending</div>
                    </div>
                </div>

                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <CheckCircle />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.approvedDocuments}</div>
                        <div className="secretary-kpi-label">Approved Documents</div>
                        <div className="secretary-kpi-sub">{dashboardData.recentUploads} Recent</div>
                    </div>
                </div>

                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <AlertCircle />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.pendingApprovals}</div>
                        <div className="secretary-kpi-label">Pending Approvals</div>
                        <div className="secretary-kpi-sub">{dashboardData.requestsAwaitingReview} Awaiting Review</div>
                    </div>
                </div>

                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <Bell />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.pendingNotifications}</div>
                        <div className="secretary-kpi-label">Notifications</div>
                        <div className="secretary-kpi-sub">{dashboardData.sentNotificationsToday} Sent Today</div>
                    </div>
                </div>

                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <Calendar />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.meetingsToday}</div>
                        <div className="secretary-kpi-label">Meetings Today</div>
                        <div className="secretary-kpi-sub">{dashboardData.upcomingMeetings} Upcoming</div>
                    </div>
                </div>

                <div className="secretary-kpi-card">
                    <div className="secretary-kpi-icon">
                        <Users />
                    </div>
                    <div className="secretary-kpi-content">
                        <div className="secretary-kpi-value">{dashboardData.visitorsToday}</div>
                        <div className="secretary-kpi-label">Visitors Today</div>
                        <div className="secretary-kpi-sub">{dashboardData.scheduledVisits} Scheduled</div>
                    </div>
                </div>
            </div>

            {/* Task Overview Section */}
            <div className="secretary-sections">
                <div className="secretary-section-card">
                    <h3>Task Overview</h3>
                    <div className="secretary-section-content">
                        <div className="secretary-metric-row">
                            <span>Total Tasks:</span>
                            <span className="metric-value">{dashboardData.totalTasks}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Completed Tasks:</span>
                            <span className="metric-value success">{dashboardData.completedTasks}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Pending Tasks:</span>
                            <span className="metric-value">{dashboardData.pendingTasks}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Overdue Tasks:</span>
                            <span className="metric-value alert">{dashboardData.overdueTask}</span>
                        </div>
                    </div>
                </div>

                <div className="secretary-section-card">
                    <h3>Communication Tasks</h3>
                    <div className="secretary-section-content">
                        <div className="secretary-metric-row">
                            <span>Pending Notifications:</span>
                            <span className="metric-value">{dashboardData.pendingNotifications}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Sent Today:</span>
                            <span className="metric-value">{dashboardData.sentNotificationsToday}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Pending Announcements:</span>
                            <span className="metric-value">{dashboardData.pendingAnnouncements}</span>
                        </div>
                    </div>
                </div>

                <div className="secretary-section-card">
                    <h3>Employee Support</h3>
                    <div className="secretary-section-content">
                        <div className="secretary-metric-row">
                            <span>Employee Queries:</span>
                            <span className="metric-value">{dashboardData.employeeQueries}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Pending Tickets:</span>
                            <span className="metric-value">{dashboardData.pendingTickets}</span>
                        </div>
                        <div className="secretary-metric-row">
                            <span>Resolved Today:</span>
                            <span className="metric-value success">{dashboardData.resolvedTicketsToday}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Schedule */}
            {dashboardData.todaySchedule && dashboardData.todaySchedule.length > 0 && (
                <div className="secretary-schedule-section">
                    <h3>Today's Schedule</h3>
                    <div className="secretary-schedule-list">
                        {dashboardData.todaySchedule.map((item, index) => (
                            <div key={index} className="secretary-schedule-item">
                                <Calendar size={16} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Priority Tasks */}
            {dashboardData.priorityTasks && dashboardData.priorityTasks.length > 0 && (
                <div className="secretary-priority-section">
                    <h3>Priority Tasks</h3>
                    <div className="secretary-priority-list">
                        {dashboardData.priorityTasks.map((task, index) => (
                            <div key={index} className="secretary-priority-item">
                                <AlertCircle size={16} />
                                <span>{task}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alerts Section */}
            {(dashboardData.overdueTask > 0 || dashboardData.pendingApprovals > 0) && (
                <div className="secretary-alerts-section">
                    <h3>Alerts</h3>
                    <div className="secretary-alerts-grid">
                        {dashboardData.overdueTask > 0 && (
                            <div className="secretary-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.overdueTask}</div>
                                    <div className="alert-label">Overdue Tasks</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.pendingApprovals > 0 && (
                            <div className="secretary-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.pendingApprovals}</div>
                                    <div className="alert-label">Pending Approvals</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecretaryDashboard;
