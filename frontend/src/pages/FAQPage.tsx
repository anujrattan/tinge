import React, { useEffect, useState } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { ChevronDownIcon } from '../components/icons';
import { formatCurrency } from '../utils/currency';
import { useApp } from '../context/AppContext';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createFAQSchema } from '../components/StructuredData';
import { DEFAULT_SITE_URL } from '../utils/seo';
import api from '../services/api';

export const FAQPage: React.FC = () => {
  const { currency } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);

  // Static fallback FAQs (used if API is unavailable or empty)
  const fallbackFaqs = [
    {
      question: 'What is your return policy?',
      answer: `We offer a 30-day return policy on all items. Items must be unworn, unwashed, and in original packaging with tags attached. Returns are free for orders over ${formatCurrency(50, currency)}.`
    },
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is available at checkout. International shipping times vary by location.'
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes! We ship to most countries worldwide. Shipping costs and delivery times vary by location. You can see estimated shipping costs at checkout.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay.'
    },
    {
      question: 'How do I track my order?',
      answer: 'Once your order ships, you\'ll receive a tracking number via email. You can use this to track your package on our website or the carrier\'s website.'
    },
    {
      question: 'Can I modify or cancel my order?',
      answer: 'Orders can be modified or cancelled within 1 hour of placement. After that, please contact our support team and we\'ll do our best to accommodate your request.'
    },
    {
      question: 'What sizes do you offer?',
      answer: 'We offer sizes S, M, L, XL for most apparel items. Some items may have different sizing - check the product page for specific size charts.'
    },
    {
      question: 'Are your products ethically made?',
      answer: 'Yes! We\'re committed to ethical manufacturing practices. All our products are made in facilities that meet strict labor and environmental standards.'
    }
  ];

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.getFaqs();
        if (isMounted && res?.items && res.items.length > 0) {
          const mapped = res.items.map((item: any) => ({
            question: item.question,
            answer: item.answer_markdown,
          }));
          setFaqs(mapped);
          return;
        }
      } catch (error) {
        console.warn('Failed to load FAQs from API, using fallback set:', error);
      }
      if (isMounted) {
        setFaqs(fallbackFaqs);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // SEO Data
  const seoData = {
    title: 'Frequently Asked Questions - Luxe Threads',
    description: 'Find answers to common questions about shipping, returns, sizing, payment methods, and more at Luxe Threads. Get help with your orders and product inquiries.',
    keywords: 'FAQ, frequently asked questions, shipping, returns, sizing, payment, Luxe Threads help, customer support',
    type: 'website' as const,
    url: `${DEFAULT_SITE_URL}/faq`,
  };

  return (
    <>
      <SEOHead {...seoData} />
      <StructuredData data={createFAQSchema(faqs.length ? faqs : fallbackFaqs)} />
      <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 max-w-4xl mx-auto">
            <div className="w-full max-w-xs flex-shrink-0 sm:order-1 order-2 sm:mr-auto">
              <Player
                src="/FAQ.json"
                autoplay
                loop
                className="w-full"
                aria-label="FAQ illustration"
              />
            </div>
            <div className="flex-1 text-left sm:order-2 order-1 min-w-0">
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
                Frequently Asked Questions
              </h1>
              <p className="mt-4 text-lg text-brand-secondary">
                Find answers to common questions about our products, shipping, returns, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-brand-surface rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-brand-primary pr-4">{faq.question}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-brand-secondary flex-shrink-0 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4 text-brand-secondary leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center bg-brand-surface rounded-xl p-8 border border-white/10">
            <h3 className="text-xl font-display font-semibold text-brand-primary mb-2">
              Still have questions?
            </h3>
            <p className="text-brand-secondary mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg font-semibold transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

