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