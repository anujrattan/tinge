import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { HeartIcon } from './icons';
import { StarRating } from './StarRating';
import { formatCurrency } from '../utils/currency';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';
import { getListingSellingPrice, hasVariableSizePricing } from '../utils/sizePricing';
import { getMaterialLabel } from '../utils/sizeSystem';

interface ProductCardProps {
  product: Product;
  /** Optional badge (e.g. best-seller rank) shown in the top-left corner */
  cornerBadge?: React.ReactNode;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, cornerBadge }) => {
  const { currency, isInWishlist, addToWishlist, removeFromWishlist } = useApp();
  const { showToast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const title = product.title || product.name || 'Artwork';
  const image = product.main_image_url || product.imageUrl;

  const showFromPrice = hasVariableSizePricing(product);
  const sellingPrice = getListingSellingPrice(product);
  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  const finalPrice = calculateFinalPrice(sellingPrice, discountPercentage, onSale, saleDiscountPercentage);
  const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
  const displaySellingPrice = toAnchoredDisplayPrice(sellingPrice);
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const effectiveDiscount = hasAnyDiscount
    ? 100 - ((100 - discountPercentage) * (100 - saleDiscountPercentage)) / 100
    : 0;

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

  return (
    <article className="group relative w-full min-w-0">
      <Link
        to={`/product/${product.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2"
      >
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-wall p-[12%]">
          {image && !imageError ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="max-h-full max-w-full h-auto w-auto shadow-[0_20px_40px_-14px_rgba(0,0,0,0.35)] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">No image</span>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            {hasAnyDiscount && (
              <span className="rounded-full bg-brand-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-cream">
                −{effectiveDiscount.toFixed(0)}%
              </span>
            )}
            {cornerBadge}
          </div>
        </div>

        <div className="mt-3 px-0.5">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-brand-primary">{title}</h3>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary">
              {getMaterialLabel(product)}
            </p>
            <p className="text-[15px] font-medium text-brand-primary tabular-nums whitespace-nowrap">
              {showFromPrice && <span className="mr-1 text-[12px] font-normal text-brand-secondary">from</span>}
              {formatCurrency(displayFinalPrice, currency, { showDecimals: false })}
              {hasAnyDiscount && (
                <span className="ml-1.5 text-[12px] font-normal text-brand-secondary line-through">
                  {formatCurrency(displaySellingPrice, currency, { showDecimals: false })}
                </span>
              )}
            </p>
          </div>
          {(product.rating ?? 0) > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <StarRating rating={product.rating || 0} readonly size="sm" />
              <span className="text-[12px] text-brand-secondary">({product.rating_count || 0})</span>
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleWishlistToggle}
        disabled={isWishlistLoading}
        aria-pressed={inWishlist}
        aria-label={inWishlist ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
        className={`absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral disabled:cursor-not-allowed disabled:opacity-50 ${
          inWishlist
            ? 'bg-brand-ink text-brand-coral'
            : 'bg-white/70 text-brand-ink hover:bg-white dark:bg-black/30 dark:text-brand-cream dark:hover:bg-black/50'
        }`}
      >
        <HeartIcon className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
};
