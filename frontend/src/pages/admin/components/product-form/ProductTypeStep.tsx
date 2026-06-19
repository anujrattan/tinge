import React, { useState } from 'react';
import type { ProductType } from '../../../../types';
import { PRODUCT_TYPE_OPTIONS } from '../../productTypeConfig';
import { Button, Card } from '../../../../components/ui';
import { formSelectClass } from './formUi';

type Props = {
  onContinue: (type: ProductType) => void;
  onCancel: () => void;
};

export const ProductTypeStep: React.FC<Props> = ({ onContinue, onCancel }) => {
  const [selected, setSelected] = useState<ProductType>('apparel');

  return (
    <Card className="p-6 md:p-8 max-w-lg mx-auto w-full border-gray-200/80 dark:border-white/10">
      <h3 className="font-playfair text-xl font-medium text-brand-primary">Add New Product</h3>
      <p className="mt-1.5 text-sm text-brand-secondary leading-relaxed mb-8">
        Choose a product type first. The form fields will match the listing you are creating.
      </p>

      <div className="space-y-2 mb-8">
        <label className="block text-sm font-medium text-brand-primary">
          Product type <span className="text-red-400">*</span>
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as ProductType)}
          className={formSelectClass}
        >
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-brand-secondary leading-relaxed">
          Apparel uses size and color variants. Metal posters use fixed poster sizes with per-size pricing.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200/80 dark:border-white/10">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onContinue(selected)}>
          Continue
        </Button>
      </div>
    </Card>
  );
};
