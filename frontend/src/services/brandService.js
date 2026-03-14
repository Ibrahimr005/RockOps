import apiClient from '../utils/apiClient';
import { EQUIPMENT_ENDPOINTS } from '../config/api.config';

export const brandService = {
    // Get all brands
    getAllBrands: () => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BRANDS);
    },

    // Get brand by ID
    getBrandById: (id) => {
        return apiClient.get(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id));
    },

    // Create new brand
    createBrand: (brandData) => {
        return apiClient.post(EQUIPMENT_ENDPOINTS.BRANDS, brandData);
    },

    // Update brand
    updateBrand: (id, brandData) => {
        return apiClient.put(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id), brandData);
    },

    // Delete brand
    deleteBrand: (id) => {
        return apiClient.delete(EQUIPMENT_ENDPOINTS.BRAND_BY_ID(id));
    }
}; 