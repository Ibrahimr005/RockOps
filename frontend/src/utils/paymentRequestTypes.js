export const PAYMENT_SOURCE_TYPES = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  MAINTENANCE: 'MAINTENANCE',
  PAYROLL_BATCH: 'PAYROLL_BATCH',
  ELOAN: 'ELOAN',
  CLOAN: 'CLOAN',
  BONUS: 'BONUS',
  LOGISTICS: 'LOGISTICS',
};

export const PAYMENT_TARGET_TYPES = {
  MERCHANT: 'MERCHANT',
  EMPLOYEE: 'EMPLOYEE',
  EMPLOYEE_GROUP: 'EMPLOYEE_GROUP',
  FINANCIAL_INSTITUTION: 'FINANCIAL_INSTITUTION',
};

export const SOURCE_TYPE_CONFIG = {
  [PAYMENT_SOURCE_TYPES.PURCHASE_ORDER]: { label: 'Purchase Order', badgeClass: 'source-procurement' },
  [PAYMENT_SOURCE_TYPES.MAINTENANCE]: { label: 'Maintenance', badgeClass: 'source-maintenance' },
  [PAYMENT_SOURCE_TYPES.PAYROLL_BATCH]: { label: 'Payroll', badgeClass: 'source-payroll' },
  [PAYMENT_SOURCE_TYPES.ELOAN]: { label: 'Employee Loan', badgeClass: 'source-eloan' },
  [PAYMENT_SOURCE_TYPES.CLOAN]: { label: 'Company Loan', badgeClass: 'source-cloan' },
  [PAYMENT_SOURCE_TYPES.BONUS]: { label: 'Bonus', badgeClass: 'source-bonus' },
  [PAYMENT_SOURCE_TYPES.LOGISTICS]: { label: 'Logistics', badgeClass: 'source-logistics' },
};

export const TARGET_TYPE_CONFIG = {
  [PAYMENT_TARGET_TYPES.MERCHANT]: { label: 'Merchant', badgeClass: 'recipient-merchant' },
  [PAYMENT_TARGET_TYPES.EMPLOYEE]: { label: 'Employee', badgeClass: 'recipient-employee' },
  [PAYMENT_TARGET_TYPES.EMPLOYEE_GROUP]: { label: 'Employee Group', badgeClass: 'recipient-employees' },
  [PAYMENT_TARGET_TYPES.FINANCIAL_INSTITUTION]: { label: 'Institution', badgeClass: 'recipient-institution' },
};

export const getSourceTypeLabel = (type) => SOURCE_TYPE_CONFIG[type]?.label || type || 'Unknown';
export const getSourceTypeBadgeClass = (type) => SOURCE_TYPE_CONFIG[type]?.badgeClass || 'source-default';
export const getTargetTypeLabel = (type) => TARGET_TYPE_CONFIG[type]?.label || type || 'Unknown';
export const getTargetTypeBadgeClass = (type) => TARGET_TYPE_CONFIG[type]?.badgeClass || 'recipient-default';
