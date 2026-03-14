import { useQuery } from '@tanstack/react-query';
import { merchantService } from '../../services/merchant/merchantService';

export const useMerchants = (options = {}) => {
    return useQuery({
        queryKey: ['merchants'],
        queryFn: async () => {
            const response = await merchantService.getAll();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
