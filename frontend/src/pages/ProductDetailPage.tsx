import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Product } from '../types';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { StarRating } from '../components/StarRating';
import { RoomMockupPreview } from '../components/RoomMockupPreview';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import {
  HeartIcon,
  CheckCircleIcon,
  PlusIcon,
  TruckIcon,
  ShieldIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '../components/icons';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createProductSchema, createBreadcrumbSchema } from '../components/StructuredData';
import { truncateDescription, DEFAULT_SITE_URL, DEFAULT_SITE_NAME } from '../utils/seo';
import { trackViewContent } from '../utils/gtm';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';
import { formatPosterSizeLabel, getMaterialLabel } from '../utils/sizeSystem';
import { getSellingPriceForSize, hasVariableSizePricing } from '../utils/sizePricing';

const MATERIAL_COPY: Record<string, { finish: string; care: string }> = {
  framed_acp: {
    finish: 'UV-printed on aluminium composite panel and framed. Rigid, perfectly flat, with a crisp gloss that holds colour.',
    care: 'Wipe with a dry microfibre cloth. Avoid solvents and abrasive cleaners.',
  },
  canvas: {
    finish: 'Printed on textile canvas for a soft, matte surface with visible weave. The artwork is tuned for canvas, not ACP gloss.',
    care: 'Dust lightly with a soft brush. Keep away from damp walls and direct sun.',
  },
  sunboard: {
    finish: 'Printed on lightweight rigid foam board. Easy to hang anywhere, ideal for a first piece or a gallery wall.',
    care: 'Keep dry and away from direct heat. Dust with a soft, dry cloth.',
  },
  neon: {
    finish: 'LED neon lettering. We confirm the final size and colour with you before production begins.',
    care: 'Switch off when cleaning. Wipe the tubes with a dry cloth only.',
  },
};

const DetailRow: React.FC<{ index: string; title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
  index,
  title,
  defaultOpen,
  children,
}) => (
  <details className="group border-b border-hairline" open={defaultOpen}>
    <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 rounded-sm">
      <span className="flex items-baseline gap-4">
        <span className="font-mono text-[11px] text-brand-secondary">{index}</span>
        <span className="text-[15px] font-medium text-brand-primary">{title}</span>
      </span>
      <PlusIcon
        className="h-4 w-4 shrink-0 text-brand-secondary motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-45"
        aria-hidden="true"
      />
    </summary>
    <div className="pb-5 pl-[38px] pr-2 text-[15px] leading-relaxed text-brand-secondary">{children}</div>
  </details>
);

const DescriptionBody: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const isBullet = (l: string) => /^[-*•]\s/.test(l);
  if (lines.length > 0 && lines.every(isBullet)) {
    return (
      <ul className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[10px] h-px w-3 shrink-0 bg-brand-secondary/60" aria-hidden="true" />
            <span>{line.replace(/^[-*•]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="whitespace-pre-line">{text}</p>;
};

const PdpSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-20" aria-busy="true" aria-label="Loading product">
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div className="space-y-5">
        <div className="aspect-[4/3] max-h-[420px] w-full rounded-2xl bg-wall motion-safe:animate-pulse" />
        <div className="aspect-[4/3] w-full rounded-2xl bg-wall motion-safe:animate-pulse" />
      </div>
      <div className="space-y-4 pt-2">
        <div className="h-3 w-24 rounded bg-wall motion-safe:animate-pulse" />
        <div className="h-12 w-4/5 rounded bg-wall motion-safe:animate-pulse" />
        <div className="h-6 w-32 rounded bg-wall motion-safe:animate-pulse" />
        <div className="grid grid-cols-2 gap-3 pt-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] rounded-xl bg-wall motion-safe:animate-pulse" />
          ))}
        </div>
        <div className="h-14 rounded-full bg-wall motion-safe:animate-pulse" />
      </div>
    </div>
  </div>
);

export const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addToCart, currency, isInWishlist, addToWishlist, removeFromWishlist } = useApp();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [familyProducts, setFamilyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const sizeRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      const data = await api.getProductById(id);
      if (data) {
        setProduct(data);
        setSelectedSize(data.variants.sizes?.[0] ?? '');
        setSelectedImage(data.main_image_url || data.imageUrl || '');

        const sameCategory = await api.getProducts(data.category);
        setFamilyProducts(
          data.design_family
            ? sameCategory
                .filter((p) => p.design_family && p.design_family === data.design_family)
                .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            : [],
        );

        let related = sameCategory.filter((p) => p.id !== data.id).slice(0, 4);
        if (related.length < 4) {
          const categories = await api.getCategories();
          const otherSlugs = (categories || [])
            .map((c: { slug: string }) => c.slug)
            .filter((slug: string) => slug && slug !== data.category);
          const seen = new Set(related.map((p) => p.id));
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

  if (!id) return <div className="py-20 text-center text-brand-secondary">Product not found.</div>;
  if (loading) return <PdpSkeleton />;
  if (!product) return <div className="py-20 text-center text-brand-secondary">Product not found.</div>;

  const productTitle = product.name || product.title || 'Artwork';
  const mainImage = product.main_image_url || product.imageUrl || '';
  const extraMockups = (product.mockup_images || []).filter((u) => u && u !== mainImage).slice(0, 4);
  const allThumbnails = [mainImage, ...extraMockups].filter(Boolean);
  const availableSizes = product.variants?.sizes || [];
  const showSizeSelector = availableSizes.length > 0;
  const sizeLabel = (s: string) => formatPosterSizeLabel(s);

  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const effectiveDiscount = hasAnyDiscount
    ? 100 - ((100 - discountPercentage) * (100 - saleDiscountPercentage)) / 100
    : 0;

  const priceFor = (size?: string) => {
    const selling = getSellingPriceForSize(product, size);
    const final = calculateFinalPrice(selling, discountPercentage, onSale, saleDiscountPercentage);
    return { final: toAnchoredDisplayPrice(final), selling: toAnchoredDisplayPrice(selling), raw: final };
  };
  const activePrice = priceFor(showSizeSelector ? selectedSize || undefined : undefined);
  const variableSizePricing = hasVariableSizePricing(product);
  const fmt = (n: number) => formatCurrency(n, currency, { showDecimals: false });

  const materialLabel = getMaterialLabel(product);
  const categorySlug = product.category_slug || product.category;
  const categoryHref = categorySlug ? `/category/${categorySlug}` : '/categories';
  const materialCopy = MATERIAL_COPY[product.material || ''];
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    const size = (selectedSize || availableSizes[0] || '').trim();
    if (showSizeSelector && !size) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Choose a size first', 'error');
      return;
    }
    addToCart({
      ...product,
      selling_price: getSellingPriceForSize(product, size || undefined),
      quantity: 1,
      selectedSize: size || 'One Size',
      selectedColor: '',
    });
    setAddedToCart(true);
    setSizeError(false);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleWishlistToggle = async () => {
    if (isWishlistLoading) return;
    setIsWishlistLoading(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(product.id);
        showToast('Removed from wishlist', 'success');
      } else {
        await addToWishlist(product.id);
        showToast('Saved to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update wishlist', 'error');
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const productDescription =
    product.description || `${productTitle}, printed in the Tinge studio on ${materialLabel.toLowerCase()}.`;
  const seoData = {
    title: `${productTitle} | ${materialLabel} Wall Art | Tinge`,
    description: truncateDescription(productDescription),
    keywords: `${productTitle}, ${materialLabel}, Tinge wall art, wall art India`,
    image: mainImage,
    type: 'product' as const,
    url: `${DEFAULT_SITE_URL}/product/${product.id}`,
  };
  const breadcrumbItems = [
    { name: 'Home', url: DEFAULT_SITE_URL },
    { name: product.category_name || 'Art', url: `${DEFAULT_SITE_URL}${categoryHref}` },
    { name: productTitle, url: `${DEFAULT_SITE_URL}/product/${product.id}` },
  ];
  const productSchema = createProductSchema({
    id: product.id,
    title: productTitle,
    description: productDescription,
    price: activePrice.raw,
    currency,
    image: mainImage,
    availability: 'https://schema.org/InStock',
    brand: DEFAULT_SITE_NAME,
    category: product.category_name,
  });

  const ctaLabel = addedToCart ? 'Added to bag' : `Add to bag · ${fmt(activePrice.final)}`;

  return (
    <>
      <SEOHead {...seoData} />
      {productSchema && <StructuredData data={productSchema} />}
      <StructuredData data={createBreadcrumbSchema(breadcrumbItems)} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-10 pt-4 lg:pt-8 pb-28 lg:pb-20">
        <nav aria-label="Breadcrumb" className="mb-5 lg:mb-8">
          <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">
            <li>
              <Link to="/" className="hover:text-brand-primary transition-colors duration-150">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={categoryHref} className="hover:text-brand-primary transition-colors duration-150">
                {product.category_name || 'Art'}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate max-w-[50vw] text-brand-primary" aria-current="page">{productTitle}</li>
          </ol>
        </nav>

        {/* 50% / 50% equal-split desktop grid */}
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
          {/* LEFT 50% — Compact main artwork + photorealistic room mockup + listing mockups */}
          <section className="space-y-6" aria-label="Product images and room preview">
            {/* Compact main artwork frame */}
            <div className="relative flex h-[320px] sm:h-[380px] lg:h-[420px] items-center justify-center rounded-2xl bg-wall p-8 sm:p-10">
              <img
                src={selectedImage || mainImage}
                alt={productTitle}
                className="max-h-full max-w-full h-auto w-auto shadow-[0_24px_48px_-16px_rgba(0,0,0,0.38)] motion-safe:transition-opacity motion-safe:duration-300"
                loading="eager"
              />
              {(onSale || hasAnyDiscount) && (
                <span className="absolute left-4 top-4 rounded-full bg-brand-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-cream">
                  {hasAnyDiscount ? `−${effectiveDiscount.toFixed(0)}%` : 'Sale'}
                </span>
              )}
            </div>

            {/* Thumbnail switcher when multiple images exist */}
            {allThumbnails.length > 1 && (
              <div className="flex flex-wrap items-center gap-2.5" role="list" aria-label="Select product image">
                {allThumbnails.map((imgUrl, i) => {
                  const active = (selectedImage || mainImage) === imgUrl;
                  return (
                    <button
                      key={imgUrl + i}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      aria-label={`View image ${i + 1}`}
                      aria-current={active ? 'true' : undefined}
                      className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-wall p-1.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                        active
                          ? 'ring-2 ring-brand-ink dark:ring-brand-cream'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="h-full w-full object-cover rounded-lg" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Photorealistic room mockup directly below main image */}
            {mainImage && (
              <RoomMockupPreview
                image={mainImage}
                material={product.material}
                sizeLabel={selectedSize || availableSizes[0]}
                title={productTitle}
              />
            )}

            {/* Additional listing mockup images stacked below */}
            {extraMockups.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraMockups.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    className="group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-wall p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                  >
                    <img
                      src={src}
                      alt={`${productTitle} detail ${i + 1}`}
                      loading="lazy"
                      className="max-h-full max-w-full h-auto w-auto shadow-[0_18px_36px_-14px_rgba(0,0,0,0.35)] motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.03]"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT 50% — Sticky buy panel */}
          <section className="lg:sticky lg:top-24" aria-label="Product details">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-coral" aria-hidden="true" />
                {materialLabel}
              </span>
              {(product.rating ?? 0) > 0 && (
                <a href="#reviews" className="flex items-center gap-1.5 text-[13px] text-brand-secondary hover:text-brand-primary">
                  <StarRating rating={product.rating || 0} readonly size="sm" />
                  <span>
                    {(product.rating || 0).toFixed(1)} ({product.rating_count || 0})
                  </span>
                </a>
              )}
            </div>

            <h1 className="mt-5 font-playfair text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.15] tracking-tight text-brand-primary [text-wrap:balance]">
              {productTitle}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[28px] font-medium tracking-tight text-brand-primary tabular-nums">
                {fmt(activePrice.final)}
              </span>
              {hasAnyDiscount && (
                <>
                  <span className="text-base text-brand-secondary line-through tabular-nums">{fmt(activePrice.selling)}</span>
                  <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                    Save {effectiveDiscount.toFixed(0)}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-[13px] text-brand-secondary">
              {variableSizePricing && selectedSize ? `For ${sizeLabel(selectedSize)} · ` : ''}Inclusive of all taxes
            </p>

            {familyProducts.length > 1 && (
              <div className="mt-7">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Also made as</p>
                <div className="flex flex-wrap gap-2">
                  {familyProducts.map((p) => {
                    const active = p.id === product.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => !active && navigate(`/product/${p.id}`)}
                        aria-current={active ? 'true' : undefined}
                        className={`min-h-[44px] cursor-pointer rounded-full border px-4 text-[14px] transition-colors duration-150 ${
                          active
                            ? 'border-brand-ink bg-brand-ink text-brand-cream dark:border-brand-cream dark:bg-brand-cream dark:text-brand-ink'
                            : 'border-hairline text-brand-primary hover:border-brand-ink dark:hover:border-brand-cream'
                        }`}
                      >
                        {getMaterialLabel(p)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showSizeSelector && (
              <fieldset className="mt-8" ref={sizeRef}>
                <legend className="mb-3 flex w-full items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Size</span>
                  {selectedSize && (
                    <span className="text-[13px] text-brand-primary">{sizeLabel(selectedSize)}</span>
                  )}
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    const p = priceFor(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedSize(size);
                          setSizeError(false);
                        }}
                        className={`relative flex min-h-[72px] cursor-pointer flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'border-brand-ink dark:border-brand-cream shadow-[inset_0_0_0_1px_currentColor] text-brand-primary'
                            : sizeError
                              ? 'border-red-400 text-brand-primary'
                              : 'border-hairline text-brand-primary hover:border-brand-secondary'
                        }`}
                      >
                        <span className="text-[15px] font-medium">{sizeLabel(size)}</span>
                        {variableSizePricing && (
                          <span className="mt-0.5 text-[13px] text-brand-secondary tabular-nums">{fmt(p.final)}</span>
                        )}
                        {isSelected && (
                          <CheckCircleIcon className="absolute right-3 top-3 h-4 w-4 text-brand-primary" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {sizeError && (
                  <p className="mt-2 text-[13px] text-red-600" role="alert">Choose a size to continue.</p>
                )}
              </fieldset>
            )}

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                aria-live="polite"
                className={`flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-[background-color,transform] duration-200 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 ${
                  addedToCart
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-ink text-brand-cream hover:bg-black dark:bg-brand-cream dark:text-brand-ink dark:hover:bg-white'
                }`}
              >
                {addedToCart && <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />}
                <span className="tabular-nums">{ctaLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={isWishlistLoading}
                aria-pressed={inWishlist}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  inWishlist
                    ? 'border-brand-coral text-brand-coral'
                    : 'border-hairline text-brand-primary hover:border-brand-ink dark:hover:border-brand-cream'
                }`}
              >
                <HeartIcon className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            <ul className="mt-6 grid grid-cols-3 divide-x divide-hairline rounded-xl border border-hairline">
              {[
                { Icon: SparklesIcon, label: 'Printed in our studio' },
                { Icon: ShieldIcon, label: 'Safe transit guarantee' },
                { Icon: TruckIcon, label: 'Ships across India' },
              ].map(({ Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-2 px-2 py-4 text-center">
                  <Icon className="h-[18px] w-[18px] text-brand-primary" aria-hidden="true" />
                  <span className="text-[12px] leading-snug text-brand-secondary">{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-hairline">
              <DetailRow index="01" title="About this piece" defaultOpen>
                <DescriptionBody text={productDescription} />
              </DetailRow>
              {materialCopy && (
                <DetailRow index="02" title={`${materialLabel} — finish & care`}>
                  <p>{materialCopy.finish}</p>
                  <p className="mt-3">{materialCopy.care}</p>
                </DetailRow>
              )}
              <DetailRow index={materialCopy ? '03' : '02'} title="Delivery & returns">
                <p>
                  Every piece is made to order in our studio and packed for safe transit. You will get tracking by
                  email once it ships.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  <Link to="/shipping" className="inline-flex items-center gap-1 font-medium text-brand-primary underline-offset-4 hover:underline">
                    Shipping details <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  <Link to="/return-policy" className="inline-flex items-center gap-1 font-medium text-brand-primary underline-offset-4 hover:underline">
                    Return policy <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </DetailRow>
            </div>
          </section>
        </div>
      </div>

      {(product.rating_count ?? 0) > 0 && (
        <section id="reviews" className="border-t border-hairline">
          <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24">
            <div className="mb-10 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Reviews</p>
                <h2 className="mt-2 font-playfair text-3xl md:text-4xl font-medium text-brand-primary">
                  From people who <em>hung it</em>
                </h2>
              </div>
            </div>
            <RatingBreakdown productId={product.id} />
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="border-t border-hairline">
          <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24 pb-28 lg:pb-24">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Keep looking</p>
                <h2 className="mt-2 font-playfair text-3xl md:text-4xl font-medium text-brand-primary">
                  Pairs well <em>with</em>
                </h2>
              </div>
              <Link
                to={categoryHref}
                className="hidden min-h-[44px] items-center gap-2 rounded-full border border-hairline px-5 text-[14px] font-medium text-brand-primary transition-colors duration-150 hover:border-brand-ink dark:hover:border-brand-cream sm:inline-flex"
              >
                View all <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/90 dark:bg-brand-bg/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-brand-secondary">
              {materialLabel}
              {selectedSize ? ` · ${sizeLabel(selectedSize)}` : ''}
            </p>
            <p className="text-[17px] font-medium text-brand-primary tabular-nums">{fmt(activePrice.final)}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex min-h-[48px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-6 text-[15px] font-medium transition-colors duration-200 motion-safe:active:scale-[0.98] ${
              addedToCart ? 'bg-emerald-600 text-white' : 'bg-brand-ink text-brand-cream dark:bg-brand-cream dark:text-brand-ink'
            }`}
          >
            {addedToCart && <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />}
            {addedToCart ? 'Added' : 'Add to bag'}
          </button>
        </div>
      </div>
    </>
  );
};
