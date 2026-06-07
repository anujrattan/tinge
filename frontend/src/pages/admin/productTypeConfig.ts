import type { ProductType } from '../../types';
import { POSTER_SIZES } from '../../utils/sizeSystem';

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'apparel', label: 'Apparel (tees & wearables)' },
  { value: 'poster', label: 'Metal poster' },
];

export const DEFAULT_FULFILLMENT_BY_TYPE: Record<ProductType, string> = {
  apparel: '',
  poster: 'Qikink',
};

export const POSTER_SIZE_LABELS: Record<string, string> = {
  '8x11.7in': '8 × 11.7 in',
  '11.7x15.7in': '11.7 × 15.7 in',
};

export const getPosterSizesForListing = (): string[] => [...POSTER_SIZES];

export const posterSizesComplete = (sizes: string[]): boolean =>
  POSTER_SIZES.every((s) =>
    sizes.some((x) => String(x).trim().toLowerCase() === s.toLowerCase()),
  );

/** Product types that use per-size selling prices in variants.size_prices */
export const SIZE_PRICING_PRODUCT_TYPES: ProductType[] = ['poster'];

export const usesSizePricing = (productType: ProductType): boolean =>
  SIZE_PRICING_PRODUCT_TYPES.includes(productType);
