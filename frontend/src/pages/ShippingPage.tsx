import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { SEOHead } from '../components/SEOHead';
import {
  TruckIcon,
  ClockIcon,
  PackageIcon,
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '../components/icons';

export const ShippingPage: React.FC = () => {
  const navigate = useNavigate();

  const shippingTiers = [
    {
      icon: <TruckIcon className="w-8 h-8 text-[#FF7A59]" />,
      title: 'Standard Express Delivery',
      duration: '3–5 Business Days',
      price: '₹99',
      freeThreshold: 'FREE on orders over ₹999',
      description: 'Dispatched via trusted courier partners (Delhivery, Bluedart, Xpressbees) with live SMS & WhatsApp tracking.',
      badge: 'Most Popular',
    },
    {
      icon: <ClockIcon className="w-8 h-8 text-[#5DA9E9]" />,
      title: 'Metro Fast-Track',
      duration: '2–3 Business Days',
      price: '₹99 (Free > ₹999)',
      freeThreshold: 'Applicable to Tier 1 Metro Cities',
      description: 'Direct air express dispatch for Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, and Pune.',
      badge: 'Metro Express',
    },
    {
      icon: <ShieldIcon className="w-8 h-8 text-[#FFC371]" />,
      title: 'Cash on Delivery (COD)',
      duration: '3–5 Business Days',
      price: '₹50 COD Handling Fee',
      freeThreshold: 'Available for orders up to ₹2,500',
      description: 'Pay cash or UPI at your doorstep. We recommend Prepaid/UPI for fastest one-click dispatch and zero handling fee.',
      badge: 'Doorstep Pay',
    },
  ];

  const trackingSteps = [
    {
      step: '01',
      title: 'Order Confirmed',
      desc: 'Instant confirmation sent to your email and WhatsApp with order summary.',
    },
    {
      step: '02',
      title: 'Print & Quality Check',
      desc: 'We print the material you ordered in the studio and check it before it leaves.',
    },
    {
      step: '03',
      title: 'Crush-Proof Packaging',
      desc: 'Panels and framed pieces ship flat. The packing matches the material.',
    },
    {
      step: '04',
      title: 'Express Doorstep Delivery',
      desc: 'Live tracking link sent via SMS/WhatsApp so you can follow your package in real-time.',
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      <SEOHead
        title="Shipping & Delivery Policy | Tinge Metal Wall Art"
        description="Fast, reliable Pan-India shipping for Tinge metal posters. Free express delivery on orders over ₹999 with reinforced crush-proof packaging."
        keywords="Tinge shipping, metal poster delivery India, art print shipping India, free shipping wall art, Delhivery art prints"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-surface border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A59]/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF7A59]/30 bg-[#FF7A59]/10 text-xs font-semibold text-[#FF7A59] uppercase tracking-wider mb-6">
            <TruckIcon className="w-3.5 h-3.5" />
            Pan-India Delivery
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-medium tracking-tight text-brand-primary">
            Shipping & Delivery Policy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-brand-secondary leading-relaxed font-sans max-w-2xl mx-auto">
            Delivering museum-grade metal art safely to 19,000+ pincodes across India with reinforced flat-pack protection.
          </p>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
            Transparent Pricing
          </span>
          <h2 className="font-playfair text-3xl font-medium text-brand-primary mt-1">
            Shipping Rates & Timelines
          </h2>
          <p className="text-sm text-brand-secondary mt-2">
            All prices are in Indian Rupees (INR) and include GST.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {shippingTiers.map((tier, index) => (
            <div
              key={index}
              className="relative bg-white dark:bg-brand-surface rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-7 hover:border-[#FF7A59]/40 transition-all duration-300 shadow-sm flex flex-col justify-between"
            >
              {tier.badge && (
                <div className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                  {tier.badge}
                </div>
              )}
              <div>
                <div className="p-3 rounded-xl bg-brand-bg border border-white/10 w-fit mb-4">
                  {tier.icon}
                </div>
                <h3 className="font-playfair text-xl font-semibold text-brand-primary mb-1">
                  {tier.title}
                </h3>
                <p className="text-sm font-medium text-brand-secondary mb-4">{tier.duration}</p>
                <div className="border-t border-gray-100 dark:border-white/10 pt-4 mb-4">
                  <p className="text-2xl font-bold font-playfair text-brand-primary">{tier.price}</p>
                  <p className="text-xs font-medium text-[#FF7A59] mt-1">{tier.freeThreshold}</p>
                </div>
                <p className="text-sm text-brand-secondary leading-relaxed font-sans">{tier.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transit Safety & Packaging Guarantee */}
      <section className="bg-brand-surface/60 border-y border-white/10 py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
                Safe Arrival Promise
              </span>
              <h2 className="font-playfair text-3xl font-medium text-brand-primary mt-2">
                Engineered Packaging for Fragile-Free Transit
              </h2>
              <p className="text-sm text-brand-secondary leading-relaxed mt-3">
                Metal prints are rigid and durable, but we take zero chances. Every order is packed inside heavy-duty multi-layer corrugated boxes with high-density corner guards.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-primary">
                    <strong>100% Free Replacement:</strong> Any dent or scratch reported within 48 hours gets an instant remake.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-primary">
                    <strong>The material you ordered:</strong> a framed ACP, a canvas, a sunboard, or a neon sign. They are not packed as the same object.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-primary">
                    <strong>Weatherproof Seal:</strong> Sealed in anti-static moisture-resistant sleeves.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-brand-bg border border-white/10 space-y-4">
              <h3 className="font-playfair text-lg font-semibold text-brand-primary flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-[#FF7A59]" />
                What's Inside Every Tinge Box?
              </h3>
              <ul className="space-y-2.5 text-sm text-brand-secondary">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                  The print you chose: framed ACP, canvas, sunboard, or neon
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                  A frame, when the order is a framed ACP
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                  Packing matched to that material, flat for panels and framed pieces
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tracking Process */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
            Transparency
          </span>
          <h2 className="font-playfair text-3xl font-medium text-brand-primary mt-1">
            How Your Order Travels
          </h2>
          <p className="text-sm text-brand-secondary mt-2">
            Real-time updates delivered straight to your SMS and WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {trackingSteps.map((info, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface/40 flex flex-col justify-between space-y-3"
            >
              <div className="text-3xl font-playfair font-bold text-[#FF7A59]/40">
                {info.step}
              </div>
              <div>
                <h3 className="font-playfair text-base font-semibold text-brand-primary mb-1">
                  {info.title}
                </h3>
                <p className="text-xs text-brand-secondary leading-relaxed font-sans">
                  {info.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Important FAQs / Delivery Notes */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto bg-brand-surface rounded-2xl border border-white/10 p-6 sm:p-8 space-y-4">
          <h3 className="font-playfair text-xl font-semibold text-brand-primary flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-[#FF7A59]" />
            Festive Season Shipping & Delivery Notes
          </h3>
          <ul className="space-y-2.5 text-sm text-brand-secondary leading-relaxed">
            <li>• <strong>Festive Gifting Deadline:</strong> We recommend placing Diwali & holiday gift orders at least 5 business days in advance to account for courier peak volumes.</li>
            <li>• <strong>Production Dispatch:</strong> All orders are custom crafted and dispatched within 24–48 hours from our fulfillment hub.</li>
            <li>• <strong>Serviceable Areas:</strong> We cover all states and Union Territories across India (including J&K and North-East).</li>
            <li>• <strong>Address Corrections:</strong> If you need to modify your shipping address, please reach out within 3 hours of placing your order.</li>
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center pt-10">
        <Button
          onClick={() => navigate('/categories')}
          className="px-8 py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-medium shadow-md inline-flex items-center gap-2"
        >
          Explore Collections
          <ArrowRightIcon className="w-4 h-4" />
        </Button>
      </section>
    </div>
  );
};


