import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { useCookieConsent } from '../context/CookieConsentContext';
import { getAcceptAllConsent, getDefaultConsent } from '../utils/cookieConsent';

export const CookieConsent: React.FC = () => {
  const { showConsentBanner, updateConsent, consent } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);

  if (!showConsentBanner) return null;

  const handleAcceptAll = () => {
    updateConsent(getAcceptAllConsent());
  };

  const handleRejectNonEssential = () => {
    updateConsent(getDefaultConsent());
  };

  const handleCustomize = () => {
    setShowPreferences(true);
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideInUp">
        {/* Backdrop for better visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        
        <div className="relative bg-white dark:bg-brand-surface border-t border-gray-200 dark:border-white/10 shadow-2xl">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
              {/* Cookie Icon & Message */}
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0 text-4xl" role="img" aria-label="Cookie">
                  🍪
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-primary mb-2 font-display">
                    We use cookies to improve your experience
                  </h3>
                  <p className="text-sm text-brand-secondary leading-relaxed">
                    We use cookies to analyze site traffic and personalize content. You can choose which cookies
                    you're okay with below.{' '}
                    <Link
                      to="/cookie-policy"
                      className="text-brand-accent hover:text-brand-accent-hover underline font-medium"
                    >
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0">
                <Button
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto whitespace-nowrap px-6"
                  size="md"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectNonEssential}
                  variant="outline"
                  className="w-full sm:w-auto whitespace-nowrap px-6"
                  size="md"
                >
                  Reject Non-Essential
                </Button>
                <Button
                  onClick={handleCustomize}
                  variant="outline"
                  className="w-full sm:w-auto whitespace-nowrap px-6"
                  size="md"
                >
                  Customize
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={updateConsent}
        currentPreferences={consent}
      />
    </>
  );
};

