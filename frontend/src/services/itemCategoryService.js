// src/services/itemCategoryService.js
import apiClient from '../utils/apiClient';
import { ITEM_CATEGORY_ENDPOINTS } from '../config/api.config';

export const itemCategoryService = {
    getAll: () => {
        return apiClient.get(ITEM_CATEGORY_ENDPOINTS.BASE);
    },

    create: (categoryData) => {
        return apiClient.post(ITEM_CATEGORY_ENDPOINTS.CREATE, categoryData);
    },

    getParents: () => {
        return apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENTS);
    },

    getChildren: () => {
        return apiClient.get(ITEM_CATEGORY_ENDPOINTS.CHILDREN);
    },

    getParentCategories: () => {
        return apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENT_CATEGORIES);
    }
}; 