import apiClient from '../utils/apiClient';
import { MAINTENANCE_ENDPOINTS } from '../config/api.config';

export const maintenanceService = {
    // Dashboard
    getDashboard: async () => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.DASHBOARD);
            return response;
        } catch (error) {
            console.error('Error fetching maintenance dashboard:', error);
            throw error;
        }
    },

    // Maintenance Records
    getAllRecords: async () => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.RECORDS.BASE);
            return response;
        } catch (error) {
            console.error('Error fetching maintenance records:', error);
            throw error;
        }
    },

    getRecordById: async (id) => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.RECORDS.BY_ID(id));
            return response;
        } catch (error) {
            console.error('Error fetching maintenance record:', error);
            throw error;
        }
    },

    createRecord: async (recordData) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.RECORDS.CREATE, recordData);
            return response;
        } catch (error) {
            console.error('Error creating maintenance record:', error);
            throw error;
        }
    },

    updateRecord: async (id, recordData) => {
        try {
            const response = await apiClient.put(MAINTENANCE_ENDPOINTS.RECORDS.UPDATE(id), recordData);
            return response;
        } catch (error) {
            console.error('Error updating maintenance record:', error);
            throw error;
        }
    },

    deleteRecord: async (id) => {
        try {
            const response = await apiClient.delete(MAINTENANCE_ENDPOINTS.RECORDS.DELETE(id));
            return response;
        } catch (error) {
            console.error('Error deleting maintenance record:', error);
            throw error;
        }
    },

    // Get records by equipment
    getRecordsByEquipment: async (equipmentId) => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.RECORDS.BY_EQUIPMENT(equipmentId));
            return response;
        } catch (error) {
            console.error('Error fetching maintenance records by equipment:', error);
            throw error;
        }
    },

    // Get active records
    getActiveRecords: async () => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.RECORDS.ACTIVE);
            return response;
        } catch (error) {
            console.error('Error fetching active maintenance records:', error);
            throw error;
        }
    },

    // Get overdue records
    getOverdueRecords: async () => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.RECORDS.OVERDUE);
            return response;
        } catch (error) {
            console.error('Error fetching overdue maintenance records:', error);
            throw error;
        }
    },

    // Maintenance steps
    getStepsByRecord: async (recordId) => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.STEPS.BY_RECORD(recordId));
            return response;
        } catch (error) {
            console.error('Error fetching maintenance steps:', error);
            throw error;
        }
    },

    createStep: async (recordId, stepData) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.STEPS.CREATE(recordId), stepData);
            return response;
        } catch (error) {
            console.error('Error creating maintenance step:', error);
            throw error;
        }
    },

    updateStep: async (stepId, stepData) => {
        try {
            const response = await apiClient.put(MAINTENANCE_ENDPOINTS.STEPS.UPDATE(stepId), stepData);
            return response;
        } catch (error) {
            console.error('Error updating maintenance step:', error);
            throw error;
        }
    },

    completeStep: async (stepId) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.STEPS.COMPLETE(stepId));
            return response;
        } catch (error) {
            console.error('Error completing maintenance step:', error);
            throw error;
        }
    },

    markStepAsFinal: async (stepId) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.STEPS.MARK_AS_FINAL(stepId));
            return response;
        } catch (error) {
            console.error('Error marking step as final:', error);
            throw error;
        }
    },

    handoffStep: async (stepId, handoffData) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.STEPS.HANDOFF(stepId), handoffData);
            return response;
        } catch (error) {
            console.error('Error handoff maintenance step:', error);
            throw error;
        }
    },

    // Contact logs
    getContactLogs: async (recordId) => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.CONTACTS.BY_RECORD(recordId));
            return response;
        } catch (error) {
            console.error('Error fetching contact logs:', error);
            throw error;
        }
    },

    createContactLog: async (stepId, contactLogData) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.CONTACTS.CREATE(stepId), contactLogData);
            return response;
        } catch (error) {
            console.error('Error creating contact log:', error);
            throw error;
        }
    },

    // Assign contact to step
    assignContactToStep: async (stepId, contactId) => {
        try {
            const response = await apiClient.post(MAINTENANCE_ENDPOINTS.STEPS.ASSIGN_CONTACT(stepId, contactId));
            return response;
        } catch (error) {
            console.error('Error assigning contact to step:', error);
            throw error;
        }
    },

    // Get available contacts
    getAvailableContacts: async () => {
        try {
            const response = await apiClient.get(MAINTENANCE_ENDPOINTS.AVAILABLE_CONTACTS);
            return response;
        } catch (error) {
            console.error('Error fetching available contacts:', error);
            throw error;
        }
    },

    deleteStep: async (stepId) => {
        try {
            const response = await apiClient.delete(MAINTENANCE_ENDPOINTS.STEPS.DELETE(stepId));
            return response;
        } catch (error) {
            console.error('Error deleting maintenance step:', error);
            throw error;
        }
    }
};

export default maintenanceService; 