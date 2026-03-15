import { useQuery } from '@tanstack/react-query';
import { inventoryValuationService } from '../../services/finance/inventoryValuationService';

export const useInventoryValuations = (options = {}) => {
    return useQuery({
        queryKey: ['inventoryValuations'],
        queryFn: async () => {
            const response = await inventoryValuationService.getAllSiteValuations();
            return Array.isArray(response) ? response : (response.data ?? response);
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
};
