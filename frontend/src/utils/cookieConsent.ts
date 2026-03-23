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

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, maxAgeDays: number): void => {
  if (typeof document === 'undefined') return;
  const maxAgeSeconds = Math.floor(maxAgeDays * 24 * 60 * 60);
  const secure = window.location.protocol === 'https:';
  document.cookie =
    `${name}=${encodeURIComponent(value)}; ` +
    `Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax;` +
    (secure ? ' Secure;' : '');
};

const clearCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax;`;
};

/**
 * Get current cookie consent from localStorage
 */
export const getCookieConsent = (): CookieConsent | null => {
  try {
    // Prefer cookie (DPDP/GDPR-friendly: survives some storage-clearing scenarios),
    // fallback to localStorage for backward compatibility.
    let stored: string | null = null;
    try {
      stored = getCookie(CONSENT_KEY);
    } catch (_) {}
    if (!stored) {
      stored = localStorage.getItem(CONSENT_KEY);
    }
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
    setCookie(CONSENT_KEY, JSON.stringify(consent), CONSENT_EXPIRY_DAYS);
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

  try {
    clearCookie(CONSENT_KEY);
  } catch (_) {}
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

