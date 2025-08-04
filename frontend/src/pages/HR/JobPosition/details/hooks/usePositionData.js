import { useState, useEffect } from 'react';
import { jobPositionService } from '../../../../../services/hr/jobPositionService.js';

export const usePositionData = (id) => {
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [positionData, setPositionData] = useState({
        employees: [],
        vacancies: [],
        promotionStats: {},
        salaryStats: {},
        validation: {},
        // Simplified promotion data
        promotionsFromSimple: [],
        promotionsToSimple: []
    });

    const fetchPositionDetails = async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Use the simplified comprehensive details method
            const comprehensiveData = await jobPositionService.getComprehensiveDetailsSimplified(id);
            const { position: positionInfo, salaryStats, validation, promotionStatsSimple } = comprehensiveData;

            setPosition(positionInfo);

            // Extract simple data from the position object with proper null checks
            const employees = positionInfo?.employees || [];
            const vacancies = positionInfo?.vacancies || [];

            // Get simplified promotion lists only when needed
            let promotionsFromSimple = [];
            let promotionsToSimple = [];

            // Only fetch detailed promotion lists if there are any promotions
            if (promotionStatsSimple?.totalPromotionsFrom > 0 || promotionStatsSimple?.totalPromotionsTo > 0) {
                try {
                    const [fromResponse, toResponse] = await Promise.allSettled([
                        jobPositionService.getPromotionsFromSimple(id),
                        jobPositionService.getPromotionsToSimple(id)
                    ]);

                    promotionsFromSimple = fromResponse.status === 'fulfilled' ? fromResponse.value.data : [];
                    promotionsToSimple = toResponse.status === 'fulfilled' ? toResponse.value.data : [];
                } catch (promotionError) {
                    console.warn('Failed to load detailed promotion data:', promotionError);
                }
            }

            const newPositionData = {
                employees,
                vacancies,
                promotionStats: promotionStatsSimple || {},
                salaryStats: salaryStats || {},
                validation: validation || {},
                promotionsFromSimple,
                promotionsToSimple,
                // Derived data for compatibility
                careerPaths: promotionStatsSimple?.topPromotionDestinations ?
                    Object.keys(promotionStatsSimple.topPromotionDestinations).slice(0, 5) : [],
                eligibleEmployees: employees.filter(emp => emp?.eligibleForPromotion) || []
            };

            setPositionData(newPositionData);

        } catch (err) {
            console.error('Error fetching position details:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load position details';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositionDetails();
    }, [id]);

    return {
        position,
        positionData,
        loading,
        error,
        refetch: fetchPositionDetails
    };
};