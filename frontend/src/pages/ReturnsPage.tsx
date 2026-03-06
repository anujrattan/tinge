import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Undo2Icon, ClockIcon, PackageIcon, MailIcon } from '../components/icons';
import { Button } from '../components/ui';
import { formatCurrency } from '../utils/currency';
import { useApp } from '../context/AppContext';

export const ReturnsPage: React.FC = () => {
  const { currency } = useApp();
  const navigate = useNavigate();
  const returnSteps = [
    {
      icon: <PackageIcon className="w-6 h-6 text-brand-accent" />,
      step: '1',
      title: 'Prepare Your Return',
      description: 'Items must be unworn, unwashed, and in original packaging with tags attached.'
    },
    {
      icon: <MailIcon className="w-6 h-6 text-brand-accent" />,
      step: '2',
      title: 'Contact Us',
      description: 'Email us at returns@podstore.com or use our contact form to initiate a return.'
    },
    {
      icon: <Undo2Icon className="w-6 h-6 text-brand-accent" />,
      step: '3',
      title: 'Ship It Back',
      description: 'We\'ll provide a prepaid return label. Drop off at any carrier location.'
    },
    {
      icon: <ClockIcon className="w-6 h-6 text-brand-accent" />,
      step: '4',
      title: 'Get Refunded',
      description: 'Once received, we\'ll process your refund within 5-7 business days.'
    }
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative bg-brand-surface/30 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <Undo2Icon className="w-12 h-12 text-brand-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
              Returns & Exchanges
            </h1>
            <p className="mt-4 text-lg text-brand-secondary">
              We want you to love your purchase. If something isn't quite right, we're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Return Policy */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-brand-surface rounded-xl border border-white/10 p-8 mb-8">
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-4">Return Policy</h2>
            <div className="space-y-4 text-brand-secondary">
              <p>
                We offer a <strong className="text-brand-primary">30-day return policy</strong> on all items. 
                To be eligible for a return, your item must be:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Unworn and unwashed</li>
                <li>In original packaging</li>
                <li>With original tags attached</li>
                <li>In the same condition you received it</li>
              </ul>
              <p className="mt-4">
                <strong className="text-brand-primary">Free returns</strong> are available on orders over {formatCurrency(50, currency)}. 
                For orders under {formatCurrency(50, currency)}, a {formatCurrency(5.99, currency)} return shipping fee applies.
              </p>
            </div>
          </div>

          {/* Return Process */}
          <h2 className="text-2xl font-display font-bold text-brand-primary mb-6 text-center">
            How to Return
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {returnSteps.map((item, index) => (
              <div
                key={index}
                className="bg-brand-surface rounded-xl border border-white/10 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-brand-accent text-white text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                      <h3 className="font-semibold text-brand-primary">{item.title}</h3>
                    </div>
                    <p className="text-sm text-brand-secondary">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Exchange Policy */}
          <div className="bg-brand-surface/50 rounded-xl border border-white/10 p-8 mb-8">
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-4">Exchanges</h2>
            <p className="text-brand-secondary mb-4">
              Need a different size or color? We offer free exchanges within 30 days of purchase. 
              Simply follow the return process and specify your exchange preference when contacting us.
            </p>
            <p className="text-brand-secondary">
              <strong className="text-brand-primary">Note:</strong> Exchanges are subject to product availability. 
              If your desired size/color is out of stock, we'll process a refund instead.
            </p>
          </div>

          {/* Refund Info */}
          <div className="bg-brand-surface rounded-xl border border-white/10 p-8">
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-4">Refunds</h2>
            <div className="space-y-3 text-brand-secondary">
              <p>
                Refunds will be processed to the original payment method within <strong className="text-brand-primary">5-7 business days</strong> 
                after we receive your return.
              </p>
              <p>
                You'll receive an email confirmation once your refund has been processed. 
                It may take an additional 3-5 business days for the refund to appear in your account, 
                depending on your bank or credit card company.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Button onClick={() => navigate('/contact')} className="px-8 py-3">
              Start a Return
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

