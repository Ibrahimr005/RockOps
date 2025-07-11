import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { equipmentService } from '../../../services/equipmentService';
import { sarkyService } from '../../../services/sarkyService';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import './EquipmentSarkyMatrix.scss';

const EquipmentSarkyMatrix = forwardRef(({ equipmentId, onDataChange }, ref) => {
    const { showSuccess, showError } = useSnackbar();
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // State management
    const [viewMode, setViewMode] = useState('month'); // 'month', '15days', 'week'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [equipmentData, setEquipmentData] = useState(null);
    const [workTypes, setWorkTypes] = useState([]);
    const [drivers, setDrivers] = useState([]);
    
    // GLOBAL MATRIX DATA - preserves data across all view modes
    const [globalMatrixData, setGlobalMatrixData] = useState({});
    const [globalDeletedEntries, setGlobalDeletedEntries] = useState([]); // Track deleted entries
    
    const [selectedDriver, setSelectedDriver] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [existingEntries, setExistingEntries] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [showAddWorkType, setShowAddWorkType] = useState(false);
    const [newWorkTypeName, setNewWorkTypeName] = useState('');
    const [focusedCell, setFocusedCell] = useState(null);
    const [copiedValue, setCopiedValue] = useState(null);

    // File attachment state
    const [showFileModal, setShowFileModal] = useState(false);
    const [selectedTimeRange, setSelectedTimeRange] = useState(null);
    const [timeRangeFiles, setTimeRangeFiles] = useState({});

    // Grid refs for keyboard navigation
    const gridRef = useRef({});

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
        refreshData: () => fetchExistingEntries()
    }));



    // Get date range based on view mode
    const getDateRange = () => {
        const start = new Date(selectedYear, selectedMonth - 1, 1);
        let end;

        switch (viewMode) {
            case 'week':
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case '15days':
                end = new Date(start);
                end.setDate(start.getDate() + 14);
                break;
            case 'month':
            default:
                end = new Date(selectedYear, selectedMonth, 0);
                break;
        }

        return { start, end };
    };

    // Generate dates array for the matrix
    const getDatesArray = () => {
        const { start, end } = getDateRange();
        const dates = [];
        const current = new Date(start);

        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    };

    // Check if a cell is blocked (future dates or no permissions)
    const isCellBlocked = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        return date > today || !permissions.canEdit;
    };

    // Get blocked cell message
    const getBlockedCellMessage = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        if (date > today) {
            return "Cannot add work for future dates";
        }
        if (!permissions.canEdit) {
            return "You don't have permission to edit work entries";
        }
        return "";
    };

    // Fetch equipment data and related info
    useEffect(() => {
        const fetchEquipmentData = async () => {
            try {
                const response = await equipmentService.getEquipmentById(equipmentId);
                setEquipmentData(response.data);

                // Set default driver
                if (response.data.mainDriverId) {
                    setSelectedDriver(response.data.mainDriverId);
                }

                // Fetch drivers
                if (response.data.typeId) {
                    const driversResponse = await equipmentService.getDriversForSarkyByEquipmentType(response.data.typeId);
                    setDrivers(driversResponse.data || []);

                    // Fetch supported work types
                    const workTypesResponse = await equipmentService.getSupportedWorkTypesForEquipmentType(response.data.typeId);
                    console.log("Fetched work types:", workTypesResponse.data);
                    setWorkTypes(workTypesResponse.data || []);
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

    // Re-initialize matrix when work types change
    useEffect(() => {
        if (workTypes.length > 0) {
            // Preserve global data when work types change
            initializeGlobalMatrixData(existingEntries);
        }
    }, [workTypes]);

    // Fetch existing entries when date range changes
    useEffect(() => {
        if (equipmentId) {
            fetchExistingEntries();
        }
    }, [equipmentId, selectedMonth, selectedYear]);

    const fetchExistingEntries = async () => {
        try {
            setLoading(true);
            
            // Fetch a broader range to preserve data across views
            const yearStart = new Date(selectedYear, 0, 1);
            const yearEnd = new Date(selectedYear, 11, 31);

            const response = await sarkyService.getByEquipmentDateRange(
                equipmentId,
                formatDateForAPI(yearStart),
                formatDateForAPI(yearEnd)
            );

            console.log("Fetched sarky entries:", response.data);

            // The API returns an array of entries
            const entries = Array.isArray(response.data) ? response.data : [];
            setExistingEntries(entries);

            // Initialize global matrix data with existing entries
            initializeGlobalMatrixData(entries);
        } catch (error) {
            console.error('Error fetching existing entries:', error);

            // If the date range endpoint fails, try fetching all entries
            try {
                const allEntriesResponse = await sarkyService.getByEquipment(equipmentId);
                console.log("Fetched all entries:", allEntriesResponse.data);

                const allEntries = Array.isArray(allEntriesResponse.data) ? allEntriesResponse.data : [];
                setExistingEntries(allEntries);
                initializeGlobalMatrixData(allEntries);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                showError('Failed to load existing work entries');
                setExistingEntries([]);
                initializeGlobalMatrixData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const initializeGlobalMatrixData = (entries) => {
        // Create a comprehensive date range for the entire year to preserve all data
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);
        const allDates = [];
        const current = new Date(yearStart);

        while (current <= yearEnd) {
            allDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        // Preserve existing global data and merge with new data
        const newGlobalData = { ...globalMatrixData };

        // Initialize all cells for the year
        allDates.forEach(date => {
            const dateKey = formatDateForAPI(date);
            if (!newGlobalData[dateKey]) {
                newGlobalData[dateKey] = {};
            }

            workTypes.forEach(workType => {
                if (!newGlobalData[dateKey][workType.id]) {
                    newGlobalData[dateKey][workType.id] = {
                        hours: 0,
                        driverId: selectedDriver || '',
                        isExisting: false,
                        originalValue: 0,
                        originalDriverId: selectedDriver || ''
                    };
                }
            });
        });

        // Populate with existing entries
        entries.forEach(entry => {
            const dateKey = entry.date;
            const workTypeId = entry.workType?.id || entry.workTypeId;

            // Only populate if the date and workType exist in our matrix
            if (newGlobalData[dateKey] && workTypes.find(wt => wt.id === workTypeId)) {
                if (!newGlobalData[dateKey][workTypeId]) {
                    newGlobalData[dateKey][workTypeId] = {};
                }

                console.log('Populating existing entry:', {
                    dateKey,
                    workTypeId,
                    workedHours: entry.workedHours,
                    driverId: entry.driverId,
                    entryId: entry.id
                });

                newGlobalData[dateKey][workTypeId] = {
                    hours: entry.workedHours || 0,
                    driverId: entry.driverId,
                    isExisting: true,
                    originalValue: entry.workedHours || 0,
                    originalDriverId: entry.driverId,
                    entryId: entry.id
                };
            }
        });

        console.log("Initialized global matrix data:", newGlobalData);
        setGlobalMatrixData(newGlobalData);
        setHasChanges(false);
    };

    // Get current view data from global data
    const getCurrentViewData = () => {
        const dates = getDatesArray();
        const viewData = {};

        dates.forEach(date => {
            const dateKey = formatDateForAPI(date);
            if (globalMatrixData[dateKey]) {
                viewData[dateKey] = globalMatrixData[dateKey];
            }
        });

        return viewData;
    };

    const formatDateForAPI = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateDisplay = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
    };

    const updateCell = (dateKey, workTypeId, value, driverId = null) => {
        // Fix: Proper number parsing - the issue is that single digits might be getting corrupted
        let numValue;
        if (value === '' || value === null || value === undefined) {
            numValue = 0;
        } else {
            // Convert to string first to ensure we're working with a clean value
            const cleanValue = String(value).trim();
            numValue = parseFloat(cleanValue);
            if (isNaN(numValue) || cleanValue === '') {
                numValue = 0;
            }
        }
        
        console.log(`🔄 UpdateCell called:`, {
            dateKey,
            workType: workTypes.find(wt => wt.id === workTypeId)?.name,
            inputValue: value,
            numValue,
            driverId
        });

        // Calculate the total hours for the day INCLUDING existing entries from database
        let dayTotal = 0;

        // Get all entries for this date from the database
        const existingEntriesForDate = existingEntries.filter(entry => entry.date === dateKey);

        // Add up all existing hours except for the one we're currently editing
        existingEntriesForDate.forEach(entry => {
            const entryWorkTypeId = entry.workType?.id || entry.workTypeId;
            // Don't count the current cell if it's an existing entry we're editing
            if (!(entryWorkTypeId === workTypeId && globalMatrixData[dateKey]?.[workTypeId]?.entryId === entry.id)) {
                dayTotal += entry.workedHours || 0;
            }
        });

        // Add hours from unsaved changes in the matrix (excluding current cell)
        Object.keys(globalMatrixData[dateKey] || {}).forEach(wtId => {
            if (wtId !== workTypeId) {
                const cellData = globalMatrixData[dateKey][wtId];
                // Only add if it's a new entry or a modified existing entry
                if (!cellData.isExisting || cellData.hours !== cellData.originalValue) {
                    dayTotal += cellData.hours || 0;
                }
            }
        });

        if (dayTotal + numValue > 24) {
            showError(`You cannot exceed 24 hours of work in one day. Current total for ${new Date(dateKey).toLocaleDateString()}: ${dayTotal.toFixed(1)}h, trying to add: ${numValue}h`);
            return;
        }

        setGlobalMatrixData(prev => {
            // Ensure the date key exists
            const prevDateData = prev[dateKey] || {};
            const existingCell = prevDateData[workTypeId] || {};
            const isNewCell = !existingCell.hasOwnProperty('hours') || existingCell.hours === undefined;
            const newDriverId = driverId !== null ? driverId : (existingCell.driverId || selectedDriver);
            
            const updatedCell = {
                hours: numValue,
                driverId: newDriverId,
                // For new cells, set original values to 0 and current driver
                // For existing cells, preserve the original values
                originalValue: isNewCell ? 0 : (existingCell.originalValue !== undefined ? existingCell.originalValue : 0),
                originalDriverId: isNewCell ? newDriverId : (existingCell.originalDriverId !== undefined ? existingCell.originalDriverId : newDriverId),
                isExisting: existingCell.isExisting || false,
                entryId: existingCell.entryId || null
            };
            
            console.log(`💾 Cell updated:`, {
                dateKey,
                workType: workTypes.find(wt => wt.id === workTypeId)?.name,
                inputValue: value,
                numValue,
                updatedCell,
                isNewCell
            });
            
            return {
                ...prev,
                [dateKey]: {
                    ...prevDateData,
                    [workTypeId]: updatedCell
                }
            };
        });
        setHasChanges(true);
    };

    const handleKeyDown = (e, dateKey, workTypeId, rowIndex, colIndex) => {
        const dates = getDatesArray();
        const numRows = dates.length;
        const numCols = workTypes.length;

        switch (e.key) {
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
                const nextRow = rowIndex;

                if (nextCol >= 0 && nextCol < numCols) {
                    const nextCell = gridRef.current[`${nextRow}-${nextCol}`];
                    nextCell?.focus();
                } else if (!e.shiftKey && rowIndex < numRows - 1) {
                    const nextCell = gridRef.current[`${rowIndex + 1}-0`];
                    nextCell?.focus();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (rowIndex > 0) {
                    const upCell = gridRef.current[`${rowIndex - 1}-${colIndex}`];
                    upCell?.focus();
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (rowIndex < numRows - 1) {
                    const downCell = gridRef.current[`${rowIndex + 1}-${colIndex}`];
                    downCell?.focus();
                }
                break;

            case 'ArrowLeft':
                if (e.target.selectionStart === 0) {
                    e.preventDefault();
                    if (colIndex > 0) {
                        const leftCell = gridRef.current[`${rowIndex}-${colIndex - 1}`];
                        leftCell?.focus();
                    }
                }
                break;

            case 'ArrowRight':
                if (e.target.selectionStart === e.target.value.length) {
                    e.preventDefault();
                    if (colIndex < numCols - 1) {
                        const rightCell = gridRef.current[`${rowIndex}-${colIndex + 1}`];
                        rightCell?.focus();
                    }
                }
                break;

            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setCopiedValue(globalMatrixData[dateKey][workTypeId]?.hours || 0);
                    showSuccess('Value copied');
                }
                break;

            case 'v':
                if ((e.ctrlKey || e.metaKey) && copiedValue !== null) {
                    e.preventDefault();
                    updateCell(dateKey, workTypeId, copiedValue);
                }
                break;

            case 'Delete':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Check if this is an existing entry that needs to be marked for deletion
                    const cellData = globalMatrixData[dateKey][workTypeId];
                    if (cellData?.isExisting && cellData.entryId) {
                        // Mark for deletion
                        setGlobalDeletedEntries(prev => [...prev, cellData.entryId]);
                        setHasChanges(true);
                    }
                    updateCell(dateKey, workTypeId, 0);
                }
                break;
        }
    };

    const handleSaveAll = useCallback(async () => {
        console.log('🚀 Save All Changes triggered');
        
        if (!hasChanges) {
            showError('No changes to save');
            return;
        }

        const entriesToSave = [];
        const entriesToDelete = [...globalDeletedEntries];
        
        // Get all dates from globalMatrixData (not just current view) to save any pending changes
        const allDateKeys = Object.keys(globalMatrixData);
        
        console.log(`🔍 Scanning ${allDateKeys.length} dates for changes...`);

        // Collect all entries that have hours > 0 or have been modified
        let totalScanned = 0;
        let entriesWithHours = 0;
        
        allDateKeys.forEach(dateKey => {
            if (!globalMatrixData[dateKey]) return; // Skip if no data for this date
            
            workTypes.forEach(workType => {
                totalScanned++;
                const cellData = globalMatrixData[dateKey][workType.id];
                
                if (!cellData) return; // Skip if no cell data
                
                if (cellData.hours > 0) {
                    entriesWithHours++;
                }
                
                // Entry needs saving if:
                // 1. It has hours > 0 AND (is new OR has changed hours OR has changed driver)
                // 2. It's an existing entry that changed to 0 hours (should be deleted)
                
                const hasHoursChanged = cellData.hours !== cellData.originalValue;
                const hasDriverChanged = cellData.isExisting && 
                    (cellData.driverId !== cellData.originalDriverId);
                const isNewEntry = !cellData.isExisting || !cellData.entryId;
                
                // Debug logging for all entries (both new and existing)
                if (cellData.hours > 0) {
                    console.log(`📝 Entry analysis:`, {
                        date: dateKey,
                        workType: workType.name,
                        isNewEntry,
                        hasHoursChanged,
                        hasDriverChanged,
                        hours: cellData.hours,
                        originalValue: cellData.originalValue,
                        driverId: cellData.driverId,
                        originalDriverId: cellData.originalDriverId,
                        isExisting: cellData.isExisting,
                        entryId: cellData.entryId,
                        willSave: isNewEntry || hasHoursChanged || hasDriverChanged
                    });
                }
                
                if (cellData.hours > 0 && (isNewEntry || hasHoursChanged || hasDriverChanged)) {
                    console.log(`➕ Adding to save queue:`, {
                        date: dateKey,
                        workType: workType.name,
                        hours: cellData.hours,
                        isUpdate: cellData.isExisting && cellData.entryId
                    });
                    entriesToSave.push({
                        date: dateKey,
                        workTypeId: workType.id,
                        workedHours: cellData.hours,
                        driverId: cellData.driverId || selectedDriver,
                        isUpdate: cellData.isExisting && cellData.entryId,
                        entryId: cellData.entryId
                    });
                } else if (cellData.isExisting && cellData.hours === 0 && cellData.originalValue > 0) {
                    // Existing entry set to 0 - mark for deletion
                    if (cellData.entryId && !entriesToDelete.includes(cellData.entryId)) {
                        entriesToDelete.push(cellData.entryId);
                    }
                }
            });
        });
        
        console.log(`📊 Scan complete:`, {
            totalScanned,
            entriesWithHours,
            entriesToSave: entriesToSave.length,
            entriesToDelete: entriesToDelete.length
        });

        console.log(`📊 Summary:`, {
            entriesToSave: entriesToSave.length,
            entriesToDelete: entriesToDelete.length,
            saveList: entriesToSave.map(e => ({ date: e.date, workType: workTypes.find(wt => wt.id === e.workTypeId)?.name, isUpdate: e.isUpdate })),
            deleteList: entriesToDelete
        });

        if (entriesToSave.length === 0 && entriesToDelete.length === 0) {
            showError('No entries to save or delete');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let deletedCount = 0;
        let failedEntries = [];

        try {
            // Process deletions first
            for (const entryId of entriesToDelete) {
                try {
                    console.log(`🗑️ Deleting entry:`, entryId);
                    await sarkyService.delete(entryId);
                    deletedCount++;
                } catch (error) {
                    failedEntries.push({
                        operation: 'delete',
                        id: entryId,
                        error: error.response?.data?.message || error.message
                    });
                }
            }

            // Process saves/updates
            for (const entry of entriesToSave) {
                try {
                    const formData = new FormData();
                    formData.append('workType', entry.workTypeId);
                    formData.append('workedHours', String(entry.workedHours)); // Ensure it's a string
                    formData.append('date', entry.date);
                    formData.append('driver', entry.driverId);

                    console.log(`📤 ${entry.isUpdate ? 'Updating' : 'Creating'} entry:`, {
                        entryId: entry.entryId,
                        workTypeId: entry.workTypeId,
                        workedHours: entry.workedHours,
                        workedHoursType: typeof entry.workedHours,
                        workedHoursString: String(entry.workedHours),
                        date: entry.date,
                        driverId: entry.driverId,
                        isUpdate: entry.isUpdate
                    });
                    
                    // Debug FormData contents
                    console.log('📋 FormData contents:');
                    for (let [key, value] of formData.entries()) {
                        console.log(`  ${key}: ${value} (${typeof value})`);
                    }

                    if (entry.isUpdate && entry.entryId) {
                        await sarkyService.update(entry.entryId, formData);
                    } else {
                        await sarkyService.create(equipmentId, formData);
                    }
                    successCount++;
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message;
                    failedEntries.push({
                        operation: entry.isUpdate ? 'update' : 'create',
                        date: entry.date,
                        workType: workTypes.find(wt => wt.id === entry.workTypeId)?.name,
                        error: errorMessage
                    });
                }
            }

            if ((successCount > 0 || deletedCount > 0) && failedEntries.length === 0) {
                const savedText = successCount > 0 ? `${successCount} entries saved` : '';
                const deletedText = deletedCount > 0 ? `${deletedCount} entries deleted` : '';
                const message = [savedText, deletedText].filter(Boolean).join(' and ');
                showSuccess(`✅ Successfully processed: ${message}`);
                setHasChanges(false);
                setGlobalDeletedEntries([]);
                await fetchExistingEntries();
                if (onDataChange) onDataChange();
            } else if ((successCount > 0 || deletedCount > 0) && failedEntries.length > 0) {
                showError(
                    `Processed ${successCount} saves and ${deletedCount} deletions, but ${failedEntries.length} operations failed:\n` +
                    failedEntries.map(f => `${f.operation}: ${f.date ? f.date + ' - ' + f.workType : f.id}: ${f.error}`).join('\n')
                );
            } else {
                showError('Failed to process all entries');
            }
        } catch (error) {
            showError('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    }, [globalMatrixData, workTypes, selectedDriver, globalDeletedEntries, existingEntries, equipmentId, showError, showSuccess, hasChanges, setSaving, setHasChanges, setGlobalDeletedEntries, fetchExistingEntries, onDataChange]);

    // Add Ctrl+S keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasChanges && !saving && permissions.canEdit) {
                    handleSaveAll();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [hasChanges, saving, permissions.canEdit, handleSaveAll]);

    const handleAddWorkType = async () => {
        if (!newWorkTypeName.trim()) {
            showError('Please enter a work type name');
            return;
        }

        try {
            // Create new work type
            const workTypeResponse = await workTypeService.create({
                name: newWorkTypeName.trim(),
                description: `Added from Sarky Matrix for ${equipmentData.name}`,
                active: true
            });

            const newWorkTypeId = workTypeResponse.data.id;

            // Add it to supported work types for this equipment type
            await equipmentService.addSupportedWorkTypesForEquipmentType(
                equipmentData.typeId,
                [newWorkTypeId]
            );

            // Refresh work types
            const workTypesResponse = await equipmentService.getSupportedWorkTypesForEquipmentType(equipmentData.typeId);
            setWorkTypes(workTypesResponse.data);

            // Update global matrix data to include new work type
            const updatedMatrix = { ...globalMatrixData };
            Object.keys(updatedMatrix).forEach(dateKey => {
                updatedMatrix[dateKey][newWorkTypeId] = {
                    hours: 0,
                    driverId: selectedDriver,
                    isExisting: false,
                    originalValue: 0,
                    originalDriverId: selectedDriver
                };
            });
            setGlobalMatrixData(updatedMatrix);

            setNewWorkTypeName('');
            setShowAddWorkType(false);
            showSuccess('Work type added successfully');
        } catch (error) {
            showError('Failed to add work type: ' + (error.response?.data?.message || error.message));
        }
    };

    // Handle file attachment for time ranges
    const handleTimeRangeClick = (timeRange) => {
        setSelectedTimeRange(timeRange);
        setShowFileModal(true);
    };

    const handleDeleteEntry = (dateKey, workTypeId) => {
        const cellData = globalMatrixData[dateKey]?.[workTypeId];
        if (cellData) {
            // If it's an existing entry, mark for deletion
            if (cellData.isExisting && cellData.entryId) {
                setGlobalDeletedEntries(prev => [...prev, cellData.entryId]);
            }
            // Clear the cell data
            updateCell(dateKey, workTypeId, 0);
            showSuccess('Entry marked for deletion');
        }
    };

    const calculateTotals = () => {
        const totals = {
            byWorkType: {},
            byDate: {},
            grand: 0
        };

        const currentViewData = getCurrentViewData();
        const dates = getDatesArray();

        // Calculate totals for current view
        dates.forEach(date => {
            const dateKey = formatDateForAPI(date);
            totals.byDate[dateKey] = 0;

            workTypes.forEach(workType => {
                const hours = currentViewData[dateKey]?.[workType.id]?.hours || 0;

                totals.byDate[dateKey] += hours;
                totals.byWorkType[workType.id] = (totals.byWorkType[workType.id] || 0) + hours;
                totals.grand += hours;
            });
        });

        return totals;
    };

    if (!equipmentData || loading) {
        return (
            <div className="sarky-matrix-loading">
                <div className="loader"></div>
                <p>Loading equipment data...</p>
            </div>
        );
    }

    const dates = getDatesArray();
    const totals = calculateTotals();
    const currentViewData = getCurrentViewData();

    return (
        <div className="sarky-matrix-container">
            {/* Header */}
            <div className="matrix-header">
                <div className="header-info">
                    <h2>Work Entry Matrix</h2>
                    <p>{equipmentData.name} - {equipmentData.typeName || 'Equipment'}</p>
                </div>

                <div className="header-controls">
                    <div className="view-toggle">
                        <button
                            className={viewMode === 'week' ? 'active' : ''}
                            onClick={() => setViewMode('week')}
                        >
                            Week
                        </button>
                        <button
                            className={viewMode === '15days' ? 'active' : ''}
                            onClick={() => setViewMode('15days')}
                        >
                            15 Days
                        </button>
                        <button
                            className={viewMode === 'month' ? 'active' : ''}
                            onClick={() => setViewMode('month')}
                        >
                            Month
                        </button>
                    </div>

                    <div className="date-selector">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                        
                        {/* File attachment button for time ranges */}
                        <button 
                            className="time-range-files-btn"
                            onClick={() => handleTimeRangeClick(`${selectedMonth}/${selectedYear}`)}
                            title="Attach files to this time period"
                        >
                            📎 Files ({Object.keys(timeRangeFiles).length})
                        </button>
                    </div>

                    <div className="driver-selector">
                        <label>Default Driver:</label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                        >
                            <option value="">Select Driver</option>
                            {drivers.map(driver => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Tips */}
            <div className="quick-tips">
                <span>💡 Tips:</span>
                <span>Tab/Enter to navigate</span>
                <span>Ctrl+C/V to copy/paste</span>
                <span>Ctrl+Delete to clear</span>
                <span>Ctrl+S to save</span>
            </div>

            {/* Matrix Table */}
            <div className="matrix-wrapper">
                <table className="sarky-matrix">
                    <thead>
                    <tr>
                        <th className="date-header">Date</th>
                        {workTypes.map(workType => (
                            <th key={workType.id} className="worktype-header">
                                {workType.name}
                            </th>
                        ))}
                        <th className="add-worktype-header">
                            <button
                                className="add-worktype-btn"
                                onClick={() => setShowAddWorkType(true)}
                                title="Add new work type"
                            >
                                + Type
                            </button>
                        </th>
                        <th className="total-header">Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {dates.map((date, rowIndex) => {
                        const dateKey = formatDateForAPI(date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isBlocked = isCellBlocked(new Date(date));
                        const blockedMessage = getBlockedCellMessage(new Date(date));

                        return (
                            <tr key={dateKey} className={`${isWeekend ? 'weekend' : ''} ${isBlocked ? 'blocked' : ''}`}>
                                <td className="date-cell">
                                    <div className="date-info">
                                        <span className="date-day">{date.getDate()}</span>
                                        <span className="date-weekday">
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                    </div>
                                </td>
                                {workTypes.map((workType, colIndex) => {
                                    const cellData = currentViewData[dateKey]?.[workType.id];
                                    const hasValue = cellData?.hours > 0;
                                    const cellDriverId = cellData?.driverId || selectedDriver;
                                    const isDefaultDriver = cellDriverId === selectedDriver;
                                    const driverName = drivers.find(d => d.id === cellDriverId)?.fullName || 'Unknown';
                                    


                                    return (
                                        <td key={workType.id} className="hours-cell">
                                            <div className="cell-content">
                                                <input
                                                    ref={el => gridRef.current[`${rowIndex}-${colIndex}`] = el}
                                                    type="number"
                                                    min="0"
                                                    max="24"
                                                    step="0.5"
                                                    value={cellData?.hours || ''}
                                                    onChange={(e) => updateCell(dateKey, workType.id, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, dateKey, workType.id, rowIndex, colIndex)}
                                                    onFocus={() => setFocusedCell({ date: dateKey, workType: workType.id })}
                                                    placeholder="0"
                                                    disabled={isBlocked}
                                                    className={`hours-input ${hasValue ? 'has-value' : ''} ${cellData?.isExisting ? 'existing' : ''} ${isBlocked ? 'blocked' : ''}`}
                                                    title={blockedMessage || `Enter hours for ${workType.name}`}
                                                />
                                                {hasValue && (
                                                    <div
                                                        className={`driver-indicator ${!isDefaultDriver ? 'custom-driver' : ''}`}
                                                        title={isDefaultDriver ? "Click to override default driver" : `Driver: ${driverName} (click to change)`}
                                                        onClick={(e) => {
                                                            if (!isBlocked && hasValue) {
                                                                e.stopPropagation();
                                                                const indicator = e.currentTarget;

                                                                // Check if dropdown already exists
                                                                const existingDropdown = document.querySelector('.driver-dropdown');
                                                                if (existingDropdown) {
                                                                    existingDropdown.remove();
                                                                }

                                                                const dropdown = document.createElement('div');
                                                                dropdown.className = 'driver-dropdown';

                                                                // Add header
                                                                const header = document.createElement('div');
                                                                header.className = 'dropdown-header';
                                                                header.textContent = 'Select Driver';
                                                                dropdown.appendChild(header);

                                                                // Add current driver info
                                                                const currentInfo = document.createElement('div');
                                                                currentInfo.className = 'current-driver-info';
                                                                currentInfo.textContent = `Current: ${driverName}`;
                                                                dropdown.appendChild(currentInfo);

                                                                // Add driver options
                                                                drivers.forEach(driver => {
                                                                    const option = document.createElement('div');
                                                                    option.className = 'driver-option';
                                                                    if (driver.id === cellDriverId) {
                                                                        option.classList.add('selected');
                                                                    }
                                                                    if (driver.id === selectedDriver && !isDefaultDriver) {
                                                                        option.classList.add('default');
                                                                    }

                                                                    option.textContent = driver.fullName;
                                                                    if (driver.id === selectedDriver && !isDefaultDriver) {
                                                                        option.textContent += ' (Default)';
                                                                    }

                                                                    option.addEventListener('click', (e) => {
                                                                        e.stopPropagation();
                                                                        updateCell(dateKey, workType.id, cellData.hours, driver.id);
                                                                        dropdown.remove();
                                                                    });

                                                                    dropdown.appendChild(option);
                                                                });

                                                                // Position and add dropdown
                                                                indicator.appendChild(dropdown);

                                                                // Close dropdown when clicking outside
                                                                const closeDropdown = (e) => {
                                                                    if (!dropdown.contains(e.target) && !indicator.contains(e.target)) {
                                                                        dropdown.remove();
                                                                        document.removeEventListener('click', closeDropdown);
                                                                    }
                                                                };

                                                                setTimeout(() => {
                                                                    document.addEventListener('click', closeDropdown);
                                                                }, 100);
                                                            }
                                                        }}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                        </svg>
                                                    </div>
                                                )}
                                                
                                                {/* Delete button for cells with values */}
                                                {hasValue && !isBlocked && (
                                                    <button
                                                        className="delete-entry-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!permissions?.canEdit) {
                                                                showError('You do not have permission to delete entries');
                                                                return;
                                                            }
                                                            handleDeleteEntry(dateKey, workType.id);
                                                        }}
                                                        title="Delete this entry"
                                                        type="button"
                                                        disabled={!permissions?.canEdit}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                                        </svg>
                                                    </button>
                                                )}
                                                
                                                {/* Blocked cell overlay */}
                                                {isBlocked && (
                                                    <div className="blocked-overlay" title={blockedMessage}>
                                                        🚫
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="empty-cell"></td>
                                <td className="total-cell">
                                    <span className="day-total">{totals.byDate[dateKey]?.toFixed(1) || '0'}</span>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                    <tfoot>
                    <tr className="totals-row">
                        <td className="total-label">Total Hours</td>
                        {workTypes.map(workType => (
                            <td key={workType.id} className="worktype-total">
                                {totals.byWorkType[workType.id]?.toFixed(1) || '0'}
                            </td>
                        ))}
                        <td className="empty-cell"></td>
                        <td className="grand-total">{totals.grand.toFixed(1)}</td>
                    </tr>
                    </tfoot>
                </table>
            </div>

            {/* Actions */}
            <div className="matrix-actions">
                <div className="changes-indicator">
                    {hasChanges && <span className="unsaved-changes">● Unsaved changes</span>}
                </div>
                <button
                    className="btn-save"
                    onClick={handleSaveAll}
                    disabled={!hasChanges || saving || !permissions.canEdit}
                >
                    {saving ? 'Saving...' : 'Save All Changes (Ctrl+S)'}
                </button>
            </div>

            {/* Add Work Type Modal */}
            {showAddWorkType && (
                <div className="modal-overlay" onClick={() => setShowAddWorkType(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Add New Work Type</h3>
                        <input
                            type="text"
                            value={newWorkTypeName}
                            onChange={(e) => setNewWorkTypeName(e.target.value)}
                            placeholder="Enter work type name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddWorkType();
                                if (e.key === 'Escape') setShowAddWorkType(false);
                            }}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setShowAddWorkType(false)}>Cancel</button>
                            <button onClick={handleAddWorkType} className="btn-primary">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Attachment Modal */}
            {showFileModal && (
                <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>File Attachments for {selectedTimeRange}</h3>
                        <p>Attach files to this time period (feature coming soon)</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowFileModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default EquipmentSarkyMatrix;