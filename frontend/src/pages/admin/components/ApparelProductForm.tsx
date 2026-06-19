import React from 'react';
import { Product, Category, Collection } from '../../../types';
import { PrintrovePrefill } from './PrintroveSyncModal';
import { ProductFormInner } from './ProductFormInner';

export const ApparelProductForm: React.FC<{
  product?: Product | null;
  prefill?: PrintrovePrefill | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
}> = (props) => <ProductFormInner {...props} productType="apparel" />;
