import apiClient from '../../utils/apiClient';
import { PROCUREMENT_ENDPOINTS } from '../../config/api.config';

export const procurementService = {
    // Get all merchants (using procurement endpoint)
    getAllMerchants: () => {
        return apiClient.get('/api/v1/merchants'); // Using the merchant endpoint for getting all
    },

    // Get merchant by ID (using procurement endpoint)
    getMerchantById: (id) => {
        return apiClient.get(PROCUREMENT_ENDPOINTS.BY_ID(id));
    },

    // Add a new merchant (using procurement endpoint)
    addMerchant: (merchantData) => {
        return apiClient.post(PROCUREMENT_ENDPOINTS.CREATE, merchantData);
    },

    // Update an existing merchant (using procurement endpoint)
    updateMerchant: (id, merchantData) => {
        return apiClient.put(PROCUREMENT_ENDPOINTS.UPDATE(id), merchantData);
    },

    // Delete a merchant (using procurement endpoint)
    deleteMerchant: (id) => {
        return apiClient.delete(PROCUREMENT_ENDPOINTS.DELETE(id));
    },

    // Get merchants by site
    getMerchantsBySite: (siteId) => {
        return apiClient.get(PROCUREMENT_ENDPOINTS.BY_SITE(siteId));
    },

    // Get merchants by type
    getMerchantsByType: (type) => {
        return apiClient.get(PROCUREMENT_ENDPOINTS.BY_TYPE(type));
    },

    // Search merchants
    searchMerchants: (searchParams) => {
        return apiClient.get(PROCUREMENT_ENDPOINTS.SEARCH, { params: searchParams });
    },

    // UTILITY METHODS

    // Validate merchant data
    validateMerchant: (merchantData) => {
        const errors = [];

        if (!merchantData.name || merchantData.name.trim() === '') {
            errors.push('Merchant name is required');
        }

        if (!merchantData.merchantType || merchantData.merchantType.trim() === '') {
            errors.push('Merchant type is required');
        }

        if (merchantData.contactEmail && !isValidEmail(merchantData.contactEmail)) {
            errors.push('Invalid email format');
        }

        if (merchantData.reliabilityScore && (merchantData.reliabilityScore < 0 || merchantData.reliabilityScore > 10)) {
            errors.push('Reliability score must be between 0 and 10');
        }

        if (merchantData.averageDeliveryTime && merchantData.averageDeliveryTime < 0) {
            errors.push('Average delivery time cannot be negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Get merchant statistics
    getMerchantStats: async () => {
        try {
            const response = await procurementService.getAllMerchants();
            const merchants = response.data || response;

            return {
                total: merchants.length,
                byType: merchants.reduce((acc, merchant) => {
                    acc[merchant.merchantType] = (acc[merchant.merchantType] || 0) + 1;
                    return acc;
                }, {}),
                bySite: merchants.reduce((acc, merchant) => {
                    const siteName = merchant.site?.name || 'Unassigned';
                    acc[siteName] = (acc[siteName] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('Error getting merchant stats:', error);
            return { total: 0, byType: {}, bySite: {} };
        }
    },

    // Get filtered merchants
    getFilteredMerchants: async (filters = {}) => {
        try {
            const response = await procurementService.getAllMerchants();
            let merchants = response.data || response;

            // Apply filters
            if (filters.type) {
                merchants = merchants.filter(m => m.merchantType === filters.type);
            }

            if (filters.siteId) {
                merchants = merchants.filter(m => m.site?.id === filters.siteId);
            }

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                merchants = merchants.filter(m =>
                    m.name.toLowerCase().includes(searchTerm) ||
                    m.contactEmail?.toLowerCase().includes(searchTerm) ||
                    m.address?.toLowerCase().includes(searchTerm)
                );
            }

            if (filters.minReliabilityScore) {
                merchants = merchants.filter(m =>
                    m.reliabilityScore >= filters.minReliabilityScore
                );
            }

            return merchants;
        } catch (error) {
            console.error('Error filtering merchants:', error);
            throw error;
        }
    }
};

// Helper function for email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
