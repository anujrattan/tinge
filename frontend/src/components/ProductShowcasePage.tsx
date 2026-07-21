import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { FlameIcon, ChevronUpIcon, ArrowRightIcon } from './icons';

const RANK_STYLES = [
  'bg-gradient-to-br from-[#FF7A59] to-[#E85D3D] text-white shadow-lg shadow-[#FF7A59]/30',
  'bg-gradient-to-br from-brand-primary to-gray-700 text-white shadow-md dark:from-white dark:to-gray-300 dark:text-brand-bg',
  'bg-white/95 text-brand-primary border border-gray-200 shadow-md dark:bg-brand-surface dark:text-white dark:border-white/15',
];

export interface ProductShowcasePageProps {
  /** Icon shown next to the eyebrow text and in the count pill / empty state */
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  /** e.g. "trending" → "12 trending pieces" */
  countAdjective: string;
  fetchProducts: () => Promise<Product[]>;
  /** Show #1–#3 rank badges on the first three cards */
  showRanks?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  ctaPrompt: string;
  ctaLabel: string;
  ctaTo: string;
}

export const ProductShowcasePage: React.FC<ProductShowcasePageProps> = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  countAdjective,
  fetchProducts,
  showRanks = false,
  emptyTitle,
  emptyDescription,
  ctaPrompt,
  ctaLabel,
  ctaTo,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const data = await fetchProducts();
      if (!cancelled) {
        setProducts(data || []);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="animate-fadeIn">
      {/* Editorial header band */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF7F3] to-transparent dark:from-brand-surface/40 dark:to-transparent">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#FF7A59]/10 blur-3xl"
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-[#FF7A59]" />
                <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.28em]">
                  {eyebrow}
                </span>
              </div>
              <h1 className="font-playfair text-4xl md:text-5xl font-medium tracking-tight text-brand-primary">
                {title}
              </h1>
              <p className="mt-3 text-brand-secondary font-sans text-base md:text-lg leading-relaxed">
                {description}
              </p>
            </div>

            {!loading && products.length > 0 && (
              <div className="inline-flex items-center gap-2 self-start sm:self-end rounded-full border border-[#FF7A59]/25 bg-white/70 dark:bg-white/[0.05] backdrop-blur-sm px-4 py-2 animate-popIn">
                <Icon className="w-4 h-4 text-[#FF7A59]" />
                <span className="text-sm font-medium text-brand-primary">
                  {products.length} {countAdjective}{' '}
                  {products.length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton-shimmer bg-gray-200/80 dark:bg-white/[0.06] aspect-[4/5] rounded-xl" />
                <div className="skeleton-shimmer bg-gray-200/80 dark:bg-white/[0.06] h-4 w-3/4 rounded-full" />
                <div className="skeleton-shimmer bg-gray-200/80 dark:bg-white/[0.06] h-4 w-1/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="group relative opacity-0 animate-riseIn transition-transform duration-300 ease-out hover:-translate-y-1.5"
                  style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
                >
                  <ProductCard
                    product={product}
                    cornerBadge={
                      showRanks && index < 3 ? (
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap transition-transform duration-300 group-hover:scale-110 ${RANK_STYLES[index]}`}
                        >
                          {index === 0 && <FlameIcon className="w-3 h-3" />}
                          #{index + 1}
                        </span>
                      ) : undefined
                    }
                  />
                </div>
              ))}
            </div>

            {/* Closing CTA */}
            <div className="mt-16 text-center">
              <p className="font-playfair text-xl md:text-2xl text-brand-primary">
                {ctaPrompt}
              </p>
              <Link
                to={ctaTo}
                className="group mt-4 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 dark:border-white/20 px-6 py-3 text-sm font-medium text-brand-primary hover:border-[#FF7A59] hover:text-[#FF7A59] transition-colors duration-300"
              >
                {ctaLabel}
                <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-24 animate-fadeIn">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A59]/10">
              <Icon className="w-6 h-6 text-[#FF7A59]" />
            </div>
            <p className="font-playfair text-2xl text-brand-primary">{emptyTitle}</p>
            <p className="mt-2 text-brand-secondary">{emptyDescription}</p>
          </div>
        )}
      </section>

      {/* Back to top */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-white dark:bg-white dark:text-brand-bg shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ${
          showScrollTop
            ? 'opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 translate-y-4'
        }`}
      >
        <ChevronUpIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
