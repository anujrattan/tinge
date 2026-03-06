/**
 * Currency Utility Functions
 * 
 * Centralized currency handling for the application
 * Designed to be scalable for multiple currencies
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  // ISO 4217 numeric code (optional, for payment gateways)
  numericCode?: string;
}

/**
 * Supported currencies
 */
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    numericCode: '356',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    numericCode: '840',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    numericCode: '853',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    numericCode: '826',
  },
};

/**
 * Default currency (INR for Indian market)
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

/**
 * LocalStorage key for currency preference
 */
export const CURRENCY_STORAGE_KEY = 'luxe-threads-currency';

/**
 * Get currency by code
 */
export const getCurrency = (code: CurrencyCode = DEFAULT_CURRENCY): Currency => {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
};

/**
 * Format a number as currency
 * 
 * @param amount - The amount to format
 * @param currencyCode - Currency code (defaults to INR)
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "₹1,234.56")
 */
export const formatCurrency = (
  amount: number | string,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
  options: {
    showSymbol?: boolean;
    showDecimals?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const currency = getCurrency(currencyCode);
  const {
    showSymbol = true,
    showDecimals = true,
    minimumFractionDigits = showDecimals ? 2 : 0,
    maximumFractionDigits = showDecimals ? 2 : 0,
  } = options;

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return showSymbol ? `${currency.symbol}0${showDecimals ? '.00' : ''}` : '0';
  }

  // Format number with locale-specific formatting
  // Using 'en-IN' for Indian number formatting (thousands separators)
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericAmount);

  return showSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
};

/**
 * Format currency without symbol (just the number)
 */
export const formatCurrencyAmount = (
  amount: number | string,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
  options?: {
    showDecimals?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  return formatCurrency(amount, currencyCode, { ...options, showSymbol: false });
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currencyCode: CurrencyCode = DEFAULT_CURRENCY): string => {
  return getCurrency(currencyCode).symbol;
};

/**
 * Parse currency string to number
 * Removes currency symbol and formatting, returns numeric value
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbols and commas, keep numbers and decimal point
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Get currency from localStorage or return default
 */
export const getStoredCurrency = (): CurrencyCode => {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (stored && stored in CURRENCIES) {
    return stored as CurrencyCode;
  }
  return DEFAULT_CURRENCY;
};

/**
 * Save currency preference to localStorage
 */
export const saveCurrencyPreference = (currencyCode: CurrencyCode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
};

