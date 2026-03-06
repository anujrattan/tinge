import React, { useState } from 'react';
import { Card, Button } from '../components/ui';
import { CookiePreferencesModal } from '../components/CookiePreferencesModal';
import { useCookieConsent } from '../context/CookieConsentContext';

export const CookiePolicyPage: React.FC = () => {
  const [showPreferences, setShowPreferences] = useState(false);
  const { consent, updateConsent } = useCookieConsent();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-bg py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-primary mb-4">
            Cookie Policy
          </h1>
          <p className="text-brand-secondary">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Cookie Preferences Card */}
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-purple-500/30 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-brand-primary mb-2">Manage Your Cookie Preferences</h3>
              <p className="text-sm text-brand-secondary">
                You can change your cookie preferences at any time by clicking the button below.
              </p>
            </div>
            <Button onClick={() => setShowPreferences(true)} className="whitespace-nowrap">
              Cookie Settings
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">1. What Are Cookies?</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide a better user experience.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                Cookies allow websites to remember your actions and preferences (such as login status, language, font size, and other display preferences) over a period of time, so you don't have to keep re-entering them whenever you come back to the site or browse from one page to another.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">2. Types of Cookies We Use</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Tinge Clothing uses different types of cookies for various purposes:
              </p>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-xl font-semibold text-brand-primary mb-3">2.1 Essential Cookies</h3>
                  <p className="text-brand-secondary leading-relaxed mb-3">
                    These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you, such as setting your privacy preferences, logging in, or filling in forms.
                  </p>
                  <p className="text-brand-secondary font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-brand-secondary space-y-1 ml-4">
                    <li>Session management cookies</li>
                    <li>Authentication cookies (keeping you logged in)</li>
                    <li>Shopping cart cookies (remembering items in your cart)</li>
                    <li>Security cookies (preventing fraudulent activity)</li>
                  </ul>
                  <p className="text-sm text-brand-secondary italic mt-3">
                    <strong>Legal Basis:</strong> These cookies are necessary for the performance of our contract with you and to provide our services.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-brand-primary mb-3">2.2 Analytics Cookies</h3>
                  <p className="text-brand-secondary leading-relaxed mb-3">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and provide a better user experience.
                  </p>
                  <p className="text-brand-secondary font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-brand-secondary space-y-1 ml-4">
                    <li>Google Analytics (visitor count, page views, session duration)</li>
                    <li>Heatmap tools (understanding user behavior)</li>
                    <li>Performance monitoring (identifying technical issues)</li>
                  </ul>
                  <p className="text-sm text-brand-secondary italic mt-3">
                    <strong>Legal Basis:</strong> These cookies require your consent, which you can provide or withdraw at any time.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="border-l-4 border-pink-500 pl-4">
                  <h3 className="text-xl font-semibold text-brand-primary mb-3">2.3 Marketing Cookies</h3>
                  <p className="text-brand-secondary leading-relaxed mb-3">
                    These cookies track your online activity to help advertisers deliver more relevant advertising or to limit how many times you see an advertisement. These cookies can share information with other organizations or advertisers.
                  </p>
                  <p className="text-brand-secondary font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-brand-secondary space-y-1 ml-4">
                    <li>Facebook Pixel (retargeting ads on Facebook/Instagram)</li>
                    <li>Google Ads conversion tracking</li>
                    <li>Third-party advertising networks</li>
                  </ul>
                  <p className="text-sm text-brand-secondary italic mt-3">
                    <strong>Note:</strong> We do not currently use marketing cookies, but may do so in the future with your consent.
                  </p>
                  <p className="text-sm text-brand-secondary italic mt-1">
                    <strong>Legal Basis:</strong> These cookies require your explicit consent.
                  </p>
                </div>

                {/* Functional Cookies */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-semibold text-brand-primary mb-3">2.4 Functional Cookies</h3>
                  <p className="text-brand-secondary leading-relaxed mb-3">
                    These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
                  </p>
                  <p className="text-brand-secondary font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-brand-secondary space-y-1 ml-4">
                    <li>Theme preference (dark/light mode)</li>
                    <li>Language settings</li>
                    <li>Currency selection</li>
                    <li>Video player preferences</li>
                  </ul>
                  <p className="text-sm text-brand-secondary italic mt-3">
                    <strong>Legal Basis:</strong> These cookies improve your experience and require your consent.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">3. How We Use Cookies</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                We use cookies for the following purposes:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Essential Website Operations:</strong> To enable core functionality such as security, authentication, and shopping cart management</li>
                <li><strong>Performance Analysis:</strong> To understand how visitors use our website and identify areas for improvement</li>
                <li><strong>Personalization:</strong> To remember your preferences and provide a customized experience</li>
                <li><strong>Marketing (Future):</strong> To deliver relevant advertisements and measure campaign effectiveness</li>
                <li><strong>Fraud Prevention:</strong> To detect and prevent fraudulent activity and security threats</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">4. Third-Party Cookies</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Some cookies are placed by third-party services that appear on our pages. We do not control the use of these cookies and cannot access them. These third-party services have their own privacy policies.
              </p>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">Current Third-Party Services:</h3>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Razorpay:</strong> Payment processing (essential for checkout functionality)</li>
                <li><strong>Google Analytics (Future):</strong> Website analytics (requires your consent)</li>
                <li><strong>Fulfillment Partners:</strong> Order tracking and delivery services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">5. How to Control Cookies</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.1 Through Our Cookie Consent Banner</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                When you first visit our website, you'll see a cookie consent banner. You can choose to:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4 mb-4">
                <li><strong>Accept All:</strong> Allow all types of cookies</li>
                <li><strong>Reject Non-Essential:</strong> Only allow essential cookies required for the website to function</li>
                <li><strong>Customize:</strong> Choose which cookie categories to allow</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mb-4">
                You can change your cookie preferences at any time by clicking the "Cookie Settings" button at the top of this page or in our website footer.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.2 Through Your Browser Settings</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                You can also control and/or delete cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4 mb-4">
                <li>See what cookies are stored on your device</li>
                <li>Delete cookies individually or all at once</li>
                <li>Block third-party cookies</li>
                <li>Block cookies from specific websites</li>
                <li>Block all cookies</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Here are links to cookie management guides for popular browsers:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-brand-accent-hover underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-brand-accent-hover underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/en-in/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-brand-accent-hover underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-brand-accent-hover underline">Microsoft Edge</a></li>
              </ul>
              <p className="text-sm text-brand-secondary italic mt-4">
                <strong>Note:</strong> Blocking all cookies may affect your ability to use certain features of our website, such as adding items to your cart or staying logged in.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">6. Cookie Lifespan</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Cookies can be either "session cookies" or "persistent cookies":
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Session Cookies:</strong> Temporary cookies that are deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                Your cookie consent preferences are stored for <strong>1 year</strong>. After this period, we will ask for your consent again.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">7. Updates to This Cookie Policy</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Updating the "Last updated" date at the top of this page</li>
                <li>Displaying a notification banner on our website</li>
                <li>Requesting your consent again if required by law</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                If the policy version changes, your previous consent will be invalidated, and you will be asked to provide consent again.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">8. Your Rights</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                Under Indian data protection laws, you have the following rights regarding cookies:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Right to Consent:</strong> Choose which cookies to accept</li>
                <li><strong>Right to Withdraw Consent:</strong> Change your cookie preferences at any time</li>
                <li><strong>Right to Information:</strong> Know what cookies are being used and why</li>
                <li><strong>Right to Deletion:</strong> Request deletion of cookies from your device</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-brand-primary mb-4">9. Contact Us</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you have any questions about our use of cookies, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-brand-bg p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-brand-primary font-semibold mb-2">Tinge Clothing</p>
                <p className="text-brand-secondary">Email: support@tingeclothing.com</p>
                <p className="text-brand-secondary">Phone: +91-XXXXXXXXXX</p>
                <p className="text-brand-secondary">Address: [To be updated upon registration]</p>
              </div>
            </section>
          </div>
        </Card>
      </div>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={updateConsent}
        currentPreferences={consent}
      />
    </div>
  );
};

