import React, { useEffect } from 'react';
import { useCookieConsent } from './CookieConsentContext';
import { trackingConfig } from '../config/tracking';
import { initGtm, setTrackingAllowed, pushToDataLayer } from '../utils/gtm';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Initializes GTM when the user has consented to analytics or marketing cookies.
 * Does not render anything; only manages tracking side effects.
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const { isAllowed } = useCookieConsent();

  const analyticsAllowed = isAllowed('analytics');
  const marketingAllowed = isAllowed('marketing');
  const trackingConsentGranted = analyticsAllowed || marketingAllowed;

  useEffect(() => {
    if (trackingConsentGranted && trackingConfig.gtmContainerId) {
      initGtm(trackingConfig.gtmContainerId);
      setTrackingAllowed(true);
    } else {
      setTrackingAllowed(false);
    }

    // Always inform GTM about consent changes once GTM is present.
    // `pushToDataLayer` allows `consent_update` even when tracking is not allowed.
    pushToDataLayer({
      event: 'consent_update',
      consent_analytics: analyticsAllowed,
      consent_marketing: marketingAllowed,
    });
  }, [trackingConsentGranted, analyticsAllowed, marketingAllowed]);

  return <>{children}</>;
};
