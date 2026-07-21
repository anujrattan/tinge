import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GlobeIcon,
  Wand2Icon,
  SparklesIcon,
  RecycleIcon,
} from './icons';

const CYCLE_MS = 6000;

type ShowcaseItem = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
};

const ITEMS: ShowcaseItem[] = [
  {
    id: 'story',
    icon: GlobeIcon,
    title: 'Story-Driven Art',
    tagline: 'Art with a reason to exist',
    description:
      'Every print starts with a moment — a trail at golden hour, a city that changed you, a feeling worth keeping. We design from stories, not stock libraries, so what hangs on your wall actually means something.',
    highlights: ['Original artwork', 'Rooted in real places', 'No stock designs'],
  },
  {
    id: 'display',
    icon: Wand2Icon,
    title: 'Made to Display',
    tagline: 'Built for walls, desks, and daily carry',
    description:
      'High-density materials, rich color reproduction, and finishes that hold up in real light and real rooms. These are pieces made to be looked at every day — not tucked in a drawer.',
    highlights: ['Gallery-grade finish', 'Fade-resistant inks', 'Ready to hang'],
  },
  {
    id: 'drops',
    icon: SparklesIcon,
    title: 'Small Batch Drops',
    tagline: 'Curated releases, not endless catalogs',
    description:
      'We release intentionally — a handful of pieces at a time, each one earning its place. When a drop is gone, it makes room for the next story instead of piling into an infinite scroll.',
    highlights: ['Limited releases', 'Hand-curated', 'Always fresh'],
  },
  {
    id: 'demand',
    icon: RecycleIcon,
    title: 'Made on Demand',
    tagline: 'Printed when you order',
    description:
      'Nothing sits in a warehouse waiting to be discounted or discarded. Every piece is produced after you order it — less waste, more intention, and a supply chain that matches how we think about art.',
    highlights: ['Zero dead stock', 'Lower waste', 'Intentional by design'],
  },
];

export const TingeDifferenceShowcase: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Bumping this key restarts the progress-bar animation after a manual selection
  const [cycleKey, setCycleKey] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Only auto-cycle while the section is actually visible
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused || !inView) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ITEMS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [isPaused, inView, cycleKey]);

  const select = useCallback((index: number) => {
    setActiveIndex(index);
    setCycleKey((k) => k + 1);
  }, []);

  const active = ITEMS[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-stretch"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left rail: the 4 points */}
      <div
        role="tablist"
        aria-label="The Tinge Difference"
        aria-orientation="vertical"
        className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-3"
      >
        {ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => select(index)}
              className={`relative overflow-hidden rounded-xl border text-left px-3 py-3 lg:px-5 lg:py-4 transition-all duration-300 ${
                isActive
                  ? 'border-[#FF7A59]/40 bg-white dark:bg-white/[0.07] shadow-md shadow-[#FF7A59]/10'
                  : 'border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] hover:border-[#FF7A59]/25 hover:bg-white dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#FF7A59] to-[#E85D3D] text-white'
                      : 'bg-[#FF7A59]/10 text-[#FF7A59]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-playfair text-sm lg:text-base font-medium truncate transition-colors ${
                      isActive ? 'text-brand-primary' : 'text-brand-primary/80'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="hidden lg:block text-xs text-brand-secondary truncate">
                    {item.tagline}
                  </span>
                </span>
              </div>

              {/* Auto-cycle progress along the bottom edge of the active tab */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF7A59]/15">
                  <span
                    key={`${activeIndex}-${cycleKey}`}
                    className="showcase-progress block h-full bg-gradient-to-r from-[#FF7A59] to-[#FFC371]"
                    style={{
                      animationDuration: `${CYCLE_MS}ms`,
                      animationPlayState: isPaused || !inView ? 'paused' : 'running',
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right panel: detail for the active point */}
      <div
        role="tabpanel"
        key={active.id}
        className="relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-brand-surface/60 p-6 md:p-10 animate-fadeIn"
      >
        {/* Decorative watermark numeral */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-2 font-playfair text-[9rem] md:text-[11rem] leading-none font-medium text-[#FF7A59]/[0.07] dark:text-[#FF7A59]/[0.09] select-none"
        >
          {String(activeIndex + 1).padStart(2, '0')}
        </span>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#FF7A59]/[0.06] blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A59] to-[#E85D3D] text-white shadow-lg shadow-[#FF7A59]/25">
              <ActiveIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                {active.tagline}
              </p>
              <h3 className="font-playfair text-2xl md:text-3xl font-medium text-brand-primary mt-0.5">
                {active.title}
              </h3>
            </div>
          </div>

          <p className="mt-5 text-base md:text-lg text-brand-secondary leading-relaxed max-w-xl">
            {active.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {active.highlights.map((highlight, i) => (
              <span
                key={highlight}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#FF7A59]/20 bg-[#FF7A59]/[0.06] px-3 py-1.5 text-xs font-medium text-brand-primary opacity-0 animate-riseIn"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A59]" />
                {highlight}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
