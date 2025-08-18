// src/services/siteService.js
import apiClient from '../utils/apiClient.js';
import { SITE_ENDPOINTS, PARTNER_ENDPOINTS, EMPLOYEE_ENDPOINTS } from '../config/api.config.js';

export const siteService = {
    // Basic site operations
    getAll: async () => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching sites:', error);
            throw error;
        }
    },

    getAllSites: async () => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching all sites:', error);
            throw error;
        }
    },

    getById: async (id) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching site ${id}:`, error);
            throw error;
        }
    },

    // Site relationships
    getSitePartners: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.PARTNERS(siteId));
        } catch (error) {
            console.error(`Error fetching partners for site ${siteId}:`, error);
            throw error;
        }
    },

    getUnassignedPartners: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.UNASSIGNED_PARTNERS(siteId));
        } catch (error) {
            console.error(`Error fetching unassigned partners for site ${siteId}:`, error);
            throw error;
        }
    },

    getSiteEmployees: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.EMPLOYEES(siteId));
        } catch (error) {
            console.error(`Error fetching employees for site ${siteId}:`, error);
            throw error;
        }
    },

    getSiteEquipment: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.EQUIPMENT(siteId));
        } catch (error) {
            console.error(`Error fetching equipment for site ${siteId}:`, error);
            throw error;
        }
    },

    getSiteWarehouses: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.WAREHOUSES(siteId));
        } catch (error) {
            console.error(`Error fetching warehouses for site ${siteId}:`, error);
            throw error;
        }
    },

    getSiteMerchants: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.MERCHANTS(siteId));
        } catch (error) {
            console.error(`Error fetching merchants for site ${siteId}:`, error);
            throw error;
        }
    },

    getSiteFixedAssets: async (siteId) => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.FIXED_ASSETS(siteId));
        } catch (error) {
            console.error(`Error fetching fixed assets for site ${siteId}:`, error);
            throw error;
        }
    },

    // Site admin operations
    addSite: async (siteData) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ADD_SITE, siteData);
        } catch (error) {
            console.error('Error adding site:', error);
            throw error;
        }
    },

    deleteSite: async (id) => {
        try {
            return await apiClient.delete(SITE_ENDPOINTS.ADMIN.DELETE_SITE(id));
        } catch (error) {
            console.error('Error deleting site:', error);
            throw error;
        }
    },

    updateSite: async (id, siteData) => {
        try {
            return await apiClient.put(SITE_ENDPOINTS.ADMIN.UPDATE_SITE(id), siteData);
        } catch (error) {
            console.error(`Error updating site ${id}:`, error);
            throw error;
        }
    },



    addWarehouse: async (siteId, warehouseData) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ADD_WAREHOUSE(siteId), warehouseData);
        } catch (error) {
            console.error(`Error adding warehouse to site ${siteId}:`, error);
            throw error;
        }
    },


    assignEquipment: async (siteId, equipmentId) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_EQUIPMENT(siteId, equipmentId));
        } catch (error) {
            console.error(`Error assigning equipment ${equipmentId} to site ${siteId}:`, error);
            throw error;
        }
    },

    removeEquipment: async (siteId, equipmentId) => {
        try {
            return await apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_EQUIPMENT(siteId, equipmentId));
        } catch (error) {
            console.error(`Error removing equipment ${equipmentId} from site ${siteId}:`, error);
            throw error;
        }
    },

    assignEmployee: async (siteId, employeeId) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_EMPLOYEE(siteId, employeeId));
        } catch (error) {
            console.error(`Error assigning employee ${employeeId} to site ${siteId}:`, error);
            throw error;
        }
    },

    removeEmployee: async (siteId, employeeId) => {
        try {
            return await apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_EMPLOYEE(siteId, employeeId));
        } catch (error) {
            console.error(`Error removing employee ${employeeId} from site ${siteId}:`, error);
            throw error;
        }
    },

    assignWarehouse: async (siteId, warehouseId) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_WAREHOUSE(siteId, warehouseId));
        } catch (error) {
            console.error(`Error assigning warehouse ${warehouseId} to site ${siteId}:`, error);
            throw error;
        }
    },

    assignFixedAsset: async (siteId, fixedAssetId) => {
        try {
            return await apiClient.post(SITE_ENDPOINTS.ADMIN.ASSIGN_FIXED_ASSET(siteId, fixedAssetId));
        } catch (error) {
            console.error(`Error assigning fixed asset ${fixedAssetId} to site ${siteId}:`, error);
            throw error;
        }
    },

// Replace your current assignPartner method with this fixed version:

    assignPartner: async (siteId, partnerId, percentage) => {
        try {
            console.log(`Assigning partner ${partnerId} with ${percentage}% to site ${siteId}`);

            const response = await apiClient.post(
                SITE_ENDPOINTS.ADMIN.ASSIGN_PARTNER(siteId, partnerId),
                { percentage: percentage }, // Send percentage in request body
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response;
        } catch (error) {
            console.error(`Error assigning partner ${partnerId} to site ${siteId}:`, error);
            throw error;
        }
    },

    updatePartnerPercentage: async (siteId, partnerId, percentage) => {
        try {
            return await apiClient.put(SITE_ENDPOINTS.ADMIN.UPDATE_PARTNER_PERCENTAGE(siteId, partnerId), { percentage });
        } catch (error) {
            console.error(`Error updating partner percentage for site ${siteId}, partner ${partnerId}:`, error);
            throw error;
        }
    },

    removePartner: async (siteId, partnerId) => {
        try {
            return await apiClient.delete(SITE_ENDPOINTS.ADMIN.REMOVE_PARTNER(siteId, partnerId));
        } catch (error) {
            console.error(`Error removing partner ${partnerId} from site ${siteId}:`, error);
            throw error;
        }
    },

    // Partner operations
    getAllPartners: async () => {
        try {
            return await apiClient.get(PARTNER_ENDPOINTS.GET_ALL);
        } catch (error) {
            console.error('Error fetching all partners:', error);
            throw error;
        }
    },

    addPartner: async (partnerData) => {
        try {
            return await apiClient.post(PARTNER_ENDPOINTS.ADD, partnerData);
        } catch (error) {
            console.error('Error adding partner:', error);
            throw error;
        }
    },

    // Employee operations
    getUnassignedEmployees: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.UNASSIGNED);
        } catch (error) {
            console.error('Error fetching unassigned employees:', error);
            throw error;
        }
    },

    getUnassignedEquipment: async ()  => {
        try {
            return await apiClient.get(SITE_ENDPOINTS.UNASSIGNED_EQUIPMENT);
        } catch (error) {
            console.error(`Error fetching unassigned equipment:`, error);
            throw error;
        }
    },

    getDrivers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.DRIVERS);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            throw error;
        }
    },

    getWarehouseWorkers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.WAREHOUSE_WORKERS);
        } catch (error) {
            console.error('Error fetching warehouse workers:', error);
            throw error;
        }
    },

    getWarehouseManagers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.WAREHOUSE_MANAGERS);
        } catch (error) {
            console.error('Error fetching warehouse managers:', error);
            throw error;
        }
    },

    getTechnicians: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.TECHNICIANS);
        } catch (error) {
            console.error('Error fetching technicians:', error);
            throw error;
        }
    }
};