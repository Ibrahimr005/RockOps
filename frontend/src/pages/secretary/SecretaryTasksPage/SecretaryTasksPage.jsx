import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Snackbar from '../../../components/common/Snackbar/Snackbar.jsx';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards.jsx';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import { adminService } from '../../../services/adminService.js';
import { taskService } from '../../../services/secretary/taskService.js';
import TaskCalendar from './TaskCalendar/TaskCalendar.jsx';
import DayTasksPanel from './DayTasksPanel/DayTasksPanel.jsx';
import CreateTaskModal from './CreateTaskModal/CreateTaskModal.jsx';
import PendingTasks from '../MyTasksPage/PendingTasks/PendingTasks.jsx';
import InProgressTasks from '../MyTasksPage/InprogressTasks/InProgressTasks.jsx';
import CompletedTasks from '../MyTasksPage/CompletedTasks/CompletedTasks.jsx';
import CancelledTasks from '../MyTasksPage/CancelledTasks/CancelledTasks.jsx';
import { FaTasks, FaClock, FaSpinner, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaList } from 'react-icons/fa';
import './SecretaryTasksPage.scss';

const SecretaryTasksPage = () => {
    const { currentUser } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('calendar');
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const [filterRole, setFilterRole] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [tasksData, usersData] = await Promise.all([
                taskService.getAll(),
                adminService.getUsers(),
            ]);
            setTasks(tasksData);
            setUsers(Array.isArray(usersData) ? usersData : usersData.data ?? []);
        } catch (err) {
            console.error('Failed to load data:', err);
            showSnackbar('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filterRole     && task.assignedTo?.role !== filterRole)     return false;
            if (filterAssignee && task.assignedTo?.id   !== filterAssignee) return false;
            if (filterPriority && task.priority         !== filterPriority) return false;
            if (filterStatus   && task.status           !== filterStatus)   return false;
            return true;
        });
    }, [tasks, filterRole, filterAssignee, filterPriority, filterStatus]);

    const selectedDayTasks = useMemo(() => {
        return filteredTasks.filter(task => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            return (
                due.getFullYear() === selectedDate.getFullYear() &&
                due.getMonth()    === selectedDate.getMonth()    &&
                due.getDate()     === selectedDate.getDate()
            );
        });
    }, [filteredTasks, selectedDate]);

    const summary = useMemo(() => ({
        total:      filteredTasks.length,
        pending:    filteredTasks.filter(t => t.status === 'PENDING').length,
        inProgress: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed:  filteredTasks.filter(t => t.status === 'COMPLETED').length,
        cancelled:  filteredTasks.filter(t => t.status === 'CANCELLED').length,
    }), [filteredTasks]);

    const statsCards = [
        { icon: <FaTasks />,       label: 'Total Tasks',  value: summary.total,      variant: 'primary' },
        { icon: <FaClock />,       label: 'Pending',      value: summary.pending,    variant: 'warning' },
        { icon: <FaSpinner />,     label: 'In Progress',  value: summary.inProgress, variant: 'info' },
        { icon: <FaCheckCircle />, label: 'Completed',    value: summary.completed,  variant: 'success' },
        { icon: <FaTimesCircle />, label: 'Cancelled',    value: summary.cancelled,  variant: 'danger' },
    ];

    const handleCreateTask = async (taskData) => {
        try {
            await taskService.create(currentUser.id, taskData);
            showSnackbar('Task created successfully');
            setShowCreateModal(false);
            await fetchAll();
        } catch (err) {
            showSnackbar('Failed to create task', 'error');
        }
    };

    const handleEditTask = async (taskId, taskData) => {
        try {
            await taskService.update(taskId, taskData);
            showSnackbar('Task updated successfully');
            setEditingTask(null);
            await fetchAll();
        } catch (err) {
            showSnackbar('Failed to update task', 'error');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await taskService.delete(taskId);
            showSnackbar('Task deleted successfully');
            await fetchAll();
        } catch (err) {
            showSnackbar('Failed to delete task', 'error');
        }
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            await taskService.updateStatus(taskId, newStatus);
            showSnackbar('Task status updated successfully');
            await fetchAll();
        } catch (err) {
            showSnackbar('Failed to update task status', 'error');
        }
    };

    const pendingTasks    = useMemo(() => filteredTasks.filter(t => t.status === 'PENDING'),     [filteredTasks]);
    const inProgressTasks = useMemo(() => filteredTasks.filter(t => t.status === 'IN_PROGRESS'), [filteredTasks]);
    const completedTasks  = useMemo(() => filteredTasks.filter(t => t.status === 'COMPLETED'),   [filteredTasks]);
    const cancelledTasks  = useMemo(() => filteredTasks.filter(t => t.status === 'CANCELLED'),   [filteredTasks]);

    return (
        <div className="sec-page">

            {/* Header Row */}
            <div className="sec-header-row">
                <PageHeader
                    title="Secretary — Tasks"
                    subtitle="Manage and assign tasks across the organization"
                />
                <div className="sec-view-toggle">
                    <button
                        className={`sec-toggle-btn ${view === 'calendar' ? 'sec-toggle-btn--active' : ''}`}
                        onClick={() => setView('calendar')}
                    >
                        <FaCalendarAlt /> Calendar
                    </button>
                    <button
                        className={`sec-toggle-btn ${view === 'table' ? 'sec-toggle-btn--active' : ''}`}
                        onClick={() => setView('table')}
                    >
                        <FaList /> Table
                    </button>
                </div>
            </div>

            <StatisticsCards cards={statsCards} />

            {/* Calendar View */}
            {view === 'calendar' && (
                <div className="sec-body">
                    <div className="sec-body__calendar">
                        <TaskCalendar
                            tasks={filteredTasks}
                            selectedDate={selectedDate}
                            currentMonth={currentMonth}
                            onDayClick={(date) => setSelectedDate(date)}
                            onMonthChange={setCurrentMonth}
                            onNewTask={(date) => { setSelectedDate(date); setEditingTask(null); setShowCreateModal(true); }}
                            users={users}
                            filterRole={filterRole}
                            filterAssignee={filterAssignee}
                            filterPriority={filterPriority}
                            filterStatus={filterStatus}
                            onFilterRoleChange={setFilterRole}
                            onFilterAssigneeChange={setFilterAssignee}
                            onFilterPriorityChange={setFilterPriority}
                            onFilterStatusChange={setFilterStatus}
                        />
                    </div>
                    <div className="sec-body__panel">
                        <DayTasksPanel
                            date={selectedDate}
                            tasks={selectedDayTasks}
                            loading={loading}
                            onEdit={(task) => { setEditingTask(task); setShowCreateModal(true); }}
                            onDelete={handleDeleteTask}
                            onNewTask={() => { setEditingTask(null); setShowCreateModal(true); }}
                            canCancel={true}
                            onStatusUpdate={handleStatusUpdate}
                        />
                    </div>
                </div>
            )}

            {/* Table View */}
            {view === 'table' && (
                <div className="sec-table-view">
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
                    <div className="sec-table-content">
                        {activeTab === 'pending'    && <PendingTasks    tasks={pendingTasks}    loading={loading} onStatusUpdate={handleStatusUpdate} onDelete={handleDeleteTask} showAssignee={true} showDelete={true} showCancel={true} />}
                        {activeTab === 'inprogress' && <InProgressTasks tasks={inProgressTasks} loading={loading} onStatusUpdate={handleStatusUpdate} onDelete={handleDeleteTask} showAssignee={true} showDelete={true} showCancel={true} />}
                        {activeTab === 'completed'  && <CompletedTasks  tasks={completedTasks}  loading={loading} onDelete={handleDeleteTask} showAssignee={true} showDelete={true} />}
                        {activeTab === 'cancelled'  && <CancelledTasks  tasks={cancelledTasks}  loading={loading} onDelete={handleDeleteTask} showAssignee={true} showDelete={true} />}
                    </div>
                </div>
            )}

            {showCreateModal && (
                <CreateTaskModal
                    task={editingTask}
                    users={users}
                    defaultDate={selectedDate}
                    onError={(msg) => showSnackbar(msg, 'error')}
                    onSubmit={editingTask
                        ? (data) => handleEditTask(editingTask.id, data)
                        : handleCreateTask
                    }
                    onClose={() => { setShowCreateModal(false); setEditingTask(null); }}
                />
            )}

            <Snackbar
                type={notificationType}
                message={notificationMessage}
                show={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default SecretaryTasksPage;