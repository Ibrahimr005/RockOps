import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, User, MapPin, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const AttendanceModal = ({
                             isOpen,
                             onClose,
                             onSubmit,
                             employees,
                             initialData,
                             selectedDate,
                             loading
                         }) => {
    const [formData, setFormData] = useState({
        employeeId: '',
        date: '',
        contractType: 'MONTHLY',
        // Hourly fields
        checkInTime: '',
        checkOutTime: '',
        breakDurationMinutes: 0,
        // Daily fields
        dailyStatus: 'PRESENT',
        // Monthly fields
        status: 'PRESENT',
        // Common fields
        notes: '',
        location: '',
        latitude: null,
        longitude: null,
        isLeave: false,
        isHoliday: false
    });

    const [errors, setErrors] = useState({});
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            resetForm();
            if (initialData) {
                populateFormWithInitialData();
            } else {
                setDefaultValues();
            }
        }
    }, [isOpen, initialData, selectedDate]);

    // Update employee info when employeeId changes
    useEffect(() => {
        if (formData.employeeId) {
            const employee = employees.find(emp => emp.id === formData.employeeId);
            setSelectedEmployee(employee);

            if (employee?.jobPosition?.contractType) {
                setFormData(prev => ({
                    ...prev,
                    contractType: employee.jobPosition.contractType
                }));
            }
        } else {
            setSelectedEmployee(null);
        }
    }, [formData.employeeId, employees]);

    const resetForm = () => {
        setErrors({});
        setSelectedEmployee(null);
        setGettingLocation(false);
        setSubmitting(false);
    };

    const populateFormWithInitialData = () => {
        setFormData({
            employeeId: initialData.employeeId || '',
            date: initialData.date || selectedDate?.toISOString().split('T')[0] || '',
            contractType: initialData.contractType || 'MONTHLY',
            checkInTime: initialData.checkInTime || '',
            checkOutTime: initialData.checkOutTime || '',
            breakDurationMinutes: initialData.breakDurationMinutes || 0,
            dailyStatus: initialData.dailyStatus || 'PRESENT',
            status: initialData.status || 'PRESENT',
            notes: initialData.notes || '',
            location: initialData.location || '',
            latitude: initialData.latitude || null,
            longitude: initialData.longitude || null,
            isLeave: initialData.isLeave || false,
            isHoliday: initialData.isHoliday || false
        });

        const employee = employees.find(emp => emp.id === initialData.employeeId);
        setSelectedEmployee(employee);
    };

    const setDefaultValues = () => {
        const currentDate = selectedDate?.toISOString().split('T')[0] ||
            new Date().toISOString().split('T')[0];

        setFormData(prev => ({
            ...prev,
            date: currentDate
        }));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear specific field error when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.employeeId) {
            newErrors.employeeId = 'Employee selection is required';
        }

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        // Date validation
        if (formData.date) {
            const selectedDateObj = new Date(formData.date);
            const today = new Date();
            const futureLimit = new Date();
            futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days in future

            if (selectedDateObj > futureLimit) {
                newErrors.date = 'Cannot record attendance more than 7 days in the future';
            }
        }

        // Contract type specific validation
        switch (formData.contractType) {
            case 'HOURLY':
                if (!formData.checkInTime) {
                    newErrors.checkInTime = 'Check-in time is required for hourly employees';
                }

                if (formData.checkOutTime && formData.checkInTime) {
                    if (formData.checkOutTime <= formData.checkInTime) {
                        newErrors.checkOutTime = 'Check-out time must be after check-in time';
                    }

                    // Calculate duration to ensure it's reasonable
                    const checkIn = new Date(`2000-01-01T${formData.checkInTime}`);
                    const checkOut = new Date(`2000-01-01T${formData.checkOutTime}`);
                    const diffHours = (checkOut - checkIn) / (1000 * 60 * 60);

                    if (diffHours > 24) {
                        newErrors.checkOutTime = 'Work duration cannot exceed 24 hours';
                    }
                }

                if (formData.breakDurationMinutes < 0 || formData.breakDurationMinutes > 480) {
                    newErrors.breakDurationMinutes = 'Break duration must be between 0 and 480 minutes';
                }
                break;

            case 'DAILY':
                if (!formData.dailyStatus) {
                    newErrors.dailyStatus = 'Daily status is required';
                }
                break;

            case 'MONTHLY':
                if (!formData.status) {
                    newErrors.status = 'Attendance status is required';
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        try {
            // Prepare data for submission
            const submitData = {
                ...formData,
                breakDurationMinutes: parseInt(formData.breakDurationMinutes) || 0
            };

            const success = await onSubmit(submitData);

            if (success) {
                onClose();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGetLocation = async () => {
        if (!navigator.geolocation) {
            setErrors(prev => ({
                ...prev,
                location: 'Geolocation is not supported by this browser'
            }));
            return;
        }

        setGettingLocation(true);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            });

            const { latitude, longitude } = position.coords;
            const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                location: locationString
            }));

            // Clear location error if it exists
            if (errors.location) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.location;
                    return newErrors;
                });
            }

        } catch (error) {
            let errorMessage = 'Unable to get location';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
                default:
                    errorMessage = 'An unknown error occurred while getting location.';
                    break;
            }

            setErrors(prev => ({
                ...prev,
                location: errorMessage
            }));
        } finally {
            setGettingLocation(false);
        }
    };

    const setCurrentTime = (field) => {
        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5);

        setFormData(prev => ({
            ...prev,
            [field]: timeString
        }));
    };

    const renderContractSpecificFields = () => {
        switch (formData.contractType) {
            case 'HOURLY':
                return (
                    <div className="form-section">
                        <h3>Hourly Attendance</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="checkInTime">
                                    <Clock size={16} />
                                    Check In Time *
                                </label>
                                <div className="time-input-group">
                                    <input
                                        type="time"
                                        id="checkInTime"
                                        name="checkInTime"
                                        value={formData.checkInTime}
                                        onChange={handleInputChange}
                                        className={errors.checkInTime ? 'error' : ''}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCurrentTime('checkInTime')}
                                        className="time-now-btn"
                                        title="Set to current time"
                                    >
                                        Now
                                    </button>
                                </div>
                                {errors.checkInTime && <span className="error-text">{errors.checkInTime}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="checkOutTime">
                                    <Clock size={16} />
                                    Check Out Time
                                </label>
                                <div className="time-input-group">
                                    <input
                                        type="time"
                                        id="checkOutTime"
                                        name="checkOutTime"
                                        value={formData.checkOutTime}
                                        onChange={handleInputChange}
                                        className={errors.checkOutTime ? 'error' : ''}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCurrentTime('checkOutTime')}
                                        className="time-now-btn"
                                        title="Set to current time"
                                    >
                                        Now
                                    </button>
                                </div>
                                {errors.checkOutTime && <span className="error-text">{errors.checkOutTime}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="breakDurationMinutes">Break Duration (minutes)</label>
                            <input
                                type="number"
                                id="breakDurationMinutes"
                                name="breakDurationMinutes"
                                value={formData.breakDurationMinutes}
                                onChange={handleInputChange}
                                min="0"
                                max="480"
                                className={errors.breakDurationMinutes ? 'error' : ''}
                            />
                            {errors.breakDurationMinutes && <span className="error-text">{errors.breakDurationMinutes}</span>}
                        </div>
                    </div>
                );

            case 'DAILY':
                return (
                    <div className="form-section">
                        <h3>Daily Attendance</h3>
                        <div className="form-group">
                            <label htmlFor="dailyStatus">
                                <CheckCircle size={16} />
                                Status *
                            </label>
                            <select
                                id="dailyStatus"
                                name="dailyStatus"
                                value={formData.dailyStatus}
                                onChange={handleInputChange}
                                className={errors.dailyStatus ? 'error' : ''}
                            >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="HOLIDAY">Holiday</option>
                                <option value="LEAVE">Leave</option>
                            </select>
                            {errors.dailyStatus && <span className="error-text">{errors.dailyStatus}</span>}
                        </div>
                    </div>
                );

            case 'MONTHLY':
                return (
                    <div className="form-section">
                        <h3>Monthly Attendance</h3>
                        <div className="form-group">
                            <label htmlFor="status">
                                <CheckCircle size={16} />
                                Status *
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className={errors.status ? 'error' : ''}
                            >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LATE">Late</option>
                                <option value="HALF_DAY">Half Day</option>
                                <option value="ON_LEAVE">On Leave</option>
                            </select>
                            {errors.status && <span className="error-text">{errors.status}</span>}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content attendance-modal" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2>
                        <Clock size={24} />
                        {initialData ? 'Edit Attendance' : 'Record Attendance'}
                    </h2>
                    <button className="modal-close" onClick={onClose} disabled={submitting}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="attendance-form">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h3>Basic Information</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="employeeId">
                                    <User size={16} />
                                    Employee *
                                </label>
                                <select
                                    id="employeeId"
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleInputChange}
                                    className={errors.employeeId ? 'error' : ''}
                                    disabled={!!initialData || submitting}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.fullName} - {employee.jobPositionName || 'Unknown Position'}
                                        </option>
                                    ))}
                                </select>
                                {errors.employeeId && <span className="error-text">{errors.employeeId}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="date">
                                    <Calendar size={16} />
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className={errors.date ? 'error' : ''}
                                    disabled={submitting}
                                />
                                {errors.date && <span className="error-text">{errors.date}</span>}
                            </div>
                        </div>

                        {selectedEmployee && (
                            <div className="employee-info-card">
                                <img
                                    src={selectedEmployee.photoUrl || '/default-avatar.png'}
                                    alt={selectedEmployee.fullName}
                                    className="employee-avatar"
                                />
                                <div className="employee-details">
                                    <h4>{selectedEmployee.fullName}</h4>
                                    <p>{selectedEmployee.jobPositionName || 'Unknown Position'}</p>
                                    <span className="contract-badge">
                                        {selectedEmployee.jobPosition?.contractType || 'MONTHLY'} Contract
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contract Type Specific Fields */}
                    {renderContractSpecificFields()}

                    {/* Additional Information */}
                    <div className="form-section">
                        <h3>Additional Information</h3>

                        <div className="form-row">
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isLeave"
                                        checked={formData.isLeave}
                                        onChange={handleInputChange}
                                        disabled={submitting}
                                    />
                                    On Leave
                                </label>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isHoliday"
                                        checked={formData.isHoliday}
                                        onChange={handleInputChange}
                                        disabled={submitting}
                                    />
                                    Holiday
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">
                                <MapPin size={16} />
                                Location
                            </label>
                            <div className="location-input-group">
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="Enter location or use GPS"
                                    className={errors.location ? 'error' : ''}
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    className="location-btn"
                                    onClick={handleGetLocation}
                                    disabled={gettingLocation || submitting}
                                >
                                    {gettingLocation ? (
                                        <Loader size={16} className="spinning" />
                                    ) : (
                                        'Get GPS'
                                    )}
                                </button>
                            </div>
                            {errors.location && <span className="error-text">{errors.location}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="notes">Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Additional notes..."
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    {/* Error Summary */}
                    {Object.keys(errors).length > 0 && (
                        <div className="error-summary">
                            <AlertCircle size={16} />
                            <span>Please fix the errors above before submitting</span>
                        </div>
                    )}

                    {/* Modal Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting || Object.keys(errors).length > 0}
                        >
                            {submitting ? (
                                <>
                                    <Loader size={16} className="spinning" />
                                    {initialData ? 'Updating...' : 'Recording...'}
                                </>
                            ) : (
                                initialData ? 'Update Attendance' : 'Record Attendance'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttendanceModal;