// Cookie Consent Utility Functions

export type CookieCategory = 'essential' | 'analytics' | 'marketing' | 'functional';

export interface CookieConsent {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: number;
  version: string; // Policy version
}

const CONSENT_KEY = 'tinge-cookie-consent';
const CURRENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 365; // 1 year

/**
 * Get current cookie consent from localStorage
 */
export const getCookieConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;

    const consent: CookieConsent = JSON.parse(stored);

    // Check if consent has expired (1 year)
    const expiryDate = new Date(consent.timestamp);
    expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);
    
    if (new Date() > expiryDate) {
      // Consent expired, clear it
      clearCookieConsent();
      return null;
    }

    // Check if policy version has changed
    if (consent.version !== CURRENT_VERSION) {
      // Policy changed, require new consent
      clearCookieConsent();
      return null;
    }

    return consent;
  } catch (error) {
    console.error('Error getting cookie consent:', error);
    return null;
  }
};

/**
 * Save user cookie consent preferences
 */
export const setCookieConsent = (preferences: Omit<CookieConsent, 'timestamp' | 'version'>): void => {
  try {
    const consent: CookieConsent = {
      ...preferences,
      essential: true, // Essential cookies are always allowed
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error('Error setting cookie consent:', error);
  }
};

/**
 * Check if user has provided consent
 */
export const hasUserConsented = (): boolean => {
  return getCookieConsent() !== null;
};

/**
 * Check if a specific cookie category is allowed
 */
export const isCategoryAllowed = (category: CookieCategory): boolean => {
  const consent = getCookieConsent();
  
  // If no consent yet, only essential cookies are allowed
  if (!consent) {
    return category === 'essential';
  }

  return consent[category] === true;
};

/**
 * Clear all cookie consent data
 */
export const clearCookieConsent = (): void => {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch (error) {
    console.error('Error clearing cookie consent:', error);
  }
};

/**
 * Update consent for a specific category
 */
export const updateCategoryConsent = (category: CookieCategory, allowed: boolean): void => {
  const currentConsent = getCookieConsent();
  
  if (!currentConsent) {
    // If no consent exists, create new one with this category
    setCookieConsent({
      essential: true,
      analytics: category === 'analytics' ? allowed : false,
      marketing: category === 'marketing' ? allowed : false,
      functional: category === 'functional' ? allowed : false,
    });
  } else {
    // Update existing consent
    setCookieConsent({
      ...currentConsent,
      [category]: category === 'essential' ? true : allowed, // Essential always true
    });
  }
};

/**
 * Get default consent (all rejected except essential)
 */
export const getDefaultConsent = (): Omit<CookieConsent, 'timestamp' | 'version'> => {
  return {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  };
};

/**
 * Get accept all consent
 */
export const getAcceptAllConsent = (): Omit<CookieConsent, 'timestamp' | 'version'> => {
  return {
    essential: true,
    analytics: true,
    marketing: true,
    functional: true,
  };
};

