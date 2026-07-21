import React, { useCallback } from 'react';
import api from '../services/api';
import { ProductShowcasePage } from '../components/ProductShowcasePage';
import { SparklesIcon } from '../components/Icons';

export const FeaturedArtPage: React.FC = () => {
  const fetchProducts = useCallback(() => api.getFeaturedProducts(200), []);

  return (
    <ProductShowcasePage
      icon={SparklesIcon}
      eyebrow="The Gallery"
      title="Featured Art"
      description="Curated pieces worth living with — newest listings first."
      countAdjective="curated"
      fetchProducts={fetchProducts}
      emptyTitle="No featured art yet"
      emptyDescription="Our curators are hanging the next collection. Check back soon."
      ctaPrompt="Want to see what everyone else is loving?"
      ctaLabel="Shop the best sellers"
      ctaTo="/best-sellers"
    />
  );
};
