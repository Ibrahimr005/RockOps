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
    }
};

export default directPurchaseService;