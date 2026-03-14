import { useQuery } from '@tanstack/react-query';
import { itemTypeService } from '../../services/itemTypeService';

export const useItemTypes = (options = {}) => {
    return useQuery({
        queryKey: ['itemTypes'],
        queryFn: async () => {
            const response = await itemTypeService.getAll();
            return response.data ?? response;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
