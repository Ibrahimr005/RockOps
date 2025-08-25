import apiClient from '../utils/apiClient';
import { CONTACT_ENDPOINTS } from '../config/api.config';

export const contactService = {
    // Create a new contact
    createContact: async (contactData) => {
        try {
            const response = await apiClient.post(CONTACT_ENDPOINTS.CREATE, contactData);
            return response;
        } catch (error) {
            console.error('Error creating contact:', error);
            throw error;
        }
    },

    // Get contact by ID
    getContact: async (id) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.BY_ID(id));
            return response;
        } catch (error) {
            console.error('Error fetching contact:', error);
            throw error;
        }
    },

    // Get all contacts with pagination
    getContacts: async (page = 0, size = 20) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.BASE, {
                params: { page, size }
            });
            return response;
        } catch (error) {
            console.error('Error fetching contacts:', error);
            throw error;
        }
    },

    // Get contacts with filters
    getContactsWithFilters: async (filters = {}, page = 0, size = 20) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.FILTER, {
                params: { ...filters, page, size }
            });
            return response;
        } catch (error) {
            console.error('Error fetching contacts with filters:', error);
            throw error;
        }
    },

    // Get all active contacts
    getActiveContacts: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.ACTIVE);
            return response;
        } catch (error) {
            console.error('Error fetching active contacts:', error);
            throw error;
        }
    },

    // Get contacts by type
    getContactsByType: async (contactType) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.BY_TYPE(contactType));
            return response;
        } catch (error) {
            console.error('Error fetching contacts by type:', error);
            throw error;
        }
    },

    // Get available contacts
    getAvailableContacts: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.AVAILABLE);
            return response;
        } catch (error) {
            console.error('Error fetching available contacts:', error);
            throw error;
        }
    },

    // Get available contacts by specialization
    getAvailableContactsBySpecialization: async (specialization) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.AVAILABLE_BY_SPECIALIZATION(specialization));
            return response;
        } catch (error) {
            console.error('Error fetching available contacts by specialization:', error);
            throw error;
        }
    },

    // Get available contacts by type
    getAvailableContactsByType: async (contactType) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.AVAILABLE_BY_TYPE(contactType));
            return response;
        } catch (error) {
            console.error('Error fetching available contacts by type:', error);
            throw error;
        }
    },

    // Get emergency contacts
    getEmergencyContacts: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.EMERGENCY);
            return response;
        } catch (error) {
            console.error('Error fetching emergency contacts:', error);
            throw error;
        }
    },

    // Search contacts
    searchContacts: async (searchTerm) => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.SEARCH, {
                params: { searchTerm }
            });
            return response;
        } catch (error) {
            console.error('Error searching contacts:', error);
            throw error;
        }
    },

    // Update contact
    updateContact: async (id, contactData) => {
        try {
            const response = await apiClient.put(CONTACT_ENDPOINTS.UPDATE(id), contactData);
            return response;
        } catch (error) {
            console.error('Error updating contact:', error);
            throw error;
        }
    },

    // Delete contact
    deleteContact: async (id) => {
        try {
            const response = await apiClient.delete(CONTACT_ENDPOINTS.DELETE(id));
            return response;
        } catch (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    },

    // Deactivate contact
    deactivateContact: async (id) => {
        try {
            const response = await apiClient.post(CONTACT_ENDPOINTS.DEACTIVATE(id));
            return response;
        } catch (error) {
            console.error('Error deactivating contact:', error);
            throw error;
        }
    },

    // Activate contact
    activateContact: async (id) => {
        try {
            const response = await apiClient.post(CONTACT_ENDPOINTS.ACTIVATE(id));
            return response;
        } catch (error) {
            console.error('Error activating contact:', error);
            throw error;
        }
    },

    // Get contacts with overdue assignments
    getContactsWithOverdueAssignments: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.OVERDUE_ASSIGNMENTS);
            return response;
        } catch (error) {
            console.error('Error fetching contacts with overdue assignments:', error);
            throw error;
        }
    },

    // Get contacts needing follow-up
    getContactsNeedingFollowUp: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.NEEDING_FOLLOWUP);
            return response;
        } catch (error) {
            console.error('Error fetching contacts needing follow-up:', error);
            throw error;
        }
    },

    // Get contact statistics
    getContactStatistics: async () => {
        try {
            const response = await apiClient.get(CONTACT_ENDPOINTS.STATISTICS);
            return response;
        } catch (error) {
            console.error('Error fetching contact statistics:', error);
            throw error;
        }
    }
};

export default contactService; 