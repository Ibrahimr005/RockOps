/**
 * Role-Based Access Control (RBAC) Utility
 * Provides functions to check user permissions for various operations
 */

// Define roles that have equipment management permissions
export const EQUIPMENT_MANAGER_ROLES = [
    'Equipment Manager',
    'EQUIPMENT_MANAGER',
    'equipment_manager',
    'MAINTENANCE_EMPLOYEE',
    'MAINTENANCE_MANAGER'
];

// Define admin roles that have all permissions
export const ADMIN_ROLES = [
    'Admin',
    'ADMIN',
    'admin',
    'Administrator',
    'ADMINISTRATOR'
];
/**
 * HR Promotion Role-Based Access Control (RBAC) Utility
 * Provides functions to check user permissions for promotion-related operations
 * Based on Spring Security annotations from PromotionRequestController
 */

// Define roles that have HR promotion management permissions
export const HR_PROMOTION_ROLES = [
    'ADMIN',
    'HR_MANAGER',
    'HR_EMPLOYEE'
];

// Define HR manager roles that can review and implement promotions
export const HR_MANAGER_ROLES = [
    'ADMIN',
    'HR_MANAGER'
];

/**
 * Check if user has basic promotion access (view promotions)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can view promotions
 */
export const hasPromotionViewAccess = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_PROMOTION_ROLES.includes(userRole);
};

/**
 * Check if user can create promotion requests
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can create promotion requests
 */
export const canCreatePromotionRequest = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_PROMOTION_ROLES.includes(userRole);
};

/**
 * Check if user can review promotion requests (approve/reject)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can review promotion requests
 */
export const canReviewPromotions = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can implement approved promotions
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can implement promotions
 */
export const canImplementPromotions = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can view promotion statistics
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can view statistics
 */
export const canViewPromotionStatistics = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can cancel promotion requests
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can cancel promotions
 */
export const canCancelPromotions = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_PROMOTION_ROLES.includes(userRole);
};

/**
 * Check if user can perform bulk actions on promotions
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can perform bulk actions
 */
export const canPerformBulkActions = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can export promotion data
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can export data
 */
export const canExportPromotionData = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can view promotion analytics
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can view analytics
 */
export const canViewPromotionAnalytics = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    return HR_MANAGER_ROLES.includes(userRole);
};

/**
 * Get comprehensive user permissions object for promotions
 * @param {Object} user - User object with role property
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {Object} - Object containing user permissions
 */
export const getPromotionPermissions = (user, isAuthenticated) => {
    if (!isAuthenticated) {
        return {
            canView: false,
            canCreate: false,
            canReview: false,
            canImplement: false,
            canCancel: false,
            canViewStatistics: false,
            canPerformBulkActions: false,
            canExport: false,
            canViewAnalytics: false,
            isHRManager: false,
            isHREmployee: false,
            isAdmin: false
        };
    }

    const userRole = user?.role?.toString();

    return {
        canView: hasPromotionViewAccess(user),
        canCreate: canCreatePromotionRequest(user),
        canReview: canReviewPromotions(user),
        canImplement: canImplementPromotions(user),
        canCancel: canCancelPromotions(user),
        canViewStatistics: canViewPromotionStatistics(user),
        canPerformBulkActions: canPerformBulkActions(user),
        canExport: canExportPromotionData(user),
        canViewAnalytics: canViewPromotionAnalytics(user),
        isHRManager: userRole === 'HR_MANAGER' || userRole === 'ADMIN',
        isHREmployee: userRole === 'HR_EMPLOYEE',
        isAdmin: ADMIN_ROLES.includes(userRole)
    };
};

/**
 * Hook-like function to get promotion permissions for React components
 * @param {Object} authContext - Auth context object with currentUser and isAuthenticated
 * @returns {Object} - Object containing user permissions
 */
export const usePromotionPermissions = (authContext) => {
    const { currentUser, isAuthenticated } = authContext;
    return getPromotionPermissions(currentUser, isAuthenticated);
};

/**
 * Check if user can perform specific action on a promotion based on its status
 * @param {Object} user - User object with role property
 * @param {string} action - Action to check (review, implement, cancel)
 * @param {string} promotionStatus - Current status of the promotion
 * @returns {boolean} - True if user can perform the action
 */
export const canPerformPromotionAction = (user, action, promotionStatus) => {
    if (!user || !action || !promotionStatus) {
        return false;
    }

    const permissions = getPromotionPermissions(user, true);

    switch (action.toLowerCase()) {
        case 'review':
            return permissions.canReview && promotionStatus === 'PENDING';

        case 'implement':
            return permissions.canImplement && promotionStatus === 'APPROVED';

        case 'cancel':
            return permissions.canCancel && ['PENDING', 'APPROVED'].includes(promotionStatus);

        case 'view':
            return permissions.canView;

        case 'edit':
            // Only allow editing for draft or pending requests, and only by HR staff
            return permissions.canCreate && ['DRAFT', 'PENDING'].includes(promotionStatus);

        default:
            return false;
    }
};

/**
 * Get filtered actions based on user permissions and promotion status
 * @param {Object} user - User object with role property
 * @param {Object} promotion - Promotion object with status
 * @returns {Array} - Array of allowed actions
 */
export const getAllowedPromotionActions = (user, promotion) => {
    if (!user || !promotion) {
        return [];
    }

    const actions = [];
    const status = promotion.status;

    // View action is always available for HR users
    if (hasPromotionViewAccess(user)) {
        actions.push('view');
    }

    // Review action for HR Managers on pending requests
    if (canPerformPromotionAction(user, 'review', status)) {
        actions.push('review');
    }

    // Implement action for HR Managers on approved requests
    if (canPerformPromotionAction(user, 'implement', status)) {
        actions.push('implement');
    }

    // Cancel action for HR staff on pending/approved requests
    if (canPerformPromotionAction(user, 'cancel', status)) {
        actions.push('cancel');
    }

    // Edit action for draft/pending requests
    if (canPerformPromotionAction(user, 'edit', status)) {
        actions.push('edit');
    }

    return actions;
};
/**
 * Check if user has equipment manager permissions
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user has equipment manager permissions
 */
export const hasEquipmentManagerPermissions = (user) => {
    if (!user || !user.role) {
        return false;
    }

    const userRole = user.role.toString();
    
    // Check if user is admin (admins have all permissions)
    if (ADMIN_ROLES.includes(userRole)) {
        return true;
    }
    
    // Check if user has equipment manager role
    return EQUIPMENT_MANAGER_ROLES.includes(userRole);
};

/**
 * Check if user can perform write operations (create, edit, delete)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can perform write operations
 */
export const canPerformWriteOperations = (user) => {
    return hasEquipmentManagerPermissions(user);
};

/**
 * Check if user can view equipment data (all authenticated users can view)
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {boolean} - True if user can view equipment data
 */
export const canViewEquipmentData = (isAuthenticated) => {
    return isAuthenticated;
};

/**
 * Get user permissions object
 * @param {Object} user - User object with role property
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {Object} - Object containing user permissions
 */
export const getUserPermissions = (user, isAuthenticated) => {
    return {
        canView: canViewEquipmentData(isAuthenticated),
        canCreate: canPerformWriteOperations(user),
        canEdit: canPerformWriteOperations(user),
        canDelete: canPerformWriteOperations(user),
        isEquipmentManager: hasEquipmentManagerPermissions(user)
    };
};

/**
 * Hook-like function to get permissions for React components
 * @param {Object} authContext - Auth context object with currentUser and isAuthenticated
 * @returns {Object} - Object containing user permissions
 */
export const useEquipmentPermissions = (authContext) => {
    const { currentUser, isAuthenticated } = authContext;
    return getUserPermissions(currentUser, isAuthenticated);
}; 