export const CANONICAL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

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
  const normalized = String(value || '').trim().toUpperCase();
  return SIZE_ALIASES[normalized] || normalized;
};

export const normalizeSizeList = (sizes: string[]): string[] => {
  const unique = new Set<string>();
  for (const size of sizes || []) {
    const normalized = normalizeSizeLabel(size);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
};
