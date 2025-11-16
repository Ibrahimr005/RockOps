// src/services/contactTypeService.js
import apiClient from '../utils/apiClient.js';
import { CONTACT_TYPE_ENDPOINTS } from '../config/api.config.js';

const contactTypeService = {
    // Get all contact types
    getAllContactTypes: async () => {
        const response = await apiClient.get(CONTACT_TYPE_ENDPOINTS.BASE);
        return response.data;
    },

    // Get all contact types for management (includes inactive)
    getAllContactTypesForManagement: async () => {
        const response = await apiClient.get(CONTACT_TYPE_ENDPOINTS.MANAGEMENT);
        return response.data;
    },

    // Get only active contact types
    getActiveContactTypes: async () => {
        const response = await apiClient.get(CONTACT_TYPE_ENDPOINTS.ACTIVE);
        return response.data;
    },

    // Get contact type by ID
    getContactTypeById: async (id) => {
        const response = await apiClient.get(CONTACT_TYPE_ENDPOINTS.BY_ID(id));
        return response.data;
    },

    // Create new contact type
    createContactType: async (contactTypeData) => {
        const response = await apiClient.post(CONTACT_TYPE_ENDPOINTS.BASE, contactTypeData);
        return response.data;
    },

    // Update existing contact type
    updateContactType: async (id, contactTypeData) => {
        const response = await apiClient.put(CONTACT_TYPE_ENDPOINTS.BY_ID(id), contactTypeData);
        return response.data;
    },

    // Delete contact type (soft delete)
    deleteContactType: async (id) => {
        const response = await apiClient.delete(CONTACT_TYPE_ENDPOINTS.BY_ID(id));
        return response.data;
    }
};

export default contactTypeService;






