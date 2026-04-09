export interface PricingValidationPayload {
  suggested_price: number;
  discounted_price: number;
  final_price: number;
}

export interface PricingInputs {
  vendorBaseCost?: number | null;
  vendorShippingCost?: number | null;
  targetMarginPercent?: number | null;
  sellingPrice: number;
  discountPercentage?: number | null;
  onSale?: boolean;
  saleDiscountPercentage?: number | null;
}

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

export const createPricingValidationSnapshot = (inputs: PricingInputs): PricingValidationPayload => {
  const vendorBaseCost = Number.isFinite(Number(inputs.vendorBaseCost)) ? Number(inputs.vendorBaseCost) : 0;
  const vendorShippingCost = Number.isFinite(Number(inputs.vendorShippingCost)) ? Number(inputs.vendorShippingCost) : 0;
  const targetMarginPercent = Number.isFinite(Number(inputs.targetMarginPercent))
    ? Number(inputs.targetMarginPercent)
    : 100;
  const sellingPrice = Number.isFinite(Number(inputs.sellingPrice)) ? Number(inputs.sellingPrice) : 0;
  const discountPercentage = Number.isFinite(Number(inputs.discountPercentage)) ? Number(inputs.discountPercentage) : 0;
  const saleDiscountPercentage = inputs.onSale && Number.isFinite(Number(inputs.saleDiscountPercentage))
    ? Number(inputs.saleDiscountPercentage)
    : 0;

  const suggestedPrice = roundTo2((vendorBaseCost + vendorShippingCost) * (1 + targetMarginPercent / 100));
  const discountedPrice = roundTo2(sellingPrice * (1 - discountPercentage / 100));
  const finalPrice = roundTo2(discountedPrice * (1 - saleDiscountPercentage / 100));

  return {
    suggested_price: suggestedPrice,
    discounted_price: discountedPrice,
    final_price: finalPrice,
  };
};

export const pricingPayloadMatches = (
  received: PricingValidationPayload,
  expected: PricingValidationPayload,
  epsilon = 0.01,
): boolean => {
  return (
    Math.abs(received.suggested_price - expected.suggested_price) <= epsilon &&
    Math.abs(received.discounted_price - expected.discounted_price) <= epsilon &&
    Math.abs(received.final_price - expected.final_price) <= epsilon
  );
};
