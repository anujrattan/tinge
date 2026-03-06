import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CookieConsent,
  CookieCategory,
  getCookieConsent,
  setCookieConsent as saveCookieConsent,
  hasUserConsented,
  isCategoryAllowed as checkCategoryAllowed,
} from '../utils/cookieConsent';

interface CookieConsentContextType {
  consent: CookieConsent | null;
  hasConsented: boolean;
  isAllowed: (category: CookieCategory) => boolean;
  updateConsent: (preferences: Omit<CookieConsent, 'timestamp' | 'version'>) => void;
  showConsentBanner: boolean;
  setShowConsentBanner: (show: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

interface CookieConsentProviderProps {
  children: ReactNode;
}

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({ children }) => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Load consent on mount
  useEffect(() => {
    const storedConsent = getCookieConsent();
    setConsent(storedConsent);
    
    // Show banner if no consent exists
    if (!storedConsent) {
      setShowConsentBanner(true);
    }
  }, []);

  const updateConsent = (preferences: Omit<CookieConsent, 'timestamp' | 'version'>) => {
    saveCookieConsent(preferences);
    const updatedConsent = getCookieConsent();
    setConsent(updatedConsent);
    setShowConsentBanner(false);
  };

  const isAllowed = (category: CookieCategory): boolean => {
    return checkCategoryAllowed(category);
  };

  const value: CookieConsentContextType = {
    consent,
    hasConsented: hasUserConsented(),
    isAllowed,
    updateConsent,
    showConsentBanner,
    setShowConsentBanner,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
};

