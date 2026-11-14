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
    title: 'Four real materials',
    tagline: 'ACP, canvas, sunboard, neon',
    description:
      'A framed UV print on ACP is not a canvas, and a sunboard is not a paper poster. Neon is a sign. The page names the material before you pay, so the box matches what you ordered.',
    highlights: ['Framed ACP', 'Canvas', 'Sunboard and neon'],
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
    title: 'Cut to the sheet',
    tagline: '12 × 4 ft, used up',
    description:
      'The ACP sheet is 12 ft by 4 ft. The sizes we sell fill that sheet: one statement panel, a pair, a triptych, or smaller pieces. You pick a size from that list. You do not invent one.',
    highlights: ['No custom measurements', 'Triptychs from one sheet', 'Smaller sizes use the offcut'],
  },
];

export const TingeDifferenceShowcase: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  // Bumping this key restarts the progress-bar animation after a manual selection
  const [cycleKey, setCycleKey] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduceMotion(media.matches);
      if (media.matches) setUserPaused(true);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

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
    const isPaused = userPaused || hoverPaused || reduceMotion;
    if (isPaused || !inView) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ITEMS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [userPaused, hoverPaused, reduceMotion, inView, cycleKey]);

  const select = useCallback((index: number) => {
    setActiveIndex(index);
    setCycleKey((k) => k + 1);
  }, []);

  const isPaused = userPaused || hoverPaused || reduceMotion;
  const active = ITEMS[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-stretch"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHoverPaused(false);
        }
      }}
    >
      <div className="lg:col-span-2 flex justify-end">
        <button
          type="button"
          onClick={() => setUserPaused((paused) => !paused)}
          aria-pressed={userPaused}
          className="min-h-11 cursor-pointer rounded-full border border-gray-200 px-4 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:border-[#FF7A59]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] focus-visible:ring-offset-2 dark:border-white/15"
        >
          {userPaused ? 'Play stories' : 'Pause stories'}
        </button>
      </div>
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
              id={`difference-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`difference-panel-${item.id}`}
              onClick={() => select(index)}
              className={`relative min-h-11 cursor-pointer overflow-hidden rounded-xl border text-left px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] focus-visible:ring-offset-2 lg:px-5 lg:py-4 ${
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
                  <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
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
                      animationPlayState: isPaused || !inView || reduceMotion ? 'paused' : 'running',
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
        id={`difference-panel-${active.id}`}
        aria-labelledby={`difference-tab-${active.id}`}
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
              <ActiveIcon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#FF7A59] uppercase tracking-[0.18em]">
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
