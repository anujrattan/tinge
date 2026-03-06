import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Product } from "../types";
import api from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { XIcon } from "../components/icons";
import { SEOHead } from "../components/SEOHead";
import { StructuredData, createBreadcrumbSchema } from "../components/StructuredData";
import { DEFAULT_SITE_URL } from "../utils/seo";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

export const CollectionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<SortOption>("default");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProductsByCollection(slug);
        setProducts(data);
        if (data.length > 0) {
          const prices = data.map((p) => p.selling_price || p.price || 0);
          const minPrice = Math.floor(Math.min(...prices));
          const maxPrice = Math.ceil(Math.max(...prices));
          setPriceRange([minPrice, maxPrice]);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load collection.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [slug]);

  if (!slug) {
    return <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">Collection not found.</div>;
  }

  const collectionName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const seoData = {
    title: `${collectionName} Collection - Luxe Threads`,
    description: `Shop the ${collectionName} collection – a curated mix of fits, colors and textures across tees, hoodies, bottoms and more.`,
    keywords: `${collectionName} collection, curated drop, streetwear collection, luxe threads`,
    type: "website" as const,
    url: `${DEFAULT_SITE_URL}/collections/${slug}`,
  };

  const breadcrumbItems = [
    { name: "Home", url: DEFAULT_SITE_URL },
    { name: "Collections", url: `${DEFAULT_SITE_URL}/collections` },
    { name: collectionName, url: `${DEFAULT_SITE_URL}/collections/${slug}` },
  ];

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((product) => {
      if (product.variants?.sizes) {
        product.variants.sizes.forEach((size: string) => sizes.add(size));
      }
    });
    return Array.from(sizes).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((product) => {
      const c = product.color;
      if (c && String(c).trim()) colors.add(String(c).trim());
    });
    return Array.from(colors).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedSizes.length > 0) {
      filtered = filtered.filter((product) =>
        product.variants?.sizes?.some((size) => selectedSizes.includes(size))
      );
    }

    if (selectedColors.length > 0) {
      filtered = filtered.filter((product) => {
        const c = product.color;
        return c && selectedColors.includes(String(c).trim());
      });
    }

    filtered = filtered.filter((product) => {
      const price = product.selling_price || product.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    switch (sortBy) {
      case "price-asc":
        filtered.sort(
          (a, b) =>
            (a.selling_price || a.price || 0) -
            (b.selling_price || b.price || 0)
        );
        break;
      case "price-desc":
        filtered.sort(
          (a, b) =>
            (b.selling_price || b.price || 0) -
            (a.selling_price || a.price || 0)
        );
        break;
      case "name-asc":
        filtered.sort((a, b) =>
          (a.title || a.name || "").localeCompare(b.title || b.name || "")
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [products, selectedSizes, selectedColors, priceRange, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    if (products.length > 0) {
      const prices = products.map((p) => p.selling_price || p.price || 0);
      const minPrice = Math.floor(Math.min(...prices));
      const maxPrice = Math.ceil(Math.max(...prices));
      setPriceRange([minPrice, maxPrice]);
    }
    setSortBy("default");
  };

  const activeFilterCount =
    selectedSizes.length +
    selectedColors.length +
    (sortBy !== "default" ? 1 : 0);

  return (
    <>
      <SEOHead {...seoData} />
      <StructuredData data={createBreadcrumbSchema(breadcrumbItems)} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-brand-primary">
              {collectionName}
            </h1>
            <p className="text-sm text-brand-secondary mt-2">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
              {activeFilterCount > 0 &&
                ` (${activeFilterCount} ${
                  activeFilterCount === 1 ? "filter" : "filters"
                } active)`}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-brand-secondary hover:text-brand-primary transition-colors flex items-center gap-1"
              >
                <XIcon className="w-4 h-4" />
                Clear filters
              </button>
            )}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as SortOption)
              }
              className="bg-brand-surface border border-white/20 rounded-lg px-4 py-2 text-sm text-brand-primary focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
            >
              <option value="default">Sort by</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <aside className="hidden lg:block">
            <div className="bg-white dark:bg-brand-surface/50 rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-semibold text-brand-primary">
                  Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-accent text-white text-xs font-medium px-2 py-1 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <div className="space-y-6">
                {availableSizes.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-brand-primary">
                      Size
                    </h3>
                    <div className="space-y-2">
                      {availableSizes.map((size) => (
                        <div key={size} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`size-${size}`}
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-brand-accent focus:ring-brand-accent focus:ring-2 cursor-pointer"
                          />
                          <label
                            htmlFor={`size-${size}`}
                            className="ml-3 text-sm text-brand-secondary cursor-pointer hover:text-brand-primary transition-colors"
                          >
                            {size}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {availableColors.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                    <h3 className="font-medium mb-3 text-brand-primary">
                      Color
                    </h3>
                    <div className="space-y-2">
                      {availableColors.map((color) => (
                        <div key={color} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`color-${color}`}
                            checked={selectedColors.includes(color)}
                            onChange={() => toggleColor(color)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-brand-accent focus:ring-brand-accent focus:ring-2 cursor-pointer"
                          />
                          <label
                            htmlFor={`color-${color}`}
                            className="ml-3 text-sm text-brand-secondary cursor-pointer hover:text-brand-primary transition-colors"
                          >
                            {color}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <section className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-brand-surface animate-pulse aspect-[4/5] rounded-lg"
                  />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-brand-secondary">
                <p className="mb-2">
                  No products in this collection yet.
                </p>
                <p className="text-sm">
                  Check back soon – we’re still curating this drop.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

