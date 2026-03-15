import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';

export const useAdminUsers = (options = {}) => {
    return useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            const response = await adminService.getUsers();
            return response.data;
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
};
