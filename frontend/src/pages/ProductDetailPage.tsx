import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, CartItem } from '../types';
import api from '../services/api';
import { Button } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { StarRating } from '../components/StarRating';
import { SizeChartModal } from '../components/SizeChartModal';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { getCssColorValue, getColorName } from '../utils/colorUtils';
import { HeartIcon, RulerIcon, CheckCircleIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '../components/icons';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createProductSchema, createBreadcrumbSchema } from '../components/StructuredData';
import { truncateDescription, DEFAULT_SITE_URL, DEFAULT_SITE_NAME } from '../utils/seo';
import { trackViewContent } from '../utils/gtm';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';
import { getSizeChartForProduct } from '../utils/sizeSystem';

// ── Description renderer (bullets or paragraph) ──────────────────────────────
const ProductDescription: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const isBulletLine = (l: string) => l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* ');
  const allBullets = lines.length > 0 && lines.every(isBulletLine);
  const PREVIEW_COUNT = 3;
  const hasMore = allBullets && lines.length > PREVIEW_COUNT;
  const visibleLines = allBullets && !expanded ? lines.slice(0, PREVIEW_COUNT) : lines;

  if (lines.length === 0) return null;

  if (allBullets) {
    return (
      <div className="mt-4">
        <ul className="space-y-2">
          {visibleLines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-brand-secondary">
              <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              <span>{line.replace(/^[-*•]\s*/, '')}</span>
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-500 hover:text-pink-500 transition-colors"
          >
            {expanded ? <><ChevronUpIcon className="w-3.5 h-3.5" /> Show less</> : <><ChevronDownIcon className="w-3.5 h-3.5" /> Show {lines.length - PREVIEW_COUNT} more details</>}
          </button>
        )}
      </div>
    );
  }

  return (
    <p className="mt-4 text-sm text-brand-secondary leading-relaxed whitespace-pre-line">{text}</p>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addToCart, currency, isInWishlist, addToWishlist, removeFromWishlist } = useApp();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [colorVariantProducts, setColorVariantProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      const data = await api.getProductById(id);
      if (data) {
        setProduct(data);
        const initialSize = data.variants.sizes?.[0] ?? '';
        setSelectedSize(initialSize);
        setSelectedImage(data.main_image_url || data.imageUrl || '');

        const sameCategory = await api.getProducts(data.category);
        if (data.design_family) {
          const siblings = sameCategory
            .filter((p) => p.design_family && p.design_family === data.design_family)
            .sort((a, b) => (a.color || '').localeCompare(b.color || ''));
          setColorVariantProducts(siblings);
        } else {
          setColorVariantProducts([]);
        }

        let related = sameCategory.filter(p => p.id !== data.id).slice(0, 4);
        if (related.length < 4) {
          const categories = await api.getCategories();
          const otherSlugs = (categories || [])
            .map((c: { slug: string }) => c.slug)
            .filter((slug: string) => slug && slug !== data.category);
          const seen = new Set(related.map(p => p.id));
          for (const slug of otherSlugs) {
            if (related.length >= 4) break;
            const products = await api.getProducts(slug);
            for (const p of products) {
              if (p.id === data.id || seen.has(p.id)) continue;
              seen.add(p.id);
              related = [...related, p];
              if (related.length >= 4) break;
            }
          }
        }
        setRelatedProducts(related.slice(0, 4));
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const sellingPrice = parseFloat(String(product.selling_price || product.price || 0));
    let value = sellingPrice;
    const discountPct = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
    const salePct = product.on_sale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
    if (discountPct > 0) value = value * (1 - discountPct / 100);
    if (salePct > 0) value = value * (1 - salePct / 100);
    trackViewContent({
      content_ids: [product.id],
      content_type: product.category_name ?? product.category,
      content_name: product.name ?? product.title,
      currency,
      value,
      items: [{ item_id: product.id, item_name: product.name ?? product.title ?? '', item_category: product.category_name ?? product.category, price: value, quantity: 1, index: 0 }],
    });
  }, [product?.id, currency, product]);

  if (!id) return <div>Product not found</div>;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-brand-secondary text-sm animate-pulse">Loading product…</p>
        </div>
      </div>
    );
  }
  if (!product) return <div className="text-center py-20 text-brand-secondary">Product not found.</div>;

  const sellingPrice = parseFloat(String(product.selling_price || 0));
  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  const finalPrice = calculateFinalPrice(sellingPrice, discountPercentage, onSale, saleDiscountPercentage);
  const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
  const displaySellingPrice = toAnchoredDisplayPrice(sellingPrice);
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const effectiveDiscount = hasAnyDiscount
    ? 100 - (100 - discountPercentage) * (100 - saleDiscountPercentage) / 100
    : 0;

  const mockupImages = product?.mockup_images || [];
  const allImages = [product.main_image_url || product.imageUrl || '', ...mockupImages.slice(0, 4)].filter(Boolean);
  const availableSizes = product.variants?.sizes || [];
  const showSizeSelector = availableSizes.length > 0 && availableSizes[0] !== 'One Size' && availableSizes[0] !== '11oz';
  const sizeChart = getSizeChartForProduct(product);

  const handleAddToCart = () => {
    if (!product) return;
    const color = (product.color || '').trim();
    const needsSize = showSizeSelector;
    const size = (selectedSize || availableSizes[0] || '').trim();

    if (needsSize && !size) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Please select a size first!', 'error');
      return;
    }
    if (!color) {
      showToast('This product is missing color configuration. Please contact support.', 'error');
      return;
    }

    addToCart({ ...product, quantity: 1, selectedSize: size || 'One Size', selectedColor: color });
    setAddedToCart(true);
    setSizeError(false);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleWishlistToggle = async () => {
    if (!product || isWishlistLoading) return;
    setIsWishlistLoading(true);
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
        showToast('Removed from wishlist', 'success');
      } else {
        await addToWishlist(product.id);
        showToast('Added to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update wishlist', 'error');
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const productTitle = product?.name || product?.title || 'Product';
  const productDescription = product?.description || `${productTitle} - Premium quality ${product?.category_name || 'apparel'}.`;
  const productImage = product?.main_image_url || product?.imageUrl || '';
  const seoData = {
    title: `${productTitle} - Premium ${product?.category_name || 'Apparel'} | Luxe Threads`,
    description: truncateDescription(productDescription),
    keywords: `${productTitle}, premium ${product?.category_name || 'apparel'}, luxury clothing, custom ${product?.category_name || 'apparel'}, ${product?.category_name || 'apparel'} online`,
    image: productImage,
    type: 'product' as const,
    url: `${DEFAULT_SITE_URL}/product/${product?.id}`,
  };
  const breadcrumbItems = [
    { name: 'Home', url: DEFAULT_SITE_URL },
    { name: product?.category_name || 'Products', url: `${DEFAULT_SITE_URL}/category/${product?.category_slug || 'all'}` },
    { name: productTitle, url: `${DEFAULT_SITE_URL}/product/${product?.id}` },
  ];
  const productSchema = createProductSchema({
    id: product.id, title: productTitle, description: productDescription, price: finalPrice,
    currency, image: productImage, availability: 'https://schema.org/InStock', brand: DEFAULT_SITE_NAME, category: product.category_name,
  });

  const inWishlist = isInWishlist(product.id);

  return (
    <>
      <SEOHead {...seoData} />
      {productSchema && <StructuredData data={productSchema} />}
      <StructuredData data={createBreadcrumbSchema(breadcrumbItems)} />

      {showSizeGuide && sizeChart && (
        <SizeChartModal
          chart={sizeChart}
          onClose={() => setShowSizeGuide(false)}
        />
      )}

      {/* ── Balanced gallery + purchase layout ─────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:h-[calc(100vh-64px)] lg:min-h-[640px]">

        {/* LEFT — Selected image with centered thumbnails */}
        <div className="bg-gray-50 dark:bg-white/5 flex flex-col min-h-[520px] lg:min-h-0 lg:h-full">
          {/* Main image */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <img
              src={selectedImage || product.main_image_url || product.imageUrl || ''}
              alt={product.name || product.title}
              className="w-full h-full object-contain p-6 lg:p-10 transition-all duration-500"
            />
            {/* Sale badge */}
            {onSale && (
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-3 py-1.5 shadow-lg animate-pulse">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold tracking-wide">ON SALE</span>
              </div>
            )}
            {hasAnyDiscount && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1.5 shadow-lg text-xs font-bold">
                {effectiveDiscount.toFixed(0)}% OFF
              </div>
            )}
          </div>

          {/* Thumbnail strip — shown only when multiple images */}
          {allImages.length > 1 && (
            <div className="flex justify-center gap-3 px-4 py-4 overflow-x-auto scrollbar-hide border-t border-gray-200 dark:border-white/10">
              {allImages.map((imgUrl, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    selectedImage === imgUrl
                      ? 'border-purple-500 ring-2 ring-purple-400/50 scale-105'
                      : 'border-transparent hover:border-purple-300 dark:hover:border-purple-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Product details panel, height-matched to gallery */}
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="px-6 py-8 lg:px-10 lg:py-8 max-w-lg mx-auto lg:mx-0">

            {/* Category pill */}
            {product.category_name && (
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-purple-500 bg-purple-500/10 rounded-full px-3 py-1 mb-4">
                {product.category_name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-brand-primary leading-tight">
              {product.name || product.title}
            </h1>

            {/* Rating row */}
            {product.rating > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarRating rating={product.rating} readonly size="sm" />
                <span className="text-xs text-brand-secondary">
                  {product.rating.toFixed(1)} · {product.rating_count || 0} {product.rating_count === 1 ? 'rating' : 'ratings'}
                </span>
              </div>
            )}

            {/* Price block */}
            <div className="mt-5 flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {formatCurrency(displayFinalPrice, currency, { showDecimals: false })}
              </span>
              {hasAnyDiscount && (
                <>
                  <span className="text-lg text-brand-secondary line-through font-medium">
                    {formatCurrency(displaySellingPrice, currency, { showDecimals: false })}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    Save {effectiveDiscount.toFixed(0)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-brand-secondary mt-1">Inclusive of all taxes</p>

            <div className="mt-6 h-px bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-transparent" />

            {/* Description */}
            {product.description && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary mb-1">Details</p>
                <ProductDescription text={product.description} />
              </div>
            )}

            <div className="mt-6 h-px bg-gray-200 dark:bg-white/10" />

            {/* Color */}
            {product.color && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary mb-2">Color</p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-full border-2 border-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: getCssColorValue(product.color) }}
                    title={getColorName(product.color)}
                  />
                  <span className="text-sm font-semibold text-brand-primary">{getColorName(product.color)}</span>
                </div>
                {colorVariantProducts.length > 1 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-brand-secondary mb-2">Other colors in this design</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {colorVariantProducts.map((variant) => {
                        const isActive = variant.id === product.id;
                        const variantColor = variant.color || '';
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => {
                              if (!isActive) navigate(`/product/${variant.id}`);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isActive
                                ? 'border-purple-500 ring-2 ring-purple-400/50 cursor-default'
                                : 'border-white/40 hover:border-purple-400'
                            }`}
                            style={{ backgroundColor: getCssColorValue(variantColor) }}
                            title={`${getColorName(variantColor)}${isActive ? ' (current)' : ''}`}
                            aria-label={`View ${getColorName(variantColor)} color`}
                            disabled={isActive}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Size selector */}
            {showSizeSelector && (
              <div className="mt-5" ref={sizeRef}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Size</p>
                  {sizeChart && (
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-purple-500 hover:text-pink-500 transition-colors"
                    >
                      <RulerIcon className="w-3.5 h-3.5" />
                      Size Guide
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setSizeError(false); }}
                        className={`min-w-[3rem] px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105 border-transparent'
                            : sizeError
                            ? 'border-2 border-red-400 text-red-500 bg-red-50 dark:bg-red-900/20 hover:border-purple-400'
                            : 'border-2 border-gray-200 dark:border-white/20 text-brand-secondary hover:border-purple-400 hover:text-purple-500 bg-white dark:bg-white/5'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {sizeError && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">Please pick a size to continue</p>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-4 px-6 rounded-2xl text-base font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                  addedToCart
                    ? 'bg-emerald-500 text-white scale-[0.98]'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {addedToCart ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Added to Cart!
                  </>
                ) : (
                  'Add to Cart'
                )}
              </button>

              <button
                onClick={handleWishlistToggle}
                disabled={isWishlistLoading}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-md ${
                  inWishlist
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-white dark:bg-white/10 border-2 border-gray-200 dark:border-white/20 text-brand-secondary hover:border-pink-400 hover:text-pink-500'
                } ${isWishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <HeartIcon className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Customer Ratings & Reviews ─────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-2">Customer feedback</p>
          <h2 className="text-2xl font-display font-extrabold tracking-tight text-brand-primary">
            Customer Ratings & Reviews
          </h2>
          <p className="mt-2 text-sm text-brand-secondary max-w-2xl">
            Star ratings and customer reviews will appear here as shoppers start sharing feedback.
          </p>
        </div>
        <RatingBreakdown productId={product.id} />
      </section>

      {/* ── You May Also Like ────────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <SparklesIcon className="w-5 h-5 text-purple-500" />
            <h2 className="text-2xl font-display font-extrabold tracking-tight text-brand-primary">You may also like</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
