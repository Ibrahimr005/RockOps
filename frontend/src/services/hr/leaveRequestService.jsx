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
            console.log('Submitting leave request:', requestData);
            const response = await apiClient.post(LEAVE_REQUEST_ENDPOINTS.BASE, requestData);
            console.log('Submit response:', response);
            return response;
        } catch (error) {
            console.error('Error submitting leave request:', error);
            throw error;
        }
    },

    // Get leave requests with filtering
    getLeaveRequests: async (filters = {}) => {
        try {
            console.log('Fetching leave requests with filters:', filters);
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.BASE, {
                params: filters
            });
            console.log('Get requests response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            throw error;
        }
    },

    // Get a specific leave request by ID
    getLeaveRequest: async (id) => {
        try {
            console.log('Fetching leave request by ID:', id);
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.DETAIL(id));
            console.log('Get single request response:', response);
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
            console.log('Approving leave request:', id, approvalData);
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.APPROVE(id), approvalData);
            console.log('Approve response:', response);
            return response;
        } catch (error) {
            console.error('Error approving leave request:', error);
            throw error;
        }
    },

    // Reject a leave request
    rejectLeaveRequest: async (id, rejectionData) => {
        try {
            console.log('Rejecting leave request:', id, rejectionData);
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.REJECT(id), rejectionData);
            console.log('Reject response:', response);
            return response;
        } catch (error) {
            console.error('Error rejecting leave request:', error);
            throw error;
        }
    },

    // Cancel a leave request
    cancelLeaveRequest: async (id) => {
        try {
            console.log('Cancelling leave request:', id);
            const response = await apiClient.put(LEAVE_REQUEST_ENDPOINTS.CANCEL(id));
            console.log('Cancel response:', response);
            return response;
        } catch (error) {
            console.error('Error cancelling leave request:', error);
            throw error;
        }
    },

    // Get pending leave requests
    getPendingLeaveRequests: async () => {
        try {
            console.log('Fetching pending leave requests');
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.PENDING);
            console.log('Pending requests response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching pending leave requests:', error);
            throw error;
        }
    },

    // Get employee leave requests
    getEmployeeLeaveRequests: async (employeeId) => {
        try {
            console.log('Fetching employee leave requests:', employeeId);
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.EMPLOYEE(employeeId));
            console.log('Employee requests response:', response);
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
            console.log('Fetching leave statistics:', params);
            const response = await apiClient.get(LEAVE_REQUEST_ENDPOINTS.STATISTICS, { params });
            console.log('Statistics response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching leave statistics:', error);
            throw error;
        }
    }
};