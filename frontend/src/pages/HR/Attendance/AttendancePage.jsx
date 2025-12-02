import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import { FaCalendarCheck, FaUsers, FaUserCheck, FaUserTimes, FaClock, FaSave, FaChevronLeft, FaChevronRight, FaUserSlash } from 'react-icons/fa';
import AttendanceMonthlyView from './components/AttendanceMonthlyView';
import AttendanceSummaryCard from './components/AttendanceSummaryCard';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './attendance.scss';
import { siteService } from '../../../services/siteService';
import { attendanceService } from '../../../services/hr/attendanceService.js';
import ContentLoader from "../../../components/common/ContentLoader/ContentLoader.jsx";

const AttendancePage = () => {
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data states
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlyAttendance, setMonthlyAttendance] = useState([]);
    const [modifiedRecords, setModifiedRecords] = useState(new Map());

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Navigation blocking
    const pendingNavigationRef = useRef(null);
    const allowNavigationRef = useRef(false);

    // Check if there are unsaved changes
    const hasUnsavedChanges = modifiedRecords.size > 0;

    // Handle browser back/forward/refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // Intercept all navigation attempts
    useEffect(() => {
        const handleClick = (e) => {
            // Skip if we're already allowing navigation
            if (allowNavigationRef.current || !hasUnsavedChanges) {
                return;
            }

            // Find the closest link or button that might trigger navigation
            const target = e.target.closest('a[href], button[type="button"]');

            if (!target) return;

            // Check if it's a link that would navigate away
            if (target.tagName === 'A') {
                const href = target.getAttribute('href');

                // Skip if it's an anchor link or external link
                if (!href || href.startsWith('#') || href.startsWith('http')) {
                    return;
                }

                // Check if the link would navigate to a different route
                const isInternalNavigation = href.startsWith('/') || !href.includes('://');

                if (isInternalNavigation) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Store the intended destination
                    pendingNavigationRef.current = href;

                    // Show confirmation dialog
                    setShowConfirmDialog(true);
                    setPendingAction({
                        type: 'navigation',
                        path: href
                    });
                }
            }
        };

        // Capture phase to intercept before React Router processes the click
        document.addEventListener('click', handleClick, true);

        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [hasUnsavedChanges]);

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
        } catch (error) {
            console.error('Error fetching sites:', error);
            showSnackbar('Failed to load sites', 'error');
        }
    };

    const fetchMonthlyAttendance = async () => {
        setLoading(true);
        try {
            const response = await attendanceService.getMonthlyAttendance(
                selectedSite, // Pass the string directly (can be UUID or "no-site")
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

        // Ensure date is in correct format (YYYY-MM-DD)
        let formattedDate = date;
        if (date && typeof date === 'string') {
            // If date is already in ISO format, use it
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                formattedDate = date;
            } else {
                // Try to parse and format the date
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    formattedDate = parsedDate.toISOString().split('T')[0];
                }
            }
        }

        const updateRecord = {
            employeeId,
            date: formattedDate,
            ...updates
        };

        // Validate required fields
        if (!updateRecord.employeeId || !updateRecord.date) {
            console.error('Missing required fields:', { employeeId, date: formattedDate });
            showSnackbar('Missing required fields for attendance update', 'error');
            return;
        }

        setModifiedRecords(prev => {
            const newMap = new Map(prev);
            newMap.set(key, updateRecord);
            return newMap;
        });

        // Update local state for immediate UI feedback
        setMonthlyAttendance(prev =>
            prev.map(employee => {
                if (employee.employeeId === employeeId) {
                    return {
                        ...employee,
                        dailyAttendance: employee.dailyAttendance.map(day => {
                            if (day.date === formattedDate) {
                                return { ...day, ...updates };
                            }
                            return day;
                        })
                    };
                }
                return employee;
            })
        );
    }, [showSnackbar]);

    const handleSaveAttendance = useCallback(async () => {
        if (modifiedRecords.size === 0) {
            showSnackbar('No changes to save', 'info');
            return;
        }

        setSaving(true);
        try {
            // Group records by date for bulk save
            const recordsByDate = new Map();

            Array.from(modifiedRecords.values()).forEach(record => {
                if (!recordsByDate.has(record.date)) {
                    recordsByDate.set(record.date, []);
                }
                recordsByDate.get(record.date).push({
                    employeeId: record.employeeId,
                    status: record.status,
                    checkIn: record.checkIn || null,
                    checkOut: record.checkOut || null,
                    hoursWorked: record.hoursWorked ? parseFloat(record.hoursWorked) : null,
                    notes: record.notes || ''
                });
            });

            console.log('Saving attendance updates grouped by date:', recordsByDate);

            // Save each date group as a separate bulk request
            let totalSaved = 0;
            for (const [date, attendanceRecords] of recordsByDate) {
                const bulkData = {
                    date: date,
                    siteId: selectedSite !== 'no-site' ? selectedSite : null,
                    attendanceRecords: attendanceRecords
                };

                console.log('Sending bulk request for date:', date, bulkData);

                await attendanceService.bulkSaveAttendance(bulkData);
                totalSaved += attendanceRecords.length;
            }

            showSnackbar(`Successfully saved ${totalSaved} attendance record(s)`, 'success');
            setModifiedRecords(new Map());

            // Refresh data after save
            await fetchMonthlyAttendance();
        } catch (error) {
            console.error('Error saving attendance:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to save attendance changes';
            showSnackbar(errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    }, [modifiedRecords, selectedSite, selectedMonth, selectedYear, showSnackbar, fetchMonthlyAttendance]);

    const handleSiteChange = useCallback((e) => {
        const newSite = e.target.value;

        if (hasUnsavedChanges) {
            setShowConfirmDialog(true);
            setPendingAction({
                type: 'site-change',
                newValue: newSite
            });
        } else {
            setSelectedSite(newSite);
        }
    }, [hasUnsavedChanges]);

    const handleMonthChange = useCallback((direction) => {
        if (hasUnsavedChanges) {
            const newDate = direction === 'next'
                ? { month: selectedMonth === 12 ? 1 : selectedMonth + 1, year: selectedMonth === 12 ? selectedYear + 1 : selectedYear }
                : { month: selectedMonth === 1 ? 12 : selectedMonth - 1, year: selectedMonth === 1 ? selectedYear - 1 : selectedYear };

            setShowConfirmDialog(true);
            setPendingAction({
                type: 'month-change',
                newValue: newDate
            });
        } else {
            if (direction === 'next') {
                if (selectedMonth === 12) {
                    setSelectedMonth(1);
                    setSelectedYear(prev => prev + 1);
                } else {
                    setSelectedMonth(prev => prev + 1);
                }
            } else {
                if (selectedMonth === 1) {
                    setSelectedMonth(12);
                    setSelectedYear(prev => prev - 1);
                } else {
                    setSelectedMonth(prev => prev - 1);
                }
            }
        }
    }, [hasUnsavedChanges, selectedMonth, selectedYear]);

    const handleConfirmDialogAction = useCallback(async (shouldSave) => {
        if (shouldSave) {
            // Save changes first
            await handleSaveAttendance();
        } else {
            // Discard changes
            setModifiedRecords(new Map());
        }

        // Execute the pending action
        if (pendingAction) {
            if (pendingAction.type === 'site-change') {
                setSelectedSite(pendingAction.newValue);
            } else if (pendingAction.type === 'month-change') {
                setSelectedMonth(pendingAction.newValue.month);
                setSelectedYear(pendingAction.newValue.year);
            } else if (pendingAction.type === 'navigation') {
                allowNavigationRef.current = true;
                navigate(pendingAction.path);
            }
        }

        setShowConfirmDialog(false);
        setPendingAction(null);
    }, [pendingAction, handleSaveAttendance, navigate]);

    const handleCancelDialog = useCallback(() => {
        setShowConfirmDialog(false);
        setPendingAction(null);
        pendingNavigationRef.current = null;
    }, []);

    // Group employees by site for display
    const groupedEmployees = useMemo(() => {
        if (!monthlyAttendance || monthlyAttendance.length === 0) {
            return [];
        }

        // Determine group label based on selected site
        let groupLabel = '';
        if (selectedSite === 'no-site') {
            groupLabel = 'Unassigned Employees';
        } else {
            const site = sites.find(s => s.id === selectedSite);
            groupLabel = site ? site.name : 'Site Employees';
        }

        return [{
            siteName: groupLabel,
            employees: monthlyAttendance
        }];
    }, [monthlyAttendance, selectedSite, sites]);

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
        return <ContentLoader />;
    }

    return (
        <div className="attendance-page">
            <div className="departments-header">
                <h1>
                    Attendance Sheet
                    <p className="employees-header__subtitle">Track and manage employee attendance records</p>
                </h1>
                {/* MOVED: The Save Button was here.
                   It has been removed and placed inside the site-group map below.
                */}
                <div className="header-actions">
                    {/* Empty or add other top-level actions if needed */}
                </div>
            </div>

            {/* ... Keep Control Inputs (Site Select, Month Selector) unchanged ... */}
            <div className="attendance-controls">
                <div className="control-group">
                    <label>Site / Employee Group</label>
                    <select
                        value={selectedSite}
                        onChange={handleSiteChange}
                        className="form-control"
                    >
                        {/* ... options ... */}
                        <option value="">Select Site or Group</option>
                        <optgroup label="Employee Groups">
                            <option value="no-site">🚫 Unassigned Employees</option>
                        </optgroup>
                        <optgroup label="Sites">
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div className="month-selector">
                    <button className="month-nav-btn" onClick={() => handleMonthChange('prev')}>
                        <FaChevronLeft />
                    </button>
                    <div className="month-display">
                        <span className="month-name">{monthNames[selectedMonth - 1]}</span>
                        <span className="year">{selectedYear}</span>
                    </div>
                    <button className="month-nav-btn" onClick={() => handleMonthChange('next')}
                            disabled={selectedYear === new Date().getFullYear() && selectedMonth >= new Date().getMonth() + 1}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            {/* ... Keep Summary Cards unchanged ... */}
            <div className="attendance-summary">
                {/* ... cards ... */}
                <AttendanceSummaryCard icon={<FaUsers />} title="Total Employees" value={summary.totalEmployees} color="primary" />
                <AttendanceSummaryCard icon={<FaUserCheck />} title="Average Attendance" value={`${summary.avgAttendance.toFixed(1)}%`} color="success" />
                <AttendanceSummaryCard icon={<FaUserTimes />} title="Total Absent Days" value={summary.totalAbsent} color="danger" />
                <AttendanceSummaryCard icon={<FaClock />} title="Total Hours" value={summary.totalHours.toFixed(1)} subValue="hours" color="info" />
            </div>

            {/* ... Keep Legend unchanged ... */}
            <div className="attendance-legend-top">
                {/* ... legend items ... */}
                <div className="legend-item"><span className="legend-color present"></span><span>Present</span></div>
                <div className="legend-item"><span className="legend-color absent"></span><span>Absent</span></div>
                <div className="legend-item"><span className="legend-color off"></span><span>Off Day</span></div>
                <div className="legend-item"><span className="legend-color leave"></span><span>On Leave</span></div>
                <div className="legend-item"><span className="legend-color late"></span><span>Late</span></div>
                <div className="legend-item"><span className="legend-color half-day"></span><span>Half Day</span></div>
            </div>

            <div className="attendance-content">
                {monthlyAttendance.length > 0 ? (
                    <>
                        {groupedEmployees.map((group, index) => (
                            <div key={index} className="site-group">
                                {group.siteName && (
                                    <div className={`site-group-header ${selectedSite === 'no-site' ? 'unassigned-header' : ''}`}>

                                        {/* LEFT SIDE: Icon and Title */}
                                        <div className="header-left">
                                            {selectedSite === 'no-site' && <FaUserSlash className="header-icon" />}
                                            <h3>{group.siteName}</h3>
                                        </div>

                                        {/* RIGHT SIDE: Save Button and Count (Moved here) */}
                                        <div className="header-right">
                                            {/* Only show save button if changes exist */}
                                            <button
                                                className="save-btn-small"
                                                onClick={handleSaveAttendance}
                                                disabled={saving || modifiedRecords.size === 0}
                                            >
                                                <FaSave /> Save Changes {modifiedRecords.size > 0 && `(${modifiedRecords.size})`}
                                            </button>

                                            <span className="employee-count">
                                                {group.employees.length} employee{group.employees.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <AttendanceMonthlyView
                                    monthlyData={group.employees}
                                    onAttendanceUpdate={handleAttendanceUpdate}
                                    loading={loading}
                                    month={selectedMonth}
                                    year={selectedYear}
                                    showLegend={false}
                                />
                            </div>
                        ))}
                    </>
                ) : (
                    // ... Empty State logic unchanged ...
                    <div className="attendance-empty-state">
                        {selectedSite === '' ? (
                            <>
                                <FaUsers className="empty-icon" />
                                <p>Please select a site or employee group to view attendance records.</p>
                            </>
                        ) : selectedSite === 'no-site' ? (
                            <>
                                <FaUserSlash className="empty-icon" />
                                <p>No unassigned employees found.</p>
                                <p className="empty-subtitle">All active employees are currently assigned to sites.</p>
                            </>
                        ) : (
                            <>
                                <FaUsers className="empty-icon" />
                                <p>No employees found for the selected site.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ... Keep Confirmation Dialog unchanged ... */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="danger"
                title="Unsaved Changes"
                message={`You have ${modifiedRecords.size} unsaved change(s). Do you want to save them before continuing?`}
                confirmText="Save & Continue"
                cancelText="Discard Changes"
                onConfirm={() => handleConfirmDialogAction(true)}
                onCancel={() => handleConfirmDialogAction(false)}
                onClose={handleCancelDialog}
                isLoading={saving}
                showIcon={true}
                size="medium"
            />
        </div>
        );
};

export default AttendancePage;