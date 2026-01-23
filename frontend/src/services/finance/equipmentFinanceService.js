import apiClient from '../../utils/apiClient.js';
import { EQUIPMENT_FINANCE_ENDPOINTS } from '../../config/api.config.js';

export const equipmentFinanceService = {
    // ========================================
    // EQUIPMENT FINANCIALS
    // ========================================

    /**
     * Get financial summary for a specific equipment
     * Includes: purchase price, current inventory value, and total expenses
     * @param {string} equipmentId - UUID of the equipment
     * @returns {Promise<Object>} Financial summary with:
     *   - equipmentId
     *   - equipmentName
     *   - purchasePrice (equipment purchase price)
     *   - currentInventoryValue (value of IN_WAREHOUSE consumables)
     *   - totalExpenses (value of CONSUMED consumables)
     *   - lastUpdated
     */
    getEquipmentFinancials: async (equipmentId) => {
        const response = await apiClient.get(
            EQUIPMENT_FINANCE_ENDPOINTS.EQUIPMENT_FINANCIALS(equipmentId)
        );
        return response.data || response;
    },

    /**
     * Manually trigger financial update for an equipment
     * Useful for recalculating values after data corrections
     * @param {string} equipmentId - UUID of the equipment
     */
    updateEquipmentFinancials: async (equipmentId) => {
        const response = await apiClient.post(
            EQUIPMENT_FINANCE_ENDPOINTS.UPDATE_EQUIPMENT_FINANCIALS(equipmentId)
        );
        return response.data || response;
    },
};