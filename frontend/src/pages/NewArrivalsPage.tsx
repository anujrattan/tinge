import React, { useCallback } from 'react';
import api from '../services/api';
import { ProductShowcasePage } from '../components/ProductShowcasePage';
import { FlameIcon } from '../components/Icons';

export const NewArrivalsPage: React.FC = () => {
  const fetchProducts = useCallback(() => api.getNewArrivals(200), []);

  return (
    <ProductShowcasePage
      icon={FlameIcon}
      eyebrow="Fresh off the press"
      title="New Arrivals"
      description="Be the first to discover our latest additions — newest listings land here the moment they drop."
      countAdjective="new"
      fetchProducts={fetchProducts}
      emptyTitle="No new arrivals yet"
      emptyDescription="Check back soon — fresh pieces are on their way."
      ctaPrompt="Want to see what everyone else is loving?"
      ctaLabel="Shop the best sellers"
      ctaTo="/best-sellers"
    />
  );
};
