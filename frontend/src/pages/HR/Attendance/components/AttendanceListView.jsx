import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock,
    CheckCircle,
    XCircle,
    Edit,
    LogIn,
    LogOut,
    Users,
    Filter,
    ChevronDown,
    ChevronUp,
    Search,
    Eye,
    Calendar,
    MapPin,
    TrendingUp,
    MoreVertical
} from 'lucide-react';

const AttendanceListView = ({
                                attendanceData,
                                employees,
                                selectedDate,
                                onEditAttendance,
                                onQuickCheckIn,
                                onQuickCheckOut,
                                onBulkAction,
                                loading
                            }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    // Process and normalize attendance data
    const processedData = useMemo(() => {
        if (!attendanceData) return [];

        let records = [];

        // Handle different data structures
        if (Array.isArray(attendanceData)) {
            records = attendanceData;
        } else if (typeof attendanceData === 'object') {
            // Handle categorized data from daily summary
            const categories = ['present', 'absent', 'late', 'checkedIn'];
            records = categories.reduce((acc, category) => {
                if (attendanceData[category] && Array.isArray(attendanceData[category])) {
                    return [...acc, ...attendanceData[category]];
                }
                return acc;
            }, []);
        }

        // Enrich records with employee information
        return records.map(record => {
            const employee = employees.find(emp => emp.id === record.employeeId);

            return {
                id: record.id || `${record.employeeId}-${record.date || selectedDate.toISOString().split('T')[0]}`,
                ...record,
                employee: employee ? {
                    id: employee.id,
                    fullName: employee.fullName || 'Unknown Employee',
                    jobPositionName: employee.jobPositionName || employee.jobPosition?.positionName || 'Unknown Position',
                    photoUrl: employee.photoUrl || null,
                    siteName: employee.siteName || employee.site?.name || 'Unknown Site',
                    departmentName: employee.departmentName || employee.department?.name || 'Unknown Department',
                    contractType: employee.jobPosition?.contractType || 'MONTHLY'
                } : {
                    id: record.employeeId,
                    fullName: 'Unknown Employee',
                    jobPositionName: 'Unknown Position',
                    photoUrl: null,
                    siteName: 'Unknown Site',
                    departmentName: 'Unknown Department',
                    contractType: 'MONTHLY'
                }
            };
        });
    }, [attendanceData, employees, selectedDate]);

    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
        let filtered = [...processedData];

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(record => {
                const status = getAttendanceStatus(record);
                return status === filterStatus;
            });
        }

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(record =>
                record.employee.fullName.toLowerCase().includes(searchLower) ||
                record.employee.jobPositionName.toLowerCase().includes(searchLower) ||
                record.employee.siteName.toLowerCase().includes(searchLower) ||
                record.employee.departmentName.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue, bValue;

                switch (sortConfig.key) {
                    case 'name':
                        aValue = a.employee.fullName;
                        bValue = b.employee.fullName;
                        break;
                    case 'position':
                        aValue = a.employee.jobPositionName;
                        bValue = b.employee.jobPositionName;
                        break;
                    case 'status':
                        aValue = getAttendanceStatus(a);
                        bValue = getAttendanceStatus(b);
                        break;
                    case 'checkIn':
                        aValue = a.checkInTime || '';
                        bValue = b.checkInTime || '';
                        break;
                    case 'checkOut':
                        aValue = a.checkOutTime || '';
                        bValue = b.checkOutTime || '';
                        break;
                    case 'hours':
                        aValue = parseFloat(a.hoursWorked) || 0;
                        bValue = parseFloat(b.hoursWorked) || 0;
                        break;
                    case 'site':
                        aValue = a.employee.siteName;
                        bValue = b.employee.siteName;
                        break;
                    case 'contract':
                        aValue = a.employee.contractType;
                        bValue = b.employee.contractType;
                        break;
                    default:
                        aValue = a[sortConfig.key] || '';
                        bValue = b[sortConfig.key] || '';
                }

                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [processedData, filterStatus, searchTerm, sortConfig]);

    const getAttendanceStatus = (record) => {
        if (!record) return 'absent';

        // Check for leave or holiday first
        if (record.isLeave || record.status === 'ON_LEAVE' || record.dailyStatus === 'LEAVE') {
            return 'leave';
        }

        if (record.isHoliday || record.dailyStatus === 'HOLIDAY') {
            return 'holiday';
        }

        // Determine status based on contract type
        switch (record.contractType || record.employee?.contractType) {
            case 'HOURLY':
                if (record.checkInTime && !record.checkOutTime) {
                    return 'checkedin';
                }
                if (record.checkInTime && record.checkOutTime) {
                    return record.isLate ? 'late' : 'present';
                }
                return 'absent';

            case 'DAILY':
                return record.dailyStatus === 'PRESENT' ? 'present' : 'absent';

            case 'MONTHLY':
                if (record.status === 'PRESENT') return 'present';
                if (record.status === 'LATE') return 'late';
                return 'absent';

            default:
                return 'unknown';
        }
    };

    const getStatusBadge = (status) => {
        const statusConfigs = {
            present: { icon: CheckCircle, className: 'status-present', text: 'Present', color: '#4caf50' },
            absent: { icon: XCircle, className: 'status-absent', text: 'Absent', color: '#f44336' },
            late: { icon: Clock, className: 'status-late', text: 'Late', color: '#ff9800' },
            checkedin: { icon: LogIn, className: 'status-checkedin', text: 'Checked In', color: '#2196f3' },
            leave: { icon: Calendar, className: 'status-leave', text: 'On Leave', color: '#9c27b0' },
            holiday: { icon: Calendar, className: 'status-holiday', text: 'Holiday', color: '#673ab7' },
            unknown: { icon: XCircle, className: 'status-unknown', text: 'Unknown', color: '#9e9e9e' }
        };

        const config = statusConfigs[status] || statusConfigs.unknown;
        const IconComponent = config.icon;

        return (
            <span className={`rockops-attendance-status-badge rockops-attendance-${config.className}`}>
                <IconComponent size={14} style={{ color: config.color }} />
                {config.text}
            </span>
        );
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    const canCheckIn = (record) => {
        const contractType = record.contractType || record.employee?.contractType;
        return contractType === 'HOURLY' && (!record.checkInTime || (record.checkInTime && record.checkOutTime));
    };

    const canCheckOut = (record) => {
        const contractType = record.contractType || record.employee?.contractType;
        return contractType === 'HOURLY' && record.checkInTime && !record.checkOutTime;
    };

    const formatTime = (time) => {
        if (!time) return '-';
        return typeof time === 'string' ? time : time.toString();
    };

    const formatHours = (hours) => {
        if (!hours) return '-';
        const numHours = parseFloat(hours);
        return isNaN(numHours) ? '-' : `${numHours.toFixed(1)}h`;
    };

    const calculateDuration = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return '-';

        try {
            const start = new Date(`2000-01-01T${checkIn}`);
            const end = new Date(`2000-01-01T${checkOut}`);
            const diffHours = (end - start) / (1000 * 60 * 60);

            return diffHours > 0 ? `${diffHours.toFixed(1)}h` : '-';
        } catch (error) {
            return '-';
        }
    };

    const handleEmployeeSelect = (employeeId, checked) => {
        setSelectedEmployees(prev =>
            checked
                ? [...prev, employeeId]
                : prev.filter(id => id !== employeeId)
        );
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedEmployees(filteredAndSortedData.map(record => record.employeeId));
        } else {
            setSelectedEmployees([]);
        }
    };

    const handleBulkCheckIn = () => {
        if (selectedEmployees.length === 0) return;
        onBulkAction('checkIn', selectedEmployees);
        setSelectedEmployees([]);
    };

    const toggleEmployeeDetails = (recordId) => {
        setExpandedEmployee(expandedEmployee === recordId ? null : recordId);
    };

    const getContractTypeColor = (contractType) => {
        const colors = {
            HOURLY: '#2196f3',
            DAILY: '#ff9800',
            MONTHLY: '#4caf50'
        };
        return colors[contractType] || '#9e9e9e';
    };

    const StatusFilterButton = ({ status, label, count }) => (
        <button
            className={`status-filter-btn ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
        >
            {label}
            {count > 0 && <span className="count">({count})</span>}
        </button>
    );

    // Calculate status counts for filter buttons
    const statusCounts = useMemo(() => {
        const counts = {
            present: 0,
            absent: 0,
            late: 0,
            checkedin: 0,
            leave: 0
        };

        processedData.forEach(record => {
            const status = getAttendanceStatus(record);
            if (counts.hasOwnProperty(status)) {
                counts[status]++;
            }
        });

        return counts;
    }, [processedData]);

    if (loading) {
        return (
            <div className="rockops-attendance-loading">
                <div className="rockops-attendance-loading-spinner"></div>
                <p>Loading attendance data...</p>
            </div>
        );
    }

    return (
        <div className="rockops-attendance-list-view">
            {/* Header with Search and Filters */}
            <div className="rockops-attendance-list-header">
                <div className="rockops-attendance-list-filters">
                    <div className="rockops-attendance-search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search employees, positions, or sites..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="rockops-attendance-search-input"
                        />
                    </div>

                    <div className="rockops-attendance-status-filters">
                        <StatusFilterButton status="all" label="All" count={processedData.length} />
                        <StatusFilterButton status="present" label="Present" count={statusCounts.present} />
                        <StatusFilterButton status="absent" label="Absent" count={statusCounts.absent} />
                        <StatusFilterButton status="late" label="Late" count={statusCounts.late} />
                        <StatusFilterButton status="checkedin" label="Checked In" count={statusCounts.checkedin} />
                        <StatusFilterButton status="leave" label="On Leave" count={statusCounts.leave} />
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedEmployees.length > 0 && (
                    <div className="rockops-attendance-bulk-actions">
                        <div className="bulk-selection-info">
                            <span>{selectedEmployees.length} employee(s) selected</span>
                            <button
                                onClick={() => setSelectedEmployees([])}
                                className="clear-selection-btn"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="bulk-action-buttons">
                            <button
                                onClick={handleBulkCheckIn}
                                className="rockops-btn rockops-btn--primary rockops-attendance-bulk-btn"
                            >
                                <LogIn size={16} />
                                Bulk Check In
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Summary */}
            <div className="rockops-attendance-results-summary">
                <span className="results-count">
                    Showing {filteredAndSortedData.length} of {processedData.length} records
                </span>
                <span className="results-date">
                    for {selectedDate.toLocaleDateString()}
                </span>
            </div>

            {/* Table */}
            <div className="rockops-attendance-list-table">
                <table className="rockops-attendance-table">
                    <thead className="rockops-attendance-table-header">
                    <tr>
                        <th className="checkbox-col">
                            <input
                                type="checkbox"
                                checked={selectedEmployees.length === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rockops-attendance-checkbox"
                            />
                        </th>
                        <th
                            className="rockops-attendance-sortable name-col"
                            onClick={() => handleSort('name')}
                        >
                            Employee {getSortIcon('name')}
                        </th>
                        <th
                            className="rockops-attendance-sortable position-col"
                            onClick={() => handleSort('position')}
                        >
                            Position {getSortIcon('position')}
                        </th>
                        <th
                            className="rockops-attendance-sortable contract-col"
                            onClick={() => handleSort('contract')}
                        >
                            Contract {getSortIcon('contract')}
                        </th>
                        <th
                            className="rockops-attendance-sortable status-col"
                            onClick={() => handleSort('status')}
                        >
                            Status {getSortIcon('status')}
                        </th>
                        <th
                            className="rockops-attendance-sortable checkin-col"
                            onClick={() => handleSort('checkIn')}
                        >
                            Check In {getSortIcon('checkIn')}
                        </th>
                        <th
                            className="rockops-attendance-sortable checkout-col"
                            onClick={() => handleSort('checkOut')}
                        >
                            Check Out {getSortIcon('checkOut')}
                        </th>
                        <th
                            className="rockops-attendance-sortable hours-col"
                            onClick={() => handleSort('hours')}
                        >
                            Hours {getSortIcon('hours')}
                        </th>
                        <th
                            className="rockops-attendance-sortable site-col"
                            onClick={() => handleSort('site')}
                        >
                            Site {getSortIcon('site')}
                        </th>
                        <th className="actions-col">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="rockops-attendance-table-body">
                    {filteredAndSortedData.length === 0 ? (
                        <tr>
                            <td colSpan="10" className="no-data-cell">
                                <div className="no-data-message">
                                    <Users size={48} />
                                    <p>No attendance records found</p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="clear-search-btn"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredAndSortedData.map((record) => (
                            <React.Fragment key={record.id}>
                                <tr className="rockops-attendance-table-row">
                                    <td className="checkbox-col">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.includes(record.employeeId)}
                                            onChange={(e) => handleEmployeeSelect(record.employeeId, e.target.checked)}
                                            className="rockops-attendance-checkbox"
                                        />
                                    </td>
                                    <td className="name-col">
                                        <div className="rockops-attendance-employee-info">
                                            <img
                                                src={record.employee.photoUrl || '/default-avatar.png'}
                                                alt={record.employee.fullName}
                                                className="rockops-attendance-employee-avatar"
                                                onError={(e) => {
                                                    e.target.src = '/default-avatar.png';
                                                }}
                                            />
                                            <div className="rockops-attendance-employee-details">
                                                    <span className="rockops-attendance-employee-name">
                                                        {record.employee.fullName}
                                                    </span>
                                                <span className="rockops-attendance-employee-id">
                                                        ID: {record.employeeId}
                                                    </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="position-col">
                                            <span className="position-name">
                                                {record.employee.jobPositionName}
                                            </span>
                                    </td>
                                    <td className="contract-col">
                                            <span
                                                className="contract-badge"
                                                style={{
                                                    backgroundColor: `${getContractTypeColor(record.employee.contractType)}20`,
                                                    color: getContractTypeColor(record.employee.contractType)
                                                }}
                                            >
                                                {record.employee.contractType}
                                            </span>
                                    </td>
                                    <td className="status-col">
                                        {getStatusBadge(getAttendanceStatus(record))}
                                    </td>
                                    <td className="checkin-col">
                                        {formatTime(record.checkInTime)}
                                    </td>
                                    <td className="checkout-col">
                                        {formatTime(record.checkOutTime)}
                                    </td>
                                    <td className="hours-col">
                                        {formatHours(record.hoursWorked)}
                                    </td>
                                    <td className="site-col">
                                        {record.employee.siteName}
                                    </td>
                                    <td className="actions-col">
                                        <div className="rockops-attendance-action-buttons">
                                            {canCheckIn(record) && (
                                                <button
                                                    onClick={() => onQuickCheckIn(record.employeeId)}
                                                    className="action-btn check-in-btn"
                                                    title="Quick Check In"
                                                >
                                                    <LogIn size={16} />
                                                </button>
                                            )}
                                            {canCheckOut(record) && (
                                                <button
                                                    onClick={() => onQuickCheckOut(record.employeeId)}
                                                    className="action-btn check-out-btn"
                                                    title="Quick Check Out"
                                                >
                                                    <LogOut size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEditAttendance(record)}
                                                className="action-btn edit-btn"
                                                title="Edit Attendance"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => toggleEmployeeDetails(record.id)}
                                                className="action-btn details-btn"
                                                title="View Details"
                                            >
                                                {expandedEmployee === record.id ? (
                                                    <ChevronUp size={16} />
                                                ) : (
                                                    <ChevronDown size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Details Row */}
                                {expandedEmployee === record.id && (
                                    <tr className="rockops-attendance-details-row">
                                        <td colSpan="10" className="rockops-attendance-details-cell">
                                            <div className="rockops-attendance-details-content">
                                                <div className="details-section">
                                                    <h4 className="details-title">
                                                        <Clock size={16} />
                                                        Time Details
                                                    </h4>
                                                    <div className="details-grid">
                                                        <div className="detail-item">
                                                            <span className="detail-label">Check In:</span>
                                                            <span className="detail-value">{formatTime(record.checkInTime)}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="detail-label">Check Out:</span>
                                                            <span className="detail-value">{formatTime(record.checkOutTime)}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="detail-label">Duration:</span>
                                                            <span className="detail-value">
                                                                    {calculateDuration(record.checkInTime, record.checkOutTime)}
                                                                </span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="detail-label">Break Time:</span>
                                                            <span className="detail-value">
                                                                    {record.breakDurationMinutes ? `${record.breakDurationMinutes}min` : '-'}
                                                                </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="details-section">
                                                    <h4 className="details-title">
                                                        <MapPin size={16} />
                                                        Location & Department
                                                    </h4>
                                                    <div className="details-grid">
                                                        <div className="detail-item">
                                                            <span className="detail-label">Site:</span>
                                                            <span className="detail-value">{record.employee.siteName}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="detail-label">Department:</span>
                                                            <span className="detail-value">{record.employee.departmentName}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="detail-label">Location:</span>
                                                            <span className="detail-value">{record.location || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {record.notes && (
                                                    <div className="details-section">
                                                        <h4 className="details-title">
                                                            Notes
                                                        </h4>
                                                        <p className="notes-content">{record.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceListView;