import React, { useEffect, useRef, useState } from 'react';
import { FlameIcon, RocketIcon, Wand2Icon, ArrowRightIcon } from './icons';

type Step = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  footnote: string;
};

const STEPS: Step[] = [
  {
    id: 'collect',
    icon: FlameIcon,
    title: 'Choose the material',
    description: 'Framed ACP, canvas, sunboard, or neon. Each one arrives as a different object.',
    footnote: 'The material is the product',
  },
  {
    id: 'display',
    icon: RocketIcon,
    title: 'Pick a listed size',
    description:
      'ACP sizes fill a 12 × 4 ft sheet. Your art uses the same list as ours.',
    footnote: 'No typed width or height',
  },
  {
    id: 'bring-home',
    icon: Wand2Icon,
    title: 'We print it here',
    description:
      'The press is in-house. A listed design ships as shown. A custom file is printed only after the size is confirmed.',
    footnote: 'Made when you order',
  },
];

export const DesignPhilosophyJourney: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal steps with a stagger the first time the section scrolls into view
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="relative">
      {/* Connector line behind the steps (desktop) */}
      <div
        aria-hidden
        className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[#FF7A59]/10 via-[#FF7A59]/40 to-[#FF7A59]/10"
      />

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={`group relative flex flex-col items-center text-center ${
                revealed ? 'opacity-0 animate-riseIn' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 180}ms` }}
            >
              {/* Step node */}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-[#FF7A59]/25 bg-white dark:bg-brand-surface shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-[#FF7A59]/20 group-hover:border-[#FF7A59]/60 group-hover:-translate-y-1">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A59]/10 text-[#FF7A59] transition-all duration-500 group-hover:bg-gradient-to-br group-hover:from-[#FF7A59] group-hover:to-[#E85D3D] group-hover:text-white">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A59] to-[#E85D3D] text-white text-[11px] font-bold shadow-md shadow-[#FF7A59]/30">
                  {index + 1}
                </span>
              </div>

              {/* Mobile connector between steps */}
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="md:hidden absolute left-1/2 top-20 h-10 w-px -translate-x-1/2 translate-y-full bg-gradient-to-b from-[#FF7A59]/40 to-transparent"
                />
              )}

              <h3 className="mt-6 font-playfair text-2xl md:text-[1.65rem] font-medium text-brand-primary">
                {step.title}
              </h3>
              <p className="mt-3 text-sm md:text-base text-brand-secondary leading-relaxed max-w-xs">
                {step.description}
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF7A59]">
                {step.footnote}
                <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
