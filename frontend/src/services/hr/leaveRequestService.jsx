import apiClient from '../../utils/apiClient.js';

// Leave Request API endpoints
const LEAVE_REQUEST_ENDPOINTS = {
    BASE: '/api/v1/leave-requests',
    APPROVE: (id) => `/api/v1/leave-requests/${id}/approve`,
    REJECT: (id) => `/api/v1/leave-requests/${id}/reject`,
    CANCEL: (id) => `/api/v1/leave-requests/${id}/cancel`,
    PENDING: '/api/v1/leave-requests/pending',
    EMPLOYEE: (employeeId) => `/api/v1/leave-requests/employee/${employeeId}`,
    STATISTICS: '/api/v1/leave-requests/statistics',
    DETAIL: (id) => `/api/v1/leave-requests/${id}`
};

export const leaveRequestService = {
    // Submit a new leave request
    submitLeaveRequest: async (requestData) => {
        try {
            const response = await apiClient.post(LEAVE_REQUEST_ENDPOINTS.BASE, requestData);
            return response;
        } catch (error) {
            console.error('Error submitting leave request:', error);
            throw error;
        }
    },

    // Get leave requests with filtering
    getLeaveRequests: async (filters = {}) => {
        try {
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.BASE, {
                params: filters
            });
            return response;
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            throw error;
        }
    },

    // Get a specific leave request by ID
    getLeaveRequest: async (id) => {
        try {
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.DETAIL(id));
            return response;
        } catch (error) {
            console.error('Error fetching leave request by ID:', error);

            // Add more specific error handling
            if (error.response?.status === 404) {
                throw new Error('Leave request not found');
            } else if (error.response?.status === 403) {
                throw new Error('You do not have permission to view this leave request');
            } else if (error.response?.status === 401) {
                throw new Error('Please log in to view this leave request');
            }

            throw error;
        }
    },

    // Approve a leave request
    approveLeaveRequest: async (id, approvalData = {}) => {
        try {
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.APPROVE(id), approvalData);
            return response;
        } catch (error) {
            console.error('Error approving leave request:', error);
            throw error;
        }
    },

    // Reject a leave request
    rejectLeaveRequest: async (id, rejectionData) => {
        try {
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.REJECT(id), rejectionData);
            return response;
        } catch (error) {
            console.error('Error rejecting leave request:', error);
            throw error;
        }
    },

    // Cancel a leave request
    cancelLeaveRequest: async (id) => {
        try {
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.CANCEL(id));
            return response;
        } catch (error) {
            console.error('Error cancelling leave request:', error);
            throw error;
        }
    },

    // Get pending leave requests
    getPendingLeaveRequests: async () => {
        try {
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.PENDING);
            return response;
        } catch (error) {
            console.error('Error fetching pending leave requests:', error);
            throw error;
        }
    },

    // Get employee leave requests
    getEmployeeLeaveRequests: async (employeeId) => {
        try {
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.EMPLOYEE(employeeId));
            return response;
        } catch (error) {
            console.error('Error fetching employee leave requests:', error);
            throw error;
        }
    },

    // Get leave statistics
    getLeaveStatistics: async (year = null) => {
        try {
            const params = year ? { year } : {};
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.STATISTICS, { params });
            return response;
        } catch (error) {
            console.error('Error fetching leave statistics:', error);
            throw error;
        }
    }
};