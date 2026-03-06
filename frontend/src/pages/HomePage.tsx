import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product, Collection } from "../types";
import api from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { Button, Card } from "../components/ui";
import {
  StarIcon,
  TruckIcon,
  TrendingUpIcon,
  Undo2Icon,
  ArrowRightIcon,
  FlameIcon,
  SmileIcon,
  MessageCircleIcon,
  ShoppingBagIcon,
  PackageIcon,
  TagIcon,
} from "../components/icons";
import { RotatingText } from "../components/RotatingText";
import { TestimonialsCarousel } from "../components/TestimonialsCarousel";
import { SEOHead } from "../components/SEOHead";
import {
  StructuredData,
  OrganizationSchema,
  WebsiteSchema,
} from "../components/StructuredData";

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
      setFeaturedProducts(bestSellers.slice(0, displayLimit));
      setHasMoreBestSellers(bestSellers.length > displayLimit);
      setNewArrivals(arrivals.slice(0, displayLimit));
      setHasMoreNewArrivals(arrivals.length > displayLimit);
    };
    fetchFeatured();
  }, []);

  const testimonials = [
    {
      name: "Alex Johnson",
      text: "The quality of the fabric is unreal. So soft and durable. I've already ordered more!",
      rating: 5,
    },
    {
      name: "Maria Garcia",
      text: "Fast shipping and beautiful packaging. The hoodie I bought is now my absolute favorite.",
      rating: 5,
    },
    {
      name: "Chris Lee",
      text: "Finally, a brand that gets minimalist design right. Everything is stylish and versatile.",
      rating: 5,
    },
  ];

  const benefits = [
    {
      icon: <PackageIcon className="w-8 h-8 text-brand-accent" />,
      title: "Premium Fabrics",
      description:
        "We source only the finest materials for a difference you can feel.",
    },
    {
      icon: <TruckIcon className="w-8 h-8 text-brand-accent" />,
      title: "Fast Shipping",
      description:
        "Get your new favorite pieces delivered to your door quickly and reliably.",
    },
    {
      icon: <Undo2Icon className="w-8 h-8 text-brand-accent" />,
      title: "Easy Returns",
      description:
        "Not a perfect fit? No problem. We offer hassle-free returns.",
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
        {/* Hero Section – same banner on all viewports; optimized for mobile */}
        <section className="relative -mt-20 md:-mt-24 overflow-hidden" aria-label="Hero banner">
          <div className="relative w-full min-h-[85vh] sm:min-h-[90vh] h-[100vh] pt-20 md:pt-24">
            {/* Hero banner: mobile portrait image; desktop landscape */}
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet="/light-hero-banner-mobile.jpeg"
              />
              <img
                src="/light-hero-banner.jpeg"
                alt="Luxe Threads hero banner"
                className="absolute inset-0 w-full h-full object-cover object-center md:object-[center_15%]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                sizes="100vw"
              />
            </picture>

            {/* Hero content – left-aligned; cohesive block on mobile, desktop centered */}
            <div className="relative h-full container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start justify-start pt-12 md:pt-0 md:justify-center">
              <div className="max-w-3xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <h1 className="text-5xl sm:text-5xl md:text-8xl font-display font-extrabold tracking-tight leading-tight">
                  <span className="block">Wear Your</span>
                  <span className="block">
                    <RotatingText
                      words={["Style", "Energy", "Essence"]}
                      interval={3000}
                      className="bg-gradient-to-r from-[#9333EA] to-[#F5E04E] bg-clip-text text-transparent"
                    />
                  </span>
                </h1>
                <p className="mt-4 sm:mt-6 text-xl sm:text-xl md:text-2xl max-w-2xl font-sans text-white/90 leading-relaxed">
                  Premium everyday wear. Designed to feel as good as it looks.
                </p>
                <div className="mt-8 sm:mt-10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button
                      onClick={() => navigate("/best-sellers")}
                      className="px-8 sm:px-10 py-3 sm:py-3.5 text-base md:text-lg font-semibold"
                    >
                      Shop Best Sellers
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate("/new-arrivals")}
                      className="text-base md:text-lg font-semibold text-white hover:text-brand-accent hover:bg-white/10"
                    >
                      New Arrivals →
                    </Button>
                  </div>
                  <p className="text-sm text-white/80">
                    Easy 7-day returns · Premium fabrics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Collection */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Curated drops
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary mt-2">
                Shop by{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
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
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 flex items-center justify-center">
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
                <TrendingUpIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Top Picks
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary">
                Best{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
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
                <FlameIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <span className="text-sm font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">
                  Just In
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary">
                New{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
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

        {/* Benefits Section */}
        <section className="bg-brand-surface/50 dark:bg-brand-surface/50 bg-gray-50">
          <div className="container mx-auto px-4 py-8 md:py-16 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 text-center">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex flex-col items-center">
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <h3 className="mt-3 md:mt-4 text-lg md:text-xl font-display font-semibold text-brand-primary">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-brand-secondary">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-brand-surface/30 dark:bg-brand-surface/30 bg-gray-100 py-6 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
              <div className="flex flex-col items-center gap-1">
                <SmileIcon className="w-8 h-8 text-brand-accent" />
                <p className="font-bold text-xl text-brand-primary">50K+</p>
                <p className="text-xs text-brand-secondary">Happy Customers</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ShoppingBagIcon className="w-8 h-8 text-brand-accent" />
                <p className="font-bold text-xl text-brand-primary">50+</p>
                <p className="text-xs text-brand-secondary">
                  Products Available
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <StarIcon className="w-8 h-8 text-brand-accent" />
                <p className="font-bold text-xl text-brand-primary">99%</p>
                <p className="text-xs text-brand-secondary">
                  Satisfaction Rate
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <MessageCircleIcon className="w-8 h-8 text-brand-accent" />
                <p className="font-bold text-xl text-brand-primary">24/7</p>
                <p className="text-xs text-brand-secondary">
                  Support Available
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-center text-brand-primary mb-8">
            What Our Customers Say
          </h2>
          <TestimonialsCarousel testimonials={testimonials} />
        </section>
      </div>
    </>
  );
};
