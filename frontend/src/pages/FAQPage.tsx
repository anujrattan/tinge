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

  // Static fallback FAQs for Tinge Metal Wall Art
  const fallbackFaqs = [
    {
      question: 'What does Tinge actually print?',
      answer: 'Four materials, all in our studio. Framed ACP is a UV print on an aluminium composite panel, then a frame. Canvas is a stretched canvas print. Sunboard is a lighter rigid panel without a frame. Neon is a sign, not a poster.'
    },
    {
      question: 'How do I choose a size?',
      answer: 'You pick from the sizes we already cut. The ACP sheet is 12 ft by 4 ft. Statement is the full sheet. Pair, triptych, gallery, home, and desk sizes are the cuts that use the rest of that sheet. You cannot type your own width and height.'
    },
    {
      question: 'Can I send my own design?',
      answer: 'Yes. Choose the material and a listed size, then send the file. We print after the size is confirmed. The custom path uses the same sizes as the shop.'
    },
    {
      question: 'Is a sunboard the same as a framed ACP?',
      answer: 'No. Sunboard is the lighter, simpler panel. A framed ACP is the UV print plus a frame, and it is the piece that uses the 12 × 4 ft sheet. They are priced and packed differently.'
    },
    {
      question: 'Do you sell cheap paper poster packs?',
      answer: 'No. We do not sell 300 GSM paper posters in a tube. If you want the lower price, that is sunboard. If you want the finished wall piece, that is framed ACP.'
    },
    {
      question: 'How long does shipping take across India?',
      answer: 'All orders are custom printed and dispatched within 24–48 hours. Express delivery takes 2–3 business days for Tier 1 metro cities (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, Chennai, Kolkata) and 3–5 business days for the rest of India.'
    },
    {
      question: 'What is your Safe Transit Guarantee?',
      answer: 'We ship all posters in reinforced, crush-proof flat boxes. In the rare event of transit damage, simply send us a photo of the damaged piece within 48 hours of delivery, and we will dispatch a brand-new replacement immediately with zero return hassle.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We support all major payment options: UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and Cash on Delivery (COD) for orders up to ₹2,500.'
    },
    {
      question: 'Can I send a Tinge print as a gift?',
      answer: 'Yes. Enter the recipient’s address at checkout. The invoice is emailed to you, not packed as a price tag.'
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
    title: 'Frequently Asked Questions | Tinge',
    description: 'What Tinge prints: framed ACP, canvas, sunboard, and neon. How sizes are cut from a 12 by 4 ft sheet, and how custom art works.',
    keywords: 'Tinge FAQ, framed ACP print, sunboard vs canvas, custom wall art India, neon sign',
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

