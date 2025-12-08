import { DIRECT_PURCHASE_ENDPOINTS } from '../config/api.config';
import apiClient from '../utils/apiClient';

export const directPurchaseService = {
    // Ticket operations
    createTicket: async (ticketData) => {
        try {
            const response = await apiClient.post(DIRECT_PURCHASE_ENDPOINTS.CREATE, ticketData);
            return response;
        } catch (error) {
            console.error('Error creating direct purchase ticket:', error);
            throw error;
        }
    },

    getTicketById: async (ticketId) => {
        try {
            const response = await apiClient.get(DIRECT_PURCHASE_ENDPOINTS.BY_ID(ticketId));
            return response;
        } catch (error) {
            console.error('Error fetching direct purchase ticket:', error);
            throw error;
        }
    },

    getAllTickets: async (filters = {}) => {
        try {
            let url;

            if (filters.status) {
                url = DIRECT_PURCHASE_ENDPOINTS.BY_STATUS(filters.status);
            } else if (filters.equipmentId) {
                url = DIRECT_PURCHASE_ENDPOINTS.BY_EQUIPMENT(filters.equipmentId);
            } else if (filters.merchantId) {
                url = DIRECT_PURCHASE_ENDPOINTS.BY_MERCHANT(filters.merchantId);
            } else {
                url = DIRECT_PURCHASE_ENDPOINTS.BASE;
            }

            const response = await apiClient.get(url);
            return response;
        } catch (error) {
            console.error('Error fetching direct purchase tickets:', error);
            throw error;
        }
    },

    updateTicket: async (ticketId, ticketData) => {
        try {
            const response = await apiClient.put(DIRECT_PURCHASE_ENDPOINTS.UPDATE(ticketId), ticketData);
            return response;
        } catch (error) {
            console.error('Error updating direct purchase ticket:', error);
            throw error;
        }
    },

    deleteTicket: async (ticketId) => {
        try {
            const response = await apiClient.delete(DIRECT_PURCHASE_ENDPOINTS.DELETE(ticketId));
            return response;
        } catch (error) {
            console.error('Error deleting direct purchase ticket:', error);
            throw error;
        }
    },

    delegateTicket: async (ticketId, responsibleUserId) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/delegate`, { responsibleUserId });
            return response;
        } catch (error) {
            console.error('Error delegating direct purchase ticket:', error);
            throw error;
        }
    },

    // Step operations
    getSteps: async (ticketId) => {
        try {
            const response = await apiClient.get(DIRECT_PURCHASE_ENDPOINTS.STEPS.BY_TICKET(ticketId));
            return response;
        } catch (error) {
            console.error('Error fetching direct purchase steps:', error);
            throw error;
        }
    },

    getStepById: async (ticketId, stepId) => {
        try {
            const response = await apiClient.get(DIRECT_PURCHASE_ENDPOINTS.STEPS.BY_ID(ticketId, stepId));
            return response;
        } catch (error) {
            console.error('Error fetching direct purchase step:', error);
            throw error;
        }
    },

    updateStep: async (ticketId, stepId, stepData) => {
        try {
            const response = await apiClient.put(DIRECT_PURCHASE_ENDPOINTS.STEPS.UPDATE(ticketId, stepId), stepData);
            return response;
        } catch (error) {
            console.error('Error updating direct purchase step:', error);
            throw error;
        }
    },

    completeStep: async (ticketId, stepId, completionData) => {
        try {
            const response = await apiClient.put(DIRECT_PURCHASE_ENDPOINTS.STEPS.COMPLETE(ticketId, stepId), completionData);
            return response;
        } catch (error) {
            console.error('Error completing direct purchase step:', error);
            throw error;
        }
    },

    deleteStep: async (ticketId, stepId) => {
        try {
            const response = await apiClient.delete(DIRECT_PURCHASE_ENDPOINTS.STEPS.DELETE(ticketId, stepId));
            return response;
        } catch (error) {
            console.error('Error deleting direct purchase step:', error);
            throw error;
        }
    },

    // ========================================
    // NEW 4-STEP WORKFLOW OPERATIONS
    // ========================================

    // Step 1: Creation
    createTicketStep1: async (data) => {
        try {
            const response = await apiClient.post('/api/direct-purchase-tickets/workflow/step-1', data);
            return response;
        } catch (error) {
            console.error('Error creating direct purchase ticket Step 1:', error);
            throw error;
        }
    },

    completeStep1: async (ticketId) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/complete-step-1`);
            return response;
        } catch (error) {
            console.error('Error completing Step 1:', error);
            throw error;
        }
    },

    // Step 2: Purchasing
    updateStep2: async (ticketId, data) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/step-2`, data);
            return response;
        } catch (error) {
            console.error('Error updating Step 2:', error);
            throw error;
        }
    },

    completeStep2: async (ticketId) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/complete-step-2`);
            return response;
        } catch (error) {
            console.error('Error completing Step 2:', error);
            throw error;
        }
    },

    // Step 3: Finalize Purchasing
    updateStep3: async (ticketId, data) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/step-3`, data);
            return response;
        } catch (error) {
            console.error('Error updating Step 3:', error);
            throw error;
        }
    },

    completeStep3: async (ticketId) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/complete-step-3`);
            return response;
        } catch (error) {
            console.error('Error completing Step 3:', error);
            throw error;
        }
    },

    // Step 4: Transporting
    updateStep4: async (ticketId, data) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/step-4`, data);
            return response;
        } catch (error) {
            console.error('Error updating Step 4:', error);
            throw error;
        }
    },

    completeStep4: async (ticketId) => {
        try {
            const response = await apiClient.put(`/api/direct-purchase-tickets/${ticketId}/workflow/complete-step-4`);
            return response;
        } catch (error) {
            console.error('Error completing Step 4:', error);
            throw error;
        }
    },

    // Helper endpoints
    getMerchantContacts: async (merchantId) => {
        try {
            const response = await apiClient.get(`/api/merchants/${merchantId}/contacts`);
            return response;
        } catch (error) {
            console.error('Error fetching merchant contacts:', error);
            throw error;
        }
    },

    getSiteEmployees: async (siteId) => {
        try {
            const response = await apiClient.get(`/api/v1/employees/site/${siteId}`);
            return response;
        } catch (error) {
            console.error('Error fetching site employees:', error);
            throw error;
        }
    }
};

export default directPurchaseService;