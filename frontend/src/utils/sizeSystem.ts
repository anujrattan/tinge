import type { Product } from '../types';

export const POSTER_SIZES = ['8x11.7in', '11.7x15.7in'] as const;

const POSTER_SIZE_CANONICAL = new Map(
  POSTER_SIZES.map((s) => [s.toLowerCase(), s]),
);

export const PREFERRED_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
type PreferredSize = (typeof PREFERRED_SIZES)[number];

const SIZE_ALIASES: Record<string, PreferredSize> = {
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
  '2XL': 'XXL',
  XXXL: '3XL',
  '3XL': '3XL',
};

export const normalizeSizeLabel = (value: string): string => {
  const trimmed = String(value || '').trim();
  const poster = POSTER_SIZE_CANONICAL.get(trimmed.toLowerCase());
  if (poster) return poster;
  const normalized = trimmed.toUpperCase();
  return SIZE_ALIASES[normalized] || normalized;
};

export const formatPosterSizeLabel = (size: string): string => {
  const canonical = POSTER_SIZE_CANONICAL.get(String(size || '').trim().toLowerCase());
  if (canonical === '8x11.7in') return '8 × 11.7 in';
  if (canonical === '11.7x15.7in') return '11.7 × 15.7 in';
  return size;
};

export const normalizePosterSizeList = (sizes: string[]): string[] => {
  const found = new Set<string>();
  for (const size of sizes || []) {
    const canonical = POSTER_SIZE_CANONICAL.get(String(size || '').trim().toLowerCase());
    if (canonical) found.add(canonical);
  }
  return POSTER_SIZES.filter((s) => found.has(s));
};

export const isPosterProduct = (product: Product): boolean =>
  product.category_product_type === 'poster';

export const normalizeSizeList = (sizes: string[]): string[] => {
  const unique = new Set<string>();
  sizes.forEach((size) => {
    const normalized = normalizeSizeLabel(size);
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

export type SizeChartDefinition = {
  id: string;
  label: string;
  imageUrl: string;
  keywords: string[];
};

export const SIZE_CHART_DEFINITIONS: SizeChartDefinition[] = [
  {
    id: 'oversized-tee',
    label: 'Oversized Fit Size Chart',
    imageUrl: '/Mens-Oversized-Tee-SizeChart.webp',
    keywords: ['oversize', 'oversized', 'loose and boxy fit', 'boxy fit', 'boxy'],
  },
  {
    id: 'regular-tee',
    label: 'Regular Fit Size Chart',
    imageUrl: '/Men-Round-Neck-HS-Tee-SizeChart.webp',
    keywords: ['regular fit', 'regular', 'classic fit', 'standard fit'],
  },
];

export const getSizeChartForProduct = (product: Product): SizeChartDefinition | null => {
  if (isPosterProduct(product)) return null;

  if (product.size_chart_profile) {
    const explicit = SIZE_CHART_DEFINITIONS.find((chart) => chart.id === product.size_chart_profile);
    if (explicit) return explicit;
  }

  const haystack = [
    product.title,
    product.name,
    product.description,
    product.category_name,
    product.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    SIZE_CHART_DEFINITIONS.find((chart) =>
      chart.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
    ) || SIZE_CHART_DEFINITIONS.find((chart) => chart.id === 'regular-tee') || null
  );
};
