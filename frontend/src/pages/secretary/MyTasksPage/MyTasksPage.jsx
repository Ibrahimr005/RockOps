import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards.jsx';
import TaskCalendar from '../SecretaryTasksPage/TaskCalendar/TaskCalendar.jsx';
import DayTasksPanel from '../SecretaryTasksPage/DayTasksPanel/DayTasksPanel.jsx';
import PendingTasks from './PendingTasks/PendingTasks.jsx';
import InProgressTasks from './InprogressTasks/InProgressTasks.jsx';
import CompletedTasks from './CompletedTasks/CompletedTasks.jsx';
import CancelledTasks from './CancelledTasks/CancelledTasks.jsx';
import { taskService } from '../../../services/secretary/taskService.js';
import { FaClock, FaSpinner, FaCheckCircle, FaTimesCircle, FaList, FaCalendarAlt } from 'react-icons/fa';
import './MyTasksPage.scss';

const MyTasksPage = () => {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [view, setView] = useState('list');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        if (currentUser) fetchTasks();
    }, [currentUser]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getByUser(currentUser.id);
            setTasks(data);
        } catch (err) {
            console.error('Failed to load tasks:', err);
            showSnackbar('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            await taskService.updateStatus(taskId, newStatus);
            showSnackbar('Task status updated successfully');
            await fetchTasks();
        } catch (err) {
            console.error('Failed to update task status:', err);
            showSnackbar('Failed to update task status', 'error');
        }
    };

    const pendingTasks    = useMemo(() => tasks.filter(t => t.status === 'PENDING'),     [tasks]);
    const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'IN_PROGRESS'), [tasks]);
    const completedTasks  = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'),   [tasks]);
    const cancelledTasks  = useMemo(() => tasks.filter(t => t.status === 'CANCELLED'),   [tasks]);

    const selectedDayTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            return (
                due.getFullYear() === selectedDate.getFullYear() &&
                due.getMonth()    === selectedDate.getMonth()    &&
                due.getDate()     === selectedDate.getDate()
            );
        });
    }, [tasks, selectedDate]);

    const statsCards = [
        { icon: <FaClock />,       label: 'Pending',     value: pendingTasks.length,    variant: 'warning' },
        { icon: <FaSpinner />,     label: 'In Progress', value: inProgressTasks.length, variant: 'info' },
        { icon: <FaCheckCircle />, label: 'Completed',   value: completedTasks.length,  variant: 'success' },
        { icon: <FaTimesCircle />, label: 'Cancelled',   value: cancelledTasks.length,  variant: 'danger' },
    ];

    const sharedProps = { loading, onStatusUpdate: handleStatusUpdate };

    return (
        <div className="my-tasks-container">

            {/* Header Row with toggle on the right */}
            <div className="my-tasks-header-row">
                <PageHeader
                    title="My Tasks"
                    subtitle="View and manage tasks assigned to you"
                />
                <div className="my-tasks-view-toggle">
                    <button
                        className={`my-tasks-toggle-btn ${view === 'list' ? 'my-tasks-toggle-btn--active' : ''}`}
                        onClick={() => setView('list')}
                        title="List View"
                    >
                        <FaList /> List
                    </button>
                    <button
                        className={`my-tasks-toggle-btn ${view === 'calendar' ? 'my-tasks-toggle-btn--active' : ''}`}
                        onClick={() => setView('calendar')}
                        title="Calendar View"
                    >
                        <FaCalendarAlt /> Calendar
                    </button>
                </div>
            </div>

            <div className="my-tasks-stats">
                <StatisticsCards cards={statsCards} />
            </div>

            {view === 'list' && (
                <div className="my-tasks-content">
                    <Tabs
                        tabs={[
                            { id: 'pending',    label: 'Pending' },
                            { id: 'inprogress', label: 'In Progress' },
                            { id: 'completed',  label: 'Completed' },
                            { id: 'cancelled',  label: 'Cancelled' },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                    <div className="my-tasks-table-container">
                        {activeTab === 'pending'    && <PendingTasks    tasks={pendingTasks}    {...sharedProps} />}
                        {activeTab === 'inprogress' && <InProgressTasks tasks={inProgressTasks} {...sharedProps} />}
                        {activeTab === 'completed'  && <CompletedTasks  tasks={completedTasks}  loading={loading} />}
                        {activeTab === 'cancelled'  && <CancelledTasks  tasks={cancelledTasks}  loading={loading} />}
                    </div>
                </div>
            )}

            {view === 'calendar' && (
                <div className="my-tasks-calendar-view">
                    <div className="my-tasks-calendar-body">
                        <div className="my-tasks-calendar-left">
                            <TaskCalendar
                                tasks={tasks}
                                selectedDate={selectedDate}
                                currentMonth={currentMonth}
                                onDayClick={setSelectedDate}
                                onMonthChange={setCurrentMonth}
                                onNewTask={() => {}}
                            />
                        </div>
                        <div className="my-tasks-calendar-right">
                            <DayTasksPanel
                                date={selectedDate}
                                tasks={selectedDayTasks}
                                loading={loading}
                                onEdit={() => {}}
                                onDelete={() => {}}
                                onNewTask={() => {}}
                                readOnly={true}
                                showStatusUpdate={true}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        </div>
                    </div>
                </div>
            )}

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default MyTasksPage;