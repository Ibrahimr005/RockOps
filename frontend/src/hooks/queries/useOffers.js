import { useQuery } from '@tanstack/react-query';
import { offerService } from '../../services/procurement/offerService';

export const useOffers = (status, options = {}) => {
    return useQuery({
        queryKey: status ? ['offers', status] : ['offers'],
        queryFn: async () => {
            if (status) {
                return await offerService.getByStatus(status);
            }
            return await offerService.getAll();
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
};

/**
 * Hook to fetch offers by multiple statuses (e.g., validated tab needs MANAGERACCEPTED + MANAGERREJECTED).
 */
export const useOffersByMultipleStatuses = (statuses = [], options = {}) => {
    return useQuery({
        queryKey: ['offers', 'multiple', ...statuses],
        queryFn: async () => {
            return await offerService.getMultipleStatuses(statuses);
        },
        staleTime: 2 * 60 * 1000,
        enabled: statuses.length > 0,
        ...options,
    });
};

/**
 * Hook to fetch completed finance offers.
 */
export const useCompletedFinanceOffers = (options = {}) => {
    return useQuery({
        queryKey: ['offers', 'completedFinance'],
        queryFn: async () => {
            return await offerService.getCompletedFinanceOffers();
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
};
