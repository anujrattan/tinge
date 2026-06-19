import React, { useState } from 'react';
import { Category } from '../types';
import { Card } from './ui';
import { RecycleIcon, SaleTagIcon } from './icons';
import { formatCurrency, DEFAULT_CURRENCY } from '../utils/currency';
import { calculateFinalPrice, toAnchoredDisplayPrice } from '../utils/pricing';

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
  
  const finalPrice = calculateFinalPrice(sellingPrice, discountPercentage, onSale, saleDiscountPercentage);
  const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
  const displaySellingPrice = toAnchoredDisplayPrice(sellingPrice);
  
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
  const descriptionLines = (formData.description || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const isBulletLine = (line: string) =>
    line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ');
  const isBulletDescription = descriptionLines.length > 0 && descriptionLines.every(isBulletLine);

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
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-purple-600">
          {categoryName.toUpperCase().replace('-', ' ')}
        </p>
        <h3 className="font-playfair text-base font-medium text-card-light-text-primary truncate mt-0.5 leading-snug">
          {formData.title || 'Product Title'}
        </h3>
        {isBulletDescription ? (
          <ul className="text-xs text-card-light-text-secondary mt-1 list-disc list-inside max-h-12 overflow-hidden space-y-0.5">
            {descriptionLines.map((line, index) => (
              <li key={index} className="leading-snug">
                {line.replace(/^[-*•]\s*/, '')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-card-light-text-secondary mt-1 h-8 overflow-hidden line-clamp-2 whitespace-pre-line">
            {formData.description || 'Product description will appear here...'}
          </p>
        )}
        
        <div className="flex items-baseline gap-1.5 mt-1.5 flex-nowrap overflow-hidden">
          <p className="text-2xl font-semibold tracking-tight text-pink-500 whitespace-nowrap">
            {formatCurrency(displayFinalPrice, DEFAULT_CURRENCY, { showDecimals: false })}
          </p>
          {hasAnyDiscount && (
            <div className="flex items-baseline gap-1.5 whitespace-nowrap min-w-0">
              <p className="text-sm text-card-light-text-secondary line-through">
                {formatCurrency(displaySellingPrice, DEFAULT_CURRENCY, { showDecimals: false })}
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

