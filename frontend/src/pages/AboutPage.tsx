import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { AwardIcon, TargetIcon, DropletIcon, HeartIcon } from '../components/icons';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: <AwardIcon className="w-8 h-8 text-brand-accent"/>,
      title: 'Unmatched Quality',
      description: 'From fabric selection to printing techniques, we are obsessed with quality. Every item is crafted to be a long-lasting favorite.'
    },
    {
      icon: <TargetIcon className="w-8 h-8 text-brand-accent"/>,
      title: 'Pixel-Perfect Design',
      description: 'We believe in the power of great design. Our products serve as the perfect canvas for creativity, ensuring every detail is crisp and clear.'
    },
    {
      icon: <DropletIcon className="w-8 h-8 text-brand-accent"/>,
      title: 'Sustainable Practices',
      description: 'We are committed to reducing our environmental footprint by using eco-friendly materials and on-demand production.'
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 dark:from-purple-950 dark:via-purple-900 dark:to-pink-950">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554126807-6b10f600673a?q=80&w=1950&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/50 to-purple-900/80 dark:via-purple-950/50 dark:to-purple-950/80"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col items-center justify-center text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight text-white drop-shadow-lg">
              About Tinge
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 mx-auto rounded-full"></div>
            <p className="mt-6 text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto font-sans text-white/95 leading-relaxed drop-shadow-md">
              Where style meets substance. We curate premium threads that reflect your unique energy and essence.
            </p>
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto font-sans text-white/80 leading-relaxed">
              Quality fabrics, curated designs, zero compromise.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-brand-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary mb-6">
              Our Story
            </h2>
            <p className="mt-4 text-brand-secondary leading-relaxed text-lg">
              Tinge was born from a simple belief: your clothing should be as unique as you are. We're not just another fashion brand—we're a movement dedicated to helping you express your authentic self through premium, thoughtfully curated apparel.
            </p>
            <p className="mt-6 text-brand-secondary leading-relaxed text-lg">
              Every piece in our collection is carefully selected for quality, comfort, and style. We partner with trusted fulfillment partners to ensure your orders are handled with care, from selection to delivery.
            </p>
            <p className="mt-6 text-brand-secondary leading-relaxed text-lg">
              Whether you're looking for everyday essentials or statement pieces, we've got you covered. Welcome to Tinge—where your style finds its voice.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-200 dark:border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
                alt="Fashion Collection"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

       {/* Values Section */}
      <section className="bg-white dark:bg-brand-surface/50 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-center text-brand-primary">Our Core Values</h2>
            <p className="mt-2 text-center text-brand-secondary font-sans max-w-2xl mx-auto">The principles that guide every decision we make.</p>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                {values.map(value => (
                <div key={value.title} className="flex flex-col items-center bg-white dark:bg-brand-surface p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-md">
                    <div className="flex-shrink-0">{value.icon}</div>
                    <h3 className="mt-4 text-xl font-display font-semibold text-brand-primary">{value.title}</h3>
                    <p className="mt-2 text-brand-secondary">{value.description}</p>
                </div>
                ))}
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary">Ready to Order?</h2>
        <p className="mt-4 text-lg max-w-2xl mx-auto text-brand-secondary">Explore our curated collections and find your perfect style today.</p>
        <Button onClick={() => navigate('/categories')} className="mt-8 px-8 py-3 text-lg">Shop Now</Button>
      </section>
    </div>
  );
};
