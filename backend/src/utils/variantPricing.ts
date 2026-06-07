import { normalizeSizeLabel, normalizeSizeList } from './sizeNormalization.js';

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

export const minSizePrice = (sizePrices: SizePricesMap): number | null => {
  const values = Object.values(sizePrices).filter((p) => Number.isFinite(p) && p > 0);
  if (values.length === 0) return null;
  return Math.min(...values);
};

export const hasVariableSizePricing = (sizePrices: SizePricesMap): boolean => {
  const values = Object.values(sizePrices).filter((p) => p > 0);
  if (values.length <= 1) return values.length === 1;
  return new Set(values).size > 1;
};

export const buildVariantsPayload = (
  sizes: string[],
  sizePrices?: SizePricesMap | null,
): { sizes: string[]; size_prices?: SizePricesMap } => {
  const filtered = parseSizePricesMap(sizePrices || {}, sizes);
  const payload: { sizes: string[]; size_prices?: SizePricesMap } = { sizes };
  if (Object.keys(filtered).length > 0) {
    payload.size_prices = filtered;
  }
  return payload;
};

export const extractVariantsFromDb = (variants: unknown): {
  sizes: string[];
  size_prices?: SizePricesMap;
} => {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) {
    return { sizes: [] };
  }
  const v = variants as { sizes?: unknown; size_prices?: unknown };
  const sizes = Array.isArray(v.sizes) ? normalizeSizeList(v.sizes as string[]) : [];
  const uniqueSizes = sizes;
  const size_prices = parseSizePricesMap(v.size_prices, uniqueSizes);
  return {
    sizes: uniqueSizes,
    ...(Object.keys(size_prices).length > 0 ? { size_prices } : {}),
  };
};

export const resolveListingSellingPrice = (
  baseSellingPrice: number,
  sizes: string[],
  sizePrices?: SizePricesMap | null,
): number => {
  const min = minSizePrice(parseSizePricesMap(sizePrices || {}, sizes));
  if (min != null && min > 0) return min;
  return baseSellingPrice;
};
