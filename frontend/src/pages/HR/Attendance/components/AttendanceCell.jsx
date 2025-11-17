import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';

const AttendanceCell = ({ day, attendance, contractType, onUpdate, isExpanded }) => {
    const [isSelected, setIsSelected] = useState(false);
    const [tempData, setTempData] = useState({
        status: attendance?.status || 'ABSENT',
        checkIn: attendance?.checkIn || '',
        checkOut: attendance?.checkOut || '',
        hoursWorked: attendance?.hoursWorked || '',
        notes: attendance?.notes || ''
    });
    const cellRef = useRef(null);

    const statusOptions = [
        { value: 'PRESENT', label: 'Present', color: 'present' },
        { value: 'ABSENT', label: 'Absent', color: 'absent' },
        { value: 'OFF', label: 'Off', color: 'off' },
        { value: 'ON_LEAVE', label: 'Leave', color: 'leave' },
        { value: 'LATE', label: 'Late', color: 'late' },
        { value: 'HALF_DAY', label: 'Half Day', color: 'half-day' }
    ];

    // Update tempData when attendance changes
    useEffect(() => {
        setTempData({
            status: attendance?.status || 'ABSENT',
            checkIn: attendance?.checkIn || '',
            checkOut: attendance?.checkOut || '',
            hoursWorked: attendance?.hoursWorked || '',
            notes: attendance?.notes || ''
        });
    }, [attendance]);

    // Close editor when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cellRef.current && !cellRef.current.contains(event.target)) {
                if (isSelected) {
                    setIsSelected(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSelected]);

    const handleCellClick = (e) => {
        e.stopPropagation();
        const isFuture = isFutureDay();
        const isEditable = attendance?.isEditable !== false;

        if (isEditable && !isFuture) {
            setIsSelected(!isSelected);
        }
    };

    const handleStatusChange = (newStatus) => {
        setTempData(prev => ({ ...prev, status: newStatus }));

        // Auto-save for simple status changes in DAILY contract
        if (contractType === 'DAILY') {
            const updates = { status: newStatus };
            onUpdate(updates);
            setIsSelected(false);
        }
    };

    const handleSave = () => {
        const updates = {
            status: tempData.status,
            notes: tempData.notes
        };

        // Add contract-specific fields
        if (contractType === 'MONTHLY' && (tempData.status === 'PRESENT' || tempData.status === 'LATE' || tempData.status === 'HALF_DAY')) {
            updates.checkIn = tempData.checkIn;
            updates.checkOut = tempData.checkOut;
        } else if (contractType === 'HOURLY' && tempData.status === 'PRESENT') {
            updates.hoursWorked = parseFloat(tempData.hoursWorked) || 0;
        }

        onUpdate(updates);
        setIsSelected(false);
    };

    const handleCancel = () => {
        // Reset to original values
        setTempData({
            status: attendance?.status || 'ABSENT',
            checkIn: attendance?.checkIn || '',
            checkOut: attendance?.checkOut || '',
            hoursWorked: attendance?.hoursWorked || '',
            notes: attendance?.notes || ''
        });
        setIsSelected(false);
    };

    const getStatusDisplay = () => {
        const statusConfig = statusOptions.find(opt => opt.value === (tempData.status || 'ABSENT'));
        return statusConfig || statusOptions[1]; // Default to ABSENT
    };

    // Determine if the day is in the future
    const isFutureDay = () => {
        if (!attendance?.date) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cellDate = new Date(attendance.date);
        cellDate.setHours(0, 0, 0, 0);

        return cellDate > today;
    };

    // Format time to 12-hour format
    const formatTime12Hour = (time24) => {
        if (!time24) return '';

        try {
            const [hours, minutes] = time24.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12;
            return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        } catch (error) {
            return time24;
        }
    };

    // Calculate worked hours from check-in/check-out times
    const calculateWorkedHours = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return null;

        try {
            const [inHour, inMin] = checkIn.split(':').map(Number);
            const [outHour, outMin] = checkOut.split(':').map(Number);

            const inMinutes = inHour * 60 + inMin;
            const outMinutes = outHour * 60 + outMin;

            let diffMinutes = outMinutes - inMinutes;
            if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shift

            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            return { hours, minutes, total: (diffMinutes / 60).toFixed(1) };
        } catch (error) {
            return null;
        }
    };

    const renderExpandedInfo = () => {
        if (!isExpanded || !attendance) return null;

        const isPresent = attendance.status === 'PRESENT' || attendance.status === 'LATE' || attendance.status === 'HALF_DAY';

        // For MONTHLY contract - show times and calculated hours
        if (contractType === 'MONTHLY' && isPresent && attendance.checkIn) {
            const workedHours = attendance.checkOut ? calculateWorkedHours(attendance.checkIn, attendance.checkOut) : null;

            return (
                <div className="expanded-info-clean">
                    <div className="time-display">
                        <span className="time-in">{formatTime12Hour(attendance.checkIn)}</span>
                        <span className="time-separator">→</span>
                        <span className="time-out">{attendance.checkOut ? formatTime12Hour(attendance.checkOut) : '–'}</span>
                    </div>
                    {workedHours && (
                        <div className="hours-total">
                            {workedHours.hours}h {workedHours.minutes > 0 && `${workedHours.minutes}m`}
                        </div>
                    )}
                </div>
            );
        }

        // For HOURLY contract - show hours worked
        if (contractType === 'HOURLY' && isPresent &&
            attendance.hoursWorked !== undefined &&
            attendance.hoursWorked !== null) {
            return (
                <div className="expanded-info-clean">
                    <div className="hours-total hourly">
                        {attendance.hoursWorked}h
                    </div>
                </div>
            );
        }

        return null;
    };

    const statusConfig = getStatusDisplay();
    const isWeekend = attendance?.dayType === 'WEEKEND';
    const isEditable = attendance?.isEditable !== false;
    const isFuture = isFutureDay();

    return (
        <div
            ref={cellRef}
            className={`attendance-cell ${statusConfig.color} ${isWeekend ? 'weekend' : ''} ${!isEditable || isFuture ? 'disabled' : ''} ${isFuture ? 'future' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={handleCellClick}
            title={isFuture ? 'Future date - cannot edit' : statusConfig.label}
        >
            <div className="cell-main-content">
                <span className="attendance-status-indicator">{statusConfig.label[0]}</span>
                {attendance?.notes && <span className="has-notes">*</span>}
                {renderExpandedInfo()}
            </div>

            {/* Edit Panel - Appears when selected */}
            {isSelected && (
                <div className="edit-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="edit-header">
                        <span className="day-label">Day {day}</span>
                        <div className="edit-actions">
                            <button
                                className="action-btn save-btn"
                                onClick={handleSave}
                                title="Save changes"
                            >
                                <FaCheck />
                            </button>
                            <button
                                className="action-btn cancel-btn"
                                onClick={handleCancel}
                                title="Cancel"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    <div className="status-options">
                        {statusOptions.map(option => (
                            <button
                                key={option.value}
                                className={`status-option ${option.color} ${tempData.status === option.value ? 'selected' : ''}`}
                                onClick={() => handleStatusChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/* Contract-specific inputs */}
                    {contractType === 'MONTHLY' && (tempData.status === 'PRESENT' || tempData.status === 'LATE' || tempData.status === 'HALF_DAY') && (
                        <div className="time-inputs">
                            <div className="input-group">
                                <label>Check In</label>
                                <input
                                    type="time"
                                    value={tempData.checkIn}
                                    onChange={(e) => setTempData(prev => ({ ...prev, checkIn: e.target.value }))}
                                />
                            </div>
                            <div className="input-group">
                                <label>Check Out</label>
                                <input
                                    type="time"
                                    value={tempData.checkOut}
                                    onChange={(e) => setTempData(prev => ({ ...prev, checkOut: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    {contractType === 'HOURLY' && tempData.status === 'PRESENT' && (
                        <div className="hours-input">
                            <label>Hours Worked</label>
                            <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={tempData.hoursWorked}
                                onChange={(e) => setTempData(prev => ({ ...prev, hoursWorked: e.target.value }))}
                                placeholder="Enter hours"
                            />
                        </div>
                    )}

                    <div className="notes-input">
                        <label>Notes</label>
                        <input
                            type="text"
                            value={tempData.notes}
                            onChange={(e) => setTempData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceCell;