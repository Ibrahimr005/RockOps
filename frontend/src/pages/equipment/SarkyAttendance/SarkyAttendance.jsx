import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { equipmentService } from '../../../services/equipmentService';
import { sarkyService } from '../../../services/sarkyService';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import {
    FaCalendarPlus,
    FaTools,
    FaClock,
    FaUser,
    FaEdit,
    FaSave,
    FaQuestionCircle,
    FaCopy,
    FaPlus,
    FaDownload,
    FaCheck,
    FaExclamationTriangle,
    FaChevronDown,
    FaChevronRight
} from 'react-icons/fa';
import './SarkyAttendance.scss';

const SarkyAttendance = forwardRef(({ equipmentId, onDataChange }, ref) => {
    const { showSuccess, showError } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // State management
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [equipmentData, setEquipmentData] = useState(null);
    const [workTypes, setWorkTypes] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [sarkyData, setSarkyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatingSarky, setGeneratingSarky] = useState(false);
    const [savingAll, setSavingAll] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(false);
    const [showBulkTools, setShowBulkTools] = useState(false);
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'matrix'
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [bulkDefaults, setBulkDefaults] = useState({
        workTypeId: '',
        workedHours: 8.0,
        driverId: ''
    });

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
        refreshData: () => {
            fetchMonthlySarky();
        }
    }));

    // Helper function to notify parent about data changes
    const notifyDataChange = () => {
        if (onDataChange) {
            onDataChange();
        }
    };

    // Fetch equipment data and related info
    useEffect(() => {
        const fetchEquipmentData = async () => {
            try {
                const response = await equipmentService.getEquipmentById(equipmentId);
                setEquipmentData(response.data);

                // Set default driver
                setBulkDefaults(prev => ({
                    ...prev,
                    driverId: response.data.mainDriverId || ''
                }));

                // Fetch drivers for this equipment type
                if (response.data.typeId) {
                    const driversResponse = await equipmentService.getDriversForSarkyByEquipmentType(response.data.typeId);
                    setDrivers(driversResponse.data);

                    // Fetch supported work types for this equipment type
                    const workTypesResponse = await equipmentService.getSupportedWorkTypesForEquipmentType(response.data.typeId);
                    setWorkTypes(workTypesResponse.data);

                    // Set default work type
                    if (workTypesResponse.data.length > 0) {
                        setBulkDefaults(prev => ({
                            ...prev,
                            workTypeId: workTypesResponse.data[0].id
                        }));
                    }
                } else {
                    // Fallback to all work types if no equipment type
                    const workTypesResponse = await workTypeService.getAll();
                    setWorkTypes(workTypesResponse.data);

                    if (workTypesResponse.data.length > 0) {
                        setBulkDefaults(prev => ({
                            ...prev,
                            workTypeId: workTypesResponse.data[0].id
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching equipment data:", error);
                showError("Failed to load equipment data");
            }
        };

        if (equipmentId) {
            fetchEquipmentData();
        }
    }, [equipmentId]);

    // Fetch monthly sarky data when month/year changes
    useEffect(() => {
        if (equipmentId) {
            fetchMonthlySarky();
        }
    }, [equipmentId, selectedMonth, selectedYear]);

    const fetchMonthlySarky = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch single-day sarkies
            const singleResponse = await sarkyService.getByEquipment(equipmentId);
            const rangeResponse = await sarkyService.getRangeByEquipment(equipmentId);

            let monthlyEntries = [];

            // Process single-day entries for the selected month
            if (singleResponse.data) {
                singleResponse.data.forEach(sarky => {
                    const date = new Date(sarky.date);
                    if (date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear) {
                        monthlyEntries.push({
                            id: sarky.id,
                            date: sarky.date,
                            workType: sarky.workType,
                            workTypeId: sarky.workType?.id,
                            workedHours: sarky.workedHours,
                            driverId: sarky.driverId,
                            driverName: sarky.driverName,
                            type: 'single',
                            canEdit: permissions.canEdit,
                            canDelete: permissions.canDelete,
                            isDraft: false
                        });
                    }
                });
            }

            // Process range entries for the selected month
            if (rangeResponse.data) {
                rangeResponse.data.forEach(range => {
                    if (range.workEntries) {
                        range.workEntries.forEach(entry => {
                            const date = new Date(entry.date);
                            if (date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear) {
                                monthlyEntries.push({
                                    id: entry.id,
                                    date: entry.date,
                                    workType: entry.workType,
                                    workTypeId: entry.workType?.id,
                                    workedHours: entry.workedHours,
                                    driverId: entry.driverId,
                                    driverName: entry.driverName,
                                    type: 'range',
                                    rangeId: range.id,
                                    canEdit: false,
                                    canDelete: false,
                                    isDraft: false
                                });
                            }
                        });
                    }
                });
            }

            // Sort by date, then by ID to ensure consistent ordering
            monthlyEntries.sort((a, b) => {
                const dateComparison = new Date(a.date) - new Date(b.date);
                if (dateComparison === 0) {
                    return a.id.toString().localeCompare(b.id.toString());
                }
                return dateComparison;
            });

            setSarkyData(monthlyEntries);
        } catch (err) {
            console.error('Error fetching monthly sarky:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateBulkEntries = () => {
        if (!dateRange.start || !dateRange.end) {
            showError("Please select both start and end dates");
            return;
        }

        if (!bulkDefaults.workTypeId || !bulkDefaults.driverId) {
            showError("Please select default work type and driver");
            return;
        }

        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const newEntries = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            const existingEntry = sarkyData.find(entry => entry.date === dateString);

            if (!existingEntry) {
                newEntries.push({
                    id: `temp-${Date.now()}-${d.getTime()}`,
                    date: dateString,
                    workTypeId: bulkDefaults.workTypeId,
                    workedHours: bulkDefaults.workedHours,
                    driverId: bulkDefaults.driverId,
                    driverName: drivers.find(d => d.id === bulkDefaults.driverId)?.fullName || '',
                    workType: workTypes.find(wt => wt.id === bulkDefaults.workTypeId),
                    type: 'draft',
                    canEdit: permissions.canEdit,
                    canDelete: permissions.canDelete,
                    isNew: true,
                    isDraft: true
                });
            }
        }

        if (newEntries.length === 0) {
            showError("All selected dates already have entries");
            return;
        }

        setSarkyData(prev => [...prev, ...newEntries].sort((a, b) => new Date(a.date) - new Date(b.date)));
        setDateRange({ start: '', end: '' });
        setShowBulkTools(false);
        showSuccess(`Generated ${newEntries.length} work entries`);
    };

    const updateSarkyEntry = (entryId, field, value) => {
        setSarkyData(prevData =>
            prevData.map(entry => {
                if (entry.id === entryId) {
                    const updatedEntry = { ...entry, [field]: value };

                    // Update related fields when driver or work type changes
                    if (field === 'driverId') {
                        const driver = drivers.find(d => d.id === parseInt(value));
                        updatedEntry.driverName = driver?.fullName || '';
                    }

                    if (field === 'workTypeId') {
                        const workType = workTypes.find(wt => wt.id === parseInt(value));
                        updatedEntry.workType = workType;
                    }

                    return updatedEntry;
                }
                return entry;
            })
        );
    };

    // Helper function to extract meaningful error messages
    const getErrorMessage = (error) => {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        if (error.response?.data && typeof error.response.data === 'string') {
            return error.response.data;
        }

        if (error.code === 'NETWORK_ERROR' || !error.response) {
            return "Network error. Please check your connection and try again.";
        }

        if (error.response?.status === 400) {
            return error.response.data?.message || "Invalid data provided. Please check your inputs.";
        }

        if (error.response?.status === 403) {
            return "You don't have permission to perform this action.";
        }

        if (error.response?.status === 404) {
            return "The requested resource was not found.";
        }

        if (error.response?.status >= 500) {
            return "Server error. Please try again later or contact support.";
        }

        return error.message || "An error occurred. Please try again.";
    };

    const saveSarkyEntry = async (entry) => {
        if (!entry.workTypeId || !entry.workedHours || !entry.driverId) {
            showError("Please fill in all required fields: Work Type, Hours, and Driver");
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("workType", entry.workTypeId);
            formData.append("workedHours", entry.workedHours);
            formData.append("date", entry.date);
            formData.append("driver", entry.driverId);

            if (entry.isNew) {
                // Create new entry
                const response = await sarkyService.create(equipmentId, formData);

                // Update the entry with the real ID from the server
                setSarkyData(prevData =>
                    prevData.map(e =>
                        e.id === entry.id
                            ? {
                                ...e,
                                id: response.data.id,
                                type: 'single',
                                isNew: false,
                                isDraft: false
                            }
                            : e
                    )
                );

                showSuccess("Work entry saved successfully");
            } else {
                // Update existing entry
                await sarkyService.update(entry.id, formData);

                // Update the entry to mark as not draft
                setSarkyData(prevData =>
                    prevData.map(e =>
                        e.id === entry.id
                            ? { ...e, isDraft: false }
                            : e
                    )
                );

                showSuccess("Work entry updated successfully");
            }

            // Notify dashboard to refresh
            notifyDataChange();
        } catch (error) {
            console.error("Error saving sarky entry:", error);
            const errorMessage = getErrorMessage(error);
            showError(`Failed to save work entry: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const saveAllEntries = async () => {
        const editableEntries = sarkyData.filter(entry =>
            entry.canEdit &&
            entry.workTypeId &&
            entry.workedHours &&
            entry.driverId
        );

        if (editableEntries.length === 0) {
            showError("No entries to save. Please fill in all required fields for at least one entry.");
            return;
        }

        setSavingAll(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const entry of editableEntries) {
                try {
                    const formData = new FormData();
                    formData.append("workType", entry.workTypeId);
                    formData.append("workedHours", entry.workedHours);
                    formData.append("date", entry.date);
                    formData.append("driver", entry.driverId);

                    if (entry.isNew) {
                        const response = await sarkyService.create(equipmentId, formData);

                        setSarkyData(prevData =>
                            prevData.map(e =>
                                e.id === entry.id
                                    ? {
                                        ...e,
                                        id: response.data.id,
                                        type: 'single',
                                        isNew: false,
                                        isDraft: false
                                    }
                                    : e
                            )
                        );
                    } else {
                        await sarkyService.update(entry.id, formData);

                        setSarkyData(prevData =>
                            prevData.map(e =>
                                e.id === entry.id
                                    ? { ...e, isDraft: false }
                                    : e
                            )
                        );
                    }

                    successCount++;
                } catch (error) {
                    console.error(`Error saving entry for ${entry.date}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0 && errorCount === 0) {
                showSuccess(`Successfully saved all ${successCount} entries`);
            } else if (successCount > 0 && errorCount > 0) {
                showError(`Saved ${successCount} entries, but ${errorCount} failed to save`);
            } else {
                showError(`Failed to save all ${errorCount} entries`);
            }

            if (successCount > 0) {
                notifyDataChange();
            }
        } catch (error) {
            console.error("Error in bulk save operation:", error);
            const errorMessage = getErrorMessage(error);
            showError(`Failed to save entries: ${errorMessage}`);
        } finally {
            setSavingAll(false);
        }
    };

    const addSingleEntry = () => {
        // Fix: Create date string without timezone conversion
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const newEntry = {
            id: `temp-${Date.now()}`,
            date: dateString,
            workTypeId: bulkDefaults.workTypeId || (workTypes[0]?.id || ''),
            workedHours: 8.0,
            driverId: bulkDefaults.driverId || equipmentData?.mainDriverId || '',
            driverName: drivers.find(d => d.id === (bulkDefaults.driverId || equipmentData?.mainDriverId))?.fullName || '',
            workType: workTypes.find(wt => wt.id === (bulkDefaults.workTypeId || workTypes[0]?.id)),
            type: 'draft',
            canEdit: permissions.canEdit,
            canDelete: permissions.canDelete,
            isNew: true,
            isDraft: true
        };

        setSarkyData(prev => [...prev, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date)));
        showSuccess("Added new work entry for today");
    };

    const duplicateEntry = (entry) => {
        // Fix: Create date string without timezone conversion
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const newEntry = {
            ...entry,
            id: `temp-${Date.now()}`,
            date: dateString,
            isNew: true,
            isDraft: true
        };
        setSarkyData(prev => [...prev, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date)));
        showSuccess("Entry duplicated");
    };

    const removeEntry = (entryId) => {
        setSarkyData(prev => prev.filter(entry => entry.id !== entryId));
        showSuccess("Entry removed");
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateString = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getSarkySummary = () => {
        if (!sarkyData.length) return { completed: 0, draft: 0, total: 0, totalHours: 0 };

        const summary = {
            completed: sarkyData.filter(s => !s.isDraft && (s.type === 'single' || s.type === 'range')).length,
            draft: sarkyData.filter(s => s.isDraft || s.type === 'draft').length,
            totalHours: sarkyData.reduce((sum, s) => sum + (parseFloat(s.workedHours) || 0), 0)
        };

        summary.total = sarkyData.length;
        return summary;
    };

    const getSaveableEntriesCount = () => {
        return sarkyData.filter(entry =>
            entry.canEdit &&
            entry.workTypeId &&
            entry.workedHours &&
            entry.driverId
        ).length;
    };

    // Generate matrix data for grid view
    const getMatrixData = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const matrixData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth - 1, day);
            const dateString = formatDateString(date);
            const dayEntries = sarkyData.filter(entry => entry.date === dateString);

            const rowData = {
                date: dateString,
                day,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isWeekend: date.getDay() === 5 || date.getDay() === 6,
                workTypes: {}
            };

            // Initialize all work types with 0 hours
            workTypes.forEach(workType => {
                rowData.workTypes[workType.id] = {
                    hours: 0,
                    entries: [],
                    hasEntry: false
                };
            });

            // Populate with actual entries
            dayEntries.forEach(entry => {
                if (entry.workTypeId && rowData.workTypes[entry.workTypeId]) {
                    rowData.workTypes[entry.workTypeId].hours += parseFloat(entry.workedHours) || 0;
                    rowData.workTypes[entry.workTypeId].entries.push(entry);
                    rowData.workTypes[entry.workTypeId].hasEntry = true;
                }
            });

            matrixData.push(rowData);
        }

        return matrixData;
    };

    // Add or update matrix entry
    const updateMatrixEntry = (dateString, workTypeId, hours) => {
        if (!hours || hours <= 0) {
            // Remove entries for this date/worktype combination
            setSarkyData(prev => prev.filter(entry =>
                !(entry.date === dateString && entry.workTypeId === workTypeId)
            ));
            return;
        }

        const existingEntry = sarkyData.find(entry =>
            entry.date === dateString && entry.workTypeId === workTypeId
        );

        if (existingEntry) {
            // Update existing entry
            updateSarkyEntry(existingEntry.id, 'workedHours', parseFloat(hours));
        } else {
            // Create new entry
            const newEntry = {
                id: `temp-${Date.now()}-${workTypeId}`,
                date: dateString,
                workTypeId: workTypeId,
                workedHours: parseFloat(hours),
                driverId: bulkDefaults.driverId || equipmentData?.mainDriverId || '',
                driverName: drivers.find(d => d.id === (bulkDefaults.driverId || equipmentData?.mainDriverId))?.fullName || '',
                workType: workTypes.find(wt => wt.id === workTypeId),
                type: 'draft',
                canEdit: permissions.canEdit,
                canDelete: permissions.canDelete,
                isNew: true,
                isDraft: true
            };
            setSarkyData(prev => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
        }
    };

    // Set driver for specific entries
    const setDriverForEntries = (dateString, workTypeId, driverId) => {
        const targetEntries = sarkyData.filter(entry =>
            entry.date === dateString && entry.workTypeId === workTypeId
        );

        targetEntries.forEach(entry => {
            updateSarkyEntry(entry.id, 'driverId', driverId);
        });
    };
    const getDaysInMonth = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            // Fix: Create date in local timezone to avoid timezone issues
            const date = new Date(selectedYear, selectedMonth - 1, day);
            const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entries = sarkyData.filter(entry => entry.date === dateString);

            days.push({
                day,
                date: dateString,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isWeekend: date.getDay() === 5 || date.getDay() === 6,
                hasEntry: entries.length > 0,
                isDraft: entries.some(e => e.isDraft || e.type === 'draft'),
                isCompleted: entries.some(e => !e.isDraft && (e.type === 'single' || e.type === 'range')),
                entryCount: entries.length
            });
        }

        return days;
    };

    const summary = getSarkySummary();
    const saveableCount = getSaveableEntriesCount();
    const calendarDays = getDaysInMonth();
    const matrixData = getMatrixData();

    if (!equipmentData) {
        return <div className="loading">Loading equipment data...</div>;
    }

    if (loading && !sarkyData.length) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
                <p>Loading monthly work data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>Error: {error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="sarky-attendance-container">
            {/* User Guide Modal */}
            {showUserGuide && (
                <div className="user-guide-overlay">
                    <div className="user-guide-modal">
                        <div className="user-guide-header">
                            <h2>Equipment Work Log - User Guide</h2>
                            <button
                                className="btn-close btn-close-danger"
                                onClick={() => setShowUserGuide(false)}
                                aria-label="Close user guide"
                            >
                            </button>
                        </div>
                        <div className="user-guide-content">
                            <div className="guide-section">
                                <h3><FaCalendarPlus /> Bulk Entry Workflow (Recommended)</h3>
                                <ol>
                                    <li><strong>Click "Bulk Add Days"</strong> to show the bulk entry tools</li>
                                    <li><strong>Select Date Range:</strong> Choose start and end dates (e.g., July 1-15)</li>
                                    <li><strong>Set Defaults:</strong> Choose common work type, hours, and driver</li>
                                    <li><strong>Click "Generate Days"</strong> to create entries for all days in range</li>
                                    <li><strong>Edit Individual Entries:</strong> Modify any entries that need different values</li>
                                    <li><strong>Save All:</strong> Click "Save All Changes" to save everything at once</li>
                                </ol>
                            </div>

                            <div className="guide-section">
                                <h3><FaPlus /> Single Entry Method</h3>
                                <ul>
                                    <li><strong>Add Today:</strong> Click "Add Single Day" for quick today entry</li>
                                    <li><strong>Calendar Click:</strong> Click any empty day in the calendar overview</li>
                                    <li><strong>Duplicate:</strong> Use the copy button to duplicate similar entries</li>
                                </ul>
                            </div>

                            <div className="guide-section">
                                <h3><FaTools /> Understanding Status Colors</h3>
                                <div className="status-examples">
                                    <div className="status-item completed">
                                        <FaCheck /> <strong>Green (Completed):</strong> Saved to database
                                    </div>
                                    <div className="status-item draft">
                                        <FaExclamationTriangle /> <strong>Orange (Draft):</strong> Not saved yet, needs attention
                                    </div>
                                    <div className="status-item empty">
                                        <span className="empty-indicator"></span> <strong>Gray (Empty):</strong> No work entry for this day
                                    </div>
                                </div>
                            </div>

                            <div className="guide-section">
                                <h3><FaClock /> Tips for Efficient Use</h3>
                                <ul>
                                    <li><strong>Weekly Batches:</strong> Process work logs weekly (e.g., Monday-Friday)</li>
                                    <li><strong>Use Defaults:</strong> Set common work type and main driver as defaults</li>
                                    <li><strong>Calendar Overview:</strong> Quickly see which days need attention</li>
                                    <li><strong>Save Frequently:</strong> Use "Save All" after making changes</li>
                                    <li><strong>Weekend Planning:</strong> Weekend days appear grayed out but can still have entries</li>
                                </ul>
                            </div>

                            <div className="guide-section">
                                <h3><FaUser /> Field Explanations</h3>
                                <ul>
                                    <li><strong>Work Type:</strong> Type of work performed (excavation, loading, etc.)</li>
                                    <li><strong>Hours:</strong> Total hours worked (can be decimal, e.g., 8.5)</li>
                                    <li><strong>Driver:</strong> Person operating the equipment that day</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="header-section">
                <div className="equipment-info">
                    <h1>Equipment Work Log</h1>
                    <p className="equipment-details">
                        {equipmentData.name} - {equipmentData.typeName || 'Unknown Type'}
                    </p>
                </div>

                <div className="header-controls">
                    <div className="month-year-selector">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="month-select"
                        >
                            {months.map(month => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="year-select"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="btn-primary btn-primary--small"
                        onClick={() => setShowUserGuide(true)}
                        title="Show User Guide"
                    >
                        <FaQuestionCircle />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-section">
                <div className="summary-card">
                    <div className="summary-icon">
                        <FaCalendarPlus />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Total Days</div>
                        <div className="summary-value">{summary.total}</div>
                    </div>
                </div>

                <div className="summary-card completed">
                    <div className="summary-icon">
                        <FaCheck />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Completed</div>
                        <div className="summary-value">{summary.completed}</div>
                    </div>
                </div>

                <div className="summary-card draft">
                    <div className="summary-icon">
                        <FaExclamationTriangle />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Draft</div>
                        <div className="summary-value">{summary.draft}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaClock />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Total Hours</div>
                        <div className="summary-value">{summary.totalHours.toFixed(1)}h</div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="admin-actions">
                <div className="action-group">
                    <div className="view-toggle">
                        <button
                            className={`btn-primary ${viewMode === 'calendar' ? '' : 'btn-primary--outline'}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            <FaCalendarPlus />
                            Calendar View
                        </button>
                        <button
                            className={`btn-primary ${viewMode === 'matrix' ? '' : 'btn-primary--outline'}`}
                            onClick={() => setViewMode('matrix')}
                        >
                            <FaTools />
                            Matrix View
                        </button>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={() => setShowBulkTools(!showBulkTools)}
                    >
                        {showBulkTools ? <FaChevronDown /> : <FaChevronRight />}
                        Bulk Add Days
                    </button>

                    {viewMode === 'calendar' && (
                        <button
                            className="btn-primary btn-primary--outline"
                            onClick={addSingleEntry}
                            disabled={!permissions.canCreate}
                        >
                            <FaPlus />
                            Add Single Day
                        </button>
                    )}
                </div>

                <div className="actions-right">
                    <button
                        className="btn-primary btn-primary--success"
                        onClick={saveAllEntries}
                        disabled={savingAll || saveableCount === 0 || !permissions.canEdit}
                    >
                        <FaSave />
                        {savingAll ? 'Saving...' : `Save All (${saveableCount})`}
                    </button>

                    <button className="btn-primary btn-primary--outline">
                        <FaDownload />
                        Export
                    </button>
                </div>
            </div>

            {/* Bulk Tools Panel */}
            {showBulkTools && (
                <div className="bulk-tools-panel">
                    <div className="bulk-tools-content">
                        <div className="bulk-field">
                            <label>From Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bulk-input"
                            />
                        </div>

                        <div className="bulk-field">
                            <label>To Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bulk-input"
                            />
                        </div>

                        <div className="bulk-field">
                            <label>Default Work Type</label>
                            <select
                                value={bulkDefaults.workTypeId}
                                onChange={(e) => setBulkDefaults(prev => ({ ...prev, workTypeId: parseInt(e.target.value) }))}
                                className="bulk-input"
                            >
                                <option value="">Select Work Type</option>
                                {workTypes.map(wt => (
                                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bulk-field">
                            <label>Default Hours</label>
                            <input
                                type="number"
                                value={bulkDefaults.workedHours}
                                onChange={(e) => setBulkDefaults(prev => ({ ...prev, workedHours: parseFloat(e.target.value) }))}
                                min="0.5"
                                step="0.5"
                                className="bulk-input"
                            />
                        </div>

                        <div className="bulk-field">
                            <label>Default Driver</label>
                            <select
                                value={bulkDefaults.driverId}
                                onChange={(e) => setBulkDefaults(prev => ({ ...prev, driverId: parseInt(e.target.value) }))}
                                className="bulk-input"
                            >
                                <option value="">Select Driver</option>
                                {drivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>{driver.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={generateBulkEntries}
                            disabled={!dateRange.start || !dateRange.end || !bulkDefaults.workTypeId || !bulkDefaults.driverId}
                        >
                            Generate Days
                        </button>
                    </div>
                </div>
            )}

            {/* Calendar Overview */}
            <div className="calendar-overview">
                <h3>Monthly Overview - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h3>
                <div className="calendar-grid">
                    <div className="calendar-header">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="calendar-day-header">{day}</div>
                        ))}
                    </div>
                    <div className="calendar-body">
                        {(() => {
                            const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
                            const paddingDays = Array.from({ length: firstDay }, (_, i) => (
                                <div key={`padding-${i}`} className="calendar-day empty"></div>
                            ));

                            return [
                                ...paddingDays,
                                ...calendarDays.map(day => (
                                    <div
                                        key={day.date}
                                        className={`calendar-day ${
                                            day.hasEntry
                                                ? day.isDraft
                                                    ? 'draft'
                                                    : 'completed'
                                                : day.isWeekend
                                                    ? 'weekend'
                                                    : 'available'
                                        }`}
                                        onClick={() => {
                                            if (!day.hasEntry && permissions.canCreate) {
                                                const newEntry = {
                                                    id: `temp-${Date.now()}`,
                                                    date: day.date,
                                                    workTypeId: bulkDefaults.workTypeId || (workTypes[0]?.id || ''),
                                                    workedHours: 8.0,
                                                    driverId: bulkDefaults.driverId || equipmentData?.mainDriverId || '',
                                                    driverName: drivers.find(d => d.id === (bulkDefaults.driverId || equipmentData?.mainDriverId))?.fullName || '',
                                                    workType: workTypes.find(wt => wt.id === (bulkDefaults.workTypeId || workTypes[0]?.id)),
                                                    type: 'draft',
                                                    canEdit: permissions.canEdit,
                                                    canDelete: permissions.canDelete,
                                                    isNew: true,
                                                    isDraft: true
                                                };
                                                setSarkyData(prev => [...prev, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date)));
                                                showSuccess(`Added work entry for ${formatDate(day.date)}`);
                                            }
                                        }}
                                        title={day.hasEntry ? `${day.entryCount} entries` : 'Click to add entry'}
                                    >
                                        <div className="day-content">
                                            <span className="day-number">{day.day}</span>
                                            {day.entryCount > 0 && (
                                                <span className="entry-count">{day.entryCount}</span>
                                            )}
                                            {day.hasEntry && (
                                                <div className="day-entries">
                                                    {sarkyData
                                                        .filter(entry => entry.date === day.date)
                                                        .slice(0, 2) // Show only first 2 entries
                                                        .map((entry, index) => (
                                                            <div
                                                                key={entry.id}
                                                                className={`entry-preview ${entry.isDraft || entry.type === 'draft' ? 'draft' : 'completed'}`}
                                                                title={`${entry.workType?.name || 'Unknown'} - ${entry.workedHours}h`}
                                                            >
                                                                <span className="entry-text">
                                                                    {entry.workType?.name?.substring(0, 8) || 'Unknown'}
                                                                    {entry.workType?.name?.length > 8 ? '...' : ''}
                                                                </span>
                                                                <span className="entry-hours">{entry.workedHours}h</span>
                                                            </div>
                                                        ))
                                                    }
                                                    {day.entryCount > 2 && (
                                                        <div className="more-entries">
                                                            +{day.entryCount - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ];
                        })()}
                    </div>
                </div>
                <div className="calendar-legend">
                    <div className="legend-item">
                        <div className="legend-color completed"></div>
                        <span>Completed</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color draft"></div>
                        <span>Draft</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color empty"></div>
                        <span>No Entry</span>
                    </div>
                </div>
            </div>

            {/* Work Entries Table */}
            <div className="entries-section">
                <div className="entries-header">
                    <h3>Work Entries</h3>
                    {sarkyData.length > 0 && (
                        <p className="entries-subtitle">
                            {sarkyData.length} entries • {summary.completed} completed • {summary.draft} draft
                        </p>
                    )}
                </div>

                {sarkyData.length > 0 ? (
                    <div className="entries-table-container">
                        <table className="entries-table">
                            <thead>
                            <tr>
                                <th>Date</th>
                                <th>Work Type</th>
                                <th>Hours</th>
                                <th>Driver</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sarkyData.map((entry) => (
                                <tr
                                    key={entry.id}
                                    className={`entry-row ${entry.isDraft || entry.type === 'draft' ? 'draft' : 'completed'}`}
                                >
                                    <td className="date-cell">
                                        <div className="date-info">
                                            <span className="date-text">{formatDate(entry.date)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {entry.canEdit ? (
                                            <select
                                                value={entry.workTypeId || ''}
                                                onChange={(e) => updateSarkyEntry(entry.id, 'workTypeId', parseInt(e.target.value))}
                                                className="table-select"
                                            >
                                                <option value="">Select Work Type</option>
                                                {workTypes.map(wt => (
                                                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span>{entry.workType?.name || 'Unknown'}</span>
                                        )}
                                    </td>
                                    <td>
                                        {entry.canEdit ? (
                                            <input
                                                type="number"
                                                value={entry.workedHours || ''}
                                                onChange={(e) => updateSarkyEntry(entry.id, 'workedHours', parseFloat(e.target.value))}
                                                min="0.5"
                                                step="0.5"
                                                className="table-input hours-input"
                                            />
                                        ) : (
                                            <span>{entry.workedHours}h</span>
                                        )}
                                    </td>
                                    <td>
                                        {entry.canEdit ? (
                                            <select
                                                value={entry.driverId || ''}
                                                onChange={(e) => updateSarkyEntry(entry.id, 'driverId', parseInt(e.target.value))}
                                                className="table-select"
                                            >
                                                <option value="">Select Driver</option>
                                                {drivers.map(driver => (
                                                    <option key={driver.id} value={driver.id}>
                                                        {driver.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span>{entry.driverName}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="status-cell">
                                                <span className={`status-badge ${entry.isDraft || entry.type === 'draft' ? 'inactive' : 'active'}`}>
                                                    {entry.isDraft || entry.type === 'draft' ? (
                                                        <>
                                                            <FaExclamationTriangle />
                                                            Draft
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaCheck />
                                                            Completed
                                                        </>
                                                    )}
                                                </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            {entry.canEdit && (
                                                <button
                                                    className="btn-primary btn-primary--small"
                                                    onClick={() => saveSarkyEntry(entry)}
                                                    disabled={!entry.workTypeId || !entry.workedHours || !entry.driverId}
                                                    title="Save Entry"
                                                >
                                                    <FaSave />
                                                </button>
                                            )}
                                            <button
                                                className="btn-primary btn-primary--small btn-primary--outline"
                                                onClick={() => duplicateEntry(entry)}
                                                title="Duplicate Entry"
                                            >
                                                <FaCopy />
                                            </button>
                                            {entry.canDelete && (
                                                <button
                                                    className="btn-close btn-close-sm"
                                                    onClick={() => removeEntry(entry.id)}
                                                    title="Remove Entry"
                                                >
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-entries">
                        <div className="no-entries-icon">
                            <FaCalendarPlus />
                        </div>
                        <h3>No work entries yet</h3>
                        <p>Start by adding work days using the "Bulk Add Days" feature above.</p>
                        <button
                            className="btn-primary"
                            onClick={() => setShowBulkTools(true)}
                        >
                            <FaPlus />
                            Add Work Days
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default SarkyAttendance;