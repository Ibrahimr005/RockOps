import apiClient from '../utils/apiClient';

const STEP_TYPE_BASE_URL = '/api/v1/steptypes';

export const stepTypeService = {
    /**
     * Get all active step types
     */
    getAllStepTypes: async () => {
        try {
            const response = await apiClient.get(STEP_TYPE_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching step types:', error);
            throw error;
        }
    },

    /**
     * Get all step types for management (including inactive)
     */
    getAllStepTypesForManagement: async () => {
        try {
            const response = await apiClient.get(`${STEP_TYPE_BASE_URL}/management`);
            return response.data;
        } catch (error) {
            console.error('Error fetching step types for management:', error);
            throw error;
        }
    },

    /**
     * Get step type by ID
     */
    getStepTypeById: async (id) => {
        try {
            const response = await apiClient.get(`${STEP_TYPE_BASE_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching step type:', error);
            throw error;
        }
    },

    /**
     * Create new step type
     */
    createStepType: async (stepTypeData) => {
        try {
            const response = await apiClient.post(STEP_TYPE_BASE_URL, stepTypeData);
            return response.data;
        } catch (error) {
            console.error('Error creating step type:', error);
            throw error;
        }
    },

    /**
     * Update existing step type
     */
    updateStepType: async (id, stepTypeData) => {
        try {
            const response = await apiClient.put(`${STEP_TYPE_BASE_URL}/${id}`, stepTypeData);
            return response.data;
        } catch (error) {
            console.error('Error updating step type:', error);
            throw error;
        }
    },

    /**
     * Delete step type (soft delete)
     */
    deleteStepType: async (id) => {
        try {
            const response = await apiClient.delete(`${STEP_TYPE_BASE_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting step type:', error);
            throw error;
        }
    }
};

export default stepTypeService;








