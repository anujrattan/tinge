import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Card } from './ui';
import { RecycleIcon, SaleTagIcon, HeartIcon } from './icons';
import { StarRating } from './StarRating';
import { formatCurrency } from '../utils/currency';
import { useApp } from '../context/AppContext';
import { getCssColorValue, getColorName } from '../utils/colorUtils';
import { useToast } from '../context/ToastContext';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';
import { getListingSellingPrice, hasVariableSizePricing } from '../utils/sizePricing';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { currency, isInWishlist, addToWishlist, removeFromWishlist } = useApp();
  const { showToast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  const inWishlist = isInWishlist(product.id);
  
  const showFromPrice = hasVariableSizePricing(product);
  const sellingPrice = getListingSellingPrice(product);
  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  
  const finalPrice = calculateFinalPrice(sellingPrice, discountPercentage, onSale, saleDiscountPercentage);
  const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
  const displaySellingPrice = toAnchoredDisplayPrice(sellingPrice);
  
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const totalSavings = sellingPrice - finalPrice;
  
  // Calculate effective discount percentage for display
  const effectiveDiscount = discountPercentage > 0 || saleDiscountPercentage > 0
    ? 100 - (100 - discountPercentage) * (100 - saleDiscountPercentage) / 100
    : 0;
  
  // Get category name - use category slug if available
  const categoryName = product.category 
    ? product.category.toUpperCase().replace('-', ' ')
    : undefined;
  
  const discountText = hasAnyDiscount ? `Save ${formatCurrency(totalSavings, currency, { showDecimals: false })}` : undefined;
  const uspTag = product.usp_tag || undefined;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking heart
    
    if (isWishlistLoading) return;
    
    setIsWishlistLoading(true);
    try {
      if (inWishlist) {
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

  return (
    <Card 
      className="cursor-pointer animate-popIn bg-card-light-bg dark:bg-brand-surface border-gray-200/50 dark:border-white/10 border shadow-md dark:shadow-lg hover:shadow-xl transition-shadow !text-card-light-text-primary dark:text-brand-primary w-full overflow-hidden" 
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl">
        {(product.main_image_url || product.imageUrl) && !imageError ? (
          <img
            src={product.main_image_url || product.imageUrl}
            alt={product.title || product.name || 'Product'}
            className="w-full h-full object-cover"
            onError={() => {
              // Stop retrying - just mark as error and show fallback
              setImageError(true);
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-sm">No image</span>
          </div>
        )}
        {/* Top Left: Discount Pill */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 max-w-[45%]">
          {discountText && (
            <div className="text-[9px] sm:text-[10px] font-semibold text-white bg-badge-pink-bg rounded-full px-1.5 sm:px-2 py-0.5 shadow-md truncate">
              {discountText}
            </div>
          )}
        </div>
        {/* Top Right: Sale Badge & Wishlist */}
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
          {onSale && (
            <div className="flex items-center gap-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-1.5 py-0.5 shadow-lg animate-pulse">
              <SaleTagIcon className="w-2.5 h-2.5" />
              <span className="text-[9px] font-bold">SALE</span>
            </div>
          )}
          {/* Wishlist Heart Icon */}
          <button
            onClick={handleWishlistToggle}
            disabled={isWishlistLoading}
            className={`p-1.5 rounded-full transition-all duration-200 ${
              inWishlist 
                ? 'bg-pink-500 text-white shadow-lg' 
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            } ${isWishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <HeartIcon 
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWishlist ? 'fill-current' : ''}`}
            />
          </button>
        </div>
      </div>
      <div className="p-2 flex flex-col min-w-0">
        {categoryName && (
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 truncate">
            {categoryName}
          </p>
        )}
        {(product.title || product.name) && (
          <h3 className="text-xs sm:text-sm font-bold text-card-light-text-primary truncate mt-0.5">
            {product.title || product.name}
          </h3>
        )}
        
        {/* Rating Display */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating rating={product.rating} readonly size="sm" />
            <span className="text-[10px] sm:text-xs text-card-light-text-secondary">
              ({product.rating_count || 0})
            </span>
          </div>
        )}
        
        {product.description && (
          <p className="text-[10px] sm:text-xs text-card-light-text-secondary mt-0.5 h-6 overflow-hidden line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="mt-1 flex items-baseline gap-1.5 flex-nowrap overflow-hidden">
          {showFromPrice && (
            <span className="text-[10px] sm:text-xs font-semibold text-card-light-text-secondary uppercase tracking-wide">
              From
            </span>
          )}
          <p className="text-base sm:text-lg font-extrabold text-pink-500 whitespace-nowrap">
            {formatCurrency(displayFinalPrice, currency, { showDecimals: false })}
          </p>
          {hasAnyDiscount && (
            <div className="flex items-baseline gap-1 whitespace-nowrap min-w-0">
              <p className="text-[10px] sm:text-xs text-card-light-text-secondary line-through">
                {formatCurrency(displaySellingPrice, currency, { showDecimals: false })}
              </p>
              <span className="text-[10px] sm:text-xs font-semibold text-pink-500">
                ({effectiveDiscount.toFixed(0)}% off)
              </span>
            </div>
          )}
        </div>
        
        {uspTag && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-tag-green-bg text-tag-green-text text-[10px] sm:text-xs font-semibold rounded-full px-2 py-0.5 self-start max-w-full">
            <RecycleIcon className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{uspTag}</span>
          </div>
        )}
        
        {/* Color (single per listing) */}
        {product.color && (
          <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden">
            <span className="text-[10px] sm:text-xs text-card-light-text-secondary flex-shrink-0">Color:</span>
            <span
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
              style={{ backgroundColor: getCssColorValue(product.color) }}
              title={getColorName(product.color)}
            />
            <span className="text-[10px] sm:text-xs text-card-light-text-secondary truncate">
              {getColorName(product.color)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};