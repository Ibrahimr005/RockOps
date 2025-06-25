import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import { FaCalendarCheck, FaUsers, FaUserCheck, FaUserTimes, FaClock, FaSave, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import AttendanceMonthlyView from './components/AttendanceMonthlyView';
import AttendanceSummaryCard from './components/AttendanceSummaryCard';
import './attendance.scss';
import { siteService } from '../../../services/siteService';
import { attendanceService } from '../../../services/attendanceService'; // Import the new service

const AttendancePage = () => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data states
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlyAttendance, setMonthlyAttendance] = useState([]);
    const [modifiedRecords, setModifiedRecords] = useState(new Map());

    // Fetch sites on component mount
    useEffect(() => {
        fetchSites();
    }, []);

    // Fetch attendance when site or month changes
    useEffect(() => {
        if (selectedSite) {
            fetchMonthlyAttendance();
        }
    }, [selectedSite, selectedMonth, selectedYear]);

    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            const data = response.data || response;
            setSites(data);

            // Auto-select first site
            if (data.length > 0) {
                setSelectedSite(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
            showSnackbar('Failed to load sites', 'error');
        }
    };

    const fetchMonthlyAttendance = async () => {
        if (!selectedSite) return;

        setLoading(true);
        try {
            const response = await attendanceService.getMonthlyAttendance(
                selectedSite,
                selectedYear,
                selectedMonth
            );

            const data = response.data || response;
            setMonthlyAttendance(data);
            setModifiedRecords(new Map()); // Reset modified records
        } catch (error) {
            console.error('Error fetching attendance:', error);
            showSnackbar('Failed to load attendance data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceUpdate = useCallback((employeeId, date, updates) => {
        const key = `${employeeId}_${date}`;
        setModifiedRecords(prev => {
            const newMap = new Map(prev);
            newMap.set(key, {
                employeeId,
                date,
                ...updates
            });
            return newMap;
        });

        // Update local state for immediate UI feedback
        setMonthlyAttendance(prev =>
            prev.map(employee => {
                if (employee.employeeId === employeeId) {
                    return {
                        ...employee,
                        dailyAttendance: employee.dailyAttendance.map(day => {
                            if (day.date === date) {
                                return { ...day, ...updates };
                            }
                            return day;
                        })
                    };
                }
                return employee;
            })
        );
    }, []);

    const handleSaveAttendance = async () => {
        if (modifiedRecords.size === 0) {
            showSnackbar('No changes to save', 'info');
            return;
        }

        setSaving(true);
        try {
            const recordsToSave = Array.from(modifiedRecords.values());

            // Create bulk attendance DTO according to your backend structure
            const bulkAttendanceData = {
                date: null, // This can be null for bulk updates with individual dates
                siteId: selectedSite,
                attendanceRecords: recordsToSave
            };

            // Use the attendance service
            const response = await attendanceService.bulkSaveAttendance(bulkAttendanceData);
            const result = response.data;

            showSnackbar(`Attendance updated for ${result.processed} records`, 'success');

            // Clear modified records and refresh data
            setModifiedRecords(new Map());
            fetchMonthlyAttendance();

        } catch (error) {
            console.error('Error saving attendance:', error);
            const message = error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                'Failed to save attendance';
            showSnackbar(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleMonthChange = (direction) => {
        if (direction === 'prev') {
            if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
            } else {
                setSelectedMonth(selectedMonth - 1);
            }
        } else {
            if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        }
    };

    // Calculate summary statistics
    const summary = useMemo(() => {
        const stats = {
            totalEmployees: monthlyAttendance.length,
            totalPresent: 0,
            totalAbsent: 0,
            totalOnLeave: 0,
            totalHours: 0,
            avgAttendance: 0
        };

        monthlyAttendance.forEach(employee => {
            stats.totalPresent += employee.presentDays || 0;
            stats.totalAbsent += employee.absentDays || 0;
            stats.totalOnLeave += employee.leaveDays || 0;
            stats.totalHours += employee.totalHours || 0;
        });

        if (stats.totalEmployees > 0) {
            const totalAttendance = monthlyAttendance.reduce((sum, emp) =>
                sum + (emp.attendancePercentage || 0), 0
            );
            stats.avgAttendance = totalAttendance / stats.totalEmployees;
        }

        return stats;
    }, [monthlyAttendance]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (loading && monthlyAttendance.length === 0) {
        return <LoadingPage />;
    }

    return (
        <div className="attendance-page">
            <div className="page-header">
                <h1>
                    <FaCalendarCheck /> Monthly Attendance Sheet
                </h1>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveAttendance}
                        disabled={saving || modifiedRecords.size === 0}
                    >
                        <FaSave /> Save Changes ({modifiedRecords.size})
                    </button>
                </div>
            </div>

            <div className="attendance-controls">
                <div className="control-group">
                    <label>Site</label>
                    <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="form-control"
                    >
                        <option value="">Select Site</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="month-selector">
                    <button
                        className="month-nav-btn"
                        onClick={() => handleMonthChange('prev')}
                    >
                        <FaChevronLeft />
                    </button>
                    <div className="month-display">
                        <span className="month-name">{monthNames[selectedMonth - 1]}</span>
                        <span className="year">{selectedYear}</span>
                    </div>
                    <button
                        className="month-nav-btn"
                        onClick={() => handleMonthChange('next')}
                        disabled={selectedYear === new Date().getFullYear() && selectedMonth >= new Date().getMonth() + 1}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            <div className="attendance-summary">
                <AttendanceSummaryCard
                    icon={<FaUsers />}
                    title="Total Employees"
                    value={summary.totalEmployees}
                    color="primary"
                />
                <AttendanceSummaryCard
                    icon={<FaUserCheck />}
                    title="Average Attendance"
                    value={`${summary.avgAttendance.toFixed(1)}%`}
                    color="success"
                />
                <AttendanceSummaryCard
                    icon={<FaUserTimes />}
                    title="Total Absent Days"
                    value={summary.totalAbsent}
                    color="danger"
                />
                <AttendanceSummaryCard
                    icon={<FaClock />}
                    title="Total Hours"
                    value={summary.totalHours.toFixed(1)}
                    subValue="hours"
                    color="info"
                />
            </div>

            <div className="attendance-content">
                {monthlyAttendance.length > 0 ? (
                    <AttendanceMonthlyView
                        monthlyData={monthlyAttendance}
                        onAttendanceUpdate={handleAttendanceUpdate}
                        loading={loading}
                        month={selectedMonth}
                        year={selectedYear}
                    />
                ) : (
                    <div className="empty-state">
                        <p>No employees found for the selected site.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendancePage;