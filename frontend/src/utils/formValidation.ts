/**
 * Form Validation Utility
 * 
 * Provides reusable validation functions and error messages
 * for form fields across the application.
 */

export interface ValidationRule {
  validator: (value: any, formData?: any) => boolean;
  message: string;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Common Validators
 */
export const validators = {
  /**
   * Check if field is not empty
   */
  required: (message: string = 'This field is required'): ValidationRule => ({
    validator: (value: any) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    },
    message,
  }),

  /**
   * Validate email format
   */
  email: (message: string = 'Please enter a valid email address'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value.trim());
    },
    message,
  }),

  /**
   * Validate phone number (digits only, 10 digits for Indian numbers)
   */
  phone: (message: string = 'Please enter a valid phone number'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      const phoneRegex = /^\d{10}$/; // 10 digits
      return phoneRegex.test(value.trim().replace(/[\s-]/g, ''));
    },
    message,
  }),

  /**
   * Validate phone number with flexible length
   */
  phoneFlexible: (minDigits: number = 7, maxDigits: number = 15, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      const digitsOnly = value.trim().replace(/[\s-]/g, '');
      const phoneRegex = new RegExp(`^\\d{${minDigits},${maxDigits}}$`);
      return phoneRegex.test(digitsOnly);
    },
    message: message || `Phone number must be ${minDigits}-${maxDigits} digits`,
  }),

  /**
   * Validate minimum length
   */
  minLength: (length: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      return value.trim().length >= length;
    },
    message: message || `Must be at least ${length} characters`,
  }),

  /**
   * Validate maximum length
   */
  maxLength: (length: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      return value.trim().length <= length;
    },
    message: message || `Must be no more than ${length} characters`,
  }),

  /**
   * Validate ZIP/PIN code (6 digits for India)
   */
  pinCode: (message: string = 'Please enter a valid PIN code'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      const pinRegex = /^\d{6}$/;
      return pinRegex.test(value.trim());
    },
    message,
  }),

  /**
   * Validate ZIP code (flexible for international)
   */
  zipCode: (message: string = 'Please enter a valid ZIP/Postal code'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let 'required' handle empty values
      // Allow alphanumeric, spaces, hyphens (US: 12345 or 12345-6789, UK: SW1A 1AA, Canada: K1A 0B1)
      const zipRegex = /^[A-Z0-9\s-]{3,10}$/i;
      return zipRegex.test(value.trim());
    },
    message,
  }),

  /**
   * Validate alphanumeric characters only
   */
  alphanumeric: (message: string = 'Only letters and numbers are allowed'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
      return alphanumericRegex.test(value);
    },
    message,
  }),

  /**
   * Validate letters only (for names)
   */
  lettersOnly: (message: string = 'Only letters are allowed'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const lettersRegex = /^[a-zA-Z\s]+$/;
      return lettersRegex.test(value);
    },
    message,
  }),

  /**
   * Custom regex validator
   */
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  /**
   * Custom validation function
   */
  custom: (validatorFn: (value: any, formData?: any) => boolean, message: string): ValidationRule => ({
    validator: validatorFn,
    message,
  }),
};

/**
 * Validate a single field against its rules
 */
export const validateField = (
  fieldName: string,
  value: any,
  rules: ValidationRule[],
  formData?: any
): string | null => {
  for (const rule of rules) {
    if (!rule.validator(value, formData)) {
      return rule.message;
    }
  }
  return null;
};

/**
 * Validate entire form
 * Returns object with field names as keys and error messages as values
 */
export const validateForm = (
  formData: { [key: string]: any },
  validationRules: FieldValidation
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(validationRules).forEach((fieldName) => {
    const rules = validationRules[fieldName];
    const value = formData[fieldName];
    const error = validateField(fieldName, value, rules, formData);
    
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Clear specific field error
 */
export const clearFieldError = (
  errors: ValidationErrors,
  fieldName: string
): ValidationErrors => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

/**
 * Pre-defined validation schemas for common use cases
 */
export const validationSchemas = {
  /**
   * Checkout form validation schema
   */
  checkout: {
    firstName: [
      validators.required('First name is required'),
      validators.minLength(2, 'First name must be at least 2 characters'),
      validators.lettersOnly('First name should only contain letters'),
    ],
    lastName: [
      validators.required('Last name is required'),
      validators.minLength(2, 'Last name must be at least 2 characters'),
      validators.lettersOnly('Last name should only contain letters'),
    ],
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email address'),
    ],
    phone: [
      validators.required('Phone number is required'),
      validators.phone('Phone number must be 10 digits'),
    ],
    countryCode: [
      validators.required('Country code is required'),
    ],
    address: [
      validators.required('Address is required'),
      validators.minLength(5, 'Address must be at least 5 characters'),
    ],
    // address2 is optional - no validation rules
    city: [
      validators.required('City is required'),
      validators.minLength(2, 'City name must be at least 2 characters'),
    ],
    state: [
      validators.required('State/Province is required'),
      validators.minLength(2, 'State/Province must be at least 2 characters'),
    ],
    zip: [
      validators.required('ZIP/Postal code is required'),
      validators.zipCode('Please enter a valid ZIP/Postal code'),
    ],
  },

  /**
   * Profile/Address form validation schema
   */
  profile: {
    first_name: [
      validators.required('First name is required'),
      validators.minLength(2, 'First name must be at least 2 characters'),
      validators.lettersOnly('First name should only contain letters'),
    ],
    last_name: [
      validators.required('Last name is required'),
      validators.minLength(2, 'Last name must be at least 2 characters'),
      validators.lettersOnly('Last name should only contain letters'),
    ],
    address1: [
      validators.required('Address is required'),
      validators.minLength(5, 'Address must be at least 5 characters'),
    ],
    city: [
      validators.required('City is required'),
      validators.minLength(2, 'City name must be at least 2 characters'),
    ],
    province: [
      validators.required('State/Province is required'),
      validators.minLength(2, 'State/Province must be at least 2 characters'),
    ],
    zip: [
      validators.required('ZIP/Postal code is required'),
      validators.zipCode('Please enter a valid ZIP/Postal code'),
    ],
  },

  /**
   * Contact form validation schema
   */
  contact: {
    name: [
      validators.required('Name is required'),
      validators.minLength(2, 'Name must be at least 2 characters'),
    ],
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email address'),
    ],
    subject: [
      validators.required('Subject is required'),
      validators.minLength(5, 'Subject must be at least 5 characters'),
    ],
    message: [
      validators.required('Message is required'),
      validators.minLength(10, 'Message must be at least 10 characters'),
    ],
  },
};

