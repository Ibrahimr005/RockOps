import apiClient from '../../utils/apiClient.js';

// Attendance API endpoints
const ATTENDANCE_ENDPOINTS = {
    BASE: '/api/v1/attendance',
    MONTHLY: '/api/v1/attendance/monthly',
    BULK: '/api/v1/attendance/bulk',
    SUMMARY: '/api/v1/attendance/summary',
    EMPLOYEE: (employeeId) => `/api/v1/attendance/employee/${employeeId}`,
    EMPLOYEE_MONTHLY: (employeeId) => `/api/v1/attendance/employee/${employeeId}/monthly`,
    DELETE: (id) => `/api/v1/attendance/${id}`,
    HEALTH: '/api/v1/attendance/health'
};

export const attendanceService = {
    // Get attendance by date and site
    getAttendance: (date, siteId) => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.BASE, {
            params: { date, siteId }
        });
    },

    // Get monthly attendance sheet
    getMonthlyAttendance: (siteId, year, month) => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.MONTHLY, {
            params: { siteId, year, month }
        });
    },

    // Update single attendance record
    updateAttendance: (attendanceData) => {
        return apiClient.put(ATTENDANCE_ENDPOINTS.BASE, attendanceData);
    },

    // Bulk save attendance
    bulkSaveAttendance: (bulkAttendanceData) => {
        return apiClient.post(ATTENDANCE_ENDPOINTS.BULK, bulkAttendanceData);
    },

    // Get attendance summary
    getAttendanceSummary: (date, siteId) => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.SUMMARY, {
            params: { date, siteId }
        });
    },

    // Get employee attendance history
    getEmployeeAttendance: (employeeId, startDate, endDate) => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.EMPLOYEE(employeeId), {
            params: { startDate, endDate }
        });
    },

    // Get employee monthly attendance
    getEmployeeMonthlyAttendance: (employeeId, year, month) => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.EMPLOYEE_MONTHLY(employeeId), {
            params: { year, month }
        });
    },

    // Delete attendance record
    deleteAttendance: (id) => {
        return apiClient.delete(ATTENDANCE_ENDPOINTS.DELETE(id));
    },

    // Health check
    healthCheck: () => {
        return apiClient.get(ATTENDANCE_ENDPOINTS.HEALTH);
    }
};