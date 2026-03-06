import React, {
    useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo
} from 'react';
import { equipmentService } from '../../../services/equipmentService';
import { sarkyService } from '../../../services/sarkyService';
import { workTypeService } from '../../../services/workTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import { documentService } from '../../../services/documentService';
import { getMonthLabel } from '../../../constants/documentTypes';
import SarkyDocumentModal from './SarkyDocumentModal';
import { Button } from '../../../components/common/Button';
import { FiPaperclip, FiUser, FiTrash2, FiPlus, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import './EquipmentSarkyMatrix.scss';

// ---------------------------------------------------------------------------
// DriverDropdown - contextual per-cell driver override
// ---------------------------------------------------------------------------
const DriverDropdown = ({
    cellDriverId,
    driverName,
    isMainDriver,
    drivers,
    onDriverChange,
    dateKey,
    workTypeId,
    onDropdownStateChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dropdownId = `${dateKey}-${workTypeId}`;

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (onDropdownStateChange) {
            onDropdownStateChange(dropdownId, dateKey, isOpen);
        }
    }, [isOpen, dropdownId, dateKey, onDropdownStateChange]);

    const handleDriverSelect = (driverId) => {
        onDriverChange(driverId);
        setIsOpen(false);
    };

    return (
        <div className="sarky-matrix-driver-dropdown-wrapper" ref={dropdownRef}>
            <div
                className={`sarky-matrix-driver-indicator ${!isMainDriver ? 'custom-driver' : ''}`}
                title={isMainDriver ? `Main driver: ${driverName}` : `Custom driver: ${driverName}`}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            >
                <FiUser size={12} />
            </div>

            {isOpen && (
                <div className="sarky-matrix-driver-dropdown">
                    <div className="dropdown-header">Select Driver</div>
                    <div className="current-driver-info">Current: {driverName}</div>
                    {drivers.map(driver => (
                        <div
                            key={driver.id}
                            className={`driver-option ${driver.id === cellDriverId ? 'selected' : ''}`}
                            onClick={() => handleDriverSelect(driver.id)}
                        >
                            <span>{driver.fullName}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// MONTH NAMES constant
// ---------------------------------------------------------------------------
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const EquipmentSarkyMatrix = forwardRef(({ equipmentId, onDataChange }, ref) => {
    const { showSuccess, showError, showConfirmation } = useSnackbar();
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // --- View state ---
    const [viewMode, setViewMode] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');

    // --- Core data ---
    const [equipmentData, setEquipmentData] = useState(null);
    const [workTypes, setWorkTypes] = useState([]);
    const [allWorkTypes, setAllWorkTypes] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [existingEntries, setExistingEntries] = useState([]);

    // --- Matrix data ---
    const [globalMatrixData, setGlobalMatrixData] = useState({});
    const [globalDeletedEntries, setGlobalDeletedEntries] = useState([]);
    const [changedCells, setChangedCells] = useState(new Set());

    // --- UI state ---
    const [loading, setLoading] = useState(false);
    const [showAddWorkType, setShowAddWorkType] = useState(false);
    const [newWorkTypeName, setNewWorkTypeName] = useState('');
    const [selectedExistingWorkType, setSelectedExistingWorkType] = useState('');
    const [workTypeSelectionMode, setWorkTypeSelectionMode] = useState('existing');
    const [copiedValue, setCopiedValue] = useState(null);
    const [activeDropdownRow, setActiveDropdownRow] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // --- Document state ---
    const [monthlyDocuments, setMonthlyDocuments] = useState([]);
    const [showSarkyDocumentModal, setShowSarkyDocumentModal] = useState(false);
    const [documentLoading, setDocumentLoading] = useState(false);

    // --- Auto-save state ---
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving' | 'error'
    const autoSaveTimerRef = useRef(null);
    const performSaveRef = useRef(null);

    // --- Grid refs ---
    const gridRef = useRef({});

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    const formatDateForAPI = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        return formatDateForAPI(new Date(date));
    };

    const isDrivable = equipmentData?.drivable === true;

    const isValidDriverId = useCallback((driverId) => {
        if (!isDrivable) return true;
        if (!driverId || driverId === '' || driverId === 'Select Driver') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(driverId);
    }, [isDrivable]);

    // ---------------------------------------------------------------------------
    // Date range logic
    // ---------------------------------------------------------------------------
    const getDateRange = useCallback(() => {
        if (viewMode === 'custom' && customFromDate && customToDate) {
            let start = new Date(customFromDate);
            let end = new Date(customToDate);
            if (start > end) [start, end] = [end, start];
            return { start, end };
        }
        const start = new Date(selectedYear, selectedMonth - 1, 1);
        const end = new Date(selectedYear, selectedMonth, 0);
        return { start, end };
    }, [viewMode, customFromDate, customToDate, selectedMonth, selectedYear]);

    const getDatesArray = useCallback(() => {
        const { start, end } = getDateRange();
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [getDateRange]);

    const isCellBlocked = useCallback((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d > today || !permissions.canEdit;
    }, [permissions.canEdit]);

    const isToday = useCallback((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    }, []);

    const getBlockedCellMessage = useCallback((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        if (d > today) return 'Cannot add work for future dates';
        if (!permissions.canEdit) return "You don't have permission to edit work entries";
        return '';
    }, [permissions.canEdit]);

    const validateCustomDateRange = useCallback(() => {
        if (viewMode !== 'custom') return true;
        if (!customFromDate || !customToDate) {
            showError('Please select both From and To dates');
            return false;
        }
        const from = new Date(customFromDate);
        const to = new Date(customToDate);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            showError('Please enter valid dates');
            return false;
        }
        const diffDays = Math.abs((to - from) / (1000 * 60 * 60 * 24));
        if (diffDays > 180) {
            showError('Custom date range cannot exceed 6 months');
            return false;
        }
        return true;
    }, [viewMode, customFromDate, customToDate, showError]);

    // ---------------------------------------------------------------------------
    // imperative handle
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
        refreshData: () => fetchExistingEntries()
    }));

    // ---------------------------------------------------------------------------
    // Navigation helpers for month mode
    // ---------------------------------------------------------------------------
    const goToPreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    // ---------------------------------------------------------------------------
    // Data fetching
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!equipmentId) return;
        const fetchEquipmentData = async () => {
            try {
                const response = await equipmentService.getEquipmentById(equipmentId);
                setEquipmentData(response.data);
                if (response.data.mainDriverId) {
                    setSelectedDriver(response.data.mainDriverId);
                }
                if (response.data.typeId) {
                    const [driversRes, workTypesRes, allWtRes] = await Promise.all([
                        equipmentService.getDriversForSarkyByEquipmentType(response.data.typeId),
                        equipmentService.getSupportedWorkTypesForEquipmentType(response.data.typeId),
                        workTypeService.getAll()
                    ]);
                    setDrivers(driversRes.data || []);
                    setWorkTypes(workTypesRes.data || []);
                    setAllWorkTypes(allWtRes.data || []);
                }
            } catch {
                showError('Failed to load equipment data');
            }
        };
        fetchEquipmentData();
    }, [equipmentId]);

    // Re-init matrix when work types change
    useEffect(() => {
        if (workTypes.length > 0) {
            initializeGlobalMatrixData(existingEntries);
        }
    }, [workTypes]);

    // Fetch entries when date range changes
    useEffect(() => {
        if (equipmentId) fetchExistingEntries();
    }, [equipmentId, selectedMonth, selectedYear, customFromDate, customToDate, viewMode]);

    // Load documents
    useEffect(() => {
        if (equipmentId) loadMonthlyDocuments();
    }, [selectedMonth, selectedYear, equipmentId]);

    const fetchExistingEntries = async () => {
        try {
            setLoading(true);
            const yearStart = new Date(selectedYear, 0, 1);
            const yearEnd = new Date(selectedYear, 11, 31);
            const response = await sarkyService.getByEquipmentDateRange(
                equipmentId, formatDateForAPI(yearStart), formatDateForAPI(yearEnd)
            );
            const entries = Array.isArray(response.data) ? response.data : [];
            setExistingEntries(entries);
            initializeGlobalMatrixData(entries);
        } catch {
            try {
                const fallback = await sarkyService.getByEquipment(equipmentId);
                const entries = Array.isArray(fallback.data) ? fallback.data : [];
                setExistingEntries(entries);
                initializeGlobalMatrixData(entries);
            } catch {
                showError('Failed to load work entries');
                setExistingEntries([]);
                initializeGlobalMatrixData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const initializeGlobalMatrixData = (entries) => {
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);
        const newData = {};
        const current = new Date(yearStart);

        while (current <= yearEnd) {
            const dateKey = formatDateForAPI(current);
            newData[dateKey] = {};
            const defaultDriverId = isDrivable ? (selectedDriver || '') : null;
            workTypes.forEach(wt => {
                newData[dateKey][wt.id] = {
                    hours: 0,
                    driverId: defaultDriverId,
                    isExisting: false,
                    originalValue: 0,
                    originalDriverId: defaultDriverId,
                    entryId: null
                };
            });
            current.setDate(current.getDate() + 1);
        }

        entries.forEach(entry => {
            const dateKey = entry.date;
            const workTypeId = entry.workType?.id || entry.workTypeId;
            if (newData[dateKey] && workTypes.find(wt => wt.id === workTypeId)) {
                newData[dateKey][workTypeId] = {
                    hours: entry.workedHours || 0,
                    driverId: entry.driverId,
                    isExisting: true,
                    originalValue: entry.workedHours || 0,
                    originalDriverId: entry.driverId,
                    entryId: entry.id
                };
            }
        });

        setGlobalMatrixData(newData);
        setChangedCells(new Set());
        setGlobalDeletedEntries([]);
        setSaveStatus('saved');
    };

    // ---------------------------------------------------------------------------
    // Current view data
    // ---------------------------------------------------------------------------
    const getCurrentViewData = useCallback(() => {
        const dates = getDatesArray();
        const viewData = {};
        dates.forEach(date => {
            const dateKey = formatDateForAPI(date);
            if (globalMatrixData[dateKey]) {
                viewData[dateKey] = globalMatrixData[dateKey];
            }
        });
        return viewData;
    }, [getDatesArray, globalMatrixData]);

    // ---------------------------------------------------------------------------
    // Cell update
    // ---------------------------------------------------------------------------
    const updateCell = useCallback((dateKey, workTypeId, value, driverId = null) => {
        let numValue;
        if (value === '' || value === null || value === undefined) {
            numValue = 0;
        } else {
            const cleanValue = String(value).trim();
            numValue = parseFloat(cleanValue);
            if (isNaN(numValue) || cleanValue === '') numValue = 0;
        }

        // Validate 24h cap
        let dayTotal = 0;
        const dateEntries = existingEntries.filter(e => e.date === dateKey);
        dateEntries.forEach(entry => {
            const entryWtId = entry.workType?.id || entry.workTypeId;
            if (!(entryWtId === workTypeId && globalMatrixData[dateKey]?.[workTypeId]?.entryId === entry.id)) {
                dayTotal += entry.workedHours || 0;
            }
        });
        Object.keys(globalMatrixData[dateKey] || {}).forEach(wtId => {
            if (wtId !== workTypeId) {
                const cell = globalMatrixData[dateKey][wtId];
                if (!cell.isExisting || cell.hours !== cell.originalValue) {
                    dayTotal += cell.hours || 0;
                }
            }
        });

        if (dayTotal + numValue > 24) {
            showError(`Cannot exceed 24 hours per day. Current: ${dayTotal.toFixed(1)}h, adding: ${numValue}h`);
            return;
        }

        setGlobalMatrixData(prev => {
            const prevDateData = prev[dateKey] || {};
            const existingCell = prevDateData[workTypeId] || {};
            const isNewCell = !existingCell.hasOwnProperty('hours') || existingCell.hours === undefined;
            const newDriverId = driverId !== null ? driverId :
                (!isDrivable ? null : (existingCell.driverId || selectedDriver || ''));

            return {
                ...prev,
                [dateKey]: {
                    ...prevDateData,
                    [workTypeId]: {
                        hours: numValue,
                        driverId: newDriverId,
                        originalValue: isNewCell ? 0 : (existingCell.originalValue ?? 0),
                        originalDriverId: isNewCell ? newDriverId : (existingCell.originalDriverId ?? newDriverId),
                        isExisting: existingCell.isExisting || false,
                        entryId: existingCell.entryId || null
                    }
                }
            };
        });

        const cellKey = `${dateKey}|${workTypeId}`;
        setChangedCells(prev => new Set(prev).add(cellKey));
        triggerAutoSave();
    }, [existingEntries, globalMatrixData, isDrivable, selectedDriver, showError]);

    // ---------------------------------------------------------------------------
    // Auto-save logic
    // ---------------------------------------------------------------------------
    const triggerAutoSave = useCallback(() => {
        setSaveStatus('unsaved');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            performSaveRef.current?.();
        }, 2000);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, []);

    const hasUnsavedChanges = changedCells.size > 0 || globalDeletedEntries.length > 0;

    const performSave = useCallback(async () => {
        // Gather entries to save from changed cells only
        const entriesToSave = [];
        const entriesToDelete = [...globalDeletedEntries];

        changedCells.forEach(cellKey => {
            const [dateKey, workTypeId] = cellKey.split('|');
            const cellData = globalMatrixData[dateKey]?.[workTypeId];
            if (!cellData) return;

            const hasHoursChanged = cellData.hours !== cellData.originalValue;
            const hasDriverChanged = cellData.isExisting && cellData.driverId !== cellData.originalDriverId;
            const isNewEntry = !cellData.isExisting || !cellData.entryId;

            if (cellData.hours > 0 && (isNewEntry || hasHoursChanged || hasDriverChanged)) {
                entriesToSave.push({
                    date: dateKey,
                    workTypeId,
                    workedHours: cellData.hours,
                    driverId: cellData.driverId || selectedDriver,
                    isUpdate: cellData.isExisting && !!cellData.entryId,
                    entryId: cellData.entryId
                });
            } else if (cellData.isExisting && cellData.hours === 0 && cellData.originalValue > 0) {
                if (cellData.entryId && !entriesToDelete.includes(cellData.entryId)) {
                    entriesToDelete.push(cellData.entryId);
                }
            }
        });

        if (entriesToSave.length === 0 && entriesToDelete.length === 0) {
            setSaveStatus('saved');
            setChangedCells(new Set());
            return;
        }

        // Validate drivers for drivable equipment
        if (isDrivable) {
            const missingDrivers = entriesToSave.filter(e => !isValidDriverId(e.driverId));
            if (missingDrivers.length > 0) {
                const details = missingDrivers.map(e => {
                    const wtName = workTypes.find(wt => wt.id === e.workTypeId)?.name || 'Unknown';
                    return `${new Date(e.date).toLocaleDateString()} - ${wtName}`;
                });
                showError(`Driver required for:\n${details.join('\n')}`);
                setSaveStatus('error');
                return;
            }
        }

        setSaveStatus('saving');
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        let successCount = 0;
        let deletedCount = 0;
        const failedEntries = [];

        try {
            // Deletions first
            for (const entryId of entriesToDelete) {
                try {
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

            // Saves / updates
            for (const entry of entriesToSave) {
                try {
                    const formData = new FormData();
                    formData.append('workType', entry.workTypeId);
                    formData.append('workedHours', String(entry.workedHours));
                    formData.append('date', entry.date);
                    if (isDrivable) {
                        formData.append('driver', entry.driverId || '');
                    }

                    if (entry.isUpdate && entry.entryId) {
                        await sarkyService.update(entry.entryId, formData);
                    } else {
                        await sarkyService.create(equipmentId, formData);
                    }
                    successCount++;
                } catch (error) {
                    failedEntries.push({
                        operation: entry.isUpdate ? 'update' : 'create',
                        date: entry.date,
                        workType: workTypes.find(wt => wt.id === entry.workTypeId)?.name,
                        error: error.response?.data?.message || error.message
                    });
                }
            }

            if (failedEntries.length === 0) {
                setSaveStatus('saved');
                setChangedCells(new Set());
                setGlobalDeletedEntries([]);
                // Silently refresh data without triggering loading state
                try {
                    const yearStart = new Date(selectedYear, 0, 1);
                    const yearEnd = new Date(selectedYear, 11, 31);
                    const response = await sarkyService.getByEquipmentDateRange(
                        equipmentId, formatDateForAPI(yearStart), formatDateForAPI(yearEnd)
                    );
                    const entries = Array.isArray(response.data) ? response.data : [];
                    setExistingEntries(entries);
                    initializeGlobalMatrixData(entries);
                } catch { /* silent refresh failure is ok */ }
                if (onDataChange) onDataChange();
            } else if (successCount > 0 || deletedCount > 0) {
                showError(
                    `Saved ${successCount}, deleted ${deletedCount}, but ${failedEntries.length} failed:\n` +
                    failedEntries.map(f => `${f.operation}: ${f.date || f.id} - ${f.error}`).join('\n')
                );
                setSaveStatus('error');
            } else {
                showError('Failed to save entries. Please try again.');
                setSaveStatus('error');
            }
        } catch {
            showError('An error occurred while saving');
            setSaveStatus('error');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalMatrixData, changedCells, globalDeletedEntries, workTypes, selectedDriver,
        isDrivable, isValidDriverId, equipmentId, showError, onDataChange, selectedYear]);

    // Keep ref in sync so triggerAutoSave always calls the latest performSave
    useEffect(() => {
        performSaveRef.current = performSave;
    }, [performSave]);

    // Ctrl+S manual save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && permissions.canEdit) {
                    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                    performSave();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, permissions.canEdit, performSave]);

    // ---------------------------------------------------------------------------
    // Keyboard navigation
    // ---------------------------------------------------------------------------
    const handleKeyDown = useCallback((e, dateKey, workTypeId, rowIndex, colIndex) => {
        const dates = getDatesArray();
        const numRows = dates.length;
        const numCols = workTypes.length;

        switch (e.key) {
            case 'Enter':
            case 'Tab': {
                e.preventDefault();
                const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
                if (nextCol >= 0 && nextCol < numCols) {
                    gridRef.current[`${rowIndex}-${nextCol}`]?.focus();
                } else if (!e.shiftKey && rowIndex < numRows - 1) {
                    gridRef.current[`${rowIndex + 1}-0`]?.focus();
                }
                break;
            }
            case 'ArrowUp':
                e.preventDefault();
                if (rowIndex > 0) gridRef.current[`${rowIndex - 1}-${colIndex}`]?.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (rowIndex < numRows - 1) gridRef.current[`${rowIndex + 1}-${colIndex}`]?.focus();
                break;
            case 'ArrowLeft':
                if (e.target.selectionStart === 0) {
                    e.preventDefault();
                    if (colIndex > 0) gridRef.current[`${rowIndex}-${colIndex - 1}`]?.focus();
                }
                break;
            case 'ArrowRight':
                if (e.target.selectionStart === e.target.value.length) {
                    e.preventDefault();
                    if (colIndex < numCols - 1) gridRef.current[`${rowIndex}-${colIndex + 1}`]?.focus();
                }
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setCopiedValue(globalMatrixData[dateKey]?.[workTypeId]?.hours || 0);
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
                    const cellData = globalMatrixData[dateKey]?.[workTypeId];
                    if (cellData?.isExisting && cellData.entryId) {
                        setGlobalDeletedEntries(prev => [...prev, cellData.entryId]);
                        triggerAutoSave();
                    }
                    updateCell(dateKey, workTypeId, 0);
                }
                break;
            default:
                break;
        }
    }, [getDatesArray, workTypes, globalMatrixData, copiedValue, updateCell, showSuccess, triggerAutoSave]);

    // ---------------------------------------------------------------------------
    // Delete entry
    // ---------------------------------------------------------------------------
    const handleDeleteEntry = useCallback((dateKey, workTypeId) => {
        const cellData = globalMatrixData[dateKey]?.[workTypeId];
        if (!cellData) return;
        if (cellData.isExisting && cellData.entryId) {
            setGlobalDeletedEntries(prev => [...prev, cellData.entryId]);
        }
        updateCell(dateKey, workTypeId, 0);
    }, [globalMatrixData, updateCell]);

    // ---------------------------------------------------------------------------
    // Dropdown z-index management
    // ---------------------------------------------------------------------------
    const handleDropdownStateChange = useCallback((dropdownId, dateKey, isOpen) => {
        if (isOpen) {
            setActiveDropdownRow(dateKey);
            setOpenDropdownId(dropdownId);
        } else if (openDropdownId === dropdownId) {
            setActiveDropdownRow(null);
            setOpenDropdownId(null);
        }
    }, [openDropdownId]);

    // ---------------------------------------------------------------------------
    // Documents
    // ---------------------------------------------------------------------------
    const loadMonthlyDocuments = async () => {
        if (!equipmentId) return;
        setDocumentLoading(true);
        try {
            const response = await documentService.getBySarkyMonth('equipment', equipmentId, selectedMonth, selectedYear);
            setMonthlyDocuments(response.data || []);
        } catch {
            // non-critical
        } finally {
            setDocumentLoading(false);
        }
    };

    const handleDocumentsChange = useCallback(() => {
        loadMonthlyDocuments();
    }, [selectedMonth, selectedYear, equipmentId]);

    // ---------------------------------------------------------------------------
    // Work Type management
    // ---------------------------------------------------------------------------
    const getAvailableWorkTypes = () => {
        return allWorkTypes.filter(wt => wt.active && !workTypes.find(existing => existing.id === wt.id));
    };

    const handleOpenWorkTypeModal = () => {
        if (getAvailableWorkTypes().length === 0) {
            setWorkTypeSelectionMode('new');
        } else {
            setWorkTypeSelectionMode('existing');
        }
        setShowAddWorkType(true);
    };

    const handleCloseWorkTypeModal = () => {
        setShowAddWorkType(false);
        setNewWorkTypeName('');
        setSelectedExistingWorkType('');
        setWorkTypeSelectionMode('existing');
    };

    const handleLinkExistingWorkType = async () => {
        if (!selectedExistingWorkType) {
            showError('Please select a work type to add');
            return;
        }
        try {
            await equipmentService.addSupportedWorkTypesForEquipmentType(equipmentData.typeId, [selectedExistingWorkType]);
            const res = await equipmentService.getSupportedWorkTypesForEquipmentType(equipmentData.typeId);
            setWorkTypes(res.data);
            handleCloseWorkTypeModal();
            showSuccess('Work type linked successfully');
        } catch {
            showError('Failed to link work type');
        }
    };

    const handleReactivateWorkType = async (workTypeName) => {
        try {
            const workTypeData = {
                name: newWorkTypeName.trim(),
                description: `Added from Sarky Matrix for ${equipmentData.name}`,
                active: true
            };
            const res = await workTypeService.reactivateByName(workTypeName, workTypeData);
            const newId = res.data.id;
            await equipmentService.addSupportedWorkTypesForEquipmentType(equipmentData.typeId, [newId]);
            const wtRes = await equipmentService.getSupportedWorkTypesForEquipmentType(equipmentData.typeId);
            setWorkTypes(wtRes.data);
            handleCloseWorkTypeModal();
            showSuccess(`Work type "${workTypeName}" reactivated successfully`);
        } catch {
            showError(`Failed to reactivate work type "${workTypeName}"`);
        }
    };

    const handleAddWorkType = async () => {
        if (workTypeSelectionMode === 'existing') {
            await handleLinkExistingWorkType();
            return;
        }
        if (!newWorkTypeName.trim()) {
            showError('Please enter a work type name');
            return;
        }
        try {
            const res = await workTypeService.create({
                name: newWorkTypeName.trim(),
                description: `Added from Sarky Matrix for ${equipmentData.name}`,
                active: true
            });
            const newId = res.data.id;
            await equipmentService.addSupportedWorkTypesForEquipmentType(equipmentData.typeId, [newId]);
            const wtRes = await equipmentService.getSupportedWorkTypesForEquipmentType(equipmentData.typeId);
            setWorkTypes(wtRes.data);
            handleCloseWorkTypeModal();
            showSuccess('Work type added successfully');
        } catch (error) {
            if (error.response?.status === 409) {
                const { conflictType, resourceName, isInactive } = error.response.data || {};
                if (isInactive) {
                    showConfirmation(
                        `Work type "${resourceName}" was previously deactivated. Reactivate it?`,
                        () => handleReactivateWorkType(resourceName),
                        () => showError('Please choose a different name.')
                    );
                } else {
                    showError(`Work type "${resourceName || newWorkTypeName.trim()}" already exists.`);
                }
            } else if (error.response?.status === 400) {
                showError('Invalid work type name. Please check your input.');
            } else if (error.response?.status === 403) {
                showError('You do not have permission to create work types.');
            } else {
                showError('Failed to add work type. Please try again.');
            }
        }
    };

    // ---------------------------------------------------------------------------
    // Totals calculation
    // ---------------------------------------------------------------------------
    const totals = useMemo(() => {
        const result = { byWorkType: {}, byDate: {}, grand: 0 };
        const dates = getDatesArray();
        const currentViewData = getCurrentViewData();
        dates.forEach(date => {
            const dateKey = formatDateForAPI(date);
            result.byDate[dateKey] = 0;
            workTypes.forEach(wt => {
                const hours = currentViewData[dateKey]?.[wt.id]?.hours || 0;
                result.byDate[dateKey] += hours;
                result.byWorkType[wt.id] = (result.byWorkType[wt.id] || 0) + hours;
                result.grand += hours;
            });
        });
        return result;
    }, [getDatesArray, getCurrentViewData, workTypes]);

    // ---------------------------------------------------------------------------
    // View mode switching
    // ---------------------------------------------------------------------------
    const handleViewModeChange = (newMode) => {
        setViewMode(newMode);
        if (newMode === 'custom' && (!customFromDate || !customToDate)) {
            const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
            const monthEnd = new Date(selectedYear, selectedMonth, 0);
            setCustomFromDate(formatDateForInput(monthStart));
            setCustomToDate(formatDateForInput(monthEnd));
        }
    };

    // ---------------------------------------------------------------------------
    // Auto-save status label
    // ---------------------------------------------------------------------------
    const autoSaveLabel = useMemo(() => {
        switch (saveStatus) {
            case 'saving': return 'Saving...';
            case 'unsaved': return 'Unsaved changes';
            case 'error': return 'Save failed';
            case 'saved':
            default: return 'All changes saved';
        }
    }, [saveStatus]);

    // ---------------------------------------------------------------------------
    // Excel Export
    // ---------------------------------------------------------------------------
    const exportToExcel = useCallback(() => {
        const dates = getDatesArray();
        const currentViewData = getCurrentViewData();
        const equipName = equipmentData?.name || equipmentData?.serialNumber || 'Equipment';
        const periodLabel = viewMode === 'month'
            ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
            : `${customFromDate} to ${customToDate}`;

        // Build header rows - two header rows for drivable: work type name + "Hours" / "Driver"
        const headers1 = ['Date', 'Day'];
        const headers2 = isDrivable ? ['', ''] : null;
        workTypes.forEach(wt => {
            if (isDrivable) {
                headers1.push(wt.name, '');
                headers2.push('Hours', 'Driver');
            } else {
                headers1.push(wt.name);
            }
        });
        headers1.push('Daily Total');
        if (isDrivable) headers2.push('');

        // Build data rows
        const rows = dates.map(date => {
            const dateKey = formatDateForAPI(date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            let dayTotal = 0;

            const row = [dateStr, dayName];

            workTypes.forEach(wt => {
                const cellData = currentViewData[dateKey]?.[wt.id];
                const hours = cellData?.hours || 0;
                dayTotal += hours;
                row.push(hours || '');
                if (isDrivable) {
                    const driverName = cellData?.driverId
                        ? (drivers.find(d => d.id === cellData.driverId)?.fullName || '')
                        : '';
                    row.push(hours > 0 ? driverName : '');
                }
            });
            row.push(dayTotal || '');

            return row;
        });

        // Build totals row
        const totalsRow = ['TOTAL', ''];
        workTypes.forEach(wt => {
            totalsRow.push(totals.byWorkType[wt.id] || 0);
            if (isDrivable) totalsRow.push('');
        });
        totalsRow.push(totals.grand);
        rows.push(totalsRow);

        // Create worksheet
        const infoRows = [
            [`Sarky Report - ${equipName}`],
            [`Period: ${periodLabel}`],
        ];
        if (isDrivable) {
            infoRows.push([`Main Driver: ${drivers.find(d => d.id === selectedDriver)?.fullName || 'N/A'}`]);
        }
        infoRows.push([]);

        const wsData = [
            ...infoRows,
            headers1,
            ...(headers2 ? [headers2] : []),
            ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Column widths
        const totalCols = headers1.length;
        const colWidths = [{ wch: 16 }, { wch: 6 }];
        workTypes.forEach(() => {
            if (isDrivable) {
                colWidths.push({ wch: 10 }, { wch: 18 });
            } else {
                colWidths.push({ wch: 14 });
            }
        });
        colWidths.push({ wch: 12 });
        ws['!cols'] = colWidths;

        // Merges
        const merges = [
            // Title and period rows span all columns
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        ];

        const headerRowStart = infoRows.length;
        if (isDrivable) {
            // Main driver info row merge
            merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } });
            // Merge "Date" across two header rows
            merges.push({ s: { r: headerRowStart, c: 0 }, e: { r: headerRowStart + 1, c: 0 } });
            // Merge "Day" across two header rows
            merges.push({ s: { r: headerRowStart, c: 1 }, e: { r: headerRowStart + 1, c: 1 } });
            // Merge each work type name across its Hours+Driver columns
            workTypes.forEach((_, i) => {
                const colStart = 2 + i * 2;
                merges.push({ s: { r: headerRowStart, c: colStart }, e: { r: headerRowStart, c: colStart + 1 } });
            });
            // Merge "Daily Total" across two header rows
            merges.push({ s: { r: headerRowStart, c: totalCols - 1 }, e: { r: headerRowStart + 1, c: totalCols - 1 } });
        }

        ws['!merges'] = merges;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sarky');
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = `Sarky_${equipName.replace(/[^a-zA-Z0-9]/g, '_')}_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [getDatesArray, getCurrentViewData, workTypes, totals, drivers, selectedDriver,
        isDrivable, equipmentData, viewMode, selectedMonth, selectedYear, customFromDate, customToDate]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    if (!equipmentData || loading) {
        return (
            <div className="sarky-matrix-loading">
                <div className="loader"></div>
                <p>Loading equipment data...</p>
            </div>
        );
    }

    const dates = getDatesArray();
    const currentViewData = getCurrentViewData();

    return (
        <div className="sarky-matrix-container">
            {/* Controls bar - single row */}
            <div className="sarky-matrix-controls">
                {/* View toggle */}
                <div className="sarky-matrix-view-toggle">
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => handleViewModeChange('month')}
                    >
                        Month
                    </button>
                    <button
                        className={viewMode === 'custom' ? 'active' : ''}
                        onClick={() => handleViewModeChange('custom')}
                    >
                        Custom
                    </button>
                </div>

                {/* Date selector */}
                <div className="sarky-matrix-date-selector">
                    {viewMode === 'custom' ? (
                        <>
                            <input
                                type="date"
                                value={customFromDate}
                                onChange={(e) => setCustomFromDate(e.target.value)}
                                max={formatDateForInput(new Date())}
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={customToDate}
                                onChange={(e) => setCustomToDate(e.target.value)}
                                max={formatDateForInput(new Date())}
                                min={customFromDate}
                            />
                        </>
                    ) : (
                        <>
                            <button className="nav-arrow" onClick={goToPreviousMonth} title="Previous month">
                                <FiChevronLeft size={18} />
                            </button>
                            <span className="month-label">
                                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                            </span>
                            <button className="nav-arrow" onClick={goToNextMonth} title="Next month">
                                <FiChevronRight size={18} />
                            </button>
                        </>
                    )}
                </div>

                {/* Attachments button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSarkyDocumentModal(true)}
                    disabled={documentLoading}
                    title={`Documents for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                >
                    <FiPaperclip size={14} />
                    <span>Files ({documentLoading ? '...' : monthlyDocuments.length})</span>
                </Button>

                {/* Driver selector (drivable only) */}
                {isDrivable && (
                    <div className="sarky-matrix-driver-selector">
                        <label>Driver:</label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                        >
                            <option value="">Select Driver</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.fullName}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Non-drivable indicator */}
                {!isDrivable && (
                    <span className="sarky-matrix-non-drivable-indicator">No Driver Required</span>
                )}

                {/* Add work type */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="sarky-matrix-add-worktype-btn"
                    onClick={handleOpenWorkTypeModal}
                    title="Add work type"
                >
                    <FiPlus size={14} />
                    <span>Add Type</span>
                </Button>

                {/* Export button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportToExcel}
                    title="Export to Excel"
                >
                    <FiDownload size={14} />
                    <span>Export</span>
                </Button>

                {/* Auto-save indicator */}
                <div className={`sarky-matrix-auto-save-indicator ${saveStatus}`}>
                    <span>{autoSaveLabel}</span>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="sarky-matrix-table-wrapper">
                <table className="sarky-matrix-table">
                    <thead>
                        <tr>
                            <th className="sarky-matrix-date-header">Date</th>
                            {workTypes.map(wt => (
                                <th key={wt.id} className="sarky-matrix-worktype-header">
                                    {wt.name}
                                    <span className="unit-label">(h)</span>
                                </th>
                            ))}
                            <th className="sarky-matrix-total-header">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dates.map((date, rowIndex) => {
                            const dateKey = formatDateForAPI(date);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const blocked = isCellBlocked(date);
                            const blockedMsg = getBlockedCellMessage(date);
                            const todayRow = isToday(date);
                            const isActiveRow = activeDropdownRow === dateKey;

                            const rowClasses = [
                                isWeekend ? 'sarky-matrix-weekend' : '',
                                blocked ? 'sarky-matrix-blocked' : '',
                                todayRow ? 'sarky-matrix-today' : '',
                                isActiveRow ? 'active-dropdown-row' : ''
                            ].filter(Boolean).join(' ');

                            return (
                                <tr key={dateKey} className={rowClasses}>
                                    <td className="sarky-matrix-date-cell">
                                        <span className="date-full">
                                            {date.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                ...(viewMode === 'custom' ? { year: 'numeric' } : {})
                                            })}
                                        </span>
                                        <span className="date-weekday">
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                    </td>
                                    {workTypes.map((wt, colIndex) => {
                                        const cellData = currentViewData[dateKey]?.[wt.id];
                                        const hasValue = cellData?.hours > 0;
                                        const cellDriverId = cellData?.driverId || selectedDriver;
                                        const isMainDriver = cellDriverId === equipmentData?.mainDriverId;
                                        const driverName = drivers.find(d => d.id === cellDriverId)?.fullName || 'Unknown';

                                        return (
                                            <td key={wt.id} className="sarky-matrix-hours-cell">
                                                <div className="cell-content">
                                                    <input
                                                        ref={el => { gridRef.current[`${rowIndex}-${colIndex}`] = el; }}
                                                        type="number"
                                                        min="0"
                                                        max="24"
                                                        step="0.5"
                                                        value={hasValue ? cellData.hours : ''}
                                                        onChange={(e) => updateCell(dateKey, wt.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key >= '0' && e.key <= '9' && e.target.value === '0') {
                                                                e.preventDefault();
                                                                updateCell(dateKey, wt.id, e.key);
                                                            } else {
                                                                handleKeyDown(e, dateKey, wt.id, rowIndex, colIndex);
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            if (e.target.value === '0' || e.target.value === '') {
                                                                e.target.value = '';
                                                                updateCell(dateKey, wt.id, '');
                                                            } else {
                                                                e.target.select();
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            if (e.target.value === '' || e.target.value === null) {
                                                                updateCell(dateKey, wt.id, 0);
                                                            }
                                                        }}
                                                        disabled={blocked}
                                                        className={[
                                                            'sarky-matrix-input',
                                                            hasValue ? 'sarky-matrix-input-has-value' : '',
                                                            cellData?.isExisting ? 'sarky-matrix-input-existing' : '',
                                                            blocked ? 'sarky-matrix-input-blocked' : ''
                                                        ].filter(Boolean).join(' ')}
                                                        title={blockedMsg || `Enter hours for ${wt.name}`}
                                                    />

                                                    {/* Driver name label under input */}
                                                    {hasValue && isDrivable && cellDriverId && (
                                                        <span className="sarky-matrix-driver-label" title={driverName}>
                                                            {driverName}
                                                        </span>
                                                    )}

                                                    {hasValue && !blocked && (
                                                        <div className="sarky-matrix-cell-actions">
                                                            {isDrivable && (
                                                                <DriverDropdown
                                                                    cellDriverId={cellDriverId}
                                                                    driverName={driverName}
                                                                    isMainDriver={isMainDriver}
                                                                    drivers={drivers}
                                                                    dateKey={dateKey}
                                                                    workTypeId={wt.id}
                                                                    onDriverChange={(did) => updateCell(dateKey, wt.id, cellData.hours, did)}
                                                                    onDropdownStateChange={handleDropdownStateChange}
                                                                />
                                                            )}

                                                            <button
                                                                className="sarky-matrix-delete-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!permissions?.canEdit) {
                                                                        showError('You do not have permission to delete entries');
                                                                        return;
                                                                    }
                                                                    handleDeleteEntry(dateKey, wt.id);
                                                                }}
                                                                title="Delete entry (Ctrl+Delete)"
                                                                type="button"
                                                                disabled={!permissions?.canEdit}
                                                            >
                                                                <FiTrash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="sarky-matrix-total-cell">
                                        {totals.byDate[dateKey]?.toFixed(1) || '0'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="sarky-matrix-totals-row">
                            <td>Total Hours</td>
                            {workTypes.map(wt => (
                                <td key={wt.id}>{totals.byWorkType[wt.id]?.toFixed(1) || '0'}</td>
                            ))}
                            <td className="grand-total">{totals.grand.toFixed(1)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Add Work Type Modal */}
            {showAddWorkType && (
                <div className="modal-overlay" onClick={handleCloseWorkTypeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Work Type</h3>
                        </div>
                        <div className="modal-body">
                            {/* Tab buttons */}
                            <div className="tab-buttons">
                                <button
                                    type="button"
                                    className={workTypeSelectionMode === 'existing' ? 'tab-active' : 'tab-inactive'}
                                    onClick={() => setWorkTypeSelectionMode('existing')}
                                >
                                    Link Existing
                                </button>
                                <button
                                    type="button"
                                    className={workTypeSelectionMode === 'new' ? 'tab-active' : 'tab-inactive'}
                                    onClick={() => setWorkTypeSelectionMode('new')}
                                >
                                    Create New
                                </button>
                            </div>

                            {workTypeSelectionMode === 'existing' ? (
                                <div className="form-group">
                                    <label htmlFor="existingWorkType">Select Work Type</label>
                                    <select
                                        id="existingWorkType"
                                        value={selectedExistingWorkType}
                                        onChange={(e) => setSelectedExistingWorkType(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddWorkType();
                                            if (e.key === 'Escape') handleCloseWorkTypeModal();
                                        }}
                                    >
                                        <option value="">-- Select a work type --</option>
                                        {getAvailableWorkTypes().map(wt => (
                                            <option key={wt.id} value={wt.id}>
                                                {wt.name}{wt.description ? ` - ${wt.description}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {getAvailableWorkTypes().length === 0 && (
                                        <p className="no-options-text">
                                            All work types are already linked.{' '}
                                            <button
                                                type="button"
                                                className="btn-link"
                                                onClick={() => setWorkTypeSelectionMode('new')}
                                            >
                                                Create a new one instead.
                                            </button>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label htmlFor="newWorkTypeName">Name</label>
                                    <input
                                        type="text"
                                        id="newWorkTypeName"
                                        value={newWorkTypeName}
                                        onChange={(e) => setNewWorkTypeName(e.target.value)}
                                        placeholder="e.g., Excavation, Transportation"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddWorkType();
                                            if (e.key === 'Escape') handleCloseWorkTypeModal();
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <Button variant="ghost" onClick={handleCloseWorkTypeModal}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleAddWorkType}
                                disabled={
                                    (workTypeSelectionMode === 'existing' && !selectedExistingWorkType) ||
                                    (workTypeSelectionMode === 'new' && !newWorkTypeName.trim())
                                }
                            >
                                {workTypeSelectionMode === 'existing' ? 'Link Work Type' : 'Create Work Type'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sarky Document Modal */}
            <SarkyDocumentModal
                isOpen={showSarkyDocumentModal}
                onClose={() => setShowSarkyDocumentModal(false)}
                equipmentId={equipmentId}
                equipmentName={equipmentData?.name || 'Equipment'}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onDocumentsChange={handleDocumentsChange}
            />
        </div>
    );
});

EquipmentSarkyMatrix.displayName = 'EquipmentSarkyMatrix';

export default EquipmentSarkyMatrix;
