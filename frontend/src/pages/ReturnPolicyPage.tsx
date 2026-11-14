import React from 'react';
import { Card } from '../components/ui';
import { PackageIcon, RefreshCwIcon, CheckCircleIcon, ShieldIcon, SparklesIcon } from '../components/icons';
import { SEOHead } from '../components/SEOHead';

export const ReturnPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-bg py-12">
      <SEOHead
        title="Return & Replacement Policy | Tinge Metal Wall Art"
        description="Learn about Tinge's 100% Safe Transit Guarantee, 48-hour free damage replacement, and print quality assurance for metal posters."
        keywords="Tinge returns, metal poster replacement, damaged art replacement, safe transit guarantee India"
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldIcon className="w-3.5 h-3.5" />
            Safe Transit Guarantee
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold text-brand-primary mb-3">
            Returns, Replacements & Transit Guarantee
          </h1>
          <p className="text-sm text-brand-secondary">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 mb-8 space-y-8">
          <section>
            <h2 className="font-playfair text-2xl font-semibold text-brand-primary mb-3">
              Our Safe Delivery & Quality Promise
            </h2>
            <p className="text-sm sm:text-base text-brand-secondary leading-relaxed mb-3">
              At <strong className="text-brand-primary">Tinge</strong>, framed ACP, canvas, sunboard, and neon are packed for the material you ordered. Panels and framed pieces ship flat in crush-resistant boxes.
            </p>
            <p className="text-sm sm:text-base text-brand-secondary leading-relaxed">
              We stand behind every print. If your artwork arrives damaged, scratched, or has any print defect, we will replace it immediately at zero cost to you.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-2xl font-semibold text-brand-primary mb-4">
              1. 48-Hour Transit Damage Replacement
            </h2>
            <p className="text-sm text-brand-secondary leading-relaxed mb-3">
              In the rare event that your package is mishandled during courier transit:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-secondary space-y-2 ml-2">
              <li>Inspect your package upon delivery.</li>
              <li>If you notice any bend, dent, or surface scratch on the metal plate, take 2–3 clear photos of the product and the outer packaging.</li>
              <li>Email us at <span className="text-[#FF7A59] font-medium">care@tinge.in</span> or message our WhatsApp support within <strong>48 hours of delivery</strong>.</li>
              <li>Our team will dispatch a fresh brand-new replacement within 24–48 hours — with zero courier pickup hassle for you.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-2xl font-semibold text-brand-primary mb-4">
              2. Print Quality & Defect Guarantee
            </h2>
            <p className="text-sm text-brand-secondary leading-relaxed mb-3">
              We inspect each piece under studio lighting before dispatch. You are covered for 100% free replacement if you encounter:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-secondary space-y-2 ml-2">
              <li>Print misalignment or visual banding</li>
              <li>Incorrect artwork or size delivered</li>
              <li>A framed ACP that arrives without its frame, or a panel that arrives as the wrong material</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-2xl font-semibold text-brand-primary mb-4">
              3. Custom On-Demand Print Policy
            </h2>
            <p className="text-sm text-brand-secondary leading-relaxed mb-3">
              Because every Tinge metal poster is custom manufactured upon receiving your order, we do not support returns for simple remorse or change of mind after dispatch.
            </p>
            <p className="text-sm text-brand-secondary leading-relaxed">
              However, if you wish to cancel or modify your order (such as changing the shipping address or swapping the artwork), please contact us within <strong>2 hours of placing the order</strong> before the production cycle begins.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-2xl font-semibold text-brand-primary mb-4">
              4. How to Reach Customer Care
            </h2>
            <div className="p-5 rounded-xl bg-brand-bg border border-white/10 space-y-2 text-sm">
              <p className="font-semibold text-brand-primary font-playfair text-base">Tinge Customer Care</p>
              <p className="text-brand-secondary">Email: <span className="text-[#FF7A59]">care@tinge.in</span></p>
              <p className="text-brand-secondary">Support Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
              <p className="text-brand-secondary">Response Time: Under 4 hours on business days</p>
            </div>
          </section>
        </Card>

        {/* 3 Quick Reference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-playfair font-semibold text-brand-primary mb-1">100% Free Replacement</h3>
                <p className="text-xs text-brand-secondary leading-relaxed">
                  Instant remake dispatched for any transit damage reported within 48 hrs.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-500/20 rounded-xl">
                <ShieldIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-playfair font-semibold text-brand-primary mb-1">Zero Pickup Hassle</h3>
                <p className="text-xs text-brand-secondary leading-relaxed">
                  No need to package or courier back defective prints — just photo proof.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-purple-500/20 rounded-xl">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-playfair font-semibold text-brand-primary mb-1">Hardware Guarantee</h3>
                <p className="text-xs text-brand-secondary leading-relaxed">
                  Extra mounting magnets & wall leaves shipped free if needed.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
