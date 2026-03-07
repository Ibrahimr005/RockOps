import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Snackbar from '../../../components/common/Snackbar/Snackbar.jsx';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards.jsx';
import { adminService } from '../../../services/adminService.js';
import { taskService } from '../../../services/secretary/taskService.js';
import TaskCalendar from './TaskCalendar/TaskCalendar.jsx';
import DayTasksPanel from './DayTasksPanel/DayTasksPanel.jsx';
import CreateTaskModal from './CreateTaskModal/CreateTaskModal.jsx';
import { FaTasks, FaClock, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './SecretaryTasksPage.scss';

const SecretaryTasksPage = () => {
    const { currentUser } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [tasksData, usersData] = await Promise.all([
                taskService.getAll(),
                adminService.getUsers(),
            ]);
            console.log('tasksData:', tasksData);
            console.log('tasksData length:', tasksData?.length);
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
            if (filterAssignee && task.assignedTo?.id !== filterAssignee) return false;
            if (filterPriority && task.priority !== filterPriority) return false;
            if (filterStatus && task.status !== filterStatus) return false;
            return true;
        });
    }, [tasks, filterAssignee, filterPriority, filterStatus]);

    const selectedDayTasks = useMemo(() => {
        return filteredTasks.filter(task => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            return (
                due.getFullYear() === selectedDate.getFullYear() &&
                due.getMonth() === selectedDate.getMonth() &&
                due.getDate() === selectedDate.getDate()
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
            await fetchAll(); // ADD await
        } catch (err) {
            console.error('Failed to create task:', err);
            showSnackbar('Failed to create task', 'error');
        }
    };

    const handleEditTask = async (taskId, taskData) => {
        try {
            await taskService.update(taskId, taskData);
            showSnackbar('Task updated successfully');
            setEditingTask(null);
            await fetchAll(); // ADD await
        } catch (err) {
            console.error('Failed to update task:', err);
            showSnackbar('Failed to update task', 'error');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await taskService.delete(taskId);
            showSnackbar('Task deleted successfully');
            await fetchAll(); // ADD await
        } catch (err) {
            console.error('Failed to delete task:', err);
            showSnackbar('Failed to delete task', 'error');
        }
    };

    return (
        <div className="sec-page">
            <PageHeader
                title="Secretary — Tasks"
                subtitle="Manage and assign tasks across the organization"
            />

            <StatisticsCards cards={statsCards} />

            {/* Filter Bar */}
            <div className="sec-filters">
                <select
                    className="sec-filters__select"
                    value={filterAssignee}
                    onChange={e => setFilterAssignee(e.target.value)}
                >
                    <option value="">All Assignees</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                        </option>
                    ))}
                </select>

                <select
                    className="sec-filters__select"
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                </select>

                <select
                    className="sec-filters__select"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>

            </div>

            {/* Two Panel Layout */}
            <div className="sec-body">
                <div className="sec-body__calendar">
                    <TaskCalendar
                        tasks={filteredTasks}
                        selectedDate={selectedDate}
                        currentMonth={currentMonth}
                        onDayClick={(date) => setSelectedDate(date)}
                        onMonthChange={setCurrentMonth}
                        onNewTask={(date) => { setSelectedDate(date); setEditingTask(null); setShowCreateModal(true); }}
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
                    />
                </div>
            </div>

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