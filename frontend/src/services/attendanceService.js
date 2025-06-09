import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance with base configuration
const attendanceAxios = axios.create({
    baseURL: `${API_BASE_URL}/api/v1/attendance`,
    headers: {
        'Content-Type': 'application/json',

    },
    timeout: 30000, // 30 second timeout
});

attendanceAxios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return Promise.reject('No auth token found');
        }

        // Validate token format
        if (!token.includes('.')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject('Invalid token format');
        }

        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
attendanceAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle different types of errors
        if (error.code === 'ECONNABORTED') {
            error.message = 'Request timeout. Please try again.';
        } else if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            error.message = 'Access denied. You do not have permission to perform this action.';
        } else if (error.response?.status === 404) {
            error.message = 'Resource not found.';
        } else if (error.response?.status >= 500) {
            error.message = 'Server error. Please try again later.';
        } else if (!error.response) {
            error.message = 'Network error. Please check your connection.';
        }

        return Promise.reject(error);
    }
);

export const attendanceService = {
    /**
     * Record attendance for any contract type
     * @param {Object} attendanceData - The attendance data to record
     * @returns {Promise} API response
     */
    recordAttendance: async (attendanceData) => {
        try {
            const response = await attendanceAxios.post('/record', attendanceData);
            return response;
        } catch (error) {
            console.error('Error recording attendance:', error);
            throw error;
        }
    },

    /**
     * Quick check-in for hourly employees with enhanced location support
     * @param {string} employeeId - Employee ID
     * @param {string} checkInTime - Check-in time (HH:MM format)
     * @param {string} location - Optional location
     * @param {number} latitude - Optional latitude
     * @param {number} longitude - Optional longitude
     * @returns {Promise} API response
     */
    checkIn: async (employeeId, checkInTime, location = null, latitude = null, longitude = null) => {
        try {
            const params = new URLSearchParams({
                employeeId,
                checkInTime
            });

            if (location) params.append('location', location);
            if (latitude !== null) params.append('latitude', latitude.toString());
            if (longitude !== null) params.append('longitude', longitude.toString());

            const response = await attendanceAxios.post(`/check-in?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error checking in employee:', error);
            throw error;
        }
    },

    /**
     * Quick check-out for hourly employees
     * @param {string} employeeId - Employee ID
     * @param {string} checkOutTime - Check-out time (HH:MM format)
     * @returns {Promise} API response
     */
    checkOut: async (employeeId, checkOutTime) => {
        try {
            const params = new URLSearchParams({
                employeeId,
                checkOutTime
            });

            const response = await attendanceAxios.post(`/check-out?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error checking out employee:', error);
            throw error;
        }
    },

    /**
     * Mark daily attendance for daily contract employees
     * @param {string} employeeId - Employee ID
     * @param {string} date - Date (YYYY-MM-DD format)
     * @param {string} status - Daily attendance status
     * @param {string} notes - Optional notes
     * @returns {Promise} API response
     */
    markDailyAttendance: async (employeeId, date, status, notes = null) => {
        try {
            const params = new URLSearchParams({
                employeeId,
                date,
                status
            });

            if (notes) params.append('notes', notes);

            const response = await attendanceAxios.post(`/daily?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error marking daily attendance:', error);
            throw error;
        }
    },

    /**
     * Generate monthly attendance for monthly contract employees
     * @param {string} employeeId - Employee ID
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @returns {Promise} API response
     */
    generateMonthlyAttendance: async (employeeId, year, month) => {
        try {
            const params = new URLSearchParams({
                employeeId,
                year: year.toString(),
                month: month.toString()
            });

            const response = await attendanceAxios.post(`/generate-monthly?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error generating monthly attendance:', error);
            throw error;
        }
    },

    /**
     * Get attendance records for an employee within a date range
     * @param {string} employeeId - Employee ID
     * @param {string} startDate - Start date (YYYY-MM-DD format)
     * @param {string} endDate - End date (YYYY-MM-DD format)
     * @returns {Promise} API response
     */
    getEmployeeAttendance: async (employeeId, startDate, endDate) => {
        try {
            const params = new URLSearchParams({
                startDate,
                endDate
            });

            const response = await attendanceAxios.get(`/employee/${employeeId}?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching employee attendance:', error);
            throw error;
        }
    },

    /**
     * Get monthly attendance summary for an employee
     * @param {string} employeeId - Employee ID
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @returns {Promise} API response
     */
    getMonthlyAttendanceSummary: async (employeeId, year, month) => {
        try {
            const params = new URLSearchParams({
                year: year.toString(),
                month: month.toString()
            });

            const response = await attendanceAxios.get(`/employee/${employeeId}/monthly-summary?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching monthly attendance summary:', error);
            throw error;
        }
    },

    /**
     * Get daily attendance summary for all employees
     * @param {string} date - Date (YYYY-MM-DD format)
     * @returns {Promise} API response
     */
    getDailyAttendanceSummary: async (date) => {
        try {
            const params = new URLSearchParams({ date });
            const response = await attendanceAxios.get(`/daily-summary?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching daily attendance summary:', error);
            throw error;
        }
    },

    /**
     * Update attendance status (for monthly employees)
     * @param {string} attendanceId - Attendance record ID
     * @param {string} status - New status
     * @returns {Promise} API response
     */
    updateAttendanceStatus: async (attendanceId, status) => {
        try {
            const params = new URLSearchParams({ status });
            const response = await attendanceAxios.put(`/${attendanceId}/status?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error updating attendance status:', error);
            throw error;
        }
    },

    /**
     * Get attendance statistics for an employee
     * @param {string} employeeId - Employee ID
     * @param {string} startDate - Start date (YYYY-MM-DD format)
     * @param {string} endDate - End date (YYYY-MM-DD format)
     * @returns {Promise} API response
     */
    getAttendanceStatistics: async (employeeId, startDate, endDate) => {
        try {
            const params = new URLSearchParams({
                startDate,
                endDate
            });

            const response = await attendanceAxios.get(`/employee/${employeeId}/statistics?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching attendance statistics:', error);
            throw error;
        }
    },

    /**
     * Get monthly attendance for an employee (legacy endpoint)
     * @param {string} employeeId - Employee ID
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @returns {Promise} API response
     */
    getMonthlyAttendance: async (employeeId, year, month) => {
        try {
            const params = new URLSearchParams({
                year: year.toString(),
                month: month.toString()
            });

            const response = await attendanceAxios.get(`/employee/${employeeId}/monthly?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching monthly attendance:', error);
            throw error;
        }
    },

    /**
     * Record hourly attendance (legacy endpoint)
     * @param {Object} attendanceData - Hourly attendance data
     * @returns {Promise} API response
     */
    recordHourlyAttendance: async (attendanceData) => {
        try {
            const response = await attendanceAxios.post('/hourly', attendanceData);
            return response;
        } catch (error) {
            console.error('Error recording hourly attendance:', error);
            throw error;
        }
    },

    /**
     * Mark employee as present (legacy endpoint)
     * @param {Object} attendanceData - Attendance data
     * @returns {Promise} API response
     */
    markPresent: async (attendanceData) => {
        try {
            const response = await attendanceAxios.post('/mark-present', attendanceData);
            return response;
        } catch (error) {
            console.error('Error marking employee present:', error);
            throw error;
        }
    },

    /**
     * Bulk operations for attendance with enhanced error handling
     */
    bulk: {
        /**
         * Record attendance for multiple employees
         * @param {Array} attendanceRecords - Array of attendance records
         * @returns {Promise} API response with detailed results
         */
        recordMultiple: async (attendanceRecords) => {
            try {
                const promises = attendanceRecords.map(record =>
                    attendanceService.recordAttendance(record).catch(error => ({
                        status: 'rejected',
                        reason: error,
                        record
                    }))
                );

                const results = await Promise.allSettled(promises);

                return {
                    results,
                    successful: results.filter(r => r.status === 'fulfilled').length,
                    failed: results.filter(r => r.status === 'rejected').length,
                    total: results.length
                };
            } catch (error) {
                console.error('Error in bulk record operation:', error);
                throw error;
            }
        },

        /**
         * Check in multiple hourly employees
         * @param {Array} checkInData - Array of {employeeId, checkInTime, location?}
         * @returns {Promise} API response with detailed results
         */
        checkInMultiple: async (checkInData) => {
            try {
                const promises = checkInData.map(data =>
                    attendanceService.checkIn(data.employeeId, data.checkInTime, data.location)
                        .then(response => ({ status: 'fulfilled', value: response, employeeId: data.employeeId }))
                        .catch(error => ({
                            status: 'rejected',
                            reason: error.message || 'Check-in failed',
                            employeeId: data.employeeId
                        }))
                );

                const results = await Promise.all(promises);

                return {
                    results,
                    successful: results.filter(r => r.status === 'fulfilled').length,
                    failed: results.filter(r => r.status === 'rejected').length,
                    total: results.length,
                    details: results
                };
            } catch (error) {
                console.error('Error in bulk check-in operation:', error);
                throw error;
            }
        },

        /**
         * Check out multiple hourly employees
         * @param {Array} checkOutData - Array of {employeeId, checkOutTime}
         * @returns {Promise} API response with detailed results
         */
        checkOutMultiple: async (checkOutData) => {
            try {
                const promises = checkOutData.map(data =>
                    attendanceService.checkOut(data.employeeId, data.checkOutTime)
                        .then(response => ({ status: 'fulfilled', value: response, employeeId: data.employeeId }))
                        .catch(error => ({
                            status: 'rejected',
                            reason: error.message || 'Check-out failed',
                            employeeId: data.employeeId
                        }))
                );

                const results = await Promise.all(promises);

                return {
                    results,
                    successful: results.filter(r => r.status === 'fulfilled').length,
                    failed: results.filter(r => r.status === 'rejected').length,
                    total: results.length,
                    details: results
                };
            } catch (error) {
                console.error('Error in bulk check-out operation:', error);
                throw error;
            }
        },

        /**
         * Generate monthly attendance for multiple employees
         * @param {Array} employeeIds - Array of employee IDs
         * @param {number} year - Year
         * @param {number} month - Month
         * @returns {Promise} API response with detailed results
         */
        generateMonthlyMultiple: async (employeeIds, year, month) => {
            try {
                const promises = employeeIds.map(employeeId =>
                    attendanceService.generateMonthlyAttendance(employeeId, year, month)
                        .then(response => ({ status: 'fulfilled', value: response, employeeId }))
                        .catch(error => ({
                            status: 'rejected',
                            reason: error.message || 'Monthly generation failed',
                            employeeId
                        }))
                );

                const results = await Promise.all(promises);

                return {
                    results,
                    successful: results.filter(r => r.status === 'fulfilled').length,
                    failed: results.filter(r => r.status === 'rejected').length,
                    total: results.length,
                    details: results
                };
            } catch (error) {
                console.error('Error in bulk monthly generation:', error);
                throw error;
            }
        }
    },

    /**
     * Enhanced utility functions
     */
    utils: {
        /**
         * Format time for API consumption with validation
         * @param {Date|string} time - Time to format
         * @returns {string} Formatted time (HH:MM)
         */
        formatTime: (time) => {
            try {
                if (time instanceof Date) {
                    return time.toTimeString().slice(0, 5);
                }
                if (typeof time === 'string') {
                    // Validate time format
                    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (timeRegex.test(time)) {
                        return time;
                    }
                    // Try to parse and format
                    const date = new Date(`2000-01-01T${time}`);
                    if (!isNaN(date.getTime())) {
                        return date.toTimeString().slice(0, 5);
                    }
                }
                return time;
            } catch (error) {
                console.warn('Error formatting time:', error);
                return time;
            }
        },

        /**
         * Format date for API consumption with validation
         * @param {Date|string} date - Date to format
         * @returns {string} Formatted date (YYYY-MM-DD)
         */
        formatDate: (date) => {
            try {
                if (date instanceof Date) {
                    return date.toISOString().split('T')[0];
                }
                if (typeof date === 'string') {
                    // Validate date format
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (dateRegex.test(date)) {
                        return date;
                    }
                    // Try to parse and format
                    const parsedDate = new Date(date);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate.toISOString().split('T')[0];
                    }
                }
                return date;
            } catch (error) {
                console.warn('Error formatting date:', error);
                return date;
            }
        },

        /**
         * Enhanced validation for attendance data
         * @param {Object} attendanceData - Attendance data to validate
         * @returns {Object} Validation result {isValid, errors, warnings}
         */
        validateAttendanceData: (attendanceData) => {
            const errors = [];
            const warnings = [];

            // Required fields validation
            if (!attendanceData.employeeId) {
                errors.push('Employee ID is required');
            }

            if (!attendanceData.date) {
                errors.push('Date is required');
            } else {
                // Date range validation
                const selectedDate = new Date(attendanceData.date);
                const today = new Date();
                const futureLimit = new Date();
                futureLimit.setDate(today.getDate() + 7);
                const pastLimit = new Date();
                pastLimit.setDate(today.getDate() - 30);

                if (selectedDate > futureLimit) {
                    errors.push('Cannot record attendance more than 7 days in the future');
                } else if (selectedDate < pastLimit) {
                    warnings.push('Recording attendance for more than 30 days ago');
                }
            }

            // Contract type specific validation
            switch (attendanceData.contractType) {
                case 'HOURLY':
                    if (!attendanceData.checkInTime) {
                        errors.push('Check-in time is required for hourly employees');
                    }

                    if (attendanceData.checkOutTime && attendanceData.checkInTime) {
                        const checkIn = new Date(`2000-01-01T${attendanceData.checkInTime}`);
                        const checkOut = new Date(`2000-01-01T${attendanceData.checkOutTime}`);

                        if (checkOut <= checkIn) {
                            errors.push('Check-out time must be after check-in time');
                        } else {
                            const diffHours = (checkOut - checkIn) / (1000 * 60 * 60);
                            if (diffHours > 16) {
                                warnings.push('Work duration exceeds 16 hours');
                            }
                            if (diffHours > 24) {
                                errors.push('Work duration cannot exceed 24 hours');
                            }
                        }
                    }

                    if (attendanceData.breakDurationMinutes) {
                        const breakMinutes = parseInt(attendanceData.breakDurationMinutes);
                        if (breakMinutes < 0 || breakMinutes > 480) {
                            errors.push('Break duration must be between 0 and 480 minutes');
                        }
                    }
                    break;

                case 'DAILY':
                    if (!attendanceData.dailyStatus) {
                        errors.push('Daily status is required for daily employees');
                    }
                    break;

                case 'MONTHLY':
                    if (!attendanceData.status) {
                        errors.push('Attendance status is required for monthly employees');
                    }
                    break;

                default:
                    errors.push('Invalid or missing contract type');
            }

            // Location validation
            if (attendanceData.latitude && attendanceData.longitude) {
                const lat = parseFloat(attendanceData.latitude);
                const lng = parseFloat(attendanceData.longitude);

                if (lat < -90 || lat > 90) {
                    errors.push('Invalid latitude value');
                }
                if (lng < -180 || lng > 180) {
                    errors.push('Invalid longitude value');
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                hasWarnings: warnings.length > 0
            };
        },

        /**
         * Calculate work duration between two times
         * @param {string} checkIn - Check-in time (HH:MM)
         * @param {string} checkOut - Check-out time (HH:MM)
         * @param {number} breakMinutes - Break duration in minutes
         * @returns {Object} Duration information
         */
        calculateWorkDuration: (checkIn, checkOut, breakMinutes = 0) => {
            try {
                if (!checkIn || !checkOut) {
                    return { hours: 0, minutes: 0, totalMinutes: 0, formatted: '0h 0m' };
                }

                const start = new Date(`2000-01-01T${checkIn}`);
                const end = new Date(`2000-01-01T${checkOut}`);

                let totalMinutes = (end - start) / (1000 * 60);
                totalMinutes -= breakMinutes;

                if (totalMinutes < 0) totalMinutes = 0;

                const hours = Math.floor(totalMinutes / 60);
                const minutes = Math.round(totalMinutes % 60);

                return {
                    hours,
                    minutes,
                    totalMinutes,
                    formatted: `${hours}h ${minutes}m`,
                    decimal: Number((totalMinutes / 60).toFixed(2))
                };
            } catch (error) {
                console.warn('Error calculating work duration:', error);
                return { hours: 0, minutes: 0, totalMinutes: 0, formatted: '0h 0m', decimal: 0 };
            }
        },

        /**
         * Get current location with enhanced error handling
         * @param {Object} options - Geolocation options
         * @returns {Promise} Location data
         */
        getCurrentLocation: (options = {}) => {
            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
                ...options
            };

            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported by this browser'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: position.timestamp,
                            formatted: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
                        });
                    },
                    (error) => {
                        let message = 'Unable to get location';

                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                message = 'Location access denied. Please enable location permissions.';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                message = 'Location information unavailable.';
                                break;
                            case error.TIMEOUT:
                                message = 'Location request timed out.';
                                break;
                        }

                        reject(new Error(message));
                    },
                    defaultOptions
                );
            });
        },

        /**
         * Format attendance status for display
         * @param {Object} record - Attendance record
         * @returns {Object} Status information
         */
        getAttendanceStatusInfo: (record) => {
            if (!record) return { status: 'unknown', label: 'Unknown', color: '#9e9e9e' };

            const statusMap = {
                present: { label: 'Present', color: '#4caf50' },
                absent: { label: 'Absent', color: '#f44336' },
                late: { label: 'Late', color: '#ff9800' },
                checkedin: { label: 'Checked In', color: '#2196f3' },
                leave: { label: 'On Leave', color: '#9c27b0' },
                holiday: { label: 'Holiday', color: '#673ab7' },
                unknown: { label: 'Unknown', color: '#9e9e9e' }
            };

            // Determine status based on record data
            let status = 'unknown';

            if (record.isLeave || record.status === 'ON_LEAVE' || record.dailyStatus === 'LEAVE') {
                status = 'leave';
            } else if (record.isHoliday || record.dailyStatus === 'HOLIDAY') {
                status = 'holiday';
            } else {
                switch (record.contractType) {
                    case 'HOURLY':
                        if (record.checkInTime && !record.checkOutTime) {
                            status = 'checkedin';
                        } else if (record.checkInTime && record.checkOutTime) {
                            status = record.isLate ? 'late' : 'present';
                        } else {
                            status = 'absent';
                        }
                        break;
                    case 'DAILY':
                        status = record.dailyStatus === 'PRESENT' ? 'present' : 'absent';
                        break;
                    case 'MONTHLY':
                        if (record.status === 'PRESENT') status = 'present';
                        else if (record.status === 'LATE') status = 'late';
                        else status = 'absent';
                        break;
                }
            }

            return {
                status,
                ...statusMap[status]
            };
        }
    }
};

export default attendanceService;