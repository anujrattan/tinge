import type { Product } from '../types';
import { normalizeSizeLabel } from './sizeSystem';

export type SizePricesMap = Record<string, number>;

export const parseSizePricesMap = (
  raw: unknown,
  sizes: string[],
): SizePricesMap => {
  const out: SizePricesMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

  const canonicalByNorm = new Map<string, string>();
  for (const size of sizes) {
    canonicalByNorm.set(normalizeSizeLabel(size), size);
  }

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const canon = canonicalByNorm.get(normalizeSizeLabel(key));
    if (!canon) continue;
    const price = typeof val === 'number' ? val : parseFloat(String(val));
    if (Number.isFinite(price) && price >= 0) out[canon] = price;
  }
  return out;
};

export const getProductSizePrices = (product: Product): SizePricesMap => {
  const sizes = product.variants?.sizes || [];
  return parseSizePricesMap(product.variants?.size_prices, sizes);
};

export const hasVariableSizePricing = (product: Product): boolean => {
  const prices = getProductSizePrices(product);
  const values = Object.values(prices).filter((p) => p > 0);
  if (values.length <= 1) return false;
  return new Set(values).size > 1;
};

export const getSellingPriceForSize = (
  product: Product,
  size?: string | null,
): number => {
  const base = Number(product.selling_price ?? product.price ?? 0) || 0;
  const sizes = product.variants?.sizes || [];
  const sizePrices = getProductSizePrices(product);
  if (!size || Object.keys(sizePrices).length === 0) {
    const min = Math.min(...Object.values(sizePrices).filter((p) => p > 0));
    if (Number.isFinite(min) && min > 0) return min;
    return base;
  }
  const canon = normalizeSizeLabel(size);
  const match = Object.entries(sizePrices).find(
    ([k]) => normalizeSizeLabel(k) === canon,
  );
  if (match && match[1] > 0) return match[1];
  return base;
};

/** Lowest size price for cards/search; falls back to selling_price. */
export const getListingSellingPrice = (product: Product): number =>
  getSellingPriceForSize(product, null);

export const buildSizePricesPayload = (
  sizes: string[],
  sizePrices: SizePricesMap,
): SizePricesMap | undefined => {
  const filtered = parseSizePricesMap(sizePrices, sizes);
  return Object.keys(filtered).length > 0 ? filtered : undefined;
};

export const minPriceForSizes = (
  sizes: string[],
  sizePrices: SizePricesMap,
  fallback = 0,
): number => {
  const filtered = parseSizePricesMap(sizePrices, sizes);
  const values = sizes
    .map((s) => filtered[normalizeSizeLabel(s)] ?? filtered[s])
    .filter((p) => Number.isFinite(p) && (p as number) > 0) as number[];
  if (values.length === 0) return fallback;
  return Math.min(...values);
};
