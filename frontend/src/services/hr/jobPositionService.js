// src/services/hr/jobPositionService.js
import apiClient from '../../utils/apiClient.js';
import { JOB_POSITION_ENDPOINTS } from '../../config/api.config.js';

export const jobPositionService = {

    // ===============================
    // BASIC CRUD OPERATIONS
    // ===============================

    // Get all job positions
    getAll: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get all job positions as DTOs
    getAllDTOs: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get job position by ID
    getById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(id));
    },

    // Get job position DTO by ID
    getDTOById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DTO_BY_ID(id));
    },

    // Create new job position
    create: (jobPositionData) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE, jobPositionData);
    },

    // Create new job position using DTO
    createDTO: (jobPositionDTO) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE_DTO, jobPositionDTO);
    },

    // Update existing job position
    update: (id, jobPositionData) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE(id), jobPositionData);
    },

    // Update existing job position using DTO
    updateDTO: (id, jobPositionDTO) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE_DTO(id), jobPositionDTO);
    },

    // Delete job position
    delete: (id) => {
        return apiClient.delete(JOB_POSITION_ENDPOINTS.DELETE(id));
    },

    // ===============================
    // EMPLOYEE MANAGEMENT
    // ===============================

    // Get employees by job position ID
    getEmployees: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEES(id));
    },

    // Get employees eligible for promotion from this position
    getEmployeesEligibleForPromotion: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEES_ELIGIBLE_FOR_PROMOTION(id));
    },

    // ===============================
    // DETAILED ANALYTICS & REPORTS
    // ===============================

    // Get job position with full details including all related entities
    getDetails: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DETAILS(id));
    },

    // Get comprehensive position analytics
    getAnalytics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.ANALYTICS(id));
    },

    // Get detailed employee analytics for this position
    getEmployeeAnalytics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEE_ANALYTICS(id));
    },

    // Get salary statistics for this position
    getSalaryStatistics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.SALARY_STATISTICS(id));
    },

    // Get position validation status
    getValidation: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATION(id));
    },

    // Check if position can be safely deleted
    getCanDelete: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.CAN_DELETE(id));
    },

    // ===============================
    // PROMOTION MANAGEMENT
    // ===============================

    // Get promotion statistics for a job position
    getPromotionStatistics: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_STATISTICS(id));
    },

    // Get all promotions FROM this position
    getPromotionsFrom: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_FROM(id));
    },

    // Get all promotions TO this position
    getPromotionsTo: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_TO(id));
    },

    // Get pending promotions FROM this position
    getPendingPromotionsFrom: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_FROM_PENDING(id));
    },

    // Get pending promotions TO this position
    getPendingPromotionsTo: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_TO_PENDING(id));
    },

    // Get career path suggestions from this position
    getCareerPathSuggestions: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.CAREER_PATH_SUGGESTIONS(id));
    },

    // Get positions that can be promoted to from this position
    getPromotionDestinations: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_DESTINATIONS(id));
    },

    // Get positions that commonly promote to this position
    getPromotionSources: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_SOURCES(id));
    },

    // ===============================
    // SIMPLIFIED PROMOTION ENDPOINTS
    // ===============================

    // Get simplified promotion statistics
    getPromotionStatsSimple: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_STATS_SIMPLE(id));
    },

    // Get simplified promotions from this position
    getPromotionsFromSimple: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_FROM_SIMPLE(id));
    },

    // Get simplified promotions to this position
    getPromotionsToSimple: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTIONS_TO_SIMPLE(id));
    },

    // ===============================
    // HIERARCHY MANAGEMENT
    // ===============================

    // Get job position hierarchy (root positions)
    getHierarchy: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.HIERARCHY);
    },

    // Get child positions for a given parent position
    getChildren: (parentId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.CHILDREN(parentId));
    },

    // Get valid promotion targets for a position (only parent position)
    getValidPromotionTargets: (positionId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_TARGETS(positionId));
    },

    // Validate if a promotion target is valid for the current position
    validatePromotionTarget: (currentPositionId, targetPositionId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATE_PROMOTION_TARGET(currentPositionId, targetPositionId));
    },

    // Get the hierarchy path for a position
    getHierarchyPath: (positionId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.HIERARCHY_PATH(positionId));
    },

    // Get all positions at a specific hierarchy level
    getPositionsByHierarchyLevel: (level) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BY_HIERARCHY_LEVEL(level));
    },

    // Get organization structure as a tree
    getOrganizationStructure: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.ORGANIZATION_STRUCTURE);
    },

    // ===============================
    // PROMOTION ELIGIBILITY
    // ===============================

    // Get positions that can be promoted from (have employees and parent positions available)
    getPositionsEligibleForPromotionFrom: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.ELIGIBLE_FOR_PROMOTION_FROM);
    },

    // Get positions that can be promoted to (active positions that are parent positions)
    getPositionsEligibleForPromotionTo: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.ELIGIBLE_FOR_PROMOTION_TO);
    },

    // ===============================
    // DEPARTMENT & VALIDATION
    // ===============================

    // Get department hierarchy with position counts
    getDepartmentHierarchy: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DEPARTMENT_HIERARCHY);
    },

    // Validate hierarchy consistency
    validateHierarchyConsistency: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATE_HIERARCHY);
    },

    // ===============================
    // PROMOTION PATH NAVIGATION
    // ===============================

    // Get promotion path between two positions
    getPromotionPath: (fromPositionId, toPositionId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_PATH(fromPositionId, toPositionId));
    },

    // Get all possible next promotion steps for a position
    getNextPromotionSteps: (positionId) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.NEXT_PROMOTION_STEPS(positionId));
    },

    // Get positions at risk (no clear promotion path)
    getPositionsAtRisk: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.POSITIONS_AT_RISK);
    },

    // ===============================
    // UTILITY METHODS
    // ===============================

    // Check if position is a root position (no parent)
    isRootPosition: async (positionId) => {
        try {
            const response = await apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(positionId));
            return response.data.isRootPosition || false;
        } catch (error) {
            console.error('Error checking if position is root:', error);
            return false;
        }
    },

    // Get complete hierarchy chain for a position (from root to current)
    getHierarchyChain: async (positionId) => {
        try {
            const response = await apiClient.get(JOB_POSITION_ENDPOINTS.HIERARCHY_PATH(positionId));
            return response.data;
        } catch (error) {
            console.error('Error getting hierarchy chain:', error);
            return '';
        }
    },

    // Get all descendants of a position (all children recursively)
    getAllDescendants: async (positionId) => {
        try {
            const descendants = [];
            const getChildrenRecursively = async (parentId) => {
                const response = await apiClient.get(JOB_POSITION_ENDPOINTS.CHILDREN(parentId));
                const children = response.data || [];

                for (const child of children) {
                    descendants.push(child);
                    await getChildrenRecursively(child.id);
                }
            };

            await getChildrenRecursively(positionId);
            return descendants;
        } catch (error) {
            console.error('Error getting all descendants:', error);
            return [];
        }
    },

    // Check if position can be promoted (has parent and employees)
    canBePromotedFrom: async (positionId) => {
        try {
            const [positionResponse, targetsResponse] = await Promise.all([
                apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(positionId)),
                apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_TARGETS(positionId))
            ]);

            const position = positionResponse.data;
            const targets = targetsResponse.data || [];

            return position.totalEmployeeCount > 0 && targets.length > 0;
        } catch (error) {
            console.error('Error checking if position can be promoted from:', error);
            return false;
        }
    },

    // Get hierarchy level of a position
    getHierarchyLevel: async (positionId) => {
        try {
            const response = await apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(positionId));
            return response.data.hierarchyLevel || 0;
        } catch (error) {
            console.error('Error getting hierarchy level:', error);
            return 0;
        }
    },

    // Check if position has children
    hasChildren: async (positionId) => {
        try {
            const response = await apiClient.get(JOB_POSITION_ENDPOINTS.CHILDREN(positionId));
            return response.data && response.data.length > 0;
        } catch (error) {
            console.error('Error checking if position has children:', error);
            return false;
        }
    },

    // ===============================
    // COMPREHENSIVE DATA METHODS
    // ===============================

    // Get complete position overview with all related data
    getComprehensiveOverview: async (id) => {
        try {
            const [
                position,
                analytics,
                promotionStats,
                hierarchy,
                salaryStats,
                validation
            ] = await Promise.allSettled([
                apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(id)),
                apiClient.get(JOB_POSITION_ENDPOINTS.ANALYTICS(id)),
                apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_STATS_SIMPLE(id)),
                Promise.all([
                    apiClient.get(JOB_POSITION_ENDPOINTS.CHILDREN(id)),
                    apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_TARGETS(id)),
                    apiClient.get(JOB_POSITION_ENDPOINTS.HIERARCHY_PATH(id))
                ]),
                apiClient.get(JOB_POSITION_ENDPOINTS.SALARY_STATISTICS(id)),
                apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATION(id))
            ]);

            let hierarchyData = {};
            if (hierarchy.status === 'fulfilled') {
                const [children, targets, path] = hierarchy.value;
                hierarchyData = {
                    children: children.data || [],
                    promotionTargets: targets.data || [],
                    hierarchyPath: path.data || ''
                };
            }

            return {
                position: position.status === 'fulfilled' ? position.value.data : null,
                analytics: analytics.status === 'fulfilled' ? analytics.value.data : {},
                promotionStats: promotionStats.status === 'fulfilled' ? promotionStats.value.data : {},
                hierarchy: hierarchyData,
                salaryStats: salaryStats.status === 'fulfilled' ? salaryStats.value.data : {},
                validation: validation.status === 'fulfilled' ? validation.value.data : {}
            };
        } catch (error) {
            console.error('Error fetching comprehensive overview:', error);
            throw error;
        }
    },

    // Updated comprehensive details method with hierarchy
    getComprehensiveDetailsSimplified: async (id) => {
        try {
            // Use the optimized backend endpoint
            const detailsResponse = await apiClient.get(JOB_POSITION_ENDPOINTS.DETAILS(id));
            const position = detailsResponse.data;

            // Get additional data with proper error handling
            const [salaryStats, validation, promotionStatsSimple, hierarchyInfo] = await Promise.allSettled([
                apiClient.get(JOB_POSITION_ENDPOINTS.SALARY_STATISTICS(id)),
                apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATION(id)),
                apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_STATS_SIMPLE(id)),
                Promise.all([
                    apiClient.get(JOB_POSITION_ENDPOINTS.CHILDREN(id)),
                    apiClient.get(JOB_POSITION_ENDPOINTS.PROMOTION_TARGETS(id)),
                    apiClient.get(JOB_POSITION_ENDPOINTS.HIERARCHY_PATH(id)),
                    apiClient.get(JOB_POSITION_ENDPOINTS.NEXT_PROMOTION_STEPS(id))
                ])
            ]);

            let hierarchyData = {};
            if (hierarchyInfo.status === 'fulfilled') {
                const [children, targets, path, nextSteps] = hierarchyInfo.value;
                hierarchyData = {
                    children: children.data || [],
                    promotionTargets: targets.data || [],
                    hierarchyPath: path.data || '',
                    nextPromotionSteps: nextSteps.data || []
                };
            }

            return {
                position,
                salaryStats: salaryStats.status === 'fulfilled' ? salaryStats.value.data : {},
                validation: validation.status === 'fulfilled' ? validation.value.data : {},
                promotionStatsSimple: promotionStatsSimple.status === 'fulfilled' ? promotionStatsSimple.value.data : {},
                hierarchy: hierarchyData
            };
        } catch (error) {
            console.error('Error fetching comprehensive details:', error);
            throw error;
        }
    },

    // ===============================
    // BULK OPERATIONS
    // ===============================

    // Get multiple positions by IDs
    getMultiplePositions: async (positionIds) => {
        try {
            const promises = positionIds.map(id =>
                apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(id))
            );
            const responses = await Promise.allSettled(promises);
            return responses
                .filter(response => response.status === 'fulfilled')
                .map(response => response.value.data);
        } catch (error) {
            console.error('Error fetching multiple positions:', error);
            return [];
        }
    },

    // Validate multiple promotion paths
    validateMultiplePromotionPaths: async (promotionPairs) => {
        try {
            const validationPromises = promotionPairs.map(({ fromId, toId }) =>
                apiClient.get(JOB_POSITION_ENDPOINTS.VALIDATE_PROMOTION_TARGET(fromId, toId))
            );
            const responses = await Promise.allSettled(validationPromises);
            return responses.map((response, index) => ({
                ...promotionPairs[index],
                isValid: response.status === 'fulfilled' ? response.value.data : false
            }));
        } catch (error) {
            console.error('Error validating multiple promotion paths:', error);
            return promotionPairs.map(pair => ({ ...pair, isValid: false }));
        }
    },

    // ===============================
    // SEARCH AND FILTER
    // ===============================

    // Search positions by various criteria
    searchPositions: async (searchCriteria) => {
        try {
            // This would require a backend search endpoint
            // For now, we'll get all positions and filter client-side
            const response = await apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
            const positions = response.data || [];

            return positions.filter(position => {
                if (searchCriteria.name) {
                    const nameMatch = position.positionName.toLowerCase()
                        .includes(searchCriteria.name.toLowerCase());
                    if (!nameMatch) return false;
                }

                if (searchCriteria.department) {
                    const deptMatch = position.departmentName &&
                        position.departmentName.toLowerCase()
                            .includes(searchCriteria.department.toLowerCase());
                    if (!deptMatch) return false;
                }

                if (searchCriteria.contractType) {
                    if (position.contractType !== searchCriteria.contractType) return false;
                }

                if (searchCriteria.hierarchyLevel !== undefined) {
                    if (position.hierarchyLevel !== searchCriteria.hierarchyLevel) return false;
                }

                if (searchCriteria.isRootPosition !== undefined) {
                    if (position.isRootPosition !== searchCriteria.isRootPosition) return false;
                }

                return true;
            });
        } catch (error) {
            console.error('Error searching positions:', error);
            return [];
        }
    }
};