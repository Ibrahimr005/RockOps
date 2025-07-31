// src/services/hr/jobPositionService.js
import apiClient from '../../utils/apiClient.js';
import { JOB_POSITION_ENDPOINTS } from '../../config/api.config.js';

export const jobPositionService = {

    // Get all job positions
    getAll: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get all job positions as DTOs
    getAllDTOs: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get job position by ID
    getById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(id));
    },

    // Get job position DTO by ID
    getDTOById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DTO_BY_ID(id));
    },

    // Create new job position
    create: (jobPositionData) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE, jobPositionData);
    },

    // Create new job position using DTO
    createDTO: (jobPositionDTO) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE_DTO, jobPositionDTO);
    },

    // Update existing job position
    update: (id, jobPositionData) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE(id), jobPositionData);
    },

    // Update existing job position using DTO
    updateDTO: (id, jobPositionDTO) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE_DTO(id), jobPositionDTO);
    },

    // Delete job position
    delete: (id) => {
        return apiClient.delete(JOB_POSITION_ENDPOINTS.DELETE(id));
    },

    // Get employees by job position ID
    getEmployees: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEES(id));
    },

    // Get job position with full details including all related entities
    getDetails: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DETAILS(id));
    },

    // Get promotion statistics for a job position
    getPromotionStatistics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_STATISTICS(id));
    },

    // Get all promotions FROM this position
    getPromotionsFrom: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_FROM(id));
    },

    // Get all promotions TO this position
    getPromotionsTo: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_TO(id));
    },

    // Get pending promotions FROM this position
    getPendingPromotionsFrom: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_FROM_PENDING(id));
    },

    // Get pending promotions TO this position
    getPendingPromotionsTo: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_TO_PENDING(id));
    },

    // Get career path suggestions from this position
    getCareerPathSuggestions: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.CAREER_PATH_SUGGESTIONS(id));
    },

    // Get employees eligible for promotion from this position
    getEmployeesEligibleForPromotion: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEES_ELIGIBLE_FOR_PROMOTION(id));
    },

    // Get salary statistics for this position
    getSalaryStatistics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.SALARY_STATISTICS(id));
    },

    // Get position validation status
    getValidation: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATION(id));
    },

    // Get comprehensive position analytics
    getAnalytics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.ANALYTICS(id));
    },

    // Check if position can be safely deleted
    getCanDelete: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.CAN_DELETE(id));
    },

    // Get positions that can be promoted to from this position
    getPromotionDestinations: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_DESTINATIONS(id));
    },

    // Get positions that commonly promote to this position
    getPromotionSources: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_SOURCES(id));
    },

    // Get detailed employee analytics for this position
    getEmployeeAnalytics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEE_ANALYTICS(id));
    },

    getPromotionStatsSimple: (id) => {
        return apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/promotion-stats-simple`);
    },

    getPromotionsFromSimple: (id) => {
        return apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/promotions-from-simple`);
    },

    getPromotionsToSimple: (id) => {
        return apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/promotions-to-simple`);
    },

    // Updated comprehensive details method
    getComprehensiveDetailsSimplified: async (id) => {
        try {
            // Use the optimized backend endpoint
            const detailsResponse = await apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/details`);
            const position = detailsResponse.data;

            // Get simplified additional data with proper error handling
            const [salaryStats, validation, promotionStatsSimple] = await Promise.allSettled([
                apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/salary-statistics`),
                apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/validation`),
                apiClient.get(`${JOB_POSITION_ENDPOINTS.BASE}/${id}/promotion-stats-simple`)
            ]);

            return {
                position,
                salaryStats: salaryStats.status === 'fulfilled' ? salaryStats.value.data : {},
                validation: validation.status === 'fulfilled' ? validation.value.data : {},
                promotionStatsSimple: promotionStatsSimple.status === 'fulfilled' ? promotionStatsSimple.value.data : {}
            };
        } catch (error) {
            console.error('Error fetching comprehensive details:', error);
            throw error;
        }
    }
};