export const ERROR_CODES = {
  // Success
  SUCCESS: 'E000',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'E001',
  FORBIDDEN: 'E002',
  INVALID_CREDENTIALS: 'E003',
  TOKEN_EXPIRED: 'E004',
  INSUFFICIENT_PERMISSIONS: 'E005',
  
  // Validation
  VALIDATION_ERROR: 'E010',
  INVALID_INPUT: 'E011',
  MISSING_REQUIRED_FIELD: 'E012',
  
  // Database
  DATABASE_ERROR: 'E020',
  RECORD_NOT_FOUND: 'E021',
  DUPLICATE_RECORD: 'E022',
  CONSTRAINT_VIOLATION: 'E023',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION: 'E030',
  INVALID_STATUS_TRANSITION: 'E031',
  PROJECT_NOT_ACTIVE: 'E032',
  TASK_ASSIGNMENT_ERROR: 'E033',
  
  // System
  INTERNAL_SERVER_ERROR: 'E999',
  SERVICE_UNAVAILABLE: 'E998',
  EXTERNAL_SERVICE_ERROR: 'E997',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.SUCCESS]: 'Success',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Token has expired',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input data',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Missing required field',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'Record not found',
  [ERROR_CODES.DUPLICATE_RECORD]: 'Record already exists',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'Constraint violation',
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
  [ERROR_CODES.INVALID_STATUS_TRANSITION]: 'Invalid status transition',
  [ERROR_CODES.PROJECT_NOT_ACTIVE]: 'Project is not active',
  [ERROR_CODES.TASK_ASSIGNMENT_ERROR]: 'Task assignment error',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service unavailable',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
} as const;
