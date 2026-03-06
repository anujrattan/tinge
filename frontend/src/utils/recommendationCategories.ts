/**
 * Category slug -> complement slugs for cart upsell recommendations.
 * Used to suggest products from other categories (e.g. pants when cart has t-shirts).
 */
const COMPLEMENT_MAP: Record<string, string[]> = {
  't-shirts': ['pants', 'hoodies', 'jackets', 'accessories', 'shoes'],
  hoodies: ['pants', 't-shirts', 'accessories', 'shoes'],
  pants: ['t-shirts', 'hoodies', 'jackets', 'shoes'],
  jackets: ['t-shirts', 'pants', 'accessories', 'shoes'],
  shoes: ['t-shirts', 'pants', 'accessories'],
  accessories: ['t-shirts', 'hoodies', 'pants', 'jackets'],
  mugs: ['t-shirts', 'hoodies', 'accessories', 'wall-art'],
  'wall-art': ['mugs', 'accessories'],
};

/**
 * Returns complement category slugs for a given category slug (for upsell recommendations).
 * Unknown categories return an empty array.
 */
export function getComplementCategorySlugs(categorySlug: string): string[] {
  if (!categorySlug) return [];
  return COMPLEMENT_MAP[categorySlug] ?? [];
}

/**
 * Returns union of complement slugs for all given category slugs, deduplicated.
 */
export function getComplementSlugsForCategories(categorySlugs: string[]): string[] {
  const set = new Set<string>();
  for (const slug of categorySlugs) {
    for (const c of getComplementCategorySlugs(slug)) set.add(c);
  }
  return Array.from(set);
}
