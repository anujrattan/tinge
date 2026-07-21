import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowRightIcon } from './icons';

type Props = {
  products: Product[];
  seeAllTo?: string;
};

export const FeaturedArtCarousel: React.FC<Props> = ({
  products,
  seeAllTo = '/featured-art',
}) => {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [products, updateArrows]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-carousel-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* Arrow — desktop */}
      <button
        type="button"
        aria-label="Scroll featured art left"
        onClick={() => scrollByCard(-1)}
        disabled={!canScrollLeft}
        className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-1/2 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/15 shadow-md transition-opacity ${
          canScrollLeft ? 'opacity-100 hover:border-brand-accent' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll featured art right"
        onClick={() => scrollByCard(1)}
        disabled={!canScrollRight}
        className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-1/2 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/15 shadow-md transition-opacity ${
          canScrollRight ? 'opacity-100 hover:border-brand-accent' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-carousel-card
            className="snap-start shrink-0 w-[min(72vw,280px)] sm:w-[240px] lg:w-[260px]"
          >
            <ProductCard product={product} />
          </div>
        ))}

        {/* See All — last slide */}
        <button
          type="button"
          data-carousel-card
          onClick={() => navigate(seeAllTo)}
          className="snap-start shrink-0 w-[min(72vw,280px)] sm:w-[240px] lg:w-[260px] rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 bg-gray-50/80 dark:bg-white/[0.03] hover:border-brand-accent hover:bg-brand-accent/5 transition-colors flex flex-col items-center justify-center gap-3 min-h-[320px] text-center px-6"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
            <ArrowRightIcon className="w-5 h-5" />
          </span>
          <span className="font-playfair text-xl font-medium text-brand-primary">See All</span>
          <span className="text-sm text-brand-secondary leading-relaxed">
            Browse every featured piece
          </span>
        </button>
      </div>
    </div>
  );
};
