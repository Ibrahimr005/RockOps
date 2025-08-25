// src/services/itemCategoryService.js
import apiClient from '../../utils/apiClient.js';
import { ITEM_CATEGORY_ENDPOINTS } from '../../config/api.config.js';

export const itemCategoryService = {
    getAll: async () => {
        const response = await apiClient.get(ITEM_CATEGORY_ENDPOINTS.BASE);
        return response.data || response;
    },

    create: async (categoryData) => {
        const response = await apiClient.post(ITEM_CATEGORY_ENDPOINTS.CREATE, categoryData);
        return response.data || response;
    },

    getParents: async () => {
        const response = await apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENTS);
        return response.data || response;
    },

    getChildren: async () => {
        const response = await apiClient.get(ITEM_CATEGORY_ENDPOINTS.CHILDREN);
        return response.data || response;
    },

    getChildrenByParent: async (parentId) => {
        const response = await apiClient.get(`/api/v1/itemCategories/children/${parentId}`);
        return response.data || response;
    },

    getParentCategories: async () => {
        const response = await apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENT_CATEGORIES);
        return response.data || response;
    },

    // Add missing update method
    update: async (id, categoryData) => {
        const response = await apiClient.put(`${ITEM_CATEGORY_ENDPOINTS.BASE}/${id}`, categoryData);
        return response.data || response;
    },

    // Add missing delete method
    delete: async (id) => {
        const response = await apiClient.delete(`${ITEM_CATEGORY_ENDPOINTS.BASE}/${id}`);
        return response.data || response;
    }
};