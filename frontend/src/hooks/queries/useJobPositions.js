import { useQuery } from '@tanstack/react-query';
import { jobPositionService } from '../../services/hr/jobPositionService';

export const useJobPositions = (options = {}) => {
    return useQuery({
        queryKey: ['jobPositions'],
        queryFn: async () => {
            const response = await jobPositionService.getAll();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
