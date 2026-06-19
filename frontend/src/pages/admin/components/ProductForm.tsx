import React, { useMemo, useState } from 'react';
import { Product, Category, Collection, ProductType } from '../../../types';
import { PrintrovePrefill } from './PrintroveSyncModal';
import { ProductTypeStep } from './product-form/ProductTypeStep';
import { ApparelProductForm } from './ApparelProductForm';
import { PosterProductForm } from './PosterProductForm';

function inferProductType(
  product: Product | null | undefined,
  categories: Category[],
): ProductType {
  if (!product?.category_id) return 'apparel';
  const cat = categories.find((c) => c.id === product.category_id);
  return cat?.product_type === 'poster' ? 'poster' : 'apparel';
}

export const ProductForm: React.FC<{
  product?: Product | null;
  prefill?: PrintrovePrefill | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
  onProductTypeChange?: (type: ProductType) => void;
}> = ({
  product,
  prefill,
  onSave,
  onCancel,
  categories,
  collections,
  onProductTypeChange,
}) => {
  const isEdit = !!product?.id;
  const initialType = useMemo(
    () => (isEdit ? inferProductType(product, categories) : prefill ? 'apparel' : null),
    [isEdit, product, categories, prefill],
  );
  const [selectedType, setSelectedType] = useState<ProductType | null>(initialType);
  const [typeCommitted, setTypeCommitted] = useState(isEdit || !!prefill);

  if (!typeCommitted) {
    return (
      <ProductTypeStep
        onCancel={onCancel}
        onContinue={(type) => {
          setSelectedType(type);
          setTypeCommitted(true);
          onProductTypeChange?.(type);
        }}
      />
    );
  }

  const productType = selectedType ?? inferProductType(product, categories);

  if (productType === 'poster') {
    return (
      <PosterProductForm
        product={product}
        onSave={onSave}
        onCancel={onCancel}
        categories={categories}
        collections={collections}
      />
    );
  }

  return (
    <ApparelProductForm
      product={product}
      prefill={prefill}
      onSave={onSave}
      onCancel={onCancel}
      categories={categories}
      collections={collections}
    />
  );
};
