import React from 'react';
import { Product, Category, Collection } from '../../../types';
import { ProductFormInner } from './ProductFormInner';

export const PosterProductForm: React.FC<{
  product?: Product | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
}> = (props) => <ProductFormInner {...props} productType="poster" prefill={null} />;
