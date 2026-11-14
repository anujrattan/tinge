import type { ArtMaterial } from '../../types';
import { ACP_CUTS } from '../../data/printTypes';

export const MATERIAL_OPTIONS: { value: ArtMaterial; label: string }[] = [
  { value: 'framed_acp', label: 'Framed ACP' },
  { value: 'canvas', label: 'Canvas' },
  { value: 'sunboard', label: 'Sunboard' },
  { value: 'neon', label: 'Neon' },
];

export const MATERIAL_SIZE_PRESETS: Record<ArtMaterial, string[]> = {
  framed_acp: ACP_CUTS.map((c) => c.size),
  canvas: ['4 × 4 ft', '4 × 2 ft', '3 × 2 ft'],
  sunboard: ['4 × 2 ft', '3 × 2 ft'],
  neon: ['Custom — confirm before produce'],
};

export const getSizesForMaterial = (material: ArtMaterial): string[] => [
  ...(MATERIAL_SIZE_PRESETS[material] || []),
];

/** @deprecated apparel removed — kept for any residual imports */
export const PRODUCT_TYPE_OPTIONS = MATERIAL_OPTIONS;
export const SIZE_PRICING_PRODUCT_TYPES: ArtMaterial[] = [
  'framed_acp',
  'canvas',
  'sunboard',
  'neon',
];
export const usesSizePricing = (_material: ArtMaterial): boolean => true;
export const DEFAULT_FULFILLMENT_BY_TYPE: Record<string, string> = {};
export const getPosterSizesForListing = (): string[] => getSizesForMaterial('framed_acp');
export const posterSizesComplete = (): boolean => true;
export const POSTER_SIZE_LABELS: Record<string, string> = {};
