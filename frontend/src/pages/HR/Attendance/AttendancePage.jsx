import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, TrendingUp, Filter, Download, Plus, RefreshCw } from 'lucide-react';
import AttendanceCalendarView from './components/AttendanceCalendarView';
import AttendanceListView from './components/AttendanceListView';
import AttendanceFilters from './components/AttendanceFilters';
import AttendanceStats from './components/AttendanceStats';
import AttendanceModal from './components/AttendanceModal';
import QuickActionPanel from './components/QuickActionPanel';

import { useSnackbar } from '../../../contexts/SnackbarContext';
import attendanceService from "../../../services/attendanceService.js";
import { employeeService } from "../../../services/employeeService.js";
import "./attendance.scss";

const AttendancePage = () => {
    // Core state
    const [view, setView] = useState('calendar');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filter and modal state
    const [filters, setFilters] = useState({
        employeeId: '',
        department: '',
        site: '',
        status: '',
        contractType: ''
    });
    const [showModal, setShowModal] = useState(false);
    const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
    const [stats, setStats] = useState({});

    const { showSnackbar } = useSnackbar();

    // Initialize component
    useEffect(() => {
        initializeComponent();
    }, []);

    // Watch for filter changes
    useEffect(() => {
        if (filters.employeeId || view === 'list') {
            fetchAttendanceData();
        }
    }, [selectedDate, filters, view]);

    // Watch for employee selection
    useEffect(() => {
        if (filters.employeeId) {
            const employee = employees.find(emp => emp.id === filters.employeeId);
            setSelectedEmployee(employee);
        } else {
            setSelectedEmployee(null);
        }
    }, [filters.employeeId, employees]);

    const initializeComponent = async () => {
        await fetchEmployees();
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // Use minimal endpoint for better performance in attendance operations
            // Falls back to full data if minimal endpoint is not available
            let response;
            try {
                response = await employeeService.getMinimal();
            } catch (minimalError) {
                console.warn('Minimal endpoint not available, falling back to full data:', minimalError);
                response = await employeeService.getAll();
            }

            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            showSnackbar('Failed to fetch employees', 'error');
            setEmployees([]); // Set empty array as fallback
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        if (!filters.employeeId && view !== 'list') return;

        try {
            setRefreshing(true);
            const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

            if (filters.employeeId) {
                // Fetch specific employee data
                const [attendanceResponse, statsResponse] = await Promise.all([
                    attendanceService.getEmployeeAttendance(
                        filters.employeeId,
                        attendanceService.utils.formatDate(startDate),
                        attendanceService.utils.formatDate(endDate)
                    ),
                    attendanceService.getMonthlyAttendanceSummary(
                        filters.employeeId,
                        selectedDate.getFullYear(),
                        selectedDate.getMonth() + 1
                    ).catch(() => ({ data: {} })) // Graceful failure for stats
                ]);

                setAttendanceData(attendanceResponse.data || []);
                setStats(statsResponse.data || {});
            } else if (view === 'list') {
                // Fetch daily summary for all employees
                const response = await attendanceService.getDailyAttendanceSummary(
                    attendanceService.utils.formatDate(selectedDate)
                );
                setAttendanceData(response.data || {});
                setStats({});
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error);
            showSnackbar('Failed to fetch attendance data', 'error');
            setAttendanceData(view === 'list' ? {} : []);
            setStats({});
        } finally {
            setRefreshing(false);
        }
    };

    const handleRecordAttendance = async (attendanceRecord) => {
        try {
            setLoading(true);

            // Validate data
            const validation = attendanceService.utils.validateAttendanceData(attendanceRecord);
            if (!validation.isValid) {
                showSnackbar(`Validation Error: ${validation.errors.join(', ')}`, 'error');
                return false;
            }

            if (selectedAttendanceRecord?.id) {
                // Update existing record
                await attendanceService.recordAttendance({
                    ...attendanceRecord,
                    id: selectedAttendanceRecord.id
                });
                showSnackbar('Attendance updated successfully', 'success');
            } else {
                // Create new record
                await attendanceService.recordAttendance(attendanceRecord);
                showSnackbar('Attendance recorded successfully', 'success');
            }

            setShowModal(false);
            setSelectedAttendanceRecord(null);
            await fetchAttendanceData();
            return true;
        } catch (error) {
            console.error('Error recording attendance:', error);
            const errorMessage = error.response?.data?.message || 'Failed to record attendance';
            showSnackbar(errorMessage, 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleQuickCheckIn = async (employeeId, location = null) => {
        try {
            setLoading(true);
            const now = new Date();
            const checkInTime = attendanceService.utils.formatTime(now);

            let coordinates = { latitude: null, longitude: null };

            // Get location if not provided
            if (!location && navigator.geolocation) {
                try {
                    const position = await getCurrentPosition();
                    coordinates.latitude = position.coords.latitude;
                    coordinates.longitude = position.coords.longitude;
                    location = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
                } catch (geoError) {
                    console.warn('Could not get location:', geoError);
                }
            }

            await attendanceService.checkIn(
                employeeId,
                checkInTime,
                location,
                coordinates.latitude,
                coordinates.longitude
            );

            showSnackbar('Employee checked in successfully', 'success');
            await fetchAttendanceData();
        } catch (error) {
            console.error('Error checking in employee:', error);
            const errorMessage = error.response?.data?.message || 'Failed to check in employee';
            showSnackbar(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickCheckOut = async (employeeId) => {
        try {
            setLoading(true);
            const now = new Date();
            const checkOutTime = attendanceService.utils.formatTime(now);

            await attendanceService.checkOut(employeeId, checkOutTime);
            showSnackbar('Employee checked out successfully', 'success');
            await fetchAttendanceData();
        } catch (error) {
            console.error('Error checking out employee:', error);
            const errorMessage = error.response?.data?.message || 'Failed to check out employee';
            showSnackbar(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkActions = async (action, employeeIds) => {
        try {
            setLoading(true);
            let results = [];

            switch (action) {
                case 'checkIn':
                    const checkInData = employeeIds.map(id => ({
                        employeeId: id,
                        checkInTime: attendanceService.utils.formatTime(new Date()),
                        location: null
                    }));
                    results = await attendanceService.bulk.checkInMultiple(checkInData);
                    break;

                case 'generateMonthly':
                    results = await attendanceService.bulk.generateMonthlyMultiple(
                        employeeIds,
                        selectedDate.getFullYear(),
                        selectedDate.getMonth() + 1
                    );
                    break;

                default:
                    throw new Error('Unknown bulk action');
            }

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (failed === 0) {
                showSnackbar(`Successfully processed ${successful} employees`, 'success');
            } else {
                showSnackbar(`Processed ${successful} employees, ${failed} failed`, 'warning');
            }

            await fetchAttendanceData();
        } catch (error) {
            console.error('Error in bulk action:', error);
            showSnackbar('Bulk operation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportAttendance = async () => {
        try {
            setLoading(true);
            let exportData = [];
            let filename = '';

            if (filters.employeeId && selectedEmployee) {
                // Export specific employee data
                const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

                const response = await attendanceService.getEmployeeAttendance(
                    filters.employeeId,
                    attendanceService.utils.formatDate(startDate),
                    attendanceService.utils.formatDate(endDate)
                );

                exportData = response.data || [];
                filename = `${selectedEmployee.fullName}_Attendance_${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}.csv`;
            } else {
                // Export daily summary
                const response = await attendanceService.getDailyAttendanceSummary(
                    attendanceService.utils.formatDate(selectedDate)
                );

                // Convert summary data to exportable format
                exportData = convertSummaryToExportFormat(response.data);
                filename = `Daily_Attendance_${attendanceService.utils.formatDate(selectedDate)}.csv`;
            }

            if (exportData.length === 0) {
                showSnackbar('No data to export', 'warning');
                return;
            }

            downloadCSV(exportData, filename);
            showSnackbar('Attendance data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting attendance:', error);
            showSnackbar('Failed to export attendance data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Utility functions
    const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false
            });
        });
    };

    const convertSummaryToExportFormat = (summaryData) => {
        if (!summaryData || typeof summaryData !== 'object') return [];

        const exportRows = [];

        // Process different attendance categories
        ['present', 'absent', 'late', 'checkedIn'].forEach(category => {
            if (summaryData[category] && Array.isArray(summaryData[category])) {
                summaryData[category].forEach(record => {
                    exportRows.push({
                        employeeName: record.employeeName || 'Unknown',
                        employeeId: record.employeeId || '',
                        status: category,
                        date: record.date || attendanceService.utils.formatDate(selectedDate),
                        checkInTime: record.checkInTime || '',
                        checkOutTime: record.checkOutTime || '',
                        hoursWorked: record.hoursWorked || 0,
                        location: record.location || ''
                    });
                });
            }
        });

        return exportRows;
    };

    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value}"`
                        : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDateNavigation = (direction) => {
        const newDate = new Date(selectedDate);
        if (view === 'calendar') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else {
            newDate.setDate(newDate.getDate() + direction);
        }
        setSelectedDate(newDate);
    };

    const refreshData = async () => {
        await Promise.all([
            fetchEmployees(),
            fetchAttendanceData()
        ]);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        handleDateNavigation(-1);
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        handleDateNavigation(1);
                        break;
                    case 'n':
                        event.preventDefault();
                        setShowModal(true);
                        break;
                    case 'e':
                        event.preventDefault();
                        handleExportAttendance();
                        break;
                    case 'r':
                        event.preventDefault();
                        refreshData();
                        break;
                    default:
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedDate, view, filters]);

    return (
        <div className="rockops-attendance-page">
            {/* Header */}
            <div className="rockops-attendance-header">
                <div className="rockops-attendance-header-left">
                    <h1 className="rockops-attendance-title">
                        <Clock className="rockops-attendance-title-icon" />
                        Attendance Management
                    </h1>
                    <p className="rockops-attendance-subtitle">
                        Track and manage employee attendance across different contract types
                    </p>
                </div>

                <div className="rockops-attendance-header-actions">
                    <button
                        className="rockops-btn rockops-btn--outline"
                        onClick={refreshData}
                        disabled={loading || refreshing}
                        title="Refresh data (Ctrl+R)"
                    >
                        <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                        Refresh
                    </button>

                    <button
                        className="rockops-btn rockops-btn--outline"
                        onClick={handleExportAttendance}
                        disabled={loading}
                        title="Export attendance data (Ctrl+E)"
                    >
                        <Download size={16} />
                        Export
                    </button>

                    <button
                        className="rockops-btn rockops-btn--primary"
                        onClick={() => setShowModal(true)}
                        disabled={loading}
                        title="Record new attendance (Ctrl+N)"
                    >
                        <Plus size={16} />
                        Record Attendance
                    </button>
                </div>
            </div>

            {/* Quick Action Panel */}
            <QuickActionPanel
                onQuickCheckIn={handleQuickCheckIn}
                onQuickCheckOut={handleQuickCheckOut}
                onBulkAction={handleBulkActions}
                selectedDate={selectedDate}
                loading={loading}
            />

            {/* Stats Section */}
            {selectedEmployee && Object.keys(stats).length > 0 && (
                <AttendanceStats
                    stats={stats}
                    employee={selectedEmployee}
                />
            )}

            {/* Filters */}
            <AttendanceFilters
                filters={filters}
                setFilters={setFilters}
                employees={employees}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />

            {/* View Controls */}
            <div className="rockops-attendance-view-controls">
                <div className="rockops-attendance-view-toggle">
                    <button
                        className={`rockops-attendance-toggle-btn ${view === 'calendar' ? 'rockops-attendance-toggle-btn--active' : ''}`}
                        onClick={() => setView('calendar')}
                        disabled={loading}
                    >
                        <Calendar size={16} />
                        Calendar View
                    </button>
                    <button
                        className={`rockops-attendance-toggle-btn ${view === 'list' ? 'rockops-attendance-toggle-btn--active' : ''}`}
                        onClick={() => setView('list')}
                        disabled={loading}
                    >
                        <Users size={16} />
                        List View
                    </button>
                </div>

                <div className="rockops-attendance-navigation-hint">
                    <span className="rockops-attendance-hint-text">
                        Keyboard shortcuts: Ctrl+← → (navigate), Ctrl+N (new), Ctrl+E (export), Ctrl+R (refresh)
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="rockops-attendance-content">
                {loading && !refreshing ? (
                    <div className="rockops-attendance-loading">
                        <div className="rockops-attendance-loading-spinner"></div>
                        <p>Loading attendance data...</p>
                    </div>
                ) : (
                    <>
                        {view === 'calendar' ? (
                            <AttendanceCalendarView
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                attendanceData={attendanceData}
                                selectedEmployee={selectedEmployee}
                                onEditAttendance={(record) => {
                                    setSelectedAttendanceRecord(record);
                                    setShowModal(true);
                                }}
                                onQuickCheckIn={handleQuickCheckIn}
                                onQuickCheckOut={handleQuickCheckOut}
                                loading={refreshing}
                            />
                        ) : (
                            <AttendanceListView
                                attendanceData={attendanceData}
                                employees={employees}
                                selectedDate={selectedDate}
                                onEditAttendance={(record) => {
                                    setSelectedAttendanceRecord(record);
                                    setShowModal(true);
                                }}
                                onQuickCheckIn={handleQuickCheckIn}
                                onQuickCheckOut={handleQuickCheckOut}
                                onBulkAction={handleBulkActions}
                                loading={refreshing}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Attendance Modal */}
            {showModal && (
                <AttendanceModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedAttendanceRecord(null);
                    }}
                    onSubmit={handleRecordAttendance}
                    employees={employees}
                    initialData={selectedAttendanceRecord}
                    selectedDate={selectedDate}
                    loading={loading}
                />
            )}
        </div>
    );
};

export default AttendancePage;