// src/services/siteService.js
import apiClient from '../utils/apiClient';
import { SITE_ENDPOINTS, PARTNER_ENDPOINTS, EMPLOYEE_ENDPOINTS } from '../config/api.config';

export const siteService = {
    // Basic site operations
    getAll: () => {
        return apiClient.get(SITE_ENDPOINTS.BASE);
    },

    getAllSites: () => {
        return apiClient.get(SITE_ENDPOINTS.BASE);
    },

    getById: (id) => {
        return apiClient.get(SITE_ENDPOINTS.BY_ID(id));
    },

    // Site relationships
    getSitePartners: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.PARTNERS(siteId));
    },

    getUnassignedPartners: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.UNASSIGNED_PARTNERS(siteId));
    },

    getSiteEmployees: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.EMPLOYEES(siteId));
    },

    getUnassignedEmployees: () => {
        return apiClient.get(EMPLOYEE_ENDPOINTS.UNASSIGNED);
    },

    getSiteEquipment: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.EQUIPMENT(siteId));
    },

    getSiteWarehouses: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.WAREHOUSES(siteId));
    },

    getSiteMerchants: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.MERCHANTS(siteId));
    },

    getSiteFixedAssets: (siteId) => {
        return apiClient.get(SITE_ENDPOINTS.FIXED_ASSETS(siteId));
    },

    // Partner operations (used in site forms)
    getAllPartners: () => {
        return apiClient.get(PARTNER_ENDPOINTS.GET_ALL);
    },

    // Site Admin operations
    addSite: (formData) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ADD_SITE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    updateSite: (id, formData) => {
        return apiClient.put(SITE_ENDPOINTS.ADMIN.UPDATE_SITE(id), formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    addWarehouse: (siteId, formData) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ADD_WAREHOUSE(siteId), formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Equipment assignment
    assignEquipment: (siteId, equipmentId) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_EQUIPMENT(siteId, equipmentId));
    },

    removeEquipment: (siteId, equipmentId) => {
        return apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_EQUIPMENT(siteId, equipmentId));
    },

    // Employee assignment
    assignEmployee: (siteId, employeeId) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_EMPLOYEE(siteId, employeeId));
    },

    removeEmployee: (siteId, employeeId) => {
        return apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_EMPLOYEE(siteId, employeeId));
    },

    // Warehouse assignment
    assignWarehouse: (siteId, warehouseId) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_WAREHOUSE(siteId, warehouseId));
    },

    // Fixed asset assignment
    assignFixedAsset: (siteId, fixedAssetId) => {
        return apiClient.post(`/siteadmin/${siteId}/assign-fixedAsset/${fixedAssetId}`);
    },

    // Partner assignment
    assignPartner: (siteId, partnerId, percentage) => {
        return apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_PARTNER(siteId, partnerId), {
            percentage: percentage
        });
    },

    updatePartnerPercentage: (siteId, partnerId, percentage) => {
        return apiClient.put(SITE_ENDPOINTS.ADMIN.UPDATE_PARTNER_PERCENTAGE(siteId, partnerId), {
            percentage: percentage
        });
    },

    removePartner: (siteId, partnerId) => {
        return apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_PARTNER(siteId, partnerId));
    },

    // Equipment operations
    getUnassignedEquipment: () => {
        return apiClient.get('/api/v1/site/unassigned-equipment');
    },

    // Fixed Assets operations
    getUnassignedFixedAssets: () => {
        return apiClient.get('/api/v1/site/unassigned-fixedassets');
    },

    // Warehouse operations
    getWarehouseManagers: () => {
        return apiClient.get('/api/v1/employees/warehouse-managers');
    },

    getWarehouseWorkers: () => {
        return apiClient.get('/api/v1/employees/warehouse-workers');
    },

    // Merchant operations
    getMerchants: (siteId) => {
        return apiClient.get(`/api/v1/site/${siteId}/merchants`);
    }
};