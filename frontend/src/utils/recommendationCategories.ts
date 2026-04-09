import type { Category } from '../types';

/**
 * Static fallback map used when a category has no complement_slugs set in the DB.
 * Edit this as a last resort — prefer managing complements via the admin Category form.
 */
export const FALLBACK_COMPLEMENT_MAP: Record<string, string[]> = {
  't-shirts': ['stickers', 'tote-bags', 'wall-art', 'mugs', 'accessories'],
  hoodies:    ['stickers', 'tote-bags', 'wall-art', 'accessories'],
  pants:      ['stickers', 'tote-bags', 'accessories'],
  jackets:    ['stickers', 'tote-bags', 'accessories'],
  shoes:      ['stickers', 'accessories'],
  accessories: ['t-shirts', 'hoodies', 'stickers', 'tote-bags'],
  mugs:       ['t-shirts', 'hoodies', 'stickers', 'wall-art'],
  'wall-art': ['mugs', 'stickers', 'tote-bags'],
  stickers:   ['t-shirts', 'hoodies', 'tote-bags', 'mugs'],
  'tote-bags': ['t-shirts', 'hoodies', 'stickers'],
};

/**
 * Builds a slug → complementSlugs map from a live categories API response.
 * Falls back to FALLBACK_COMPLEMENT_MAP for any category with no DB value set.
 */
export function buildComplementMap(categories: Category[]): Record<string, string[]> {
  const map: Record<string, string[]> = { ...FALLBACK_COMPLEMENT_MAP };
  for (const cat of categories) {
    if (cat.slug && Array.isArray(cat.complementSlugs) && cat.complementSlugs.length > 0) {
      map[cat.slug] = cat.complementSlugs;
    }
  }
  return map;
}

/**
 * Returns complement category slugs for a given slug using the provided map.
 */
export function getComplementCategorySlugs(
  categorySlug: string,
  map: Record<string, string[]> = FALLBACK_COMPLEMENT_MAP
): string[] {
  if (!categorySlug) return [];
  return map[categorySlug] ?? [];
}

/**
 * Returns union of complement slugs for all given category slugs, deduplicated.
 */
export function getComplementSlugsForCategories(
  categorySlugs: string[],
  map: Record<string, string[]> = FALLBACK_COMPLEMENT_MAP
): string[] {
  const set = new Set<string>();
  for (const slug of categorySlugs) {
    for (const c of getComplementCategorySlugs(slug, map)) set.add(c);
  }
  return Array.from(set);
}
