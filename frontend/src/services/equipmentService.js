// src/services/equipmentService.js
import { EQUIPMENT_ENDPOINTS, SITE_ENDPOINTS, MERCHANT_ENDPOINTS, EMPLOYEE_ENDPOINTS } from '../config/api.config';
import apiClient from "../utils/apiClient.js";



export const equipmentService = {
    // Get all equipment
    getAllEquipment: () => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BASE);
    },

    // Get equipment status options
    getEquipmentStatusOptions: () => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.STATUS_OPTIONS);
    },

    // Get equipment by ID
    getEquipmentById: (id) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BY_ID(id));
    },

    // Get equipment main photo
    getEquipmentMainPhoto: (equipmentId) => {
        return apiClient.get(`/minio/equipment/${equipmentId}/main-photo`);
    },

    // Add new equipment
    addEquipment: (formData) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.BASE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Add new equipment using DTO
    addEquipmentWithDTO: (formData) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.CREATE_DTO, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Update existing equipment
    updateEquipment: (id, formData) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.BY_ID(id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Update existing equipment using DTO
    updateEquipmentWithDTO: (id, formData) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.STATUS_DTO(id), formData);
    },

    // Update equipment status
    updateEquipmentStatus: (id, status) => {
        return apiClient.patch(EQUIPMENT_ENDPOINTS.STATUS(id), { status });
    },

    // Update equipment status using DTO
    updateEquipmentStatusWithDTO: (id, statusDTO) => {
        return apiClient.patch(EQUIPMENT_ENDPOINTS.STATUS_DTO(id), statusDTO);
    },

    // Delete equipment
    deleteEquipment: (id) => {
        return apiClient.delete(EQUIPMENT_ENDPOINTS.BY_ID(id));
    },

    // Equipment Type Management
    getAllEquipmentTypes: () => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.TYPES);
    },

    getEquipmentTypeById: (id) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.TYPE_BY_ID(id));
    },

    createEquipmentType: (typeData) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.TYPES, typeData);
    },

    updateEquipmentType: (id, typeData) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.TYPE_BY_ID(id), typeData);
    },

    deleteEquipmentType: (id) => {
        return apiClient.delete(EQUIPMENT_ENDPOINTS.TYPE_BY_ID(id));
    },

    // Equipment Brand Management
    getAllEquipmentBrands: () => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BRANDS);
    },

    getEquipmentBrandById: (id) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id));
    },

    createEquipmentBrand: (brandData) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.BRANDS, brandData);
    },

    updateEquipmentBrand: (id, brandData) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id), brandData);
    },

    deleteEquipmentBrand: (id) => {
        return apiClient.delete(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id));
    },

    // Get equipment by type
    getEquipmentByType: (typeId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BY_TYPE(typeId));
    },

    // Get equipment consumables
    getEquipmentConsumables: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.CONSUMABLES(equipmentId));
    },

    // Get equipment consumables by category (current, surplus, resolved)
    getEquipmentConsumablesByCategory: (equipmentId, category) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.CONSUMABLES_BY_CATEGORY(equipmentId, category));
    },

    // Get equipment consumable analytics
    getConsumableAnalytics: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.CONSUMABLES_ANALYTICS(equipmentId));
    },

    // Site Management
    getAllSites: () => {
        return apiClient.get(SITE_ENDPOINTS.BASE);
    },

    getSiteById: (id) => {
        return apiClient.get(SITE_ENDPOINTS.BY_ID(id));
    },

    // Merchant Management
    getAllMerchants: () => {
        return apiClient.get(MERCHANT_ENDPOINTS.BASE);
    },

    getMerchantById: (id) => {
        return apiClient.get(MERCHANT_ENDPOINTS.BY_ID(id));
    },

    // Employee/Driver Management
    getAllEmployees: () => {
        return apiClient.get(EMPLOYEE_ENDPOINTS.BASE);
    },

    getEmployeeById: (id) => {
        return apiClient.get(EMPLOYEE_ENDPOINTS.BY_ID(id));
    },

    // NEW: Get eligible drivers for equipment type
    getEligibleDriversForEquipmentType: (typeId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.ELIGIBLE_DRIVERS(typeId));
    },

    // NEW: Get drivers for Sarky logs (includes already assigned drivers)
    getDriversForSarkyByEquipmentType: (typeId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.SARKY_DRIVERS(typeId));
    },

    // NEW: Check driver compatibility for equipment
    checkDriverCompatibility: (equipmentId, employeeId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.CHECK_DRIVER_COMPATIBILITY(equipmentId, employeeId));
    },

    // NEW: Get supported work types for equipment type
    getSupportedWorkTypesForEquipmentType: (typeId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.SUPPORTED_WORK_TYPES(typeId));
    },

    // NEW: Manage supported work types for equipment types
    setSupportedWorkTypesForEquipmentType: (typeId, workTypeIds) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.TYPE_SUPPORTED_WORK_TYPES(typeId), workTypeIds);
    },

    addSupportedWorkTypesForEquipmentType: (typeId, workTypeIds) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.TYPE_SUPPORTED_WORK_TYPES(typeId), workTypeIds);
    },

    removeSupportedWorkTypesForEquipmentType: (typeId, workTypeIds) => {
        return apiClient.delete(EQUIPMENT_ENDPOINTS.TYPE_SUPPORTED_WORK_TYPES(typeId), { data: workTypeIds });
    },

    // NEW: Get sarky analytics for equipment dashboard
    getSarkyAnalyticsForEquipment: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.SARKY_ANALYTICS(equipmentId));
    },

    // Update createEquipment method
    createEquipment: (equipmentData) => {
        // Ensure brand is sent as an object with id
        if (equipmentData.brand && typeof equipmentData.brand === 'object') {
            equipmentData.brandId = equipmentData.brand.id;
        }
        return apiClient.post(EQUIPMENT_ENDPOINTS.CREATE_DTO, equipmentData);
    },

    // ========================================
    // EQUIPMENT TRANSACTION MANAGEMENT
    // Enhanced with DTO-based endpoints
    // ========================================

    // Get all transactions for equipment
    getEquipmentTransactions: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.TRANSACTIONS(equipmentId));
    },

    // Get transactions initiated by equipment
    getInitiatedTransactions: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.TRANSACTIONS_INITIATED(equipmentId));
    },

    // Create transaction with equipment as sender
    sendTransaction: (equipmentId, requestData) => {
        const params = new URLSearchParams({
            receiverId: requestData.receiverId,
            receiverType: requestData.receiverType,
            batchNumber: requestData.batchNumber.toString(),
            purpose: requestData.purpose || 'GENERAL'
        });

        if (requestData.transactionDate) {
            params.append('transactionDate', requestData.transactionDate);
        }

        if (requestData.description) {
            params.append('description', requestData.description);
        }

        return apiClient.post(
            `${EQUIPMENT_ENDPOINTS.SEND_TRANSACTION(equipmentId)}?${params.toString()}`,
            requestData.items
        );
    },

    // Create transaction with equipment as receiver
    receiveTransaction: (equipmentId, senderId, senderType, batchNumber, purpose, items, transactionDate, description) => {
        const params = new URLSearchParams({
            senderId: senderId,
            senderType: senderType,
            batchNumber: batchNumber.toString(),
            purpose: purpose || 'GENERAL'
        });

        if (transactionDate) {
            params.append('transactionDate', transactionDate);
        }

        if (description) {
            params.append('description', description);
        }

        return apiClient.post(
            `${EQUIPMENT_ENDPOINTS.RECEIVE_TRANSACTION(equipmentId)}?${params.toString()}`,
            items
        );
    },

    // Accept equipment transaction
    acceptEquipmentTransaction: (equipmentId, transactionId, acceptanceData) => {
        return apiClient.post(
            EQUIPMENT_ENDPOINTS.ACCEPT_TRANSACTION(equipmentId, transactionId),
            acceptanceData
        );
    },

    // Reject equipment transaction
    rejectEquipmentTransaction: (equipmentId, transactionId, rejectionData) => {
        return apiClient.post(
            EQUIPMENT_ENDPOINTS.REJECT_TRANSACTION(equipmentId, transactionId),
            rejectionData
        );
    },

    // Update equipment transaction
    updateEquipmentTransaction: (equipmentId, transactionId, updateData) => {
        const params = new URLSearchParams({
            senderId: updateData.senderId,
            senderType: updateData.senderType,
            receiverId: updateData.receiverId,
            receiverType: updateData.receiverType,
            batchNumber: updateData.batchNumber.toString()
        });

        if (updateData.transactionDate) {
            params.append('transactionDate', updateData.transactionDate);
        }

        if (updateData.purpose) {
            params.append('purpose', updateData.purpose);
        }

        if (updateData.description) {
            params.append('description', updateData.description);
        }

        return apiClient.put(
            `${EQUIPMENT_ENDPOINTS.UPDATE_TRANSACTION(equipmentId, transactionId)}?${params.toString()}`,
            updateData.items
        );
    },

    // ========================================
    // LEGACY EQUIPMENT TRANSACTION METHODS
    // Keep for backward compatibility
    // ========================================

    // Legacy receive transaction method
    receiveTransactionLegacy: (equipmentId, senderId, senderType, batchNumber, purpose, items, transactionDate) => {
        const params = new URLSearchParams({
            senderId,
            senderType,
            batchNumber: batchNumber.toString(),
            purpose: purpose || 'GENERAL'
        });

        if (transactionDate) {
            params.append('transactionDate', transactionDate);
        }

        return apiClient.post(
            `${EQUIPMENT_ENDPOINTS.RECEIVE_TRANSACTION(equipmentId)}?${params.toString()}`,
            items
        );
    },

    // ========================================
    // MAINTENANCE INTEGRATION METHODS
    // Enhanced transaction acceptance with maintenance linking
    // ========================================

    // Search maintenance records for linking
    searchMaintenanceRecords: (equipmentId, searchCriteria) => {
        const params = new URLSearchParams();
        
        if (searchCriteria.startDate) params.append('startDate', searchCriteria.startDate);
        if (searchCriteria.endDate) params.append('endDate', searchCriteria.endDate);
        if (searchCriteria.technicianId) params.append('technicianId', searchCriteria.technicianId);
        if (searchCriteria.maintenanceTypeId) params.append('maintenanceTypeId', searchCriteria.maintenanceTypeId);
        if (searchCriteria.status) params.append('status', searchCriteria.status);
        if (searchCriteria.description) params.append('description', searchCriteria.description);
        if (searchCriteria.hasLinkedTransactions !== undefined) {
            params.append('hasLinkedTransactions', searchCriteria.hasLinkedTransactions.toString());
        }

        return apiClient.get(`${EQUIPMENT_ENDPOINTS.MAINTENANCE_SEARCH(equipmentId)}?${params.toString()}`);
    },

    // Get maintenance records suitable for linking
    getMaintenanceRecordsForLinking: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.MAINTENANCE_FOR_LINKING(equipmentId));
    },

    // Accept transaction with maintenance integration
    acceptTransactionWithMaintenance: (equipmentId, transactionId, acceptanceData) => {
        return apiClient.post(
            EQUIPMENT_ENDPOINTS.ACCEPT_TRANSACTION_WITH_MAINTENANCE(equipmentId, transactionId),
            acceptanceData
        );
    },

    // Check if batch number exists for equipment
    checkBatchExists: (equipmentId, batchNumber) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.CHECK_BATCH_EXISTS(equipmentId, batchNumber));
    },

    // Get equipment items
    getEquipmentItems: (equipmentId) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.ITEMS(equipmentId));
    },

    // Get equipment by site
    getEquipmentBySite: (siteId) => {
        return apiClient.get(`/api/equipment/site/${siteId}`);
    }
};