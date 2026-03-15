import { useQuery } from '@tanstack/react-query';
import { employeeService } from '../../services/hr/employeeService';

export const useEmployees = (options = {}) => {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const response = await employeeService.getAll();
            return response.data;
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
};
