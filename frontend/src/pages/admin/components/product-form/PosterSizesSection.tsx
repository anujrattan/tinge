import React from 'react';
import { CheckCircleIcon } from '../../../../components/icons';
import { POSTER_SIZE_LABELS } from '../../productTypeConfig';
import { POSTER_SIZES } from '../../../../utils/sizeSystem';
import type { PartnerVariant } from '../../../../types';

type FormSlice = {
  sizes: string[];
  partner_variants: PartnerVariant[];
};

type Props = {
  formData: FormSlice;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
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

export const PosterSizesSection: React.FC<Props> = ({ formData, setFormData }) => {
  const selectedSizes = POSTER_SIZES.filter((s) => formData.sizes.includes(s));

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
        partner_variants: ensurePosterPartnerVariants(normalized, prev.partner_variants || []),
      };
    });
  };

  const includeAllSizes = () => setSizes([...POSTER_SIZES]);

  return (
    <div className="space-y-5">
      {selectedSizes.length < POSTER_SIZES.length && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={includeAllSizes}
            className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover underline underline-offset-2"
          >
            Include both sizes
          </button>
        </div>
      )}

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
              className={`flex-1 text-left rounded-xl border px-4 py-3.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 focus-visible:ring-offset-2 ${
                isIncluded
                  ? 'border-brand-accent bg-brand-accent/5 dark:bg-brand-accent/10 shadow-sm'
                  : 'border-dashed border-gray-300 dark:border-white/25 bg-white dark:bg-brand-surface hover:border-gray-400 dark:hover:border-white/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    isIncluded
                      ? 'border-brand-accent bg-brand-accent text-white'
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
                    className={`block text-sm font-medium ${
                      isIncluded ? 'text-brand-primary' : 'text-gray-500 dark:text-brand-secondary'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${
                      isIncluded ? 'text-brand-accent' : 'text-gray-400 dark:text-brand-secondary'
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

      <p className="text-xs text-brand-secondary leading-relaxed">
        <span className="font-medium text-brand-primary">{selectedSizes.length}</span> of{' '}
        {POSTER_SIZES.length} sizes included
        {selectedSizes.length < POSTER_SIZES.length && (
          <span className="text-amber-600 dark:text-amber-400">
            {' '}
            — add the missing size before publishing
          </span>
        )}
      </p>
    </div>
  );
};
