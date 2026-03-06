import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';
import { Button, Toggle } from './ui';
import { CookieConsent, getDefaultConsent, getAcceptAllConsent } from '../utils/cookieConsent';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: Omit<CookieConsent, 'timestamp' | 'version'>) => void;
  currentPreferences?: CookieConsent | null;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPreferences,
}) => {
  const [preferences, setPreferences] = useState<Omit<CookieConsent, 'timestamp' | 'version'>>(
    getDefaultConsent()
  );

  useEffect(() => {
    if (currentPreferences) {
      setPreferences({
        essential: currentPreferences.essential,
        analytics: currentPreferences.analytics,
        marketing: currentPreferences.marketing,
        functional: currentPreferences.functional,
      });
    }
  }, [currentPreferences]);

  if (!isOpen) return null;

  const handleToggle = (category: keyof Omit<CookieConsent, 'timestamp' | 'version'>, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  const handleAcceptAll = () => {
    const allAccepted = getAcceptAllConsent();
    setPreferences(allAccepted);
    onSave(allAccepted);
    onClose();
  };

  const handleRejectAll = () => {
    const allRejected = getDefaultConsent();
    setPreferences(allRejected);
    onSave(allRejected);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-brand-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-popIn border border-gray-200 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-brand-surface border-b border-gray-200 dark:border-white/10 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-brand-primary font-display">Cookie Preferences</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-brand-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <p className="text-brand-secondary leading-relaxed">
              We use different types of cookies to optimize your experience on our website. You can choose which
              categories you'd like to allow:
            </p>

            {/* Essential Cookies */}
            <div className="border border-gray-200 dark:border-white/10 rounded-lg p-4 bg-gray-50 dark:bg-brand-bg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-primary flex items-center gap-2">
                    <span className="text-green-500">✓</span> Essential Cookies
                    <span className="text-xs font-normal text-brand-secondary bg-gray-200 dark:bg-white/10 px-2 py-1 rounded">
                      Always Active
                    </span>
                  </h3>
                </div>
                <Toggle checked={true} onChange={() => {}} disabled className="opacity-50 cursor-not-allowed" />
              </div>
              <p className="text-sm text-brand-secondary mt-2">
                Required for the website to function properly. These cannot be disabled.
              </p>
              <p className="text-xs text-brand-secondary mt-2 italic">
                Examples: Session management, authentication, shopping cart
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-brand-accent/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-primary">Analytics Cookies</h3>
                </div>
                <Toggle
                  checked={preferences.analytics}
                  onChange={(checked) => handleToggle('analytics', checked)}
                />
              </div>
              <p className="text-sm text-brand-secondary mt-2">
                Help us understand how visitors interact with our website by collecting and reporting information
                anonymously.
              </p>
              <p className="text-xs text-brand-secondary mt-2 italic">
                Examples: Google Analytics, page views, session duration
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-brand-accent/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-primary">Marketing Cookies</h3>
                </div>
                <Toggle
                  checked={preferences.marketing}
                  onChange={(checked) => handleToggle('marketing', checked)}
                />
              </div>
              <p className="text-sm text-brand-secondary mt-2">
                Used to track visitors across websites to display relevant advertisements.
              </p>
              <p className="text-xs text-brand-secondary mt-2 italic">
                Examples: Facebook Pixel, Google Ads (not currently in use)
              </p>
            </div>

            {/* Functional Cookies */}
            <div className="border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-brand-accent/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-primary">Functional Cookies</h3>
                </div>
                <Toggle
                  checked={preferences.functional}
                  onChange={(checked) => handleToggle('functional', checked)}
                />
              </div>
              <p className="text-sm text-brand-secondary mt-2">
                Enable enhanced functionality and personalization, such as remembering your preferences.
              </p>
              <p className="text-xs text-brand-secondary mt-2 italic">
                Examples: Theme preference (dark/light mode), currency settings
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white dark:bg-brand-surface border-t border-gray-200 dark:border-white/10 p-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} className="flex-1 sm:order-2">
              Save Preferences
            </Button>
            <Button onClick={handleAcceptAll} variant="outline" className="flex-1 sm:order-1">
              Accept All
            </Button>
            <Button onClick={handleRejectAll} variant="outline" className="flex-1 sm:order-3">
              Reject All
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

