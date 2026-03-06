import React from 'react';
import { TruckIcon, ClockIcon, GlobeIcon, PackageIcon } from '../components/icons';
import { formatCurrency } from '../utils/currency';
import { useApp } from '../context/AppContext';

export const ShippingPage: React.FC = () => {
  const { currency } = useApp();
  const shippingOptions = [
    {
      icon: <TruckIcon className="w-8 h-8 text-brand-accent" />,
      title: 'Standard Shipping',
      duration: '5-7 Business Days',
      price: formatCurrency(5.99, currency),
      freeThreshold: `Free on orders over ${formatCurrency(50, currency)}`,
      description: 'Our standard shipping option delivers your order safely and securely.'
    },
    {
      icon: <ClockIcon className="w-8 h-8 text-brand-accent" />,
      title: 'Express Shipping',
      duration: '2-3 Business Days',
      price: formatCurrency(14.99, currency),
      freeThreshold: `Free on orders over ${formatCurrency(100, currency)}`,
      description: 'Need it faster? Express shipping gets your order to you quickly.'
    },
    {
      icon: <GlobeIcon className="w-8 h-8 text-brand-accent" />,
      title: 'International Shipping',
      duration: '7-14 Business Days',
      price: 'Varies by location',
      freeThreshold: `Free on orders over ${formatCurrency(150, currency)}`,
      description: 'We ship worldwide! International orders may be subject to customs fees.'
    }
  ];

  const trackingInfo = [
    {
      step: '1',
      title: 'Order Placed',
      description: 'You\'ll receive an order confirmation email immediately after placing your order.'
    },
    {
      step: '2',
      title: 'Order Processing',
      description: 'We prepare your order for shipment within 1-2 business days.'
    },
    {
      step: '3',
      title: 'Order Shipped',
      description: 'You\'ll receive a shipping confirmation email with your tracking number.'
    },
    {
      step: '4',
      title: 'Out for Delivery',
      description: 'Your order is on its way! Track it using the provided tracking number.'
    }
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative bg-brand-surface/30 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <TruckIcon className="w-12 h-12 text-brand-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
              Shipping Information
            </h1>
            <p className="mt-4 text-lg text-brand-secondary">
              Everything you need to know about shipping, delivery times, and tracking your order.
            </p>
          </div>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-primary mb-8 text-center">
          Shipping Options
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {shippingOptions.map((option, index) => (
            <div
              key={index}
              className="bg-brand-surface rounded-xl border border-white/10 p-6 hover:border-brand-accent/50 transition-colors"
            >
              <div className="flex justify-center mb-4">{option.icon}</div>
              <h3 className="text-xl font-display font-semibold text-brand-primary mb-2 text-center">
                {option.title}
              </h3>
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-brand-accent mb-1">{option.price}</p>
                <p className="text-sm text-brand-secondary">{option.duration}</p>
                <p className="text-xs text-brand-secondary mt-2">{option.freeThreshold}</p>
              </div>
              <p className="text-sm text-brand-secondary text-center">{option.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tracking Process */}
      <section className="bg-brand-surface/50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-primary mb-8 text-center">
            Order Tracking
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {trackingInfo.map((info, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-brand-accent text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                    {info.step}
                  </div>
                  <h3 className="font-semibold text-brand-primary mb-2">{info.title}</h3>
                  <p className="text-sm text-brand-secondary">{info.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-brand-surface rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-display font-semibold text-brand-primary mb-3 flex items-center gap-2">
              <PackageIcon className="w-6 h-6 text-brand-accent" />
              Important Notes
            </h3>
            <ul className="space-y-2 text-brand-secondary">
              <li>• Orders placed before 2 PM EST ship the same day (Monday-Friday)</li>
              <li>• Weekend orders ship on the next business day</li>
              <li>• Delivery times are estimates and may vary due to carrier delays</li>
              <li>• International orders may be subject to customs duties and taxes</li>
              <li>• Signature may be required for high-value orders</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

