import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './TaskCalendar.scss';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const PRIORITY_COLORS = {
    LOW:    'dot--low',
    MEDIUM: 'dot--medium',
    HIGH:   'dot--high',
    URGENT: 'dot--urgent',
};

const ROLE_LABELS = {
    ADMIN:               'Admin',
    SECRETARY:           'Secretary',
    WAREHOUSE_MANAGER:   'Warehouse Manager',
    WAREHOUSE_EMPLOYEE:  'Warehouse Employee',
};

const TaskCalendar = ({
                          tasks,
                          selectedDate,
                          currentMonth,
                          onDayClick,
                          onMonthChange,
                          onNewTask,
                          users = [],
                          filterRole,
                          filterAssignee,
                          filterPriority,
                          filterStatus,
                          onFilterRoleChange,
                          onFilterAssigneeChange,
                          onFilterPriorityChange,
                          onFilterStatusChange,
                      }) => {

    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const [showPicker, setShowPicker]   = useState(false);
    const [pickerYear, setPickerYear]   = useState(year);
    const pickerRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setPickerYear(currentMonth.getFullYear());
    }, [currentMonth]);

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tasksByDay = useMemo(() => {
        const map = {};
        tasks.forEach(task => {
            if (!task.dueDate) return;
            const d = new Date(task.dueDate);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        return map;
    }, [tasks]);

    const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
    const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));

    const handleMonthSelect = (m) => {
        onMonthChange(new Date(pickerYear, m, 1));
        setShowPicker(false);
    };

    const today = new Date();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const filteredUsersByRole = useMemo(() => {
        return filterRole ? users.filter(u => u.role === filterRole) : users;
    }, [users, filterRole]);

    const activeFilterCount = [filterRole, filterAssignee, filterPriority, filterStatus].filter(Boolean).length;

    return (
        <div className="cal">
            {/* Filter Toolbar — top of card */}
            <div className="cal__toolbar">
                <select
                    className="cal__filter-select"
                    value={filterRole}
                    onChange={e => { onFilterRoleChange(e.target.value); onFilterAssigneeChange(''); }}
                >
                    <option value="">All Roles</option>
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>

                <select
                    className="cal__filter-select"
                    value={filterAssignee}
                    onChange={e => onFilterAssigneeChange(e.target.value)}
                >
                    <option value="">All Assignees</option>
                    {filteredUsersByRole.map(u => (
                        <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                        </option>
                    ))}
                </select>

                <select
                    className="cal__filter-select"
                    value={filterPriority}
                    onChange={e => onFilterPriorityChange(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                </select>

                <select
                    className="cal__filter-select"
                    value={filterStatus}
                    onChange={e => onFilterStatusChange(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>

                {activeFilterCount > 0 && (
                    <button
                        className="cal__filter-clear"
                        onClick={() => {
                            onFilterRoleChange('');
                            onFilterAssigneeChange('');
                            onFilterPriorityChange('');
                            onFilterStatusChange('');
                        }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Header */}
            <div className="cal__header">
                <button className="cal__nav-btn" onClick={prevMonth}>
                    <FaChevronLeft />
                </button>

                <div className="cal__month-picker-wrapper" ref={pickerRef}>
                    <button
                        className="cal__month-label"
                        onClick={() => setShowPicker(p => !p)}
                        title="Click to pick month & year"
                    >
                        {monthLabel} <span className="cal__month-label-caret">▾</span>
                    </button>

                    {showPicker && (
                        <div className="cal__picker">
                            <div className="cal__picker-year">
                                <button className="cal__picker-year-btn" onClick={() => setPickerYear(y => y - 1)}>‹</button>
                                <span className="cal__picker-year-val">{pickerYear}</span>
                                <button className="cal__picker-year-btn" onClick={() => setPickerYear(y => y + 1)}>›</button>
                            </div>
                            <div className="cal__picker-months">
                                {MONTHS.map((m, i) => (
                                    <button
                                        key={m}
                                        className={`cal__picker-month-btn ${pickerYear === year && i === month ? 'cal__picker-month-btn--active' : ''}`}
                                        onClick={() => handleMonthSelect(i)}
                                    >
                                        {m.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="cal__header-right">
                    <button className="cal__nav-btn" onClick={nextMonth}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            {/* Day names */}
            <div className="cal__day-names">
                {DAYS.map(d => (
                    <div key={d} className="cal__day-name">{d}</div>
                ))}
            </div>

            {/* Grid */}
            <div className="cal__grid">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="cal__cell cal__cell--empty" />;

                    const key = `${year}-${month}-${day}`;
                    const dayTasks = tasksByDay[key] || [];
                    const isSelected =
                        selectedDate.getFullYear() === year &&
                        selectedDate.getMonth() === month &&
                        selectedDate.getDate() === day;
                    const isToday =
                        today.getFullYear() === year &&
                        today.getMonth() === month &&
                        today.getDate() === day;

                    const dots = dayTasks.slice(0, 3);

                    return (
                        <div
                            key={key}
                            className={`cal__cell ${isSelected ? 'cal__cell--selected' : ''} ${isToday ? 'cal__cell--today' : ''} ${dayTasks.length > 0 ? 'cal__cell--has-tasks' : ''}`}
                            onClick={() => onDayClick(new Date(year, month, day))}
                        >
                            <span className="cal__day-num">{day}</span>
                            {dots.length > 0 && (
                                <div className="cal__dots">
                                    {dots.map((t, i) => (
                                        <span key={i} className={`cal__dot ${PRIORITY_COLORS[t.priority] || ''}`} />
                                    ))}
                                    {dayTasks.length > 3 && (
                                        <span className="cal__dot-more">+{dayTasks.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="cal__legend">
                <span className="cal__legend-item"><span className="cal__dot dot--low" />Low</span>
                <span className="cal__legend-item"><span className="cal__dot dot--medium" />Medium</span>
                <span className="cal__legend-item"><span className="cal__dot dot--high" />High</span>
                <span className="cal__legend-item"><span className="cal__dot dot--urgent" />Urgent</span>
            </div>
        </div>
    );
};

export default TaskCalendar;