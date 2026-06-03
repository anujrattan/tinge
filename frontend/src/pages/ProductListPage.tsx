import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { PackageIcon, StarIcon, XIcon } from '../components/icons';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import { getColorName, getColorHex } from '../utils/colorUtils';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createBreadcrumbSchema } from '../components/StructuredData';
import { DEFAULT_SITE_URL } from '../utils/seo';
import { shuffleArray } from '../utils/shuffle';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

export const ProductListPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currency } = useApp();
  
  if (!slug) {
    return <div>Category not found</div>;
  }
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await api.getProducts(slug);
      setProducts(shuffleArray(data));
      setLoading(false);
      
      // Set initial price range based on products
      if (data.length > 0) {
        const prices = data.map(p => p.selling_price || p.price || 0);
        const minPrice = Math.floor(Math.min(...prices));
        const maxPrice = Math.ceil(Math.max(...prices));
        setPriceRange([minPrice, maxPrice]);
      }
    };
    fetchProducts();
  }, [slug]);

  const categoryName = slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // SEO Data
  const seoData = {
    title: `${categoryName} - Premium Apparel | Luxe Threads`,
    description: `Browse our collection of premium ${categoryName.toLowerCase()}. High-quality, designer ${categoryName.toLowerCase()} with free shipping on orders over ₹500.`,
    keywords: `${categoryName}, premium ${categoryName.toLowerCase()}, luxury ${categoryName.toLowerCase()}, designer ${categoryName.toLowerCase()}, ${categoryName.toLowerCase()} online`,
    type: 'website' as const,
    url: `${DEFAULT_SITE_URL}/category/${slug}`,
  };

  // Breadcrumb schema
  const breadcrumbItems = [
    { name: 'Home', url: DEFAULT_SITE_URL },
    { name: categoryName, url: `${DEFAULT_SITE_URL}/category/${slug}` },
  ];
  
  // Extract unique sizes and colors from products
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(product => {
      if (product.variants?.sizes) {
        product.variants.sizes.forEach((size: string) => sizes.add(size));
      }
    });
    return Array.from(sizes).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach(product => {
      const c = product.color;
      if (c && String(c).trim()) colors.add(String(c).trim());
    });
    return Array.from(colors).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by size
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(product => 
        product.variants?.sizes?.some(size => selectedSizes.includes(size))
      );
    }

    if (selectedColors.length > 0) {
      filtered = filtered.filter(product => {
        const c = product.color;
        return c && selectedColors.includes(String(c).trim());
      });
    }

    // Filter by price range
    filtered = filtered.filter(product => {
      const price = product.selling_price || product.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort products
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.selling_price || a.price || 0) - (b.selling_price || b.price || 0));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.selling_price || b.price || 0) - (a.selling_price || a.price || 0));
        break;
      case 'name-asc':
        filtered.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        break;
      default:
        // Keep original order
        break;
    }

    return filtered;
  }, [products, selectedSizes, selectedColors, priceRange, sortBy]);

  // Filter handlers
  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    if (products.length > 0) {
      const prices = products.map(p => p.selling_price || p.price || 0);
      const minPrice = Math.floor(Math.min(...prices));
      const maxPrice = Math.ceil(Math.max(...prices));
      setPriceRange([minPrice, maxPrice]);
    }
    setSortBy('default');
  };

  const activeFilterCount = selectedSizes.length + selectedColors.length + (sortBy !== 'default' ? 1 : 0);

  return (
    <>
      <SEOHead {...seoData} />
      <StructuredData data={createBreadcrumbSchema(breadcrumbItems)} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-brand-primary">{categoryName}</h1>
          <p className="text-sm text-brand-secondary mt-2">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {activeFilterCount > 0 && ` (${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active)`}
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
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-brand-surface border border-white/20 rounded-lg px-4 py-2 text-sm text-brand-primary focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
          >
            <option value="default">Sort by</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <aside className="hidden lg:block">
          <div className="bg-white dark:bg-brand-surface/50 rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-brand-primary">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="bg-brand-accent text-white text-xs font-medium px-2 py-1 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="space-y-6">
              {/* Size Filter */}
              {availableSizes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-brand-primary">Size</h3>
                  <div className="space-y-2">
                    {availableSizes.map(size => (
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
              
              {/* Color Filter */}
              {availableColors.length > 0 && (
                <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                  <h3 className="font-medium mb-3 text-brand-primary">Color</h3>
                  <div className="space-y-2">
                    {availableColors.map(color => {
                      const colorName = getColorName(color);
                      const colorHex = getColorHex(color);
                      
                      return (
                        <div key={color} className="flex items-center group">
                          <input 
                            type="checkbox" 
                            id={`color-${color}`} 
                            checked={selectedColors.includes(color)}
                            onChange={() => toggleColor(color)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-brand-accent focus:ring-brand-accent focus:ring-2 cursor-pointer" 
                          />
                          <label 
                            htmlFor={`color-${color}`} 
                            className="ml-3 text-sm text-brand-secondary cursor-pointer hover:text-brand-primary transition-colors flex items-center gap-2"
                          >
                            <span 
                              className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/20 shadow-sm flex-shrink-0 ring-1 ring-gray-200 dark:ring-white/10"
                              style={{ backgroundColor: colorHex }}
                            ></span>
                            <span className="group-hover:underline">{colorName}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Price Range Filter */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                <h3 className="font-medium mb-3 text-brand-primary">Price Range</h3>
                <div className="space-y-4">
                  <input 
                    type="range" 
                    min={0}
                    max={products.length > 0 ? Math.ceil(Math.max(...products.map(p => p.selling_price || p.price || 0))) : 10000}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-brand-accent cursor-pointer" 
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-secondary">Max:</span>
                    <span className="text-brand-primary font-medium">
                      {formatCurrency(priceRange[1], currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-brand-surface animate-pulse aspect-[4/5] rounded-lg"></div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="text-center py-20 col-span-full">
              <div className="max-w-md mx-auto">
                <PackageIcon className="w-20 h-20 mx-auto text-brand-secondary opacity-40 mb-6" />
                <h3 className="text-2xl font-display font-semibold text-brand-primary mb-3">
                  No products match your filters
                </h3>
                <p className="text-brand-secondary mb-6 leading-relaxed">
                  Try adjusting your filters to see more products.
                </p>
                <Button 
                  onClick={clearFilters}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 col-span-full">
              <div className="max-w-md mx-auto">
                <div className="relative mb-6">
                  <PackageIcon className="w-20 h-20 mx-auto text-brand-secondary opacity-40" />
                  <StarIcon className="w-8 h-8 absolute -top-2 -right-2 text-purple-400 opacity-60 animate-pulse" filled={true} />
                </div>
                <h3 className="text-2xl font-display font-semibold text-brand-primary mb-3">
                  Coming Soon to {categoryName}
                </h3>
                <p className="text-brand-secondary mb-6 leading-relaxed">
                  We're curating something special for this collection. 
                  Check back soon for premium pieces that match your style.
                </p>
                <Button 
                  onClick={() => navigate('/categories')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Explore Other Collections
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  );
};