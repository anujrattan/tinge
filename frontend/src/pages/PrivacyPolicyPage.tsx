import React from 'react';
import { Card } from '../components/ui';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-bg py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-primary mb-4">
            Privacy Policy
          </h1>
          <p className="text-brand-secondary">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <Card className="p-8 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">1. Introduction</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Welcome to Tinge Clothing ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                By using our website, you consent to the data practices described in this policy. If you do not agree with this policy, please do not access or use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">2.1 Personal Information</h3>
              <p className="text-brand-secondary leading-relaxed mb-3">
                We collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4 mb-4">
                <li>Register for an account</li>
                <li>Place an order</li>
                <li>Contact our customer support</li>
                <li>Subscribe to our newsletter</li>
                <li>Participate in surveys or promotions</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mb-4">
                This information may include:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Shipping and billing address</li>
                <li>Payment information (processed securely through Razorpay)</li>
              </ul>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <p className="text-brand-secondary leading-relaxed mb-3">
                When you visit our website, we automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Pages visited and time spent on pages</li>
                <li>Referring website</li>
              </ul>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">2.3 Cookies and Tracking Technologies</h3>
              <p className="text-brand-secondary leading-relaxed">
                We may use cookies and similar tracking technologies to enhance your experience on our website. We will implement a cookie consent mechanism to comply with applicable laws. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">3. How We Use Your Information</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>To process and fulfill your orders</li>
                <li>To communicate with you about your orders and account</li>
                <li>To provide customer support</li>
                <li>To send you marketing communications (with your consent)</li>
                <li>To improve our website and services</li>
                <li>To detect and prevent fraud</li>
                <li>To comply with legal obligations</li>
                <li>To analyze website usage and trends (using tools like Google Analytics)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">4. How We Share Your Information</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                We may share your information with third parties only in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.1 Service Providers</h3>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4 mb-4">
                <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
                <li><strong>Fulfillment Partners:</strong> Third-party vendors for order fulfillment and shipping</li>
                <li><strong>Analytics Providers:</strong> Google Analytics (to be implemented) for website analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.2 Legal Requirements</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We may disclose your information if required by law, court order, or government regulation, or to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.3 Business Transfers</h3>
              <p className="text-brand-secondary leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">5. Data Storage and Security</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Your data is stored securely on servers located in India. We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">6. Your Rights</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                Under applicable Indian data protection laws, you have the following rights:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Objection:</strong> Object to processing of your information</li>
                <li><strong>Data Portability:</strong> Request transfer of your data</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                To exercise these rights, please contact us at [support@tingeclothing.com].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">7. Data Retention</h2>
              <p className="text-brand-secondary leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Order information is retained for accounting and legal compliance purposes for a minimum of 7 years.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">8. Children's Privacy</h2>
              <p className="text-brand-secondary leading-relaxed">
                Our services are available to users of all ages. However, we do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">9. International Users</h2>
              <p className="text-brand-secondary leading-relaxed">
                Our services are primarily intended for users in India. If you access our website from outside India, your information will be transferred to and processed in India, which may have different data protection laws than your country.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-brand-secondary leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">11. Contact Us</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-brand-bg p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-brand-primary font-semibold mb-2">Tinge Clothing</p>
                <p className="text-brand-secondary">Email: support@tingeclothing.com</p>
                <p className="text-brand-secondary">Phone: +91-XXXXXXXXXX</p>
                <p className="text-brand-secondary">Address: [To be updated upon registration]</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-brand-primary mb-4">12. Governing Law</h2>
              <p className="text-brand-secondary leading-relaxed">
                This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts in [City/State - to be updated upon registration].
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

