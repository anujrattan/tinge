import type { Product } from '../types';

export type HomepageGridSections = {
  bestSellers: Product[];
  newArrivals: Product[];
  hasMoreBestSellers: boolean;
  hasMoreNewArrivals: boolean;
};

/**
 * Allocate Best Sellers and New Arrivals exclusively, never repeating
 * products already shown in Featured Art (or any other exclude set).
 */
export function allocateExclusiveGrids(
  bestSellerPool: Product[],
  newArrivalPool: Product[],
  excludeIds: string[] = [],
  sectionSize = 8,
): HomepageGridSections {
  const claimed = new Set(excludeIds.filter(Boolean));

  const take = (pool: Product[], n: number): Product[] => {
    const out: Product[] = [];
    if (n <= 0) return out;
    for (const product of pool) {
      if (!product?.id || claimed.has(product.id)) continue;
      claimed.add(product.id);
      out.push(product);
      if (out.length >= n) break;
    }
    return out;
  };

  const bestSellers = take(bestSellerPool, sectionSize);
  const newArrivals = take(newArrivalPool, sectionSize);

  return {
    bestSellers,
    newArrivals,
    hasMoreBestSellers: bestSellerPool.length > sectionSize,
    hasMoreNewArrivals: newArrivalPool.length > sectionSize,
  };
}

/** @deprecated Use allocateExclusiveGrids + curated featured feed */
export function allocateHomepageProducts(
  bestSellerPool: Product[],
  newArrivalPool: Product[],
  sectionSize = 8,
) {
  const claimed = new Set<string>();
  const take = (pool: Product[], n: number): Product[] => {
    const out: Product[] = [];
    for (const product of pool) {
      if (!product?.id || claimed.has(product.id)) continue;
      claimed.add(product.id);
      out.push(product);
      if (out.length >= n) break;
    }
    return out;
  };

  const featuredArt = take(bestSellerPool, sectionSize);
  if (featuredArt.length < sectionSize) {
    featuredArt.push(...take(newArrivalPool, sectionSize - featuredArt.length));
  }

  const grids = allocateExclusiveGrids(
    bestSellerPool,
    newArrivalPool,
    featuredArt.map((p) => p.id),
    sectionSize,
  );

  return { featuredArt, ...grids };
}
