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
import { HeartIcon, RulerIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '../components/icons';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createProductSchema, createBreadcrumbSchema } from '../components/StructuredData';
import { truncateDescription, DEFAULT_SITE_URL, DEFAULT_SITE_NAME } from '../utils/seo';
import { trackViewContent } from '../utils/gtm';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';
import { formatPosterSizeLabel, getSizeChartForProduct, isPosterProduct } from '../utils/sizeSystem';
import { getSellingPriceForSize, hasVariableSizePricing } from '../utils/sizePricing';

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
      <div>
        <ul className="space-y-2">
          {visibleLines.map((line, i) => (
            <li key={i} className="flex items-start gap-3 text-[13px] text-brand-secondary leading-relaxed">
              <span className="mt-[7px] flex-shrink-0 w-[5px] h-[5px] rounded-full bg-brand-coral opacity-80" />
              <span>{line.replace(/^[-*•]\s*/, '')}</span>
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-[11px] text-brand-secondary/60 hover:text-brand-secondary transition-colors"
          >
            {expanded
              ? <><ChevronUpIcon className="w-3 h-3" /> Show less</>
              : <><ChevronDownIcon className="w-3 h-3" /> Show {lines.length - PREVIEW_COUNT} more</>}
          </button>
        )}
      </div>
    );
  }

  return (
    <p className="text-[13px] text-brand-secondary leading-relaxed whitespace-pre-line">{text}</p>
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

  const mockupImages = product?.mockup_images || [];
  const allImages = [product.main_image_url || product.imageUrl || '', ...mockupImages.slice(0, 4)].filter(Boolean);
  const isPoster = isPosterProduct(product);
  const availableSizes = product.variants?.sizes || [];
  const showSizeSelector =
    isPoster
      ? availableSizes.length > 0
      : availableSizes.length > 0 && availableSizes[0] !== 'One Size' && availableSizes[0] !== '11oz';

  const variableSizePricing = hasVariableSizePricing(product);
  const activeSellingPrice = getSellingPriceForSize(
    product,
    showSizeSelector ? selectedSize || undefined : undefined,
  );
  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  const finalPrice = calculateFinalPrice(activeSellingPrice, discountPercentage, onSale, saleDiscountPercentage);
  const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
  const displaySellingPrice = toAnchoredDisplayPrice(activeSellingPrice);
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const effectiveDiscount = hasAnyDiscount
    ? 100 - (100 - discountPercentage) * (100 - saleDiscountPercentage) / 100
    : 0;

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
    if (!isPoster && !color) {
      showToast('This product is missing color configuration. Please contact support.', 'error');
      return;
    }

    const lineSellingPrice = getSellingPriceForSize(product, size || undefined);

    addToCart({
      ...product,
      selling_price: lineSellingPrice,
      quantity: 1,
      selectedSize: size || 'One Size',
      selectedColor: isPoster ? '' : color,
    });
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
        <SizeChartModal chart={sizeChart} onClose={() => setShowSizeGuide(false)} />
      )}

      {/* ── Editorial product layout ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-[55fr_45fr] lg:h-[calc(100vh-64px)] lg:min-h-[640px]">

        {/* LEFT — Gallery */}
        <div className="bg-brand-surface flex flex-col lg:flex-row min-h-[480px] lg:min-h-0 lg:h-full">

          {/* Vertical thumbnail strip — desktop only, left rail */}
          {allImages.length > 1 && (
            <div className="hidden lg:flex flex-col items-center gap-2.5 px-3 pt-8 pb-6 border-r border-gray-200/50 dark:border-white/8 flex-shrink-0 overflow-y-auto">
              {allImages.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`w-[56px] h-[56px] flex-shrink-0 overflow-hidden transition-all duration-200 ${
                    selectedImage === imgUrl
                      ? 'ring-2 ring-brand-ink dark:ring-brand-cream opacity-100'
                      : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <img
              src={selectedImage || product.main_image_url || product.imageUrl || ''}
              alt={product.name || product.title}
              className="w-full h-full object-contain p-8 lg:p-14 transition-all duration-500"
            />
            {onSale && (
              <div className="absolute top-4 left-4 bg-brand-ink text-brand-cream text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5">
                Sale
              </div>
            )}
            {hasAnyDiscount && (
              <div className="absolute top-4 right-4 border border-brand-coral text-brand-coral text-[10px] font-semibold px-2.5 py-1">
                −{effectiveDiscount.toFixed(0)}%
              </div>
            )}
          </div>

          {/* Horizontal thumbnail strip — mobile only */}
          {allImages.length > 1 && (
            <div className="flex lg:hidden justify-center gap-2.5 px-4 py-3 border-t border-gray-200/50 dark:border-white/8 overflow-x-auto">
              {allImages.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`flex-shrink-0 w-14 h-14 overflow-hidden transition-all ${
                    selectedImage === imgUrl
                      ? 'ring-2 ring-brand-ink dark:ring-brand-cream opacity-100'
                      : 'opacity-45 hover:opacity-75'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Product info */}
        <div className="lg:h-full lg:overflow-y-auto border-t border-gray-200/40 dark:border-white/8 lg:border-t-0 lg:border-l lg:border-gray-200/40 dark:lg:border-white/8">
          <div className="px-7 py-6 lg:px-10 lg:py-7 max-w-lg mx-auto lg:mx-0">

            {/* Category + rating row */}
            <div className="flex items-center justify-between mb-3">
              {product.category_name && (
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand-secondary">
                  {product.category_name}
                </span>
              )}
              {product.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={product.rating} readonly size="sm" />
                  <span className="text-[11px] text-brand-secondary">
                    {product.rating.toFixed(1)} ({product.rating_count || 0})
                  </span>
                </div>
              )}
            </div>

            {/* Title — editorial serif */}
            <h1 className="font-playfair text-[26px] lg:text-[30px] font-medium leading-[1.18] tracking-tight text-brand-primary">
              {product.name || product.title}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <span className="text-[20px] font-semibold text-brand-primary">
                {formatCurrency(displayFinalPrice, currency, { showDecimals: false })}
              </span>
              {hasAnyDiscount && (
                <>
                  <span className="text-sm text-brand-secondary/60 line-through">
                    {formatCurrency(displaySellingPrice, currency, { showDecimals: false })}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Save {effectiveDiscount.toFixed(0)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-brand-secondary/60 mt-1 leading-relaxed">
              {variableSizePricing && selectedSize
                ? `Price for ${isPoster ? formatPosterSizeLabel(selectedSize) : selectedSize} · `
                : ''}
              Incl. of all taxes
            </p>

            <div className="mt-5 h-px bg-gray-200/70 dark:bg-white/8" />

            {/* Description */}
            {product.description && (
              <div className="mt-4">
                <ProductDescription text={product.description} />
              </div>
            )}

            {/* Color — apparel only */}
            {!isPoster && product.color && (
              <div className="mt-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-secondary/70">
                    Color
                  </span>
                  <span className="text-[12px] text-brand-primary">{getColorName(product.color)}</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {colorVariantProducts.length > 1 ? (
                    colorVariantProducts.map((variant) => {
                      const isActive = variant.id === product.id;
                      const variantColor = variant.color || '';
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => { if (!isActive) navigate(`/product/${variant.id}`); }}
                          className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all ${
                            isActive
                              ? 'border-brand-ink dark:border-brand-cream shadow ring-2 ring-brand-ink/15 dark:ring-brand-cream/15 cursor-default'
                              : 'border-white/50 opacity-60 hover:opacity-100 hover:border-brand-ink/40 dark:hover:border-brand-cream/40'
                          }`}
                          style={{ backgroundColor: getCssColorValue(variantColor) }}
                          title={`${getColorName(variantColor)}${isActive ? ' (current)' : ''}`}
                          aria-label={`View ${getColorName(variantColor)} color`}
                          disabled={isActive}
                        />
                      );
                    })
                  ) : (
                    <span
                      className="w-8 h-8 rounded-full border-2 border-brand-ink/20 dark:border-brand-cream/20 shadow-sm"
                      style={{ backgroundColor: getCssColorValue(product.color) }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Size selector */}
            {showSizeSelector && (
              <div className="mt-5" ref={sizeRef}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-secondary/70">
                      Size
                    </span>
                    {selectedSize && (
                      <span className="text-[12px] text-brand-primary">
                        {isPoster ? formatPosterSizeLabel(selectedSize) : selectedSize}
                      </span>
                    )}
                  </div>
                  {sizeChart && (
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="flex items-center gap-1 text-[11px] text-brand-secondary/60 hover:text-brand-coral transition-colors"
                    >
                      <RulerIcon className="w-3 h-3" />
                      Size guide
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizes.map(size => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setSizeError(false); }}
                        className={`min-w-[3rem] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-all duration-150 border ${
                          isSelected
                            ? 'bg-brand-ink dark:bg-brand-cream text-white dark:text-brand-ink border-brand-ink dark:border-brand-cream'
                            : sizeError
                            ? 'border-red-400 text-red-500'
                            : 'border-gray-300 dark:border-white/20 text-brand-secondary hover:border-brand-ink dark:hover:border-brand-cream hover:text-brand-primary'
                        }`}
                      >
                        {isPoster ? formatPosterSizeLabel(size) : size}
                      </button>
                    );
                  })}
                </div>
                {sizeError && (
                  <p className="text-[11px] text-red-500 mt-2">Please select a size to continue.</p>
                )}
              </div>
            )}

            {/* CTA row */}
            <div className="mt-6 flex gap-2.5">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-6 text-sm font-medium tracking-[0.08em] transition-all duration-300 flex items-center justify-center gap-2 ${
                  addedToCart
                    ? 'bg-emerald-500 text-white'
                    : 'bg-brand-ink dark:bg-brand-cream text-white dark:text-brand-ink hover:opacity-85 active:opacity-100'
                }`}
              >
                {addedToCart
                  ? <><CheckCircleIcon className="w-4 h-4" /> Added to Bag</>
                  : 'Add to Bag'
                }
              </button>
              <button
                onClick={handleWishlistToggle}
                disabled={isWishlistLoading}
                className={`w-[50px] flex items-center justify-center flex-shrink-0 border transition-all ${
                  inWishlist
                    ? 'border-pink-400 text-pink-500 bg-pink-50 dark:bg-pink-500/10'
                    : 'border-gray-300 dark:border-white/20 text-brand-secondary hover:border-pink-400 hover:text-pink-400'
                } ${isWishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <HeartIcon className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Trust line */}
            <p className="mt-4 text-[11px] text-brand-secondary/50 leading-relaxed">
              Easy 7-day returns &middot; Secure checkout &middot; Made to order
            </p>

          </div>
        </div>
      </div>

      {/* ── Ratings & Reviews ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-secondary mb-3">
            Customer feedback
          </p>
          <h2 className="font-playfair text-[26px] font-medium text-brand-primary">
            Ratings &amp; Reviews
          </h2>
        </div>
        <RatingBreakdown productId={product.id} />
      </section>

      {/* ── You May Also Like ──────────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-secondary mb-3">
              Curated for you
            </p>
            <h2 className="font-playfair text-[26px] font-medium text-brand-primary">
              You may also like
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </>
  );
};
