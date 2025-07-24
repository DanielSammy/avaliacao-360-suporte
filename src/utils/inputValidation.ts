// Input validation utilities for form security

import { sanitizeString, sanitizeNumber, SECURITY_CONSTRAINTS } from './security';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

// Validate text input fields
export function validateTextInput(
  value: string, 
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedChars?: RegExp;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  // Sanitize first
  const sanitizedValue = sanitizeString(value);
  
  // Required validation
  if (options.required && !sanitizedValue.trim()) {
    errors.push(`${fieldName} é obrigatório`);
    return { isValid: false, errors };
  }
  
  // Skip other validations if empty and not required
  if (!sanitizedValue.trim() && !options.required) {
    return { isValid: true, errors: [], sanitizedValue };
  }
  
  // Length validations
  if (options.minLength && sanitizedValue.length < options.minLength) {
    errors.push(`${fieldName} deve ter pelo menos ${options.minLength} caracteres`);
  }
  
  const maxLength = options.maxLength || SECURITY_CONSTRAINTS.MAX_STRING_LENGTH;
  if (sanitizedValue.length > maxLength) {
    errors.push(`${fieldName} deve ter no máximo ${maxLength} caracteres`);
  }
  
  // Pattern validation
  if (options.pattern && !options.pattern.test(sanitizedValue)) {
    errors.push(`${fieldName} tem formato inválido`);
  }
  
  // Allowed characters validation
  if (options.allowedChars && !options.allowedChars.test(sanitizedValue)) {
    errors.push(`${fieldName} contém caracteres não permitidos`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  };
}

// Validate numeric input fields
export function validateNumericInput(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    allowNegative?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  // Sanitize and convert to number
  const sanitizedValue = sanitizeNumber(value);
  
  // Required validation
  if (options.required && (sanitizedValue === 0 && value !== 0 && value !== '0')) {
    errors.push(`${fieldName} é obrigatório`);
    return { isValid: false, errors };
  }
  
  // Check if it's a valid number
  if (isNaN(sanitizedValue) || !isFinite(sanitizedValue)) {
    errors.push(`${fieldName} deve ser um número válido`);
    return { isValid: false, errors };
  }
  
  // Negative number validation
  if (!options.allowNegative && sanitizedValue < 0) {
    errors.push(`${fieldName} não pode ser negativo`);
  }
  
  // Range validations
  if (options.min !== undefined && sanitizedValue < options.min) {
    errors.push(`${fieldName} deve ser pelo menos ${options.min}`);
  }
  
  if (options.max !== undefined && sanitizedValue > options.max) {
    errors.push(`${fieldName} deve ser no máximo ${options.max}`);
  }
  
  // Integer validation
  if (options.integer && !Number.isInteger(sanitizedValue)) {
    errors.push(`${fieldName} deve ser um número inteiro`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  };
}

// Validate percentage fields (0-100)
export function validatePercentage(
  value: any,
  fieldName: string,
  required: boolean = false
): ValidationResult {
  return validateNumericInput(value, fieldName, {
    required,
    min: 0,
    max: 100,
    allowNegative: false
  });
}

// Validate currency/bonus fields
export function validateCurrency(
  value: any,
  fieldName: string,
  required: boolean = false
): ValidationResult {
  return validateNumericInput(value, fieldName, {
    required,
    min: 0,
    max: 999999,
    allowNegative: false
  });
}

// Validate period format (YYYY-MM)
export function validatePeriod(
  value: string,
  fieldName: string = 'Período',
  required: boolean = true
): ValidationResult {
  const result = validateTextInput(value, fieldName, {
    required,
    pattern: /^\d{4}-\d{2}$/,
    maxLength: 7
  });
  
  if (!result.isValid || !result.sanitizedValue) {
    return result;
  }
  
  // Additional date validation
  const [year, month] = result.sanitizedValue.split('-').map(Number);
  const currentYear = new Date().getFullYear();
  
  if (year < 2020 || year > currentYear + 1) {
    result.errors.push(`Ano deve estar entre 2020 e ${currentYear + 1}`);
    result.isValid = false;
  }
  
  if (month < 1 || month > 12) {
    result.errors.push('Mês deve estar entre 01 e 12');
    result.isValid = false;
  }
  
  return result;
}

// Validate operator name
export function validateOperatorName(
  value: string,
  existingNames: string[] = [],
  excludeId?: string,
  required: boolean = true
): ValidationResult {
  const result = validateTextInput(value, 'Nome do operador', {
    required,
    minLength: 2,
    maxLength: 100,
    allowedChars: /^[a-zA-ZÀ-ÿ\s\-'\.]+$/
  });
  
  if (!result.isValid || !result.sanitizedValue) {
    return result;
  }
  
  // Check for duplicates
  const normalizedValue = result.sanitizedValue.toLowerCase().trim();
  const isDuplicate = existingNames.some((name, index) => {
    if (excludeId && index.toString() === excludeId) return false;
    return name.toLowerCase().trim() === normalizedValue;
  });
  
  if (isDuplicate) {
    result.errors.push('Já existe um operador com este nome');
    result.isValid = false;
  }
  
  return result;
}

// Validate criteria name
export function validateCriteriaName(
  value: string,
  existingNames: string[] = [],
  excludeId?: string,
  required: boolean = true
): ValidationResult {
  const result = validateTextInput(value, 'Nome do critério', {
    required,
    minLength: 3,
    maxLength: 200,
    allowedChars: /^[a-zA-ZÀ-ÿ\s\-'\.0-9%()]+$/
  });
  
  if (!result.isValid || !result.sanitizedValue) {
    return result;
  }
  
  // Check for duplicates
  const normalizedValue = result.sanitizedValue.toLowerCase().trim();
  const isDuplicate = existingNames.some((name, index) => {
    if (excludeId && index.toString() === excludeId) return false;
    return name.toLowerCase().trim() === normalizedValue;
  });
  
  if (isDuplicate) {
    result.errors.push('Já existe um critério com este nome');
    result.isValid = false;
  }
  
  return result;
}

// Batch validation for forms
export function validateForm(validations: (() => ValidationResult)[]): {
  isValid: boolean;
  errors: string[];
  results: ValidationResult[];
} {
  const results = validations.map(validation => validation());
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: results.every(result => result.isValid),
    errors: allErrors,
    results
  };
}

// Real-time input sanitization for forms
export function createSanitizedInputProps(
  value: string,
  onChange: (value: string) => void,
  validation?: (value: string) => ValidationResult
) {
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      let sanitized = sanitizeString(e.target.value);
      
      // Apply additional validation if provided
      if (validation) {
        const result = validation(sanitized);
        sanitized = result.sanitizedValue || sanitized;
      }
      
      onChange(sanitized);
    },
    onPaste: (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      let sanitized = sanitizeString(pastedText);
      
      if (validation) {
        const result = validation(sanitized);
        sanitized = result.sanitizedValue || sanitized;
      }
      
      onChange(sanitized);
    }
  };
}

// XSS prevention for display text
export function safeDisplayText(text: string): string {
  return sanitizeString(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}