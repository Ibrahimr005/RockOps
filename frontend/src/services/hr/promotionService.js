// src/services/hr/promotionService.js - Fixed with better error handling and RBAC
import apiClient from '../../utils/apiClient.js';
import { extractErrorMessage } from '../../utils/errorHandler.js';

const PROMOTION_ENDPOINTS = {
    BASE: '/api/v1/promotions',
    BY_ID: (id) => `/api/v1/promotions/${id}`,
    REVIEW: (id) => `/api/v1/promotions/${id}/review`,
    IMPLEMENT: (id) => `/api/v1/promotions/${id}/implement`,
    CANCEL: (id) => `/api/v1/promotions/${id}/cancel`,
    PENDING: '/api/v1/promotions/pending',
    READY_FOR_IMPLEMENTATION: '/api/v1/promotions/ready-for-implementation',
    STATISTICS: '/api/v1/promotions/statistics',
    EMPLOYEE_SUMMARY: (employeeId) => `/api/v1/promotions/employee/${employeeId}/summary`,
    EMPLOYEE_ELIGIBILITY: (employeeId) => `/api/v1/promotions/employee/${employeeId}/eligibility`,
    DEPARTMENT: (departmentId) => `/api/v1/promotions/department/${departmentId}`,
    BULK_ACTION: '/api/v1/promotions/bulk-action',
    ANALYTICS: '/api/v1/promotions/analytics',
    EXPORT: '/api/v1/promotions/export',
    HEALTH: '/api/v1/promotions/health'
};

/**
 * Enhanced promotion service with better error handling and RBAC awareness
 */
const promotionService = {
    /**
     * Create a new promotion request
     * @param {Object} promotionData - Promotion request data
     * @returns {Promise} API response with created promotion request
     */
    createPromotionRequest: async (promotionData) => {
        try {
            console.log('Creating promotion request with data:', promotionData);

            const response = await apiClient.post(PROMOTION_ENDPOINTS.BASE, promotionData);

            console.log('Promotion creation response:', response);
            return response;
        } catch (error) {
            console.error('Error creating promotion request:', error);

            // Enhanced error handling
            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'create';
            enhancedError.entity = 'promotion request';

            throw enhancedError;
        }
    },

    /**
     * Get all promotion requests with optional filtering
     * @param {Object} filters - Optional filters (status, employeeId, requestedBy, page, size, sortBy, sortDir)
     * @returns {Promise} API response with promotion requests
     */
    getAllPromotionRequests: async (filters = {}) => {
        try {
            console.log('Fetching promotion requests with filters:', filters);

            // Clean up filters - remove empty values
            const cleanFilters = Object.entries(filters)
                .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            const response = await apiClient.get(PROMOTION_ENDPOINTS.BASE, {
                params: cleanFilters
            });

            console.log('Fetched promotion requests response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching promotion requests:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'promotion requests';

            throw enhancedError;
        }
    },

    /**
     * Get promotion request by ID
     * @param {string} id - Promotion request ID
     * @returns {Promise} API response with promotion request
     */
    getPromotionRequestById: async (id) => {
        try {
            console.log('Fetching promotion request by ID:', id);

            if (!id) {
                throw new Error('Promotion request ID is required');
            }

            const response = await apiClient.get(PROMOTION_ENDPOINTS.BY_ID(id));

            console.log('Fetched promotion request:', response);
            return response;
        } catch (error) {
            console.error(`Error fetching promotion request ${id}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'promotion request';
            enhancedError.resourceId = id;

            throw enhancedError;
        }
    },

    /**
     * Get pending promotion requests for HR managers
     * @returns {Promise} API response with pending promotion requests
     */
    getPendingPromotionRequests: async () => {
        try {
            console.log('Fetching pending promotion requests');

            const response = await apiClient.get(PROMOTION_ENDPOINTS.PENDING);

            console.log('Fetched pending promotions:', response);
            return response;
        } catch (error) {
            console.error('Error fetching pending promotion requests:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'pending promotion requests';

            throw enhancedError;
        }
    },

    /**
     * Review a promotion request (approve/reject)
     * @param {string} id - Promotion request ID
     * @param {Object} reviewData - Review data (action, managerComments, rejectionReason, approvedSalary, actualEffectiveDate)
     * @returns {Promise} API response with reviewed promotion request
     */
    reviewPromotionRequest: async (id, reviewData) => {
        try {
            console.log('Reviewing promotion request:', { id, reviewData });

            if (!id) {
                throw new Error('Promotion request ID is required');
            }

            if (!reviewData || !reviewData.action) {
                throw new Error('Review action is required');
            }

            // Validate action
            const validActions = ['approve', 'reject'];
            if (!validActions.includes(reviewData.action.toLowerCase())) {
                throw new Error('Invalid review action. Must be "approve" or "reject"');
            }

            const response = await apiClient.put(PROMOTION_ENDPOINTS.REVIEW(id), reviewData);

            console.log('Review response:', response);
            return response;
        } catch (error) {
            console.error(`Error reviewing promotion request ${id}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'review';
            enhancedError.entity = 'promotion request';
            enhancedError.resourceId = id;

            throw enhancedError;
        }
    },

    /**
     * Implement an approved promotion request
     * @param {string} id - Promotion request ID
     * @returns {Promise} API response with implemented promotion request
     */
    implementPromotionRequest: async (id) => {
        try {
            console.log('Implementing promotion request:', id);

            if (!id) {
                throw new Error('Promotion request ID is required');
            }

            // Fixed: Use POST with empty body (no data parameter)
            const response = await apiClient.post(PROMOTION_ENDPOINTS.IMPLEMENT(id));

            console.log('Implementation response:', response);
            return response;
        } catch (error) {
            console.error(`Error implementing promotion request ${id}:`, error);

            // Enhanced error message based on common implementation issues
            let errorMessage = extractErrorMessage(error);

            if (error.response?.status === 400) {
                if (errorMessage.includes('not approved')) {
                    errorMessage = 'This promotion request must be approved before it can be implemented.';
                } else if (errorMessage.includes('effective date')) {
                    errorMessage = 'This promotion cannot be implemented yet. Please check the effective date.';
                } else if (errorMessage.includes('already implemented')) {
                    errorMessage = 'This promotion has already been implemented.';
                }
            }

            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'implement';
            enhancedError.entity = 'promotion request';
            enhancedError.resourceId = id;

            throw enhancedError;
        }
    },

    /**
     * Cancel a promotion request
     * @param {string} id - Promotion request ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise} API response with cancelled promotion request
     */
    cancelPromotionRequest: async (id, reason) => {
        try {
            console.log('Cancelling promotion request:', { id, reason });

            if (!id) {
                throw new Error('Promotion request ID is required');
            }

            if (!reason || reason.trim() === '') {
                throw new Error('Cancellation reason is required');
            }

            const response = await apiClient.post(PROMOTION_ENDPOINTS.CANCEL(id), { reason });

            console.log('Cancellation response:', response);
            return response;
        } catch (error) {
            console.error(`Error cancelling promotion request ${id}:`, error);

            let errorMessage = extractErrorMessage(error);

            // Enhanced error messages for cancellation
            if (error.response?.status === 400) {
                if (errorMessage.includes('already completed') || errorMessage.includes('implemented')) {
                    errorMessage = 'Cannot cancel a promotion that has already been implemented.';
                } else if (errorMessage.includes('reason')) {
                    errorMessage = 'A cancellation reason is required.';
                }
            }

            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'cancel';
            enhancedError.entity = 'promotion request';
            enhancedError.resourceId = id;

            throw enhancedError;
        }
    },

    /**
     * Get approved promotions ready for implementation
     * @returns {Promise} API response with promotions ready for implementation
     */
    getPromotionsReadyForImplementation: async () => {
        try {
            console.log('Fetching promotions ready for implementation');

            const response = await apiClient.get(PROMOTION_ENDPOINTS.READY_FOR_IMPLEMENTATION);

            console.log('Ready for implementation response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching promotions ready for implementation:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'promotions ready for implementation';

            throw enhancedError;
        }
    },

    /**
     * Get promotion statistics
     * @returns {Promise} API response with promotion statistics
     */
    getPromotionStatistics: async () => {
        try {
            console.log('Fetching promotion statistics');

            const response = await apiClient.get(PROMOTION_ENDPOINTS.STATISTICS);

            console.log('Statistics response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching promotion statistics:', error);

            // Statistics errors are often not critical, so provide a softer error
            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(`Unable to load promotion statistics: ${errorMessage}`);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'promotion statistics';
            enhancedError.isCritical = false; // Mark as non-critical

            throw enhancedError;
        }
    },

    /**
     * Get employee promotion summary
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response with employee promotion summary
     */
    getEmployeePromotionSummary: async (employeeId) => {
        try {
            console.log('Fetching employee promotion summary for:', employeeId);

            if (!employeeId) {
                throw new Error('Employee ID is required');
            }

            const response = await apiClient.get(PROMOTION_ENDPOINTS.EMPLOYEE_SUMMARY(employeeId));

            console.log('Employee promotion summary response:', response);
            return response;
        } catch (error) {
            console.error(`Error fetching employee promotion summary for ${employeeId}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'employee promotion summary';
            enhancedError.resourceId = employeeId;

            throw enhancedError;
        }
    },

    /**
     * Check employee promotion eligibility
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response with eligibility status
     */
    checkEmployeePromotionEligibility: async (employeeId) => {
        try {
            console.log('Checking promotion eligibility for employee:', employeeId);

            if (!employeeId) {
                throw new Error('Employee ID is required');
            }

            const response = await apiClient.get(PROMOTION_ENDPOINTS.EMPLOYEE_ELIGIBILITY(employeeId));

            console.log('Eligibility check response:', response);
            return response;
        } catch (error) {
            console.error(`Error checking promotion eligibility for employee ${employeeId}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'check';
            enhancedError.entity = 'employee promotion eligibility';
            enhancedError.resourceId = employeeId;

            throw enhancedError;
        }
    },

    /**
     * Check if employee has pending promotion
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response indicating if employee has pending promotion
     */
    checkEmployeeHasPendingPromotion: async (employeeId) => {
        try {
            console.log('Checking pending promotions for employee:', employeeId);

            if (!employeeId) {
                throw new Error('Employee ID is required');
            }

            const response = await apiClient.get(PROMOTION_ENDPOINTS.BASE, {
                params: {
                    employeeId: employeeId,
                    status: 'PENDING'
                }
            });

            // Check if the response contains any pending promotions
            let hasPending = false;
            let count = 0;

            if (response.data?.success && response.data?.data) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                hasPending = data.length > 0;
                count = data.length;
            } else if (Array.isArray(response.data)) {
                hasPending = response.data.length > 0;
                count = response.data.length;
            }

            const result = {
                data: {
                    hasPending: hasPending,
                    count: count,
                    employeeId: employeeId
                }
            };

            console.log('Pending promotion check result:', result);
            return result;
        } catch (error) {
            console.error(`Error checking pending promotions for employee ${employeeId}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'check';
            enhancedError.entity = 'pending promotions';
            enhancedError.resourceId = employeeId;

            throw enhancedError;
        }
    },

    /**
     * Get promotion requests by department
     * @param {string} departmentId - Department ID
     * @param {string} type - Type of requests (current, historical)
     * @returns {Promise} API response with department promotion requests
     */
    getPromotionRequestsByDepartment: async (departmentId, type = 'current') => {
        try {
            console.log('Fetching promotion requests for department:', { departmentId, type });

            if (!departmentId) {
                throw new Error('Department ID is required');
            }

            const response = await apiClient.get(PROMOTION_ENDPOINTS.DEPARTMENT(departmentId), {
                params: { type }
            });

            console.log('Department promotion requests response:', response);
            return response;
        } catch (error) {
            console.error(`Error fetching promotion requests for department ${departmentId}:`, error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'department promotion requests';
            enhancedError.resourceId = departmentId;

            throw enhancedError;
        }
    },

    /**
     * Perform bulk action on promotion requests
     * @param {Object} bulkActionData - Bulk action data (action, promotionRequestIds)
     * @returns {Promise} API response with bulk action result
     */
    bulkPromotionAction: async (bulkActionData) => {
        try {
            console.log('Performing bulk promotion action:', bulkActionData);

            if (!bulkActionData || !bulkActionData.action) {
                throw new Error('Bulk action type is required');
            }

            if (!bulkActionData.promotionRequestIds || !Array.isArray(bulkActionData.promotionRequestIds) || bulkActionData.promotionRequestIds.length === 0) {
                throw new Error('At least one promotion request ID is required');
            }

            const response = await apiClient.post(PROMOTION_ENDPOINTS.BULK_ACTION, bulkActionData);

            console.log('Bulk action response:', response);
            return response;
        } catch (error) {
            console.error('Error performing bulk promotion action:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'bulk action';
            enhancedError.entity = 'promotion requests';

            throw enhancedError;
        }
    },

    /**
     * Get promotion analytics and trends
     * @param {Object} filters - Optional filters (year, departmentId)
     * @returns {Promise} API response with promotion analytics
     */
    getPromotionAnalytics: async (filters = {}) => {
        try {
            console.log('Fetching promotion analytics with filters:', filters);

            // Clean up filters
            const cleanFilters = Object.entries(filters)
                .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            const response = await apiClient.get(PROMOTION_ENDPOINTS.ANALYTICS, {
                params: cleanFilters
            });

            console.log('Analytics response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching promotion analytics:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'fetch';
            enhancedError.entity = 'promotion analytics';
            enhancedError.isCritical = false; // Analytics errors are typically non-critical

            throw enhancedError;
        }
    },

    /**
     * Export promotion data
     * @param {Object} exportOptions - Export options (format, status, departmentId)
     * @returns {Promise} API response with export data
     */
    exportPromotionData: async (exportOptions = {}) => {
        try {
            console.log('Exporting promotion data with options:', exportOptions);

            // Clean up export options
            const cleanOptions = Object.entries(exportOptions)
                .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            const response = await apiClient.get(PROMOTION_ENDPOINTS.EXPORT, {
                params: cleanOptions,
                responseType: 'blob' // For file downloads
            });

            console.log('Export response:', response);
            return response;
        } catch (error) {
            console.error('Error exporting promotion data:', error);

            let errorMessage = extractErrorMessage(error);

            // Special handling for export errors
            if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to export promotion data.';
            } else if (error.response?.status === 404) {
                errorMessage = 'No promotion data found to export with the specified criteria.';
            }

            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.operation = 'export';
            enhancedError.entity = 'promotion data';

            throw enhancedError;
        }
    },

    /**
     * Health check for promotion service
     * @returns {Promise} API response with service health status
     */
    healthCheck: async () => {
        try {
            console.log('Checking promotion service health');

            const response = await apiClient.get(PROMOTION_ENDPOINTS.HEALTH);

            console.log('Health check response:', response);
            return response;
        } catch (error) {
            console.error('Error checking promotion service health:', error);

            const errorMessage = extractErrorMessage(error);
            const enhancedError = new Error(`Promotion service health check failed: ${errorMessage}`);
            enhancedError.originalError = error;
            enhancedError.operation = 'health check';
            enhancedError.entity = 'promotion service';
            enhancedError.isCritical = false;

            throw enhancedError;
        }
    },

    /**
     * Helper method to handle promotion service errors consistently
     * @param {Error} error - The error object
     * @param {string} operation - The operation being performed
     * @param {string} entityId - Optional entity ID
     * @returns {Error} Enhanced error object
     */
    _enhanceError: (error, operation, entityId = null) => {
        const errorMessage = extractErrorMessage(error);
        const enhancedError = new Error(errorMessage);
        enhancedError.originalError = error;
        enhancedError.operation = operation;
        enhancedError.entity = 'promotion';
        enhancedError.resourceId = entityId;

        // Add RBAC-specific error handling
        if (error.response?.status === 403) {
            enhancedError.isPermissionError = true;
            enhancedError.message = 'You do not have permission to perform this action on promotion requests.';
        } else if (error.response?.status === 401) {
            enhancedError.isAuthError = true;
            enhancedError.message = 'Your session has expired. Please log in again.';
        }

        return enhancedError;
    }
};

export default promotionService;