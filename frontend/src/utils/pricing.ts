export interface PricingInputs {
  vendorBaseCost?: number | null;
  vendorShippingCost?: number | null;
  targetMarginPercent?: number | null;
  sellingPrice: number;
  discountPercentage?: number | null;
  onSale?: boolean;
  saleDiscountPercentage?: number | null;
}

export interface PricingValidationPayload {
  suggested_price: number;
  discounted_price: number;
  final_price: number;
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

export const calculateFinalPrice = (
  sellingPrice: number,
  discountPercentage?: number | null,
  onSale?: boolean,
  saleDiscountPercentage?: number | null,
): number => {
  let finalPrice = toFiniteNumber(sellingPrice, 0);
  const discountPct = toFiniteNumber(discountPercentage, 0);
  const salePct = onSale ? toFiniteNumber(saleDiscountPercentage, 0) : 0;

  if (discountPct > 0) {
    finalPrice = finalPrice * (1 - discountPct / 100);
  }
  if (salePct > 0) {
    finalPrice = finalPrice * (1 - salePct / 100);
  }

  return roundTo2(finalPrice);
};

/**
 * Converts an exact (possibly decimal) price to a clean customer-facing display price.
 * - Strips decimals (floor, never round up)
 * - Avoids "x00" psychological dead-zones: 1200 → 1199, 2400 → 2399
 *
 * Use this for ALL customer-facing price rendering.
 * Do NOT use for backend order totals or internal financial math.
 */
export const toAnchoredDisplayPrice = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const whole = Math.floor(amount);
  return whole % 100 === 0 ? whole - 1 : whole;
};

/**
 * Convenience: compute final price from a product and return the anchored display value.
 */
export const getDisplayPrice = (
  sellingPrice: number,
  discountPercentage?: number | null,
  onSale?: boolean,
  saleDiscountPercentage?: number | null,
): number => toAnchoredDisplayPrice(
  calculateFinalPrice(sellingPrice, discountPercentage, onSale, saleDiscountPercentage),
);

export const createPricingValidationPayload = (inputs: PricingInputs): PricingValidationPayload => {
  const vendorBaseCost = toFiniteNumber(inputs.vendorBaseCost, 0);
  const vendorShippingCost = toFiniteNumber(inputs.vendorShippingCost, 0);
  const targetMarginPercent = toFiniteNumber(inputs.targetMarginPercent, 100);
  const sellingPrice = toFiniteNumber(inputs.sellingPrice, 0);
  const discountPercentage = toFiniteNumber(inputs.discountPercentage, 0);
  const saleDiscountPercentage = inputs.onSale ? toFiniteNumber(inputs.saleDiscountPercentage, 0) : 0;

  const suggestedPrice = roundTo2((vendorBaseCost + vendorShippingCost) * (1 + targetMarginPercent / 100));
  const discountedPrice = roundTo2(sellingPrice * (1 - discountPercentage / 100));
  const finalPrice = roundTo2(discountedPrice * (1 - saleDiscountPercentage / 100));

  return {
    suggested_price: suggestedPrice,
    discounted_price: discountedPrice,
    final_price: finalPrice,
  };
};
