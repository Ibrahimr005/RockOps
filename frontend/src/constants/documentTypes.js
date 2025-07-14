// src/constants/documentTypes.js

// Standard document types for general equipment documents
export const GENERAL_DOCUMENT_TYPES = [
    { value: 'MANUAL', label: 'Equipment Manual', icon: 'FileText', color: '#4f46e5' },
    { value: 'WARRANTY', label: 'Warranty Document', icon: 'FileText', color: '#059669' },
    { value: 'CERTIFICATE', label: 'Certificate', icon: 'FileText', color: '#dc2626' },
    { value: 'INSURANCE', label: 'Insurance Document', icon: 'FileText', color: '#ea580c' },
    { value: 'REGISTRATION', label: 'Registration Document', icon: 'FileText', color: '#7c2d12' },
    { value: 'INSPECTION', label: 'Inspection Certificate', icon: 'FileText', color: '#7c3aed' },
    { value: 'OTHER_GENERAL', label: 'Other', icon: 'File', color: '#6b7280' }
];

// Sarky-specific document types for monthly work documentation
export const SARKY_DOCUMENT_TYPES = [
    { value: 'DAILY_REPORT', label: 'Daily Work Report', icon: 'FileText', color: '#4f46e5' },
    { value: 'TIMESHEET', label: 'Timesheet', icon: 'Clock', color: '#059669' },
    { value: 'MONTHLY_SUMMARY', label: 'Monthly Summary', icon: 'BarChart', color: '#dc2626' },
    { value: 'WORK_ORDER', label: 'Work Order', icon: 'ClipboardList', color: '#ea580c' },
    { value: 'MAINTENANCE_LOG', label: 'Maintenance Log', icon: 'Tool', color: '#7c2d12' },
    { value: 'FUEL_RECORD', label: 'Fuel Record', icon: 'Fuel', color: '#059669' },
    { value: 'INSPECTION_REPORT', label: 'Inspection Report', icon: 'Search', color: '#7c3aed' },
    { value: 'PHOTO_DOCUMENTATION', label: 'Photo Documentation', icon: 'Camera', color: '#0369a1' },
    { value: 'INCIDENT_REPORT', label: 'Incident Report', icon: 'AlertTriangle', color: '#ef4444' },
    { value: 'SAFETY_CHECKLIST', label: 'Safety Checklist', icon: 'Shield', color: '#22c55e' },
    { value: 'OPERATOR_LOG', label: 'Operator Log', icon: 'User', color: '#8b5cf6' },
    { value: 'OTHER_SARKY', label: 'Other', icon: 'File', color: '#6b7280' }
];

// Document type utility functions
export const getDocumentTypeByValue = (value, isSarky = false) => {
    const types = isSarky ? SARKY_DOCUMENT_TYPES : GENERAL_DOCUMENT_TYPES;
    return types.find(type => type.value === value);
};

export const getDocumentTypeIcon = (value, isSarky = false) => {
    const docType = getDocumentTypeByValue(value, isSarky);
    return docType ? docType.icon : 'File';
};

export const getDocumentTypeColor = (value, isSarky = false) => {
    const docType = getDocumentTypeByValue(value, isSarky);
    return docType ? docType.color : '#6b7280';
};

export const getDocumentTypeLabel = (value, isSarky = false) => {
    const docType = getDocumentTypeByValue(value, isSarky);
    return docType ? docType.label : value;
};

// Utility to generate auto-naming convention for sarky documents
export const generateSarkyDocumentName = (equipmentName, month, year, originalFileName, documentType) => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNames[month - 1];
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const fileExtension = originalFileName.split('.').pop();
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    
    // Clean equipment name for filename (remove special characters)
    const cleanEquipmentName = equipmentName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Get document type label without spaces
    const docTypeLabel = getDocumentTypeLabel(documentType, true).replace(/\s+/g, '_');
    
    return `${cleanEquipmentName}_Sarky_${monthName}${year}_${docTypeLabel}_${baseName}_${timestamp}.${fileExtension}`;
};

// Month utilities for sarky documents
export const MONTH_OPTIONS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

export const getMonthLabel = (monthNumber) => {
    const month = MONTH_OPTIONS.find(m => m.value === monthNumber);
    return month ? month.label : `Month ${monthNumber}`;
};

// Year range utility
export const generateYearOptions = (yearsBack = 2, yearsForward = 1) => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = currentYear - yearsBack; i <= currentYear + yearsForward; i++) {
        years.push({ value: i, label: i.toString() });
    }
    
    return years;
}; 