import { useQuery } from '@tanstack/react-query';
import { siteService } from '../../services/siteService';

export const useSites = (options = {}) => {
    return useQuery({
        queryKey: ['sites'],
        queryFn: async () => {
            const response = await siteService.getAll();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
