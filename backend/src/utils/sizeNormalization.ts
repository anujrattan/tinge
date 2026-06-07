export const CANONICAL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export const POSTER_SIZES = ['8x11.7in', '11.7x15.7in'] as const;

const POSTER_SIZE_CANONICAL = new Map(
  POSTER_SIZES.map((s) => [s.toLowerCase(), s]),
);

const SIZE_ALIASES: Record<string, string> = {
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

export const normalizePosterSizeList = (sizes: string[]): string[] => {
  const found = new Set<string>();
  for (const size of sizes || []) {
    const canonical = POSTER_SIZE_CANONICAL.get(String(size || '').trim().toLowerCase());
    if (canonical) found.add(canonical);
  }
  return POSTER_SIZES.filter((s) => found.has(s));
};

export const hasAllPosterSizes = (sizes: string[]): boolean =>
  POSTER_SIZES.every((s) => normalizePosterSizeList(sizes).includes(s));

export const normalizeSizeList = (sizes: string[]): string[] => {
  const unique = new Set<string>();
  for (const size of sizes || []) {
    const normalized = normalizeSizeLabel(size);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
};
