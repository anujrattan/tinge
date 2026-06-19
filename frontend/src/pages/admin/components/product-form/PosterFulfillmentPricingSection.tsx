import React from 'react';
import { PartnerVariant } from '../../../../types';
import { Input } from '../../../../components/ui';
import { POSTER_SIZE_LABELS } from '../../productTypeConfig';
import { POSTER_SIZES } from '../../../../utils/sizeSystem';
import type { SizePricesMap } from '../../../../utils/sizePricing';
import { FormField, FormRow, formInputClass, formSelectClass } from './formUi';

type FormSlice = {
  sizes: string[];
  size_prices: SizePricesMap;
  fulfillment_partner: string;
  partner_product_id: string;
  partner_variants: PartnerVariant[];
};

type Props = {
  formData: FormSlice;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const ensurePosterPartnerVariants = (sizes: string[], existing: PartnerVariant[]): PartnerVariant[] =>
  sizes.map((size) => {
    const prev = existing.find((p) => p.size === size);
    return {
      size,
      partner_variant_id: prev?.partner_variant_id || '',
      partner_sku: prev?.partner_sku || '',
    };
  });

const tableInputClass =
  'w-full rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface px-2.5 py-1.5 text-xs text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent disabled:opacity-50';

export const PosterFulfillmentPricingSection: React.FC<Props> = ({
  formData,
  setFormData,
  onFieldChange,
}) => {
  const partnerVariants = ensurePosterPartnerVariants(
    [...POSTER_SIZES],
    Array.isArray(formData.partner_variants) ? formData.partner_variants : [],
  );

  const updateSizePrice = (size: string, raw: string) => {
    const parsed = raw === '' ? 0 : parseFloat(raw);
    const price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setFormData((prev: any) => {
      const nextPrices = { ...(prev.size_prices || {}), [size]: price };
      const included = POSTER_SIZES.filter((s) => (prev.sizes || []).includes(s));
      const positives = included
        .map((s) => nextPrices[s] ?? 0)
        .filter((p) => p > 0);
      const min = positives.length > 0 ? Math.min(...positives) : 0;
      return {
        ...prev,
        size_prices: nextPrices,
        ...(min > 0 && Number.isFinite(min) ? { selling_price: min } : {}),
      };
    });
  };

  const updatePartnerVariant = (index: number, field: 'partner_sku' | 'partner_variant_id', value: string) => {
    setFormData((prev: any) => {
      const list = ensurePosterPartnerVariants(
        POSTER_SIZES.filter((s) => (prev.sizes || []).includes(s)),
        prev.partner_variants || [],
      );
      const next = [...list];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, partner_variants: next };
    });
  };

  return (
    <div className="space-y-5">
      <FormRow>
        <FormField label="Fulfillment partner">
          <select
            name="fulfillment_partner"
            value={formData.fulfillment_partner || 'Qikink'}
            onChange={onFieldChange}
            className={formSelectClass}
          >
            <option value="Qikink">Qikink</option>
            <option value="Printrove">Printrove</option>
          </select>
        </FormField>
        <FormField
          label="Fulfillment product ID / SKU"
          hint="Product or parent SKU from your fulfillment dashboard."
        >
          <Input
            name="partner_product_id"
            placeholder="Product or parent SKU"
            value={formData.partner_product_id}
            onChange={onFieldChange}
            className={formInputClass}
          />
        </FormField>
      </FormRow>

      <FormField
        label="Size pricing & fulfillment reference"
        hint='Set a selling price for each size. Listing cards use the lowest price ("From …"). SKU and Variant ID are for manual order reference.'
      >
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-brand-accent/10 text-brand-primary">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Size</th>
                <th className="text-left px-3 py-2.5 font-semibold">Price (₹)</th>
                <th className="text-left px-3 py-2.5 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 font-semibold">Variant ID</th>
              </tr>
            </thead>
            <tbody>
              {partnerVariants.map((pv, i) => {
                const included = formData.sizes.includes(pv.size);
                return (
                  <tr
                    key={pv.size}
                    className={`border-t border-gray-200/80 dark:border-white/10 ${included ? '' : 'opacity-50'}`}
                  >
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                      {POSTER_SIZE_LABELS[pv.size] || pv.size}
                      {!included && (
                        <span className="block text-[10px] text-brand-secondary font-normal mt-0.5">
                          Not on listing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        disabled={!included}
                        value={
                          formData.size_prices?.[pv.size] != null && formData.size_prices[pv.size] > 0
                            ? formData.size_prices[pv.size]
                            : ''
                        }
                        onChange={(e) => updateSizePrice(pv.size, e.target.value)}
                        className={`${tableInputClass} min-w-[5rem]`}
                        placeholder="e.g. 899"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={pv.partner_sku || ''}
                        onChange={(e) => updatePartnerVariant(i, 'partner_sku', e.target.value)}
                        className={`${tableInputClass} font-mono`}
                        placeholder="SKU"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={pv.partner_variant_id || ''}
                        onChange={(e) => updatePartnerVariant(i, 'partner_variant_id', e.target.value)}
                        className={`${tableInputClass} font-mono`}
                        placeholder="Variant ID"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormField>
    </div>
  );
};
