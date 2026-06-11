import React from 'react';
import { PartnerVariant } from '../../../../types';
import { Input } from '../../../../components/ui';
import { CheckCircleIcon } from '../../../../components/icons';
import { POSTER_SIZE_LABELS } from '../../productTypeConfig';
import { POSTER_SIZES } from '../../../../utils/sizeSystem';
import type { SizePricesMap } from '../../../../utils/sizePricing';

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

export const PosterProductFields: React.FC<Props> = ({ formData, setFormData, onFieldChange }) => {
  const selectedSizes = POSTER_SIZES.filter((s) => formData.sizes.includes(s));
  const partnerVariants = ensurePosterPartnerVariants(
    [...POSTER_SIZES],
    Array.isArray(formData.partner_variants) ? formData.partner_variants : [],
  );

  const setSizes = (nextSizes: string[]) => {
    const normalized = POSTER_SIZES.filter((s) => nextSizes.includes(s));
    setFormData((prev: any) => ({
      ...prev,
      sizes: normalized,
      partner_variants: ensurePosterPartnerVariants(normalized, prev.partner_variants || []),
    }));
  };

  const toggleSize = (size: string) => {
    setFormData((prev: any) => {
      const has = prev.sizes.includes(size);
      const nextSizes = has
        ? prev.sizes.filter((x: string) => x !== size)
        : [...prev.sizes, size];
      const normalized = POSTER_SIZES.filter((s) => nextSizes.includes(s));
      return {
        ...prev,
        sizes: normalized,
        partner_variants: ensurePosterPartnerVariants(
          normalized,
          prev.partner_variants || [],
        ),
      };
    });
  };

  const includeAllSizes = () => setSizes([...POSTER_SIZES]);

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
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <label className="block text-sm font-semibold text-brand-primary">
            Sizes on this listing <span className="text-red-400">*</span>
          </label>
          {selectedSizes.length < POSTER_SIZES.length && (
            <button
              type="button"
              onClick={includeAllSizes}
              className="text-xs font-semibold text-[#E85D4A] hover:text-[#c94f3f] underline underline-offset-2"
            >
              Include both sizes
            </button>
          )}
        </div>
        <p className="text-xs text-brand-secondary mb-3">
          This is not “pick one size for the product.” Turn each size on if it should appear on the
          product page. Shoppers choose one size at checkout. Publishing requires both sizes included.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {POSTER_SIZES.map((size) => {
            const isIncluded = formData.sizes.includes(size);
            const label = POSTER_SIZE_LABELS[size] || size;
            return (
              <button
                key={size}
                type="button"
                role="checkbox"
                aria-checked={isIncluded}
                aria-label={`${label} — ${isIncluded ? 'included on listing' : 'not included on listing'}`}
                onClick={() => toggleSize(size)}
                className={`flex-1 text-left rounded-xl border-2 px-4 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] focus-visible:ring-offset-2 ${
                  isIncluded
                    ? 'border-[#E85D4A] bg-[#FFF5F2] dark:bg-[#E85D4A]/15 shadow-sm'
                    : 'border-dashed border-gray-300 dark:border-white/30 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      isIncluded
                        ? 'border-[#E85D4A] bg-[#E85D4A] text-white'
                        : 'border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface'
                    }`}
                    aria-hidden
                  >
                    {isIncluded ? (
                      <CheckCircleIcon className="h-4 w-4" strokeWidth={2.5} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-semibold ${
                        isIncluded ? 'text-brand-primary' : 'text-gray-500 dark:text-brand-secondary'
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs font-medium ${
                        isIncluded
                          ? 'text-[#C94F3F] dark:text-[#FF9A85]'
                          : 'text-gray-400 dark:text-brand-secondary'
                      }`}
                    >
                      {isIncluded ? 'Included on listing' : 'Not included (draft only)'}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-brand-secondary mt-3">
          <span className="font-semibold text-brand-primary">{selectedSizes.length}</span> of{' '}
          {POSTER_SIZES.length} sizes included
          {selectedSizes.length < POSTER_SIZES.length && (
            <span className="text-amber-600 dark:text-amber-400">
              {' '}
              — add the missing size before publishing
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-2">Fulfillment partner</label>
          <select
            name="fulfillment_partner"
            value={formData.fulfillment_partner || 'Qikink'}
            onChange={onFieldChange}
            className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary"
          >
            <option value="Qikink">Qikink</option>
            <option value="Printrove">Printrove</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-2">Fulfillment product ID / SKU</label>
          <Input
            name="partner_product_id"
            placeholder="Product or parent SKU (from fulfillment dashboard)"
            value={formData.partner_product_id}
            onChange={onFieldChange}
            className="border-2 border-gray-300 dark:border-white/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-brand-primary mb-2">
          Size pricing &amp; fulfillment reference
        </label>
        <p className="text-xs text-brand-secondary mb-2">
          Set a selling price for each size. Listing cards use the lowest price (“From …”).
        </p>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-[#FF7A59]/10 text-brand-primary">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Size</th>
                <th className="text-left px-3 py-2 font-semibold">Price (₹)</th>
                <th className="text-left px-3 py-2 font-semibold">SKU</th>
                <th className="text-left px-3 py-2 font-semibold">Variant ID</th>
              </tr>
            </thead>
            <tbody>
              {partnerVariants.map((pv, i) => {
                const included = formData.sizes.includes(pv.size);
                return (
                <tr
                  key={pv.size}
                  className={`border-t border-white/10 ${included ? '' : 'opacity-50'}`}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {POSTER_SIZE_LABELS[pv.size] || pv.size}
                    {!included && (
                      <span className="block text-[10px] text-brand-secondary font-normal">
                        Not on listing
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
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
                      className="w-full min-w-[5rem] rounded border border-gray-300 dark:border-white/30 bg-white dark:bg-brand-surface px-2 py-1 text-xs disabled:opacity-50"
                      placeholder="e.g. 899"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={pv.partner_sku || ''}
                      onChange={(e) => updatePartnerVariant(i, 'partner_sku', e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-white/30 bg-white dark:bg-brand-surface px-2 py-1 text-xs font-mono"
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={pv.partner_variant_id || ''}
                      onChange={(e) => updatePartnerVariant(i, 'partner_variant_id', e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-white/30 bg-white dark:bg-brand-surface px-2 py-1 text-xs font-mono"
                      placeholder="Variant ID"
                    />
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-brand-secondary mt-1">
          SKU and Variant ID are for reference — enter these from your fulfillment dashboard when placing orders manually.
        </p>
      </div>
    </div>
  );
};
