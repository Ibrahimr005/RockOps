import { useQuery } from '@tanstack/react-query';
import { equipmentTypeService } from '../../services/equipmentTypeService';

export const useEquipmentTypes = (options = {}) => {
    return useQuery({
        queryKey: ['equipmentTypes'],
        queryFn: async () => {
            const response = await equipmentTypeService.getAllEquipmentTypes();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
