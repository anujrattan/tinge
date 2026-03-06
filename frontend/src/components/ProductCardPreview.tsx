import React, { useState } from 'react';
import { Category } from '../types';
import { Card } from './ui';
import { RecycleIcon, SaleTagIcon } from './icons';
import { formatCurrency, DEFAULT_CURRENCY } from '../utils/currency';

interface ProductCardPreviewProps {
  formData: {
    title: string;
    description: string;
    selling_price: number;
    discount_percentage?: number;
    on_sale?: boolean;
    sale_discount_percentage?: number;
    usp_tag?: string;
    main_image_url: string;
    category_id?: string;
  };
  categories: Category[];
}

export const ProductCardPreview: React.FC<ProductCardPreviewProps> = ({ formData, categories }) => {
  const [imageError, setImageError] = useState(false);
  const sellingPrice = parseFloat(String(formData.selling_price || 0));
  const discountPercentage = formData.discount_percentage ? parseFloat(String(formData.discount_percentage)) : 0;
  const onSale = formData.on_sale === true;
  const saleDiscountPercentage = onSale && formData.sale_discount_percentage ? parseFloat(String(formData.sale_discount_percentage)) : 0;
  
  // Calculate final price with multiplicative stacking
  let finalPrice = sellingPrice;
  if (discountPercentage > 0) {
    finalPrice = finalPrice * (1 - discountPercentage / 100);
  }
  if (saleDiscountPercentage > 0) {
    finalPrice = finalPrice * (1 - saleDiscountPercentage / 100);
  }
  
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  const totalSavings = sellingPrice - finalPrice;
  
  // Calculate effective discount percentage for display
  const effectiveDiscount = discountPercentage > 0 || saleDiscountPercentage > 0
    ? 100 - (100 - discountPercentage) * (100 - saleDiscountPercentage) / 100
    : 0;
  
  // Find category name from category_id
  const selectedCategory = categories.find(cat => cat.id === formData.category_id);
  const categoryName = selectedCategory?.name || selectedCategory?.slug || 'CATEGORY';
  
  const discountText = hasAnyDiscount ? `Save ${formatCurrency(totalSavings, DEFAULT_CURRENCY, { showDecimals: false })}` : undefined;
  const uspTag = formData.usp_tag || undefined;

  return (
    <Card className="bg-card-light-bg border-gray-200/50 shadow-md !text-card-light-text-primary w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl">
        {formData.main_image_url && !imageError ? (
          <img
            src={formData.main_image_url}
            alt={formData.title || 'Product preview'}
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
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {discountText && (
            <div className="text-xs font-semibold text-white bg-badge-pink-bg rounded-full px-2.5 py-1 shadow-md">
              {discountText}
            </div>
          )}
        </div>
        {/* Top Right: Sale Badge */}
        {onSale && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-2 py-1 shadow-lg animate-pulse">
              <SaleTagIcon className="w-3 h-3" />
              <span className="text-xs font-bold">SALE</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col">
        <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
          {categoryName.toUpperCase().replace('-', ' ')}
        </p>
        <h3 className="text-base font-bold text-card-light-text-primary truncate mt-0.5">
          {formData.title || 'Product Title'}
        </h3>
        <p className="text-xs text-card-light-text-secondary mt-1 h-8 overflow-hidden line-clamp-2">
          {formData.description || 'Product description will appear here...'}
        </p>
        
        <div className="flex items-baseline gap-2 mt-1.5">
          <p className="text-2xl font-extrabold text-pink-500">
            {formatCurrency(finalPrice, DEFAULT_CURRENCY)}
          </p>
          {hasAnyDiscount && (
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm text-card-light-text-secondary line-through">
                {formatCurrency(sellingPrice, DEFAULT_CURRENCY)}
              </p>
              <span className="text-xs font-semibold text-pink-500">
                ({effectiveDiscount.toFixed(0)}% off)
              </span>
            </div>
          )}
        </div>
        
        {uspTag && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-tag-green-bg text-tag-green-text text-xs font-semibold rounded-full px-2.5 py-1 self-start">
            <RecycleIcon className="w-3 h-3" />
            <span>{uspTag}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

