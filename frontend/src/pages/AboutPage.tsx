import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { SEOHead } from '../components/SEOHead';
import {
  SparklesIcon,
  ShieldIcon,
  ZapIcon,
  CheckCircleIcon,
  PackageIcon,
  ArrowRightIcon,
  HeartIcon,
  AwardIcon,
} from '../components/icons';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const brandPillars = [
    {
      icon: <SparklesIcon className="w-8 h-8 text-[#FF7A59]" />,
      title: 'Framed UV on ACP',
      description:
        'The main piece is a UV print on an aluminium composite panel, then a frame. The sheet is 12 ft by 4 ft. Every size we sell fills that sheet.',
    },
    {
      icon: <ZapIcon className="w-8 h-8 text-[#5DA9E9]" />,
      title: 'Canvas, sunboard, neon',
      description:
        'Canvas is the textile print. Sunboard is the lighter rigid panel. Neon is a sign. They are not the same product and they are not packed as one.',
    },
    {
      icon: <ShieldIcon className="w-8 h-8 text-[#FFC371]" />,
      title: 'Your art, our sizes',
      description:
        'Send a file if you want. You still pick a listed size. We do not take a custom width, because that wastes the sheet.',
    },
    {
      icon: <HeartIcon className="w-8 h-8 text-[#FF7A59]" />,
      title: 'Curated Visual Stories',
      description:
        'We collaborate with visionary digital artists and illustrators worldwide to bring you exclusive, story-driven collections across cyberpunk, sacred geometry, anime, minimalism, and nature.',
    },
  ];

  const mountingSteps = [
    {
      step: '01',
      title: 'Choose the material',
      desc: 'Framed ACP, canvas, sunboard, or neon. The page names which one you are buying.',
    },
    {
      step: '02',
      title: 'Pick a listed size',
      desc: 'ACP sizes are the cuts of a 12 × 4 ft sheet, from one statement panel to eight smaller pieces.',
    },
    {
      step: '03',
      title: 'We print it here',
      desc: 'A listed design ships as shown. A custom file is printed after the size is confirmed.',
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      <SEOHead
        title="About Us | Tinge — The Future of Wall Art"
        description="Tinge prints wall art in-house: framed UV on ACP, canvas, sunboard, and neon. Made in India."
        keywords="about Tinge, framed ACP print, canvas print India, sunboard, neon sign, wall art studio"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-surface border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A59]/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF7A59]/30 bg-[#FF7A59]/10 text-xs font-semibold text-[#FF7A59] uppercase tracking-wider mb-6">
            <SparklesIcon className="w-3.5 h-3.5" />
            The Tinge Story
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-brand-primary leading-tight">
            Art Made to Outlast{' '}
            <span className="bg-gradient-to-r from-[#FF7A59] via-[#FF5E62] to-[#FFC371] bg-clip-text text-transparent italic">
              Paper and Glass.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-secondary leading-relaxed max-w-3xl mx-auto font-sans">
            We started Tinge with a simple frustration: paper posters tear and fade, glass frames shatter and glare, and hanging art meant drilling holes and damaging walls.
          </p>
          <p className="mt-3 text-base sm:text-lg text-brand-primary font-medium max-w-2xl mx-auto">
            So we print it ourselves: UV on ACP with a frame, canvas, sunboard, and neon.
          </p>
        </div>
      </section>

      {/* Narrative Section: The Problem & The Solution */}
      <section className="py-16 md:py-24 bg-white dark:bg-brand-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
              Why We Exist
            </div>
            <h2 className="font-playfair text-3xl sm:text-4xl font-medium text-brand-primary tracking-tight">
              Printed in the studio. Hung as a finished piece.
            </h2>
            <p className="text-brand-secondary text-base leading-relaxed">
              Your living space is a reflection of what moves you — the stories you love, the aesthetic you curate, and the energy you bring into your room. Yet traditional wall decor in India has always been cumbersome: heavy frames, drilling dust, crooked nails, and landlord restrictions.
            </p>
            <p className="text-brand-secondary text-base leading-relaxed">
              At <strong className="text-brand-primary">Tinge</strong>, a framed piece is a UV print on ACP, cut from a 12 × 4 ft sheet, then framed. Canvas and sunboard are different products. Neon is a sign. We name the material before you order.
            </p>
            <div className="pt-2 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-brand-surface/40">
                <div className="text-2xl font-bold font-playfair text-brand-primary">4</div>
                <div className="text-xs text-brand-secondary mt-1">Print lines in the studio</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-brand-surface/40">
                <div className="text-2xl font-bold font-playfair text-[#FF7A59]">12×4</div>
                <div className="text-xs text-brand-secondary mt-1">Largest ACP sheet, in feet</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10 aspect-[4/3] group">
              <img
                src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop"
                alt="Modern living room with curated wall art decor"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-6">
                <p className="text-white text-sm font-medium font-sans">
                  Curated metal art in a modern home gallery setup
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 4 Craft Pillars */}
      <section className="py-16 md:py-24 bg-brand-surface border-y border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
              Engineered for Perfection
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-medium text-brand-primary mt-2">
              The Tinge Craft Standard
            </h2>
            <p className="mt-3 text-sm sm:text-base text-brand-secondary">
              The material, the size, and the frame are decided before the box is packed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {brandPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface/70 hover:border-[#FF7A59]/40 transition-all duration-300 flex flex-col items-start text-left shadow-sm"
              >
                <div className="p-3 rounded-xl bg-brand-bg border border-white/10 mb-5">
                  {pillar.icon}
                </div>
                <h3 className="font-playfair text-lg font-semibold text-brand-primary mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-brand-secondary leading-relaxed font-sans">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Mounting System */}
      <section className="py-16 md:py-24 bg-white dark:bg-brand-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-[#FF7A59] uppercase tracking-widest">
              Simple & Damage-Free
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-medium text-brand-primary mt-2">
              How an order is made
            </h2>
            <p className="mt-2 text-sm sm:text-base text-brand-secondary">
              Hang your art in 3 effortless steps without touching a hammer or drill.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mountingSteps.map((s, idx) => (
              <div
                key={idx}
                className="relative p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-brand-surface/40 flex flex-col justify-between space-y-4"
              >
                <div className="text-4xl font-playfair font-bold text-[#FF7A59]/30">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-playfair text-xl font-medium text-brand-primary mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-brand-secondary leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safe Transit Banner */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-brand-surface via-[#FF7A59]/10 to-brand-surface p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF7A59] uppercase tracking-wider">
              <PackageIcon className="w-4 h-4" /> 100% Safe Transit Guarantee
            </div>
            <h3 className="font-playfair text-2xl md:text-3xl font-medium text-brand-primary">
              Delivered safely to your doorstep across India.
            </h3>
            <p className="text-sm text-brand-secondary">
              Every Tinge poster is shipped in reinforced, crush-resistant flat-pack boxes. In the rare event of transit damage, we replace your art instantly within 48 hours — no questions asked.
            </p>
          </div>
          <Button
            onClick={() => navigate('/categories')}
            className="flex-shrink-0 px-8 py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-brand-accent/20"
          >
            Explore Collections
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 md:py-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-playfair text-3xl sm:text-5xl font-medium text-brand-primary tracking-tight">
            Ready to give your walls the upgrade they deserve?
          </h2>
          <p className="text-base sm:text-lg text-brand-secondary max-w-xl mx-auto font-sans">
            Browse our curated drops or build your personal gallery wall ahead of this festive season.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/new-arrivals')}
              className="px-8 py-3.5 text-base bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl shadow-md"
            >
              Shop New Arrivals
            </Button>
            <Button
              onClick={() => navigate('/best-sellers')}
              variant="outline"
              className="px-8 py-3.5 text-base border-gray-300 dark:border-white/20 rounded-xl"
            >
              View Best Sellers
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

