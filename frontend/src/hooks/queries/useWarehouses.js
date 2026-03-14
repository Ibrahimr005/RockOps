import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '../../services/warehouseService';

export const useWarehouses = (options = {}) => {
    return useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const response = await warehouseService.getAll();
            return response.data ?? response;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
