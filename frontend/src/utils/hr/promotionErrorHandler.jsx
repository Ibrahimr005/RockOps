/**
 * HR Promotion Error Handler Utility
 * Provides specialized error handling for promotion-related operations
 */

import { extractErrorMessage } from '../../utils/errorHandler';

/**
 * Enhanced error messages for promotion operations
 */
const PROMOTION_ERROR_MESSAGES = {
    // Authentication & Authorization
    AUTH_EXPIRED: 'Your session has expired. Please log in again.',
    NO_PERMISSION: 'You do not have permission to perform this action.',
    INSUFFICIENT_ROLE: 'Your role does not allow this operation.',

    // Validation Errors
    MISSING_EMPLOYEE: 'Employee information is required.',
    MISSING_POSITION: 'Job position information is required.',
    INVALID_PROMOTION: 'Invalid promotion data provided.',
    SAME_POSITION: 'Cannot promote employee to the same position.',
    MISSING_REASON: 'A reason is required for this action.',

    // Status-related Errors
    NOT_PENDING: 'This promotion request is not in pending status and cannot be reviewed.',
    NOT_APPROVED: 'This promotion request must be approved before it can be implemented.',
    ALREADY_IMPLEMENTED: 'This promotion has already been implemented.',
    ALREADY_COMPLETED: 'Cannot modify a completed promotion request.',
    EFFECTIVE_DATE_FUTURE: 'This promotion cannot be implemented yet. Please check the effective date.',

    // Business Logic Errors
    EMPLOYEE_HAS_PENDING: 'This employee already has a pending promotion request.',
    INSUFFICIENT_TENURE: 'Employee does not meet minimum tenure requirements for promotion.',
    PERFORMANCE_REQUIREMENT: 'Employee does not meet performance requirements for this promotion.',
    BUDGET_EXCEEDED: 'This promotion would exceed the department budget.',

    // System Errors
    SERVICE_UNAVAILABLE: 'Promotion service is temporarily unavailable. Please try again later.',
    DATA_CONFLICT: 'Data conflict detected. Please refresh and try again.',
    EXPORT_FAILED: 'Failed to export data. Please check your permissions and try again.',

    // Default fallbacks
    GENERIC_CREATE: 'Failed to create promotion request. Please check your input and try again.',
    GENERIC_UPDATE: 'Failed to update promotion request. Please try again.',
    GENERIC_DELETE: 'Failed to delete promotion request. Please try again.',
    GENERIC_FETCH: 'Failed to load promotion data. Please refresh the page.',
    GENERIC_OPERATION: 'Operation failed. Please try again.'
};

/**
 * Maps HTTP status codes to appropriate error messages
 */
const STATUS_CODE_MESSAGES = {
    400: 'Invalid request data. Please check your input.',
    401: PROMOTION_ERROR_MESSAGES.AUTH_EXPIRED,
    403: PROMOTION_ERROR_MESSAGES.NO_PERMISSION,
    404: 'The requested promotion request was not found.',
    409: PROMOTION_ERROR_MESSAGES.DATA_CONFLICT,
    422: 'The provided data is invalid or incomplete.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error occurred. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: PROMOTION_ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    504: 'Request timeout. Please try again.'
};

/**
 * Categorizes errors by type for better handling
 */
const ERROR_CATEGORIES = {
    PERMISSION: ['403', 'forbidden', 'permission', 'unauthorized', 'access denied'],
    AUTHENTICATION: ['401', 'expired', 'session', 'token', 'login'],
    VALIDATION: ['400', '422', 'invalid', 'required', 'missing', 'empty'],
    NOT_FOUND: ['404', 'not found', 'does not exist'],
    CONFLICT: ['409', 'conflict', 'already exists', 'duplicate'],
    BUSINESS_LOGIC: ['pending', 'approved', 'implemented', 'completed', 'status'],
    NETWORK: ['timeout', 'network', 'connection', 'failed to fetch'],
    SERVER: ['500', '502', '503', '504', 'server error', 'internal error']
};

/**
 * Extract and enhance error message for promotion operations
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @param {string} context - Additional context
 * @returns {string} Enhanced error message
 */
export const extractPromotionErrorMessage = (error, operation = '', context = '') => {
    // Start with the basic error message
    let baseMessage = extractErrorMessage(error);
    let enhancedMessage = baseMessage;

    // Check for specific error patterns and enhance the message
    const lowerMessage = baseMessage.toLowerCase();

    // Authentication and authorization errors
    if (ERROR_CATEGORIES.AUTHENTICATION.some(keyword => lowerMessage.includes(keyword))) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.AUTH_EXPIRED;
    } else if (ERROR_CATEGORIES.PERMISSION.some(keyword => lowerMessage.includes(keyword))) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.NO_PERMISSION;
    }
    // Status-related business logic errors
    else if (lowerMessage.includes('not pending') || lowerMessage.includes('pending status')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.NOT_PENDING;
    } else if (lowerMessage.includes('not approved') || lowerMessage.includes('must be approved')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.NOT_APPROVED;
    } else if (lowerMessage.includes('already implemented')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.ALREADY_IMPLEMENTED;
    } else if (lowerMessage.includes('effective date') || lowerMessage.includes('cannot be implemented yet')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.EFFECTIVE_DATE_FUTURE;
    } else if (lowerMessage.includes('already completed') || lowerMessage.includes('completed promotion')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.ALREADY_COMPLETED;
    }
    // Validation errors
    else if (lowerMessage.includes('same position')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.SAME_POSITION;
    } else if (lowerMessage.includes('employee not found')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.MISSING_EMPLOYEE;
    } else if (lowerMessage.includes('position not found')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.MISSING_POSITION;
    } else if (lowerMessage.includes('reason') && lowerMessage.includes('required')) {
        enhancedMessage = PROMOTION_ERROR_MESSAGES.MISSING_REASON;
    }
    // HTTP status code mapping
    else if (error.response?.status) {
        const statusMessage = STATUS_CODE_MESSAGES[error.response.status];
        if (statusMessage) {
            enhancedMessage = statusMessage;
        }
    }
    // Operation-specific fallbacks
    else if (operation) {
        switch (operation.toLowerCase()) {
            case 'create':
                enhancedMessage = PROMOTION_ERROR_MESSAGES.GENERIC_CREATE;
                break;
            case 'update':
            case 'review':
            case 'implement':
                enhancedMessage = PROMOTION_ERROR_MESSAGES.GENERIC_UPDATE;
                break;
            case 'delete':
            case 'cancel':
                enhancedMessage = PROMOTION_ERROR_MESSAGES.GENERIC_DELETE;
                break;
            case 'fetch':
            case 'load':
                enhancedMessage = PROMOTION_ERROR_MESSAGES.GENERIC_FETCH;
                break;
            default:
                enhancedMessage = PROMOTION_ERROR_MESSAGES.GENERIC_OPERATION;
        }
    }

    // Add context if provided
    if (context) {
        enhancedMessage = `${enhancedMessage} (${context})`;
    }

    return enhancedMessage;
};

/**
 * Categorize error for different handling strategies
 * @param {Error} error - The error object
 * @returns {string} Error category
 */
export const categorizePromotionError = (error) => {
    const message = extractErrorMessage(error).toLowerCase();
    const statusCode = error.response?.status?.toString();

    for (const [category, keywords] of Object.entries(ERROR_CATEGORIES)) {
        if (keywords.some(keyword =>
            message.includes(keyword) ||
            (statusCode && keyword === statusCode)
        )) {
            return category;
        }
    }

    return 'UNKNOWN';
};

/**
 * Determine if error is critical (requires immediate attention)
 * @param {Error} error - The error object
 * @returns {boolean} Whether the error is critical
 */
export const isPromotionErrorCritical = (error) => {
    const category = categorizePromotionError(error);
    const criticalCategories = ['SERVER', 'NETWORK'];

    // Authentication errors are critical for user experience
    if (category === 'AUTHENTICATION') {
        return true;
    }

    // Permission errors are critical for security
    if (category === 'PERMISSION') {
        return true;
    }

    return criticalCategories.includes(category);
};

/**
 * Get suggested actions for error recovery
 * @param {Error} error - The error object
 * @param {string} operation - The operation that failed
 * @returns {Array<string>} Array of suggested recovery actions
 */
export const getPromotionErrorRecoveryActions = (error, operation) => {
    const category = categorizePromotionError(error);

    switch (category) {
        case 'AUTHENTICATION':
            return ['Please log in again', 'Refresh the page if the problem persists'];

        case 'PERMISSION':
            return ['Contact your HR administrator for access', 'Verify you have the correct role permissions'];

        case 'VALIDATION':
            return ['Check all required fields are filled', 'Verify the data format is correct', 'Review any validation messages'];

        case 'NOT_FOUND':
            return ['Refresh the page to reload data', 'Verify the item still exists', 'Contact support if the issue persists'];

        case 'CONFLICT':
            return ['Refresh the page to get latest data', 'Try the operation again', 'Check for conflicting changes'];

        case 'BUSINESS_LOGIC':
            return ['Check the promotion status', 'Verify all requirements are met', 'Review the promotion workflow'];

        case 'NETWORK':
            return ['Check your internet connection', 'Try again in a few moments', 'Contact IT support if issue persists'];

        case 'SERVER':
            return ['Try again in a few minutes', 'Contact system administrator', 'Check service status page'];

        default:
            return ['Try the operation again', 'Refresh the page', 'Contact support if the problem continues'];
    }
};

/**
 * Create a comprehensive error handler for promotion operations
 * @param {Function} showError - Error display function
 * @param {Function} showWarning - Warning display function (optional)
 * @returns {Object} Error handler functions
 */
export const createPromotionErrorHandler = (showError, showWarning = null) => {
    return {
        /**
         * Handle promotion creation errors
         */
        handleCreateError: (error, context = '') => {
            const message = extractPromotionErrorMessage(error, 'create', context);
            const category = categorizePromotionError(error);

            if (category === 'VALIDATION' && showWarning) {
                showWarning(message);
            } else {
                showError(message);
            }

            // Log for debugging
            console.error('Promotion creation error:', {
                error,
                message,
                category,
                context,
                recoveryActions: getPromotionErrorRecoveryActions(error, 'create')
            });
        },

        /**
         * Handle promotion review errors
         */
        handleReviewError: (error, context = '') => {
            const message = extractPromotionErrorMessage(error, 'review', context);
            showError(message);

            console.error('Promotion review error:', {
                error,
                message,
                category: categorizePromotionError(error),
                context
            });
        },

        /**
         * Handle promotion implementation errors
         */
        handleImplementError: (error, context = '') => {
            const message = extractPromotionErrorMessage(error, 'implement', context);
            showError(message);

            console.error('Promotion implementation error:', {
                error,
                message,
                category: categorizePromotionError(error),
                context
            });
        },

        /**
         * Handle promotion cancellation errors
         */
        handleCancelError: (error, context = '') => {
            const message = extractPromotionErrorMessage(error, 'cancel', context);
            showError(message);

            console.error('Promotion cancellation error:', {
                error,
                message,
                category: categorizePromotionError(error),
                context
            });
        },

        /**
         * Handle data fetching errors
         */
        handleFetchError: (error, dataType = 'promotion data', context = '') => {
            const message = extractPromotionErrorMessage(error, 'fetch', context);
            const category = categorizePromotionError(error);

            // Non-critical fetch errors (like statistics) can be warnings
            if (!isPromotionErrorCritical(error) && showWarning) {
                showWarning(`Unable to load ${dataType}: ${message}`);
            } else {
                showError(`Failed to load ${dataType}: ${message}`);
            }

            console.error('Promotion fetch error:', {
                error,
                message,
                category,
                dataType,
                context
            });
        },

        /**
         * Handle generic promotion errors
         */
        handleGenericError: (error, operation = 'operation', context = '') => {
            const message = extractPromotionErrorMessage(error, operation, context);
            showError(message);

            console.error('Promotion generic error:', {
                error,
                message,
                operation,
                category: categorizePromotionError(error),
                context,
                isCritical: isPromotionErrorCritical(error)
            });
        }
    };
};

/**
 * Promotion-specific error types for better error handling
 */
export const PROMOTION_ERROR_TYPES = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INVALID_STATUS: 'INVALID_STATUS',
    EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
    POSITION_NOT_FOUND: 'POSITION_NOT_FOUND',
    ALREADY_PROMOTED: 'ALREADY_PROMOTED',
    INSUFFICIENT_TENURE: 'INSUFFICIENT_TENURE',
    BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
};

export default {
    extractPromotionErrorMessage,
    categorizePromotionError,
    isPromotionErrorCritical,
    getPromotionErrorRecoveryActions,
    createPromotionErrorHandler,
    PROMOTION_ERROR_TYPES,
    PROMOTION_ERROR_MESSAGES
};