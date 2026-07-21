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
} from "../components/icons";
import { TingeDifferenceShowcase } from "../components/TingeDifferenceShowcase";
import { DesignPhilosophyJourney } from "../components/DesignPhilosophyJourney";
import { RotatingText } from "../components/RotatingText";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { SEOHead } from "../components/SEOHead";
import {
  StructuredData,
  OrganizationSchema,
  WebsiteSchema,
} from "../components/StructuredData";
import { shuffleArray } from "../utils/shuffle";
import { allocateExclusiveGrids } from "../utils/homepageProductAllocation";
import { FeaturedArtCarousel } from "../components/FeaturedArtCarousel";

const SECTION_SIZE = 8;
/** Enough headroom for Best Sellers + New Arrivals after excluding featured IDs */
const POOL_FETCH_LIMIT = 24;
const FEATURED_CAROUSEL_LIMIT = 8;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [featuredArt, setFeaturedArt] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [hasMoreBestSellers, setHasMoreBestSellers] = useState(false);
  const [hasMoreNewArrivals, setHasMoreNewArrivals] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      const [collectionsData, curatedFeatured, bestSellers, arrivals] = await Promise.all([
        api.getCollections(),
        api.getFeaturedProducts(FEATURED_CAROUSEL_LIMIT),
        api.getBestSellers(POOL_FETCH_LIMIT),
        api.getNewArrivals(POOL_FETCH_LIMIT),
      ]);
      const visible = (collectionsData || []).filter((c) => c.isActive !== false);
      setCollections(visible.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setCollectionsLoading(false);

      const featured = curatedFeatured || [];
      setFeaturedArt(featured);

      const grids = allocateExclusiveGrids(
        shuffleArray(bestSellers || []),
        shuffleArray(arrivals || []),
        featured.map((p) => p.id),
        SECTION_SIZE,
      );
      setFeaturedProducts(grids.bestSellers);
      setNewArrivals(grids.newArrivals);
      setHasMoreBestSellers(grids.hasMoreBestSellers);
      setHasMoreNewArrivals(grids.hasMoreNewArrivals);
    };
    fetchFeatured();
  }, []);

  // SEO Data
  const seoData = {
    title: "Tinge Clothing — Art Prints & Accessories",
    description:
      "Collect stories. Display what moves you. Shop curated art prints and adventure-inspired accessories from Tinge — made on demand, shipped across India.",
    keywords:
      "art prints, curated art, wall art, adventure accessories, collectible prints, high-quality prints, curated drops, Tinge Clothing",
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
                alt="Tinge art prints and accessories"
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
                  "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.15) 60%, transparent 80%)",
              }}
            />
            {/* Desktop: left-side scrim so copy stays readable on bright sunset areas */}
            <div aria-hidden="true" className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent pointer-events-none" />
            <div aria-hidden="true" className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

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
              <div className="w-full md:max-w-3xl hero-copy-panel">

                {/* Eyebrow */}
                <p className="hero-eyebrow inline-flex items-center gap-3 text-[10px] md:text-xs font-bold uppercase tracking-[0.28em] mb-3 md:mb-4">
                  <span aria-hidden className="inline-block h-px w-8 md:w-12 bg-gradient-to-r from-[#FF9966] to-transparent" />
                  Art Prints & Accessories
                </p>

                {/* Headline */}
                <h1 className="font-playfair text-[2.35rem] leading-[1.12] sm:text-[2.75rem] md:text-7xl lg:text-8xl font-medium tracking-tight">
                  <span className="hero-headline-accent block">Collect Stories.</span>
                  <span className="block mt-1 md:mt-3 text-[1.85rem] sm:text-[2.25rem] md:text-6xl lg:text-7xl leading-[1.15]">
                    <RotatingText
                      words={["Display What Moves You.", "Bring It Home."]}
                      interval={3000}
                      typingSpeed={55}
                      className="hero-headline-rotate"
                    />
                  </span>
                </h1>

                {/* Subheading */}
                <p className="hero-subtext mt-4 md:mt-6 text-sm sm:text-base md:text-xl max-w-sm md:max-w-xl leading-relaxed">
                  Adventure doesn&apos;t end at the trail. Curated art on high-density,
                  high-quality prints — made to give your room decor that extra oomph.
                </p>

                {/* CTAs */}
                <div className="mt-5 md:mt-10 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate("/collections")}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-all duration-200 bg-[#FF7A59] hover:bg-[#FF5E62] text-[#FFF8EE] active:scale-[0.97] shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                  >
                    Explore Art Prints
                  </button>
                  <button
                    onClick={() => navigate("/categories")}
                    className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-all duration-200 bg-[#1E1B22]/85 backdrop-blur-md border border-[#1E1B22]/30 text-[#F7F3EA] hover:bg-[#1E1B22] active:scale-[0.97] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                  >
                    Shop Accessories
                  </button>
                </div>

                {/* Upcoming launch badge — apparel is the next drop, keep it visible */}
                <div className="mt-5 md:mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#1E1B22]/75 backdrop-blur-md border border-[#FFC371]/45 pl-3.5 pr-4 py-2 shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
                  <span className="relative flex h-2.5 w-2.5" aria-hidden>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC371] opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FFC371]" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#FFE0B0]">
                    Coming Soon
                    <span className="mx-1.5 text-[#FFC371]/60">·</span>
                    <span className="text-[#FFF8EE]">Tees &amp; Apparel Drops</span>
                  </span>
                </div>

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
              <p className="mt-2 text-brand-secondary leading-relaxed">
                Curated art prints and accessories — each drop tells a story worth displaying.
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
                        "A curated set of prints and pieces built around one visual story."}
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

        {/* Featured Art — curated carousel (newest listings first) */}
        {featuredArt.length > 0 && (
          <section
            className="bg-white dark:bg-brand-surface/40 py-12 md:py-16"
            aria-label="Featured art"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.28em]">
                    The Gallery
                  </span>
                  <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary mt-2">
                    Featured{" "}
                    <span className="italic bg-gradient-to-r from-[#FF7A59] to-[#FFC371] bg-clip-text text-transparent">
                      Art
                    </span>
                  </h2>
                  <p className="mt-2 text-brand-secondary leading-relaxed max-w-xl">
                    A short list of pieces worth living with — swipe or scroll through, then see them all.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/featured-art")}
                  variant="outline"
                  className="hidden sm:flex items-center gap-2 self-start sm:self-auto"
                >
                  See all
                  <ArrowRightIcon className="w-4 h-4" />
                </Button>
              </div>

              <FeaturedArtCarousel products={featuredArt} seeAllTo="/featured-art" />
            </div>
          </section>
        )}

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
              <p className="mt-2 text-brand-secondary leading-relaxed">
                The prints and pieces everyone&apos;s bringing home.
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
              <p className="mt-2 text-brand-secondary leading-relaxed">
                Fresh drops — be first to discover what&apos;s new.
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

        {/* The Tinge Difference — interactive showcase */}
        <section className="bg-white dark:bg-brand-surface/50">
          <div className="container mx-auto px-4 py-10 md:py-16 sm:px-6 lg:px-8">
            <div className="mb-8 md:mb-12 max-w-2xl">
              <span className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.22em]">
                Why Tinge
              </span>
              <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary mt-2">
                The Tinge Difference
              </h2>
              <p className="mt-3 text-brand-secondary leading-relaxed">
                Four things we refuse to compromise on. Explore each one — or
                let them tell their own story.
              </p>
            </div>
            <TingeDifferenceShowcase />
          </div>
        </section>

        {/* Design Philosophy — three-step journey */}
        <section className="bg-gradient-to-b from-white to-[#FAFAFA] dark:from-brand-surface/30 dark:to-brand-bg py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              <p className="text-[11px] font-semibold text-[#FF7A59] uppercase tracking-[0.28em]">
                Why Tinge
              </p>
              <h2 className="font-playfair text-3xl md:text-5xl font-medium tracking-tight text-brand-primary mt-3">
                Design Philosophy
              </h2>
              <p className="mt-5 text-lg md:text-xl text-brand-secondary leading-relaxed font-playfair italic">
                Collect what moves you. Display what matters.
              </p>
            </div>
            <DesignPhilosophyJourney />
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
