/**
 * Country Codes for Phone Numbers
 * 
 * List of countries with their ISO codes, names, and phone dialing codes.
 * Sorted by popularity for e-commerce (India first, then major markets).
 */

export interface Country {
  code: string;      // ISO 3166-1 alpha-2 code
  name: string;      // Country name
  dialCode: string;  // International dialing code (e.g., "+91")
  flag: string;      // Emoji flag
}

export const countryCodes: Country[] = [
  // India - Default for Tinge
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  
  // Major E-commerce Markets
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  
  // South Asia
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻' },
  
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  
  // Southeast Asia
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  
  // East Asia
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  
  // Europe (Major Markets)
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
  
  // Other Regions
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
];

/**
 * Get country by dial code
 */
export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countryCodes.find(country => country.dialCode === dialCode);
};

/**
 * Get country by ISO code
 */
export const getCountryByCode = (code: string): Country | undefined => {
  return countryCodes.find(country => country.code === code);
};

/**
 * Get default country (India)
 */
export const getDefaultCountry = (): Country => {
  return countryCodes[0]; // India
};

/**
 * Format phone number for display (with country code)
 */
export const formatPhoneWithCountryCode = (phoneNumber: string, countryCode: string): string => {
  const country = getCountryByCode(countryCode);
  if (!country) return phoneNumber;
  
  // Remove any existing + or country code from phone number
  const cleanPhone = phoneNumber.replace(/^\+?\d{1,4}/, '').trim();
  
  return `${country.dialCode}${cleanPhone}`;
};

/**
 * Format phone number for backend storage
 * Returns format: +91**********
 */
export const formatPhoneForBackend = (phoneNumber: string, dialCode: string): string => {
  // Remove any spaces, hyphens, parentheses
  const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
  
  // If phone already has +, remove it
  const phoneWithoutPlus = cleanPhone.replace(/^\+/, '');
  
  // If phone already starts with dial code (without +), remove it
  const dialCodeDigits = dialCode.replace('+', '');
  const phoneWithoutDialCode = phoneWithoutPlus.startsWith(dialCodeDigits)
    ? phoneWithoutPlus.slice(dialCodeDigits.length)
    : phoneWithoutPlus;
  
  return `${dialCode}${phoneWithoutDialCode}`;
};

/**
 * Parse phone number from backend format
 * Returns { dialCode, phoneNumber }
 */
export const parsePhoneFromBackend = (fullPhone: string): { dialCode: string; phoneNumber: string; country?: Country } => {
  if (!fullPhone) {
    return { dialCode: '+91', phoneNumber: '' };
  }
  
  // Ensure it starts with +
  const normalized = fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`;
  
  // Try to match against known dial codes (longest first to avoid conflicts like +1 vs +1-xxx)
  const sortedCountries = [...countryCodes].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (normalized.startsWith(country.dialCode)) {
      const phoneNumber = normalized.slice(country.dialCode.length);
      return {
        dialCode: country.dialCode,
        phoneNumber,
        country,
      };
    }
  }
  
  // Fallback: assume first 2-4 characters are dial code
  const dialCodeMatch = normalized.match(/^\+\d{1,4}/);
  if (dialCodeMatch) {
    const dialCode = dialCodeMatch[0];
    const phoneNumber = normalized.slice(dialCode.length);
    return { dialCode, phoneNumber };
  }
  
  // Ultimate fallback
  return { dialCode: '+91', phoneNumber: normalized.replace('+', '') };
};

