// frontend/src/utils/formatters.js

/**
 * Format currency values to USD format
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(0);
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount));
};

/**
 * Format date values to readable format
 * @param {string|Date} date - The date to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, locale = 'en-US', options = {}) => {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format date and time values to readable format
 * @param {string|Date} date - The date to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, locale = 'en-US', options = {}) => {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format number values with thousand separators
 * @param {number} number - The number to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {number} minimumFractionDigits - Minimum decimal places
 * @param {number} maximumFractionDigits - Maximum decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (
    number,
    locale = 'en-US',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
) => {
    if (number === null || number === undefined || isNaN(number)) {
        return '0';
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits
    }).format(Number(number));
};

/**
 * Format percentage values
 * @param {number} value - The value to format as percentage (0.15 = 15%)
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {number} minimumFractionDigits - Minimum decimal places (default: 1)
 * @param {number} maximumFractionDigits - Maximum decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (
    value,
    locale = 'en-US',
    minimumFractionDigits = 1,
    maximumFractionDigits = 2
) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits,
        maximumFractionDigits
    }).format(Number(value));
};

/**
 * Format percentage values from regular numbers (15 = 15%)
 * @param {number} value - The value to format as percentage (15 = 15%)
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {number} minimumFractionDigits - Minimum decimal places (default: 1)
 * @param {number} maximumFractionDigits - Maximum decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export const formatPercentageFromNumber = (
    value,
    locale = 'en-US',
    minimumFractionDigits = 1,
    maximumFractionDigits = 2
) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits,
        maximumFractionDigits
    }).format(Number(value) / 100);
};

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || isNaN(bytes)) return 'N/A';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format duration in milliseconds to human readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (milliseconds) => {
    if (!milliseconds || isNaN(milliseconds)) return '0s';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
};

/**
 * Format phone number to standard format
 * @param {string} phoneNumber - Raw phone number
 * @param {string} format - Format type ('us', 'international')
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber, format = 'us') => {
    if (!phoneNumber) return '';

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (format === 'us' && cleaned.length === 10) {
        // Format as (XXX) XXX-XXXX
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (format === 'us' && cleaned.length === 11 && cleaned[0] === '1') {
        // Format as +1 (XXX) XXX-XXXX
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    return phoneNumber; // Return original if can't format
};

/**
 * Format text to title case
 * @param {string} text - Text to format
 * @returns {string} Title case text
 */
export const formatTitleCase = (text) => {
    if (!text) return '';

    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Format text to sentence case
 * @param {string} text - Text to format
 * @returns {string} Sentence case text
 */
export const formatSentenceCase = (text) => {
    if (!text) return '';

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
    if (!text || text.length <= maxLength) return text || '';

    return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Format employee ID with padding
 * @param {string|number} employeeId - Employee ID
 * @param {number} padding - Number of digits to pad to (default: 6)
 * @returns {string} Formatted employee ID
 */
export const formatEmployeeId = (employeeId, padding = 6) => {
    if (!employeeId) return '';

    const id = String(employeeId);
    return id.padStart(padding, '0');
};

/**
 * Format loan ID with prefix
 * @param {string|number} loanId - Loan ID
 * @param {string} prefix - Prefix to add (default: 'LN')
 * @param {number} padding - Number of digits to pad to (default: 6)
 * @returns {string} Formatted loan ID
 */
export const formatLoanId = (loanId, prefix = 'LN', padding = 6) => {
    if (!loanId) return '';

    const id = String(loanId).padStart(padding, '0');
    return `${prefix}${id}`;
};

/**
 * Format payslip ID with prefix
 * @param {string|number} payslipId - Payslip ID
 * @param {string} prefix - Prefix to add (default: 'PS')
 * @param {number} padding - Number of digits to pad to (default: 8)
 * @returns {string} Formatted payslip ID
 */
export const formatPayslipId = (payslipId, prefix = 'PS', padding = 8) => {
    if (!payslipId) return '';

    const id = String(payslipId).padStart(padding, '0');
    return `${prefix}${id}`;
};

/**
 * Format relative time (time ago)
 * @param {string|Date} date - Date to compare
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, locale = 'en-US') => {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
        return formatDate(dateObj, locale);
    }
};

/**
 * Format address to single line
 * @param {object} address - Address object with street, city, state, zip
 * @returns {string} Formatted address string
 */
export const formatAddress = (address) => {
    if (!address) return '';

    const parts = [
        address.street,
        address.city,
        address.state,
        address.zip
    ].filter(Boolean);

    return parts.join(', ');
};

/**
 * Format name from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} format - Format type ('full', 'last-first', 'initials')
 * @returns {string} Formatted name
 */
export const formatName = (firstName, lastName, format = 'full') => {
    if (!firstName && !lastName) return '';

    const first = firstName || '';
    const last = lastName || '';

    switch (format) {
        case 'last-first':
            return `${last}, ${first}`.trim().replace(/^,|,$/, '');
        case 'initials':
            return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
        case 'full':
        default:
            return `${first} ${last}`.trim();
    }
};

/**
 * Format status text for display
 * @param {string} status - Status string
 * @returns {string} Formatted status
 */
export const formatStatus = (status) => {
    if (!status) return '';

    return status
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

// Export all formatters as a collection
export const formatters = {
    currency: formatCurrency,
    date: formatDate,
    dateTime: formatDateTime,
    number: formatNumber,
    percentage: formatPercentage,
    percentageFromNumber: formatPercentageFromNumber,
    fileSize: formatFileSize,
    duration: formatDuration,
    phoneNumber: formatPhoneNumber,
    titleCase: formatTitleCase,
    sentenceCase: formatSentenceCase,
    truncateText,
    employeeId: formatEmployeeId,
    loanId: formatLoanId,
    payslipId: formatPayslipId,
    relativeTime: formatRelativeTime,
    address: formatAddress,
    name: formatName,
    status: formatStatus
};

export default formatters;