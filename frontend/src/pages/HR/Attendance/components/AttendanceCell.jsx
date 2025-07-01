import React, { useState, useRef, useEffect } from 'react';
import { FaClock, FaEdit } from 'react-icons/fa';
// import './AttendanceCell.scss';

const AttendanceCell = ({ day, attendance, contractType, onUpdate, isExpanded }) => {
    const [isEditing, setIsEditing] = useState(false);
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

    // Close editor when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cellRef.current && !cellRef.current.contains(event.target)) {
                if (isEditing) {
                    handleSave();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, tempData]);

    const handleStatusChange = (newStatus) => {
        setTempData(prev => ({ ...prev, status: newStatus }));

        // Auto-save for simple status changes in DAILY contract
        if (contractType === 'DAILY') {
            const updates = { status: newStatus };
            onUpdate(updates);
            setIsEditing(false);
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
        setIsEditing(false);
    };

    const getStatusDisplay = () => {
        const statusConfig = statusOptions.find(opt => opt.value === (attendance?.status || 'ABSENT'));
        return statusConfig || statusOptions[1]; // Default to ABSENT
    };

    const renderCompactView = () => {
        const statusConfig = getStatusDisplay();
        const isWeekend = attendance?.dayType === 'WEEKEND';
        const isEditable = attendance?.isEditable !== false;
        // Determine if the day is in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison
        const cellDate = attendance?.date ? new Date(attendance.date) : null;
        if (cellDate) cellDate.setHours(0, 0, 0, 0);
        const isFuture = cellDate && cellDate > today;

        return (
            <div
                className={`attendance-cell ${statusConfig.color} ${isWeekend ? 'weekend' : ''} ${!isEditable || isFuture ? 'disabled' : ''} ${isFuture ? 'future' : ''}`}
                onClick={() => isEditable && !isEditing && !isFuture && setIsEditing(true)}
                title={statusConfig.label}
            >
                <span className="attendance-status-indicator">{statusConfig.label[0]}</span>
                {attendance?.notes && <span className="has-notes">*</span>}
                {renderExpandedInfo()}
            </div>
        );
    };

    const renderEditMode = () => {
        return (
            <div className="attendance-cell-editor" ref={cellRef}>
                <div className="editor-header">
                    <span className="day-label">Day {day}</span>
                    <button className="save-btn" onClick={handleSave}>Save</button>
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
        );
    };

    const renderExpandedInfo = () => {
        if (!isExpanded || !attendance) return null;

        return (
            <div className="expanded-info">
                {contractType === 'MONTHLY' && attendance.checkIn && (
                    <div className="time-info">
                        <FaClock size={10} />
                        <span>{attendance.checkIn} - {attendance.checkOut || '?'}</span>
                    </div>
                )}
                {contractType === 'HOURLY' && attendance.hoursWorked && (
                    <div className="hours-info">{attendance.hoursWorked}h</div>
                )}
            </div>
        );
    };

    if (isEditing) {
        return renderEditMode();
    }

    return (
        <>
            {renderCompactView()}
        </>
    );
};

export default AttendanceCell;