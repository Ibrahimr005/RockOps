import { useQuery } from '@tanstack/react-query';
import { itemCategoryService } from '../../services/itemCategoryService';

export const useItemCategories = (options = {}) => {
    return useQuery({
        queryKey: ['itemCategories', 'parents'],
        queryFn: async () => {
            const response = await itemCategoryService.getParents();
            return response.data ?? response;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useAllItemCategories = (options = {}) => {
    return useQuery({
        queryKey: ['itemCategories', 'all'],
        queryFn: async () => {
            const response = await itemCategoryService.getAll();
            return response.data ?? response;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
