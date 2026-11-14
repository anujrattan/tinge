import React from 'react';
import { Product, Category, Collection } from '../../../types';
import { ArtProductForm } from './ArtProductForm';

export const ProductForm: React.FC<{
  product?: Product | null;
  prefill?: unknown;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
  onProductTypeChange?: (type: string) => void;
}> = ({ product, onSave, onCancel, categories, collections }) => (
  <ArtProductForm
    product={product}
    onSave={onSave}
    onCancel={onCancel}
    categories={categories}
    collections={collections}
  />
);
