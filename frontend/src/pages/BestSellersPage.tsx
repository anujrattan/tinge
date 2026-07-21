import React, { useCallback } from 'react';
import api from '../services/api';
import { ProductShowcasePage } from '../components/ProductShowcasePage';
import { TrendingUpIcon } from '../components/Icons';

export const BestSellersPage: React.FC = () => {
  // API default limit is 8 (home strip only); request enough rows for a full grid.
  const fetchProducts = useCallback(() => api.getBestSellers(200), []);

  return (
    <ProductShowcasePage
      icon={TrendingUpIcon}
      eyebrow="Loved by collectors"
      title="Best Sellers"
      description="The pieces people keep coming back for — ranked by what's actually flying off our shelves."
      countAdjective="trending"
      fetchProducts={fetchProducts}
      showRanks
      emptyTitle="Nothing trending yet"
      emptyDescription="Check back soon — the first drops are on their way."
      ctaPrompt="Looking for something quieter?"
      ctaLabel="Browse the curated gallery"
      ctaTo="/featured-art"
    />
  );
};
