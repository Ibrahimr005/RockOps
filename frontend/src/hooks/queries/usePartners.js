import { useQuery } from '@tanstack/react-query';
import { partnerService } from '../../services/partnerService';

export const usePartners = (options = {}) => {
    return useQuery({
        queryKey: ['partners'],
        queryFn: async () => {
            const response = await partnerService.getAll();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
