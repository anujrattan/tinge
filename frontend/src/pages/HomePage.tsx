import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product, Collection } from "../types";
import api from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { Button, Card } from "../components/ui";
import {
  TrendingUpIcon,
  ArrowRightIcon,
  FlameIcon,
  TagIcon,
  GlobeIcon,
  Wand2Icon,
  SparklesIcon,
  RecycleIcon,
  RocketIcon,
} from "../components/icons";
import { RotatingText } from "../components/RotatingText";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { SEOHead } from "../components/SEOHead";
import {
  StructuredData,
  OrganizationSchema,
  WebsiteSchema,
} from "../components/StructuredData";
import { shuffleArray } from "../utils/shuffle";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [hasMoreBestSellers, setHasMoreBestSellers] = useState(false);
  const [hasMoreNewArrivals, setHasMoreNewArrivals] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      const displayLimit = 8;

      const [collectionsData, bestSellers, arrivals] = await Promise.all([
        api.getCollections(),
        api.getBestSellers(displayLimit + 1),
        api.getNewArrivals(displayLimit + 1),
      ]);
      const visible = (collectionsData || []).filter((c) => c.isActive !== false);
      setCollections(visible.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setCollectionsLoading(false);
      const shuffledBest = shuffleArray(bestSellers);
      const shuffledNew = shuffleArray(arrivals);
      setFeaturedProducts(shuffledBest.slice(0, displayLimit));
      setHasMoreBestSellers(shuffledBest.length > displayLimit);
      setNewArrivals(shuffledNew.slice(0, displayLimit));
      setHasMoreNewArrivals(shuffledNew.length > displayLimit);
    };
    fetchFeatured();
  }, []);

  const benefits = [
    {
      icon: <GlobeIcon className="w-8 h-8 text-brand-accent" />,
      title: "Designed for Escape",
      description:
        "Inspired by road trips, campfires, sunsets and exploration.",
    },
    {
      icon: <Wand2Icon className="w-8 h-8 text-brand-accent" />,
      title: "Wearable Art",
      description:
        "Graphics created to tell stories, not follow trends.",
    },
    {
      icon: <SparklesIcon className="w-8 h-8 text-brand-accent" />,
      title: "Small Batch Drops",
      description:
        "Curated collections instead of endless catalogs.",
    },
    {
      icon: <RecycleIcon className="w-8 h-8 text-brand-accent" />,
      title: "Made on Demand",
      description:
        "Made only when ordered to reduce waste.",
    },
  ];

  const philosophy = [
    {
      icon: <FlameIcon className="w-7 h-7 text-[#FF7A59]" />,
      title: "Escape",
      description: "Designs inspired by movement and adventure.",
    },
    {
      icon: <RocketIcon className="w-7 h-7 text-[#FF7A59]" />,
      title: "Horizon",
      description:
        "Space for curiosity — break routine, roam farther, discover what's next.",
    },
    {
      icon: <Wand2Icon className="w-7 h-7 text-[#FF7A59]" />,
      title: "Unordinary",
      description: "Created for people who don't blend in.",
    },
  ];

  // SEO Data
  const seoData = {
    title: "Luxe Threads - Premium Apparel & Custom Clothing Online",
    description:
      "Shop premium apparel and custom clothing at Luxe Threads. Designer t-shirts, luxury fashion, and print-on-demand apparel. Free shipping on orders over ₹500.",
    keywords:
      "premium apparel, luxury clothing, custom t-shirts, designer fashion, print on demand, luxury fashion online, custom clothing, designer t-shirts",
    type: "website" as const,
  };

  return (
    <>
      <SEOHead {...seoData} />
      <StructuredData data={OrganizationSchema} />
      <StructuredData data={WebsiteSchema} />
      <div className="space-y-8 md:space-y-12 animate-fadeIn pb-16">
        {/* ── Cinematic Hero ──────────────────────────────────────────────── */}
        <section className="relative -mt-20 md:-mt-24 overflow-hidden" aria-label="Hero banner">
          {/*
           * Mobile:  portrait image fills full height; text anchored to bottom behind
           *          a strong gradient scrim for readability.
           * Desktop: landscape image; text centered-left with lighter overlay.
           */}
          <div className="relative w-full min-h-[100svh] md:h-[100vh] md:min-h-[700px]">

            {/* ── Background image ─────────────────────────────────────────────── */}
            <picture>
              <source media="(max-width: 767px)" srcSet="/Hero-Banner-Updated-Mobile.png" />
              <img
                src="/Hero-Banner-Updated.png"
                alt="Luxe Threads lifestyle hero"
                className="hero-banner-image absolute inset-0 w-full h-full object-cover object-top md:object-center animate-cinematicZoom"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </picture>

            {/* ── Gradient overlays ────────────────────────────────────────────── */}
            {/* Mobile: light bottom scrim — text legibility only where copy sits */}
            <div
              aria-hidden="true"
              className="absolute inset-0 md:hidden pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.22) 30%, transparent 55%)",
              }}
            />
            {/* Desktop: minimal tint — preserve original image color */}
            <div aria-hidden="true" className="hidden md:block absolute inset-0 bg-gradient-to-br from-black/12 via-transparent to-transparent pointer-events-none" />
            <div aria-hidden="true" className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent pointer-events-none" />

            {/* ── Film grain ───────────────────────────────────────────────────── */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.03] md:opacity-[0.04] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundRepeat: "repeat",
                backgroundSize: "180px 180px",
              }}
            />

            {/* ── Bottom page fade ─────────────────────────────────────────────── */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0 h-20 md:h-24 pointer-events-none bg-gradient-to-b from-transparent to-black/15"
            />

            {/* ── Floating particles — desktop only ────────────────────────────── */}
            <div className="hidden md:block" aria-hidden="true">
              {(
                [
                  { top: "18%", left: "6%",  size: 3, color: "rgba(255,153,102,0.55)", delay: "0s",   dur: "7s"   },
                  { top: "42%", left: "12%", size: 2, color: "rgba(255,94,98,0.45)",   delay: "1.8s", dur: "9s"   },
                  { top: "65%", left: "4%",  size: 4, color: "rgba(255,195,113,0.40)", delay: "3.2s", dur: "7.5s" },
                  { top: "22%", left: "88%", size: 2, color: "rgba(255,153,102,0.50)", delay: "2.4s", dur: "8.5s" },
                  { top: "55%", left: "92%", size: 3, color: "rgba(255,94,98,0.40)",   delay: "0.8s", dur: "6.5s" },
                  { top: "78%", left: "28%", size: 2, color: "rgba(255,195,113,0.45)", delay: "4s",   dur: "8s"   },
                  { top: "12%", left: "55%", size: 2, color: "rgba(255,153,102,0.30)", delay: "5s",   dur: "11s"  },
                ] as { top: string; left: string; size: number; color: string; delay: string; dur: string }[]
              ).map((p, i) => (
                <span
                  key={i}
                  className="absolute rounded-full pointer-events-none animate-float"
                  style={{
                    top: p.top,
                    left: p.left,
                    width: p.size,
                    height: p.size,
                    background: p.color,
                    animationDelay: p.delay,
                    animationDuration: p.dur,
                  }}
                />
              ))}
            </div>

            {/* ── Hero content ─────────────────────────────────────────────────── */}
            {/*
             * Mobile:  justify-end — block sits at the bottom of the image.
             * Desktop: justify-center — block floats in the left-center of the image.
             */}
            <div className="relative h-full flex flex-col justify-end pb-10 px-5 md:pb-0 md:px-0 md:justify-center md:container md:mx-auto md:px-8 pt-24 md:pt-0">
              <div className="w-full md:max-w-3xl">

                {/* Eyebrow tagline — visible on mobile as an orientation cue */}
                <p
                  className="text-[10px] md:text-xs font-bold uppercase tracking-[0.28em] mb-3 md:mb-4"
                  style={{ color: "rgba(255,153,102,0.90)" }}
                >
                  New Season · Collectible Drops
                </p>

                {/* Headline */}
                <h1
                  className="text-[2.65rem] leading-[1.08] sm:text-5xl md:text-8xl font-display font-extrabold tracking-tight"
                  style={{ color: "#F7F3EA" }}
                >
                  <span className="hero-wear-your-line block">Wear Your</span>
                  <span className="block">
                    <RotatingText
                      words={["Escape", "Orbit", "Adventure"]}
                      interval={3000}
                      className="bg-gradient-to-r from-[#FF9966] via-[#FF5E62] to-[#FFC371] bg-clip-text text-transparent"
                    />
                  </span>
                </h1>

                {/* Subheading */}
                <p
                  className="mt-3 md:mt-6 text-sm sm:text-base md:text-2xl max-w-sm md:max-w-2xl font-sans leading-relaxed"
                  style={{ color: "rgba(247,243,234,0.80)" }}
                >
                  Retro-inspired graphics and collectible drops made for people who never stay still.
                </p>

                {/* CTAs — full-width on mobile for thumb-friendly tap targets */}
                <div className="mt-5 md:mt-10 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate("/collections")}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-all duration-200 bg-[#FF7A59] hover:bg-[#FF5E62] text-[#FFF8EE] active:scale-[0.97] shadow-[0_4px_24px_rgba(255,94,98,0.40)]"
                  >
                    Explore Drops
                  </button>
                  <button
                    onClick={() => navigate("/best-sellers")}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-all duration-200 bg-black/45 backdrop-blur-md border border-white/15 text-[#F7F3EA] hover:bg-black/55 hover:border-white/25 active:scale-[0.97]"
                  >
                    Shop Best Sellers
                  </button>
                </div>

                {/* Trust micro-copy — dark ink + light halo for legibility on light hero areas */}
                <p className="mt-3 text-xs font-semibold tracking-wide text-[#1E1B22]/90 drop-shadow-[0_1px_3px_rgba(255,255,255,0.85)]">
                  Easy 7-day returns · Premium fabrics
                </p>

              </div>
            </div>

          </div>
        </section>

        {/* Shop by Collection */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                Curated drops
              </span>
              <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary mt-2">
                Shop by{" "}
                <span className="bg-gradient-to-r from-[#FF7A59] to-[#FFC371] bg-clip-text text-transparent">
                  Collection
                </span>
              </h2>
              <p className="mt-2 text-brand-secondary font-sans">
                Explore our curated drops – each collection blends styles, colors, and fits.
              </p>
            </div>
            {collections.length > 0 && (
              <Button
                onClick={() => navigate("/collections")}
                variant="outline"
                className="hidden sm:flex items-center gap-2"
              >
                View all
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          {collectionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-56 bg-white/10" />
                  <div className="p-5 h-16 bg-white/10" />
                </Card>
              ))}
            </div>
          ) : collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <Card
                  key={collection.id}
                  className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => navigate(`/collections/${collection.slug}`)}
                >
                  <div className="relative h-56 overflow-hidden">
                    {collection.imageUrl ? (
                      <img
                        src={collection.imageUrl}
                        alt={collection.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1A1410] via-[#231E1A] to-[#2C2620] flex items-center justify-center">
                        <TagIcon className="w-10 h-10 text-white/70" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-1">Collection</p>
                      <h3 className="text-2xl font-display font-bold text-white">{collection.name}</h3>
                    </div>
                  </div>
                  <div className="p-5 flex items-center justify-between gap-3">
                    <p className="text-sm text-brand-secondary line-clamp-2">
                      {collection.description ||
                        "A tightly curated mix of fits, colors, and textures designed to work together."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/collections/${collection.slug}`);
                      }}
                    >
                      View drop
                      <ArrowRightIcon className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </section>

        {/* Best Sellers */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUpIcon className="w-5 h-5 text-[#FF7A59]" />
                <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                  Top Picks
                </span>
              </div>
              <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary">
                Best{" "}
                <span className="bg-gradient-to-r from-[#FF7A59] to-[#FFC371] bg-clip-text text-transparent">
                  Sellers
                </span>
              </h2>
              <p className="mt-2 text-brand-secondary font-sans">
                Discover the pieces everyone is talking about.
              </p>
            </div>
            {hasMoreBestSellers && (
              <Button
                onClick={() => navigate("/best-sellers")}
                variant="outline"
                className="hidden sm:flex items-center gap-2"
              >
                Show All
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMoreBestSellers && (
            <div className="mt-6 sm:hidden flex justify-center">
              <Button
                onClick={() => navigate("/best-sellers")}
                variant="outline"
                className="flex items-center gap-2"
              >
                Show All
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </section>

        {/* New Arrivals */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FlameIcon className="w-5 h-5 text-[#FF7A59]" />
                <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                  Just In
                </span>
              </div>
              <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary">
                New{" "}
                <span className="bg-gradient-to-r from-[#FF7A59] to-[#FFC371] bg-clip-text text-transparent">
                  Arrivals
                </span>
              </h2>
              <p className="mt-2 text-brand-secondary font-sans">
                Be the first to discover our latest additions.
              </p>
            </div>
            {hasMoreNewArrivals && newArrivals.length > 0 && (
              <Button
                onClick={() => navigate("/new-arrivals")}
                variant="outline"
                className="hidden sm:flex items-center gap-2"
              >
                Show All
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {newArrivals.length > 0 ? (
              newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-brand-secondary">
                <p>No new arrivals at the moment. Check back soon!</p>
              </div>
            )}
          </div>
          {hasMoreNewArrivals && newArrivals.length > 0 && (
            <div className="mt-6 sm:hidden flex justify-center">
              <Button
                onClick={() => navigate("/new-arrivals")}
                variant="outline"
                className="flex items-center gap-2"
              >
                Show All
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </section>

        {/* The Tinge Difference */}
        <section className="bg-white dark:bg-brand-surface/50">
          <div className="container mx-auto px-4 py-8 md:py-16 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                Why Tinge
              </span>
              <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary mt-2">
                The Tinge Difference
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 text-center">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex flex-col items-center">
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <h3 className="mt-3 md:mt-4 text-lg font-playfair font-medium text-brand-primary">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 md:mt-2 text-sm text-brand-secondary leading-relaxed max-w-xs">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design Philosophy */}
        <section className="bg-gradient-to-b from-white to-[#FAFAFA] dark:from-brand-surface/30 dark:to-brand-bg py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
              <p className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.28em]">
                Why Tinge
              </p>
              <h2 className="font-playfair text-3xl md:text-5xl font-medium tracking-tight text-brand-primary mt-3">
                Design Philosophy
              </h2>
              <p className="mt-5 text-lg md:text-xl text-brand-secondary leading-relaxed font-playfair italic">
                Wander farther. Own less. Wear what matters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {philosophy.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className="group relative flex flex-col rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-brand-surface/60 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF7A59] via-[#FF5E62] to-[#FFC371] opacity-80 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] font-bold text-brand-secondary/50 tracking-[0.2em] mb-4">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="mb-4">{pillar.icon}</div>
                  <h3 className="font-playfair text-2xl md:text-[1.65rem] font-medium text-brand-primary">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm md:text-base text-brand-secondary leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter + Community */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <NewsletterSignup source="homepage" />
        </section>
      </div>
    </>
  );
};
