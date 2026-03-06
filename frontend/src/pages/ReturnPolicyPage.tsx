import React from 'react';
import { Card } from '../components/ui';
import { PackageIcon, RefreshCwIcon, CheckCircleIcon } from '../components/icons';

export const ReturnPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-bg py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-primary mb-4">
            Return & Exchange Policy
          </h1>
          <p className="text-brand-secondary">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <Card className="p-8 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 mb-6">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">Overview</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                At Tinge Clothing, we want you to be completely satisfied with your purchase. If you're not happy with your order, we offer a hassle-free return and exchange policy within 7 days of delivery.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                Please read this policy carefully to understand your rights and our process for returns and exchanges.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">1. Return Eligibility</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">1.1 Return Window</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                You have <strong>7 days</strong> from the date of delivery to initiate a return or exchange. Returns requested after 7 days will not be accepted.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">1.2 Product Condition</h3>
              <p className="text-brand-secondary leading-relaxed mb-3">
                To be eligible for a return or exchange, products must meet the following conditions:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Unused and Unworn:</strong> Products must be in their original, unworn, and unwashed condition</li>
                <li><strong>Tags Intact:</strong> All original tags, labels, and barcodes must be attached</li>
                <li><strong>No Damage:</strong> Products must not be damaged, stained, or altered in any way</li>
                <li><strong>Hygienic Condition:</strong> Products must be in a clean and hygienic condition</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                <em>Note: Original packaging is not mandatory, but products should be returned in a condition suitable for resale.</em>
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">1.3 Proof of Purchase</h3>
              <p className="text-brand-secondary leading-relaxed">
                You must provide proof of purchase (order number, invoice, or receipt) to initiate a return or exchange.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">2. Non-Returnable Items</h2>
              <p className="text-brand-secondary leading-relaxed mb-3">
                For hygiene and safety reasons, the following items are <strong>not eligible</strong> for return or exchange:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Innerwear and Undergarments:</strong> Including boxers, briefs, vests, and socks</li>
                <li><strong>Swimwear and Activewear:</strong> Once worn or tags removed</li>
                <li><strong>Face Masks and Personal Care Items</strong></li>
                <li><strong>Discounted/Sale Items:</strong> Products marked as "Final Sale" or purchased during clearance sales</li>
                <li><strong>Gift Cards and Vouchers</strong></li>
                <li><strong>Custom or Personalized Items:</strong> Products made to order or with customization</li>
                <li><strong>Items with Missing or Damaged Tags</strong></li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                These restrictions are clearly marked on product pages and at checkout.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">3. How to Initiate a Return or Exchange</h2>
              
              <div className="bg-gray-50 dark:bg-brand-bg p-6 rounded-lg border border-gray-200 dark:border-white/10 mb-6">
                <h3 className="text-lg font-semibold text-brand-primary mb-4">Step-by-Step Process:</h3>
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <div>
                      <p className="text-brand-primary font-semibold">Contact Customer Support</p>
                      <p className="text-brand-secondary text-sm mt-1">
                        Email us at <span className="text-brand-accent">support@tingeclothing.com</span> or call <span className="text-brand-accent">+91-XXXXXXXXXX</span> within 7 days of delivery.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <div>
                      <p className="text-brand-primary font-semibold">Provide Order Details</p>
                      <p className="text-brand-secondary text-sm mt-1">
                        Share your order number, product details, and reason for return/exchange.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <div>
                      <p className="text-brand-primary font-semibold">Receive Return Authorization</p>
                      <p className="text-brand-secondary text-sm mt-1">
                        Our team will verify your request and provide a Return Authorization Number (RAN) if approved.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <div>
                      <p className="text-brand-primary font-semibold">Ship the Product Back</p>
                      <p className="text-brand-secondary text-sm mt-1">
                        Securely pack the product with all tags attached and ship it to the address provided. Include your RAN in the package.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-sm">5</span>
                    <div>
                      <p className="text-brand-primary font-semibold">Quality Check & Processing</p>
                      <p className="text-brand-secondary text-sm mt-1">
                        Once we receive your return, we'll inspect it and process your refund or exchange within 7 days.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              <p className="text-brand-secondary leading-relaxed text-sm italic">
                <strong>Important:</strong> Returns without a Return Authorization Number (RAN) may not be accepted.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">4. Return Shipping</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                <strong>Return shipping costs are currently under review.</strong> Our team will provide specific instructions on return shipping during the return authorization process.
              </p>
              <p className="text-brand-secondary leading-relaxed mb-4">
                In most cases:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Defective or Wrong Items:</strong> We will provide a prepaid return label or arrange pickup at no cost to you.</li>
                <li><strong>Change of Mind:</strong> Return shipping costs may apply (to be confirmed by our support team).</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                Please use a trackable shipping method and retain your shipping receipt until the return is processed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">5. Refunds</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.1 Refund Processing Time</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Once we receive and inspect your returned product, we will notify you of the approval or rejection of your refund. If approved, your refund will be processed within <strong>7 business days</strong>.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.2 Refund Method</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Refunds will be issued to the original payment method:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li><strong>Online Payment (Credit/Debit Card, UPI, Net Banking):</strong> Refund to original payment source within 7-10 business days (bank processing time may vary)</li>
                <li><strong>Cash on Delivery (COD):</strong> Bank transfer to your provided account details within 7 business days</li>
              </ul>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">5.3 Partial Refunds</h3>
              <p className="text-brand-secondary leading-relaxed mb-3">
                Partial refunds may be granted in the following situations:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Product showing signs of use or wear</li>
                <li>Product missing tags or accessories</li>
                <li>Product returned after the 7-day return window (at our discretion)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">6. Exchanges</h2>
              
              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">6.1 Exchange Eligibility</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                We offer exchanges for:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Different size (subject to availability)</li>
                <li>Different color (subject to availability)</li>
                <li>Different product of equal or higher value</li>
              </ul>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">6.2 Exchange Process</h3>
              <p className="text-brand-secondary leading-relaxed mb-4">
                Follow the same return process outlined above, but specify that you want an exchange instead of a refund. Once we receive and approve your return, we will ship the replacement item at no additional cost.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                If the replacement item is of higher value, you will need to pay the price difference. If it's of lower value, we will refund the difference.
              </p>

              <h3 className="text-xl font-semibold text-brand-primary mb-3 mt-6">6.3 Out of Stock Items</h3>
              <p className="text-brand-secondary leading-relaxed">
                If your requested exchange item is out of stock, we will notify you and offer a full refund or an alternative product.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">7. Damaged or Defective Items</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you receive a damaged, defective, or incorrect item, please contact us immediately at <span className="text-brand-accent">support@tingeclothing.com</span> with:
              </p>
              <ul className="list-disc list-inside text-brand-secondary space-y-2 ml-4">
                <li>Photos of the damaged/defective product</li>
                <li>Photos of the packaging</li>
                <li>Order number and product details</li>
              </ul>
              <p className="text-brand-secondary leading-relaxed mt-4">
                We will arrange a free return pickup and send you a replacement or issue a full refund (including return shipping costs) as per your preference.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">8. Wrong Item Delivered</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you receive an incorrect item, please contact us within 48 hours of delivery. We will arrange a free return pickup and send you the correct item at no additional cost.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                Do not use or wash the incorrect item, and keep all tags attached.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">9. Quality Assurance</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                All returned products undergo a quality inspection. We reserve the right to reject returns that do not meet our return eligibility criteria. In such cases, the product will be returned to you, and you may be responsible for return shipping costs.
              </p>
              <p className="text-brand-secondary leading-relaxed">
                If a return is rejected, we will notify you with photographic evidence and provide an opportunity to collect the item or have it shipped back at your expense.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">10. Lost or Damaged Returns</h2>
              <p className="text-brand-secondary leading-relaxed">
                We are not responsible for returns that are lost or damaged during shipping. We strongly recommend using a trackable shipping method with insurance. Keep your tracking number and shipping receipt until your refund or exchange is processed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-brand-primary mb-4">11. Policy Updates</h2>
              <p className="text-brand-secondary leading-relaxed">
                We reserve the right to modify this Return & Exchange Policy at any time. Changes will be effective immediately upon posting to our website. Please review this policy periodically for updates.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-brand-primary mb-4">12. Contact Us</h2>
              <p className="text-brand-secondary leading-relaxed mb-4">
                If you have any questions about our Return & Exchange Policy, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-brand-bg p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-brand-primary font-semibold mb-2">Tinge Clothing</p>
                <p className="text-brand-secondary">Email: support@tingeclothing.com</p>
                <p className="text-brand-secondary">Phone: +91-XXXXXXXXXX</p>
                <p className="text-brand-secondary">Address: [To be updated upon registration]</p>
                <p className="text-brand-secondary mt-3 text-sm">Customer Support Hours: Monday - Saturday, 10:00 AM - 6:00 PM IST</p>
              </div>
            </section>
          </div>
        </Card>

        {/* Quick Reference Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border-green-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 dark:bg-green-500/30 rounded-full">
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-primary mb-2">7-Day Returns</h3>
                <p className="text-sm text-brand-secondary">
                  Easy returns within 7 days of delivery with tags intact
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 dark:bg-blue-500/30 rounded-full">
                <RefreshCwIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-primary mb-2">Quick Refunds</h3>
                <p className="text-sm text-brand-secondary">
                  Refunds processed within 7 business days of approval
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 dark:bg-purple-500/30 rounded-full">
                <PackageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-primary mb-2">Free Exchanges</h3>
                <p className="text-sm text-brand-secondary">
                  Exchange for different size or color at no extra cost
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

