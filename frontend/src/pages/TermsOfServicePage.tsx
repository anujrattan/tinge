import React from 'react';
import { Card } from '../components/ui';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-bg py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-primary mb-4">
            Terms of Service
          </h1>
          <p className="text-brand-secondary">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <Card className="p-8 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">1. Agreement to Terms</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Welcome to Tinge Clothing. These Terms of Service ("Terms") govern your access to and use of our website, products, and services. By accessing or using our services, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                If you do not agree to these Terms, you may not access or use our services. We reserve the right to modify these Terms at any time, and your continued use of our services constitutes acceptance of any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">2. Eligibility</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Our services are available to users of all ages. However, if you are under the age of 18, you must have parental or guardian consent to make purchases through our website.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                By using our services, you represent and warrant that you have the legal capacity to enter into this agreement and comply with these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">3. Account Registration</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                To place an order, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                We reserve the right to suspend or terminate your account if you provide false information or violate these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">4. Products and Pricing</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.1 Product Information</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We strive to provide accurate product descriptions, images, and pricing. However, we do not warrant that product descriptions, colors, or other content is accurate, complete, or error-free. Colors may vary due to screen settings and lighting.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.2 Pricing</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                All prices are listed in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST). Prices are subject to change without notice. The price displayed at the time of order placement will be the final price charged.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                In the event of a pricing error, we reserve the right to cancel the order and refund any payment made.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">4.3 Product Availability</h3>
              <p className="text-brand-secondary leading-relaxed">
                All products are subject to availability. We reserve the right to limit quantities or discontinue products at any time. If a product becomes unavailable after you place an order, we will notify you and offer a refund or alternative product.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">5. Orders and Payment</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.1 Order Placement</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                When you place an order, you are making an offer to purchase the products. We reserve the right to accept or reject your order for any reason, including product availability, errors in pricing or product information, or suspected fraud.
              </p>
              <p className="text-brand-secondary leading-relaxed mb-4">
                After placing an order, you will receive an order confirmation email. This does not constitute acceptance of your order. Order acceptance occurs when we contact you for order confirmation via phone call.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.2 Payment Methods</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We accept the following payment methods:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4 mb-4">
                <li><strong>Cash on Delivery (COD):</strong> Pay in cash when your order is delivered</li>
                <li><strong>Online Payment via Razorpay:</strong> Credit/Debit cards, Net Banking, UPI, and other methods supported by Razorpay</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Payment information is processed securely through Razorpay. We do not store your complete payment card details on our servers.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.3 Order Confirmation</h3>
              <p className="text-brand-secondary leading-relaxed">
                After you place an order, our team will contact you via phone to confirm the order details. Your order will be processed only after this confirmation. This step helps prevent fraud and ensures order accuracy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">6. Order Cancellation</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">6.1 Cancellation by Customer</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                You may cancel your order at any time <strong>before it is confirmed</strong> by our team via phone call. Once the order is confirmed, cancellation is not permitted as the order enters the fulfillment process.
              </p>
              <p className="text-brand-secondary leading-relaxed mb-4">
                To cancel an order before confirmation, please contact us immediately at support@tingeclothing.com or +91-XXXXXXXXXX.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">6.2 Cancellation by Tinge Clothing</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We reserve the right to cancel any order for reasons including but not limited to:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Product unavailability</li>
                <li>Pricing or product description errors</li>
                <li>Suspected fraudulent activity</li>
                <li>Inability to verify order information</li>
                <li>Failure to reach customer for order confirmation</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                If we cancel your order, you will receive a full refund within 7-10 business days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">7. Shipping and Delivery</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">7.1 Delivery Areas</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We currently deliver to most locations within India. Delivery timelines and availability depend on your location and will be communicated by our fulfillment partner.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">7.2 Delivery Timeline</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Estimated delivery timelines will be provided by our fulfillment partner and communicated to you via email or SMS. Delivery times are estimates and not guaranteed.
              </p>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We are not responsible for delays caused by factors beyond our control, including but not limited to courier service delays, natural disasters, strikes, or government restrictions.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">7.3 Failed Delivery</h3>
              <p className="text-brand-secondary leading-relaxed">
                If delivery fails due to incorrect address, unavailability of recipient, or refusal to accept the package, the order may be returned to us. In such cases, you may be responsible for return shipping costs and re-delivery charges.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">8. Intellectual Property</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                All content on our website, including but not limited to text, images, logos, designs, graphics, and software, is the property of Tinge Clothing or our licensors and is protected by Indian and international copyright, trademark, and intellectual property laws.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                You may not reproduce, distribute, modify, or create derivative works from our content without our express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">9. Prohibited Activities</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Use our services for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt our services</li>
                <li>Upload or transmit viruses or malicious code</li>
                <li>Collect or harvest information about other users</li>
                <li>Impersonate any person or entity</li>
                <li>Engage in any fraudulent activity</li>
                <li>Resell our products without authorization</li>
                <li>Use automated systems (bots, scrapers) to access our website</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">10. Limitation of Liability</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                To the fullest extent permitted by law, Tinge Clothing shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Your use or inability to use our services</li>
                <li>Unauthorized access to your account or data</li>
                <li>Errors or omissions in content</li>
                <li>Product defects or dissatisfaction</li>
                <li>Delays or failures in delivery</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                Our total liability for any claim arising from these Terms or your use of our services shall not exceed the amount you paid for the specific product or service giving rise to the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">11. Indemnification</h2>
              <p className="text-brand-secondary leading-relaxed">
                You agree to indemnify, defend, and hold harmless Tinge Clothing, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising from your violation of these Terms, your use of our services, or your violation of any rights of another party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">12. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">12.1 Informal Resolution</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                In the event of any dispute, claim, or controversy, you agree to first contact us at support@tingeclothing.com to attempt to resolve the issue informally.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">12.2 Arbitration</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If informal resolution fails, any dispute shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in [City - to be updated], India.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">12.3 Governing Law and Jurisdiction</h3>
              <p className="text-brand-secondary leading-relaxed">
                These Terms are governed by the laws of India. Any disputes not subject to arbitration shall be subject to the exclusive jurisdiction of the courts in [City/State - to be updated upon registration].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">13. Severability</h2>
              <p className="text-brand-secondary leading-relaxed">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">14. Entire Agreement</h2>
              <p className="text-brand-secondary leading-relaxed">
                These Terms, together with our Privacy Policy and Return Policy, constitute the entire agreement between you and Tinge Clothing regarding your use of our services and supersede any prior agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">15. Changes to Terms</h2>
              <p className="text-brand-secondary leading-relaxed">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of our services after changes are posted constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">16. Contact Information</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
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
    </div>
  );
};

