import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance with base configuration
const employeeAxios = axios.create({
    baseURL: `${API_BASE_URL}/api/v1/employees`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Add request interceptor to include auth token
employeeAxios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return Promise.reject('No auth token found');
        }

        // Validate token format
        if (!token.includes('.')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject('Invalid token format');
        }

        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
employeeAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const employeeService = {
    /**
     * Get all employees with full data
     * @returns {Promise} API response with full employee data
     */
    getAll: async () => {
        try {
            return await employeeAxios.get('');
        } catch (error) {
            console.error('Error fetching all employees:', error);
            throw error;
        }
    },

    /**
     * Get employees with minimal data for attendance operations
     * This is more efficient for large lists and attendance operations
     * @returns {Promise} API response with minimal employee data
     */
    getMinimal: async () => {
        try {
            const response = await employeeAxios.get('/minimal');
            return response;
        } catch (error) {
            console.error('Error fetching minimal employee data:', error);
            throw error;
        }
    },

    /**
     * Get employees by contract type with minimal data
     * @param {string} contractType - Contract type (HOURLY, DAILY, MONTHLY)
     * @returns {Promise} API response with filtered employees
     */
    getByContractType: async (contractType) => {
        try {
            const response = await employeeAxios.get(`/by-contract-type/${contractType.toUpperCase()}`);
            return response;
        } catch (error) {
            console.error(`Error fetching employees by contract type ${contractType}:`, error);
            throw error;
        }
    },

    /**
     * Get active employees by contract type with minimal data
     * @param {string} contractType - Contract type (HOURLY, DAILY, MONTHLY)
     * @returns {Promise} API response with filtered active employees
     */
    getActiveByContractType: async (contractType) => {
        try {
            const response = await employeeAxios.get(`/active/by-contract-type/${contractType.toUpperCase()}`);
            return response;
        } catch (error) {
            console.error(`Error fetching active employees by contract type ${contractType}:`, error);
            throw error;
        }
    },

    /**
     * Get all employees grouped by contract type
     * @returns {Promise} API response with employees grouped by contract type
     */
    getGroupedByContractType: async () => {
        try {
            const response = await employeeAxios.get('/grouped-by-contract');
            return response;
        } catch (error) {
            console.error('Error fetching employees grouped by contract type:', error);
            throw error;
        }
    },

    /**
     * Get specific employee types
     */
    getWarehouseWorkers: async () => {
        try {
            const response = await employeeAxios.get('/warehouse-workers');
            return response;
        } catch (error) {
            console.error('Error fetching warehouse workers:', error);
            throw error;
        }
    },

    getWarehouseManagers: async () => {
        try {
            const response = await employeeAxios.get('/warehouse-managers');
            return response;
        } catch (error) {
            console.error('Error fetching warehouse managers:', error);
            throw error;
        }
    },

    getDrivers: async () => {
        try {
            const response = await employeeAxios.get('/drivers');
            return response;
        } catch (error) {
            console.error('Error fetching drivers:', error);
            throw error;
        }
    },

    getTechnicians: async () => {
        try {
            const response = await employeeAxios.get('/technicians');
            return response;
        } catch (error) {
            console.error('Error fetching technicians:', error);
            throw error;
        }
    },

    /**
     * Utility functions for employee data
     */
    utils: {
        /**
         * Get contract type display name
         * @param {string} contractType - Contract type enum value
         * @returns {string} Human-readable contract type
         */
        getContractTypeDisplay: (contractType) => {
            const contractTypeMap = {
                'HOURLY': 'Hourly Contract',
                'DAILY': 'Daily Contract',
                'MONTHLY': 'Monthly Contract'
            };
            return contractTypeMap[contractType] || contractType;
        },

        /**
         * Get contract type color for UI
         * @param {string} contractType - Contract type enum value
         * @returns {string} CSS color value
         */
        getContractTypeColor: (contractType) => {
            const colorMap = {
                'HOURLY': '#2196f3',   // Blue
                'DAILY': '#ff9800',    // Orange
                'MONTHLY': '#4caf50'   // Green
            };
            return colorMap[contractType] || '#9e9e9e';
        },

        /**
         * Filter employees by multiple criteria
         * @param {Array} employees - Array of employee objects
         * @param {Object} filters - Filter criteria
         * @returns {Array} Filtered employees
         */
        filterEmployees: (employees, filters = {}) => {
            if (!employees || !Array.isArray(employees)) return [];

            return employees.filter(employee => {
                // Filter by status
                if (filters.status && employee.status !== filters.status) {
                    return false;
                }

                // Filter by contract type
                if (filters.contractType && employee.contractType !== filters.contractType) {
                    return false;
                }

                // Filter by site
                if (filters.siteId && employee.siteId !== filters.siteId) {
                    return false;
                }

                // Filter by department
                if (filters.departmentName && employee.departmentName !== filters.departmentName) {
                    return false;
                }

                // Filter by search term
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    const fullName = employee.fullName?.toLowerCase() || '';
                    const jobPosition = employee.jobPositionName?.toLowerCase() || '';
                    const siteName = employee.siteName?.toLowerCase() || '';

                    if (!fullName.includes(searchTerm) &&
                        !jobPosition.includes(searchTerm) &&
                        !siteName.includes(searchTerm)) {
                        return false;
                    }
                }

                return true;
            });
        },

        /**
         * Group employees by a specific field
         * @param {Array} employees - Array of employee objects
         * @param {string} groupBy - Field to group by
         * @returns {Object} Grouped employees
         */
        groupEmployees: (employees, groupBy) => {
            if (!employees || !Array.isArray(employees)) return {};

            return employees.reduce((groups, employee) => {
                const key = employee[groupBy] || 'Unassigned';
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(employee);
                return groups;
            }, {});
        },

        /**
         * Sort employees by a specific field
         * @param {Array} employees - Array of employee objects
         * @param {string} sortBy - Field to sort by
         * @param {string} direction - Sort direction ('asc' or 'desc')
         * @returns {Array} Sorted employees
         */
        sortEmployees: (employees, sortBy, direction = 'asc') => {
            if (!employees || !Array.isArray(employees)) return [];

            return [...employees].sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];

                // Handle null/undefined values
                if (aValue == null) aValue = '';
                if (bValue == null) bValue = '';

                // Convert to strings for comparison
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (direction === 'desc') {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                } else {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                }
            });
        },

        /**
         * Get employee statistics
         * @param {Array} employees - Array of employee objects
         * @returns {Object} Statistics object
         */
        getEmployeeStats: (employees) => {
            if (!employees || !Array.isArray(employees)) {
                return {
                    total: 0,
                    byContractType: {},
                    byStatus: {},
                    bySite: {},
                    byDepartment: {}
                };
            }

            const stats = {
                total: employees.length,
                byContractType: {},
                byStatus: {},
                bySite: {},
                byDepartment: {}
            };

            employees.forEach(employee => {
                // Count by contract type
                const contractType = employee.contractType || 'Unknown';
                stats.byContractType[contractType] = (stats.byContractType[contractType] || 0) + 1;

                // Count by status
                const status = employee.status || 'Unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Count by site
                const siteName = employee.siteName || 'Unassigned';
                stats.bySite[siteName] = (stats.bySite[siteName] || 0) + 1;

                // Count by department
                const departmentName = employee.departmentName || 'Unassigned';
                stats.byDepartment[departmentName] = (stats.byDepartment[departmentName] || 0) + 1;
            });

            return stats;
        },

        /**
         * Validate employee data for attendance operations
         * @param {Object} employee - Employee object
         * @returns {Object} Validation result
         */
        validateForAttendance: (employee) => {
            const errors = [];
            const warnings = [];

            if (!employee) {
                errors.push('Employee data is required');
                return { isValid: false, errors, warnings };
            }

            // Check required fields
            if (!employee.id) {
                errors.push('Employee ID is required');
            }

            if (!employee.fullName) {
                errors.push('Employee name is required');
            }

            if (!employee.contractType) {
                warnings.push('Contract type not specified, defaulting to MONTHLY');
            } else if (!['HOURLY', 'DAILY', 'MONTHLY'].includes(employee.contractType)) {
                errors.push('Invalid contract type');
            }

            if (!employee.jobPositionName) {
                warnings.push('Job position not assigned');
            }

            if (!employee.siteName) {
                warnings.push('Site not assigned');
            }

            if (employee.status !== 'ACTIVE') {
                warnings.push('Employee is not in ACTIVE status');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                hasWarnings: warnings.length > 0
            };
        },

        /**
         * Format employee data for display
         * @param {Object} employee - Employee object
         * @returns {Object} Formatted employee data
         */
        formatForDisplay: (employee) => {
            if (!employee) return null;

            return {
                id: employee.id,
                displayName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                position: employee.jobPositionName || 'Unassigned',
                contractType: employeeService.utils.getContractTypeDisplay(employee.contractType),
                site: employee.siteName || 'Unassigned',
                department: employee.departmentName || 'Unassigned',
                status: employee.status || 'Unknown',
                photoUrl: employee.photoUrl || '/default-avatar.png',
                isActive: employee.status === 'ACTIVE',
                canCheckIn: employee.contractType === 'HOURLY' && employee.status === 'ACTIVE',
                contractTypeColor: employeeService.utils.getContractTypeColor(employee.contractType)
            };
        }
    },

    /**
     * Cache management for improved performance
     */
    cache: {
        employees: null,
        minimalEmployees: null,
        groupedEmployees: null,
        lastFetch: null,
        cacheTimeout: 5 * 60 * 1000, // 5 minutes

        /**
         * Check if cache is valid
         * @returns {boolean} Whether cache is still valid
         */
        isValid: function() {
            return this.lastFetch && (Date.now() - this.lastFetch) < this.cacheTimeout;
        },

        /**
         * Clear all cached data
         */
        clear: function() {
            this.employees = null;
            this.minimalEmployees = null;
            this.groupedEmployees = null;
            this.lastFetch = null;
        },

        /**
         * Update cache timestamp
         */
        updateTimestamp: function() {
            this.lastFetch = Date.now();
        }
    }
};

export default employeeService;