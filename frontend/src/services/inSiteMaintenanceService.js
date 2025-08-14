import apiClient from '../utils/apiClient';
import { INSITE_MAINTENANCE_ENDPOINTS } from '../config/api.config';

export const inSiteMaintenanceService = {
    // Get all maintenance records for equipment
    getByEquipmentId: (equipmentId) => {
        return apiClient.get(INSITE_MAINTENANCE_ENDPOINTS.BASE(equipmentId));
    },

    // Get maintenance analytics for dashboard
    getAnalytics: (equipmentId) => {
        return apiClient.get(INSITE_MAINTENANCE_ENDPOINTS.ANALYTICS(equipmentId));
    },

    // Get all technicians
    getTechnicians: (equipmentId) => {
        return apiClient.get(INSITE_MAINTENANCE_ENDPOINTS.TECHNICIANS(equipmentId));
    },

    // Create new maintenance record
    create: (equipmentId, maintenanceData) => {
        return apiClient.post(INSITE_MAINTENANCE_ENDPOINTS.CREATE(equipmentId), maintenanceData);
    },

    // Update maintenance record
    update: (equipmentId, maintenanceId, maintenanceData) => {
        return apiClient.put(INSITE_MAINTENANCE_ENDPOINTS.UPDATE(equipmentId, maintenanceId), maintenanceData);
    },

    // Delete maintenance record
    delete: (equipmentId, maintenanceId) => {
        return apiClient.delete(INSITE_MAINTENANCE_ENDPOINTS.DELETE(equipmentId, maintenanceId));
    },

    // Link transaction to maintenance
    linkTransaction: (equipmentId, maintenanceId, transactionId) => {
        return apiClient.post(INSITE_MAINTENANCE_ENDPOINTS.LINK_TRANSACTION(equipmentId, maintenanceId, transactionId));
    },

    // Create maintenance transaction
    createMaintenanceTransaction: (equipmentId, maintenanceId, senderId, senderType, batchNumber, items) => {
        return apiClient.post(
            `${INSITE_MAINTENANCE_ENDPOINTS.CREATE_TRANSACTION(equipmentId, maintenanceId)}?senderId=${senderId}&senderType=${senderType}&batchNumber=${batchNumber}`,
            items
        );
    },

    // Check if transaction exists by batch number
    checkTransactionExists: (equipmentId, batchNumber) => {
        return apiClient.get(INSITE_MAINTENANCE_ENDPOINTS.CHECK_TRANSACTION(equipmentId, batchNumber));
    },

    // Get all maintenance records across all equipment (for dashboard)
    getAllMaintenanceRecords: () => {
        return apiClient.get('/api/maintenance/all');
    },

    // Get maintenance summary statistics
    getMaintenanceSummary: () => {
        return apiClient.get('/api/maintenance/summary');
    },

    // Validate transaction inline during maintenance creation
    validateTransactionInline: (equipmentId, maintenanceId, transactionId, validationData) => {
        return apiClient.post(
            INSITE_MAINTENANCE_ENDPOINTS.VALIDATE_TRANSACTION(equipmentId, maintenanceId, transactionId), 
            validationData
        );
    },

    // Create transaction for maintenance (new batch validation workflow)
    createTransactionForMaintenance: (equipmentId, maintenanceId, transactionData) => {
        const params = new URLSearchParams({
            senderId: transactionData.senderId,
            senderType: transactionData.senderType,
            batchNumber: transactionData.batchNumber.toString()
        });

        if (transactionData.transactionDate) {
            params.append('transactionDate', transactionData.transactionDate);
        }

        if (transactionData.description) {
            params.append('description', transactionData.description);
        }

        return apiClient.post(
            `${INSITE_MAINTENANCE_ENDPOINTS.CREATE_TRANSACTION(equipmentId, maintenanceId)}?${params.toString()}`,
            transactionData.items
        );
    },

    // Validate transaction for maintenance (new batch validation workflow)
    validateTransactionForMaintenance: (equipmentId, maintenanceId, transactionId, validationData) => {
        return apiClient.post(
            INSITE_MAINTENANCE_ENDPOINTS.VALIDATE_TRANSACTION(equipmentId, maintenanceId, transactionId),
            validationData
        );
    }
}; 