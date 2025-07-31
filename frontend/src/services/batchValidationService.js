// batchValidationService.js - Centralized batch validation for equipment transactions
import apiClient from '../utils/apiClient.js';

export const batchValidationService = {
    /**
     * Validate batch number for equipment transactions using backend validation
     * @param {string} equipmentId - Equipment ID
     * @param {number} batchNumber - Batch number to validate
     * @returns {Promise<Object>} Validation result with scenario and transaction details
     */
    validateBatchForEquipment: async (equipmentId, batchNumber) => {
        try {
            const response = await apiClient.get(
                `/api/v1/batch-validation/equipment/${equipmentId}/batch/${batchNumber}`
            );
            return response.data;
        } catch (error) {
            console.error('Error validating batch for equipment:', error);
            
            // Handle specific error responses
            if (error.response?.status === 400) {
                return {
                    scenario: 'validation_error',
                    found: false,
                    canCreateNew: false,
                    message: error.response.data?.message || 'Invalid batch number format.',
                    batchNumber
                };
            } else if (error.response?.status === 403) {
                return {
                    scenario: 'permission_error',
                    found: false,
                    canCreateNew: false,
                    message: 'You don\'t have permission to validate batch numbers.',
                    batchNumber
                };
            }
            
            throw error;
        }
    },

    /**
     * Validate batch number for equipment maintenance transactions
     * @param {string} equipmentId - Equipment ID
     * @param {string} maintenanceId - Maintenance record ID
     * @param {number} batchNumber - Batch number to validate
     * @returns {Promise<Object>} Enhanced validation result with maintenance context
     */
    validateBatchForEquipmentMaintenance: async (equipmentId, maintenanceId, batchNumber) => {
        try {
            const response = await apiClient.get(
                `/api/v1/batch-validation/equipment/${equipmentId}/maintenance/${maintenanceId}/batch/${batchNumber}`
            );
            return response.data;
        } catch (error) {
            console.error('Error validating batch for equipment maintenance:', error);
            
            // Handle specific error responses
            if (error.response?.status === 400) {
                return {
                    scenario: 'validation_error',
                    found: false,
                    canCreateNew: false,
                    message: error.response.data?.message || 'Invalid batch number format.',
                    batchNumber,
                    maintenanceContext: true,
                    maintenanceId
                };
            }
            
            throw error;
        }
    },

    /**
     * Check if a batch number is available for new transaction creation
     * @param {number} batchNumber - Batch number to check
     * @returns {Promise<boolean>} True if available, false if already in use
     */
    isBatchNumberAvailable: async (batchNumber) => {
        try {
            const response = await apiClient.get(`/api/v1/batch-validation/batch/${batchNumber}/available`);
            return response.data;
        } catch (error) {
            console.error('Error checking batch number availability:', error);
            return false;
        }
    },

    /**
     * Validate batch number uniqueness before transaction creation
     * @param {number} batchNumber - Batch number to validate
     * @returns {Promise<boolean>} True if unique, throws error if not unique
     */
    validateBatchNumberUniqueness: async (batchNumber) => {
        try {
            await apiClient.post(`/api/v1/batch-validation/batch/${batchNumber}/validate-uniqueness`);
            return true;
        } catch (error) {
            if (error.response?.status === 409) {
                throw new Error(error.response.data || `Batch number ${batchNumber} is already in use.`);
            }
            throw error;
        }
    }
};