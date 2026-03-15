import { useQuery } from '@tanstack/react-query';
import { departmentService } from '../../services/hr/departmentService';

export const useDepartments = (options = {}) => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const response = await departmentService.getAll();
            return response.data ?? response;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
