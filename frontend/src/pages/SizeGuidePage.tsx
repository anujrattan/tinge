import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RulerIcon, PackageIcon, CheckCircleIcon, SparklesIcon, ArrowRightIcon } from '../components/icons';
import { Button } from '../components/ui';
import { SEOHead } from '../components/SEOHead';
import { ACP_CUTS } from '../data/printTypes';

export const SizeGuidePage: React.FC = () => {
  const navigate = useNavigate();

  const artSizes = ACP_CUTS.map((cut) => ({
    size: cut.name,
    dimensionsInches: cut.size,
    dimensionsCm: cut.panels,
    thickness: 'ACP sheet, then a frame',
    included: 'The print and the frame for ACP. Canvas and sunboard are separate.',
    bestFor: cut.bestFor,
    popular: cut.id === 'home',
  }));

  const placementTips = [
    {
      title: 'The 57-Inch Eye-Level Rule',
      desc: 'Hang artwork so that the visual center of the print is 57 to 60 inches (145–152 cm) from the floor — standard museum gallery viewing height.',
    },
    {
      title: 'Above Furniture Spacing',
      desc: 'When mounting above a sofa, bed, or console table, ensure the print occupies approximately 60% to 75% of the furniture width, placed 6–8 inches above.',
    },
    {
      title: 'Gallery Wall Symmetry',
      desc: 'When hanging multiple Tinge metal prints side by side, maintain a clean 2 to 3-inch (5–7 cm) gap between plates for a cohesive editorial aesthetic.',
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      <SEOHead
        title="Wall Art Size & Dimensions Guide | Tinge"
        description="Find the perfect metal art print dimensions for your room. Compare Medium (12x18), Large (18x24), and Gallery Sets with wall visual recommendations."
        keywords="Tinge sizes, 12 by 4 ft ACP, triptych wall art, framed print dimensions"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-surface border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A59]/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF7A59]/30 bg-[#FF7A59]/10 text-xs font-semibold text-[#FF7A59] uppercase tracking-wider mb-6">
            <RulerIcon className="w-3.5 h-3.5" />
            Print Dimensions & Room Visualizer
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-medium tracking-tight text-brand-primary">
            Size & Placement Guide
          </h1>
          <p className="mt-4 text-base sm:text-lg text-brand-secondary leading-relaxed font-sans max-w-2xl mx-auto">
            Choose the ideal print scale for your living room, home office, or bedroom with our exact dimension specifications.
          </p>
        </div>
      </section>

      {/* Size Comparison Cards */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
            Curated Dimensions
          </span>
          <h2 className="font-playfair text-3xl font-medium text-brand-primary mt-1">
            Sizes cut from one ACP sheet
          </h2>
          <p className="text-sm text-brand-secondary mt-2">
            These six sizes fill a 12 × 4 ft sheet. Pick one. Do not send a custom measurement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {artSizes.map((item, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-sm ${
                item.popular
                  ? 'bg-brand-surface border-[#FF7A59]/60 shadow-lg shadow-[#FF7A59]/5'
                  : 'bg-white dark:bg-brand-surface border-gray-200 dark:border-white/10 hover:border-[#FF7A59]/40'
              }`}
            >
              {item.popular && (
                <div className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FF7A59] text-white">
                  Most Popular
                </div>
              )}
              <div>
                <h3 className="font-playfair text-xl font-semibold text-brand-primary mb-1">
                  {item.size}
                </h3>
                <div className="mt-3 mb-4 p-3 rounded-xl bg-brand-bg border border-white/10">
                  <p className="text-2xl font-bold font-playfair text-brand-primary">
                    {item.dimensionsInches}
                  </p>
                  <p className="text-xs text-brand-secondary font-mono mt-0.5">
                    {item.dimensionsCm} · {item.thickness}
                  </p>
                </div>
                <div className="space-y-2 text-xs text-brand-secondary font-sans mb-4">
                  <p className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>What you get:</strong> {item.included}</span>
                  </p>
                </div>
                <p className="text-xs text-brand-secondary leading-relaxed pt-3 border-t border-gray-100 dark:border-white/10">
                  <strong>Ideal for:</strong> {item.bestFor}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Placement Guidelines */}
      <section className="bg-brand-surface/60 border-y border-white/10 py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
              Interior Design Tips
            </span>
            <h2 className="font-playfair text-3xl font-medium text-brand-primary mt-1">
              How to Position on Your Wall
            </h2>
            <p className="text-sm text-brand-secondary mt-2">
              Simple rules for gallery-grade balance and aesthetic appeal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {placementTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-brand-bg border border-white/10 space-y-3"
              >
                <div className="text-2xl font-playfair font-bold text-[#FF7A59]">
                  0{idx + 1}
                </div>
                <h3 className="font-playfair text-lg font-semibold text-brand-primary">
                  {tip.title}
                </h3>
                <p className="text-xs sm:text-sm text-brand-secondary leading-relaxed font-sans">
                  {tip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center pt-14">
        <div className="max-w-xl mx-auto space-y-4">
          <h3 className="font-playfair text-2xl sm:text-3xl font-medium text-brand-primary">
            Ready to find the perfect print for your space?
          </h3>
          <p className="text-sm text-brand-secondary">
            Framed ACP includes the frame. Canvas and sunboard are listed separately on the print types page.
          </p>
          <Button
            onClick={() => navigate('/categories')}
            className="px-8 py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-medium shadow-md inline-flex items-center gap-2"
          >
            Explore Collections
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};


